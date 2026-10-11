import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VcsAuthService } from '../vcs/vcs-auth.service';
import { VcsProviderFactory } from '../vcs/vcs-provider.factory';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vcsAuthService: VcsAuthService,
    private readonly vcsProviderFactory: VcsProviderFactory,
  ) {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      this.logger.warn('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing. GitHub OAuth will fail.');
    }
  }

  // --- Organization ---
  async getOrganization(id: string) {
    let org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      org = await this.prisma.organization.create({
        data: { id, name: '', industry: 'fintech' },
      });
    }
    return org;
  }

  async updateOrganization(id: string, name?: string, industry?: string) {
    return this.prisma.organization.upsert({
      where: { id },
      update: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
      },
      create: {
        id,
        name: name !== undefined ? name : '',
        industry: industry !== undefined ? industry : 'fintech',
      },
    });
  }

  // --- GitHub Integration ---
  async getGithubStatus(organizationId: string) {
    const integration = await this.prisma.vcsIntegration.findUnique({
      where: { organizationId_provider: { organizationId, provider: 'GITHUB' } },
    });
    const repoCount = await this.prisma.repository.count({
      where: { organizationId, provider: 'GITHUB' },
    });
    
    // Find latest sync time
    const latestRepo = await this.prisma.repository.findFirst({
      where: { organizationId, provider: 'GITHUB' },
      orderBy: { lastScannedAt: 'desc' },
    });

    return {
      connected: !!integration,
      connectedAccount: integration?.installationId || (integration ? 'GitHub (OAuth)' : null),
      repositoryCount: repoCount,
      lastSyncTime: latestRepo?.lastScannedAt || null,
    };
  }

  getGithubOauthUrl(organizationId: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      this.logger.warn('Cannot generate OAuth URL because GITHUB_CLIENT_ID is missing.');
      return '';
    }
    const scopes = encodeURIComponent('repo read:user');
    // We pass the organizationId as state so we know who to connect this to when GitHub redirects back
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes}&state=${organizationId}`;
  }

  async handleGithubCallback(code: string, state: string) {
    const organizationId = state;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('OAuth configuration missing');
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      },
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      console.error('GitHub OAuth Exchange Error Data:', tokenResponse.data);
      throw new Error(`Failed to obtain access token from GitHub: ${JSON.stringify(tokenResponse.data)}`);
    }

    // Fetch user details
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUsername = userResponse.data.login;

    // Delete existing repos for this provider/org so if they switch accounts, it updates
    await this.prisma.repository.deleteMany({
      where: {
        organizationId,
        provider: 'GITHUB'
      }
    });

    await this.vcsAuthService.storeToken(organizationId, 'GITHUB', accessToken);
    
    // We update the integration to store the username in installationId as a quick hack
    await this.prisma.vcsIntegration.update({
      where: { organizationId_provider: { organizationId, provider: 'GITHUB' } },
      data: { installationId: githubUsername },
    });

    // Sync repositories immediately
    try {
      const provider = this.vcsProviderFactory.getProvider('GITHUB' as any);
      await provider.authenticate(accessToken);
      const repos = await provider.getRepositories();
      
      const repoCreates = repos.map(repo => {
        // extract owner from url (e.g. https://github.com/owner/repo)
        const parts = repo.url.split('/');
        const owner = parts[parts.length - 2] || 'unknown';
        return {
          id: repo.id,
          organizationId,
          name: repo.name,
          url: repo.url,
          provider: 'GITHUB' as any,
          owner,
        };
      });

      // Upsert repos
      for (const repoData of repoCreates) {
        await this.prisma.repository.upsert({
          where: { id: repoData.id },
          update: {
            name: repoData.name,
            url: repoData.url,
            owner: repoData.owner,
            organizationId: repoData.organizationId,
          },
          create: repoData,
        });
      }
    } catch (e) {
      console.error('Failed to sync repositories after GitHub connect:', e);
    }
    
    return { success: true };
  }

  async syncGithubRepositories(organizationId: string) {
    const token = await this.vcsAuthService.getToken(organizationId, 'GITHUB');
    if (!token) {
      throw new Error('GitHub is not connected for this organization');
    }

    try {
      const provider = this.vcsProviderFactory.getProvider('GITHUB' as any);
      await provider.authenticate(token);
      const repos = await provider.getRepositories();
      
      const repoCreates = repos.map(repo => {
        const parts = repo.url.split('/');
        const owner = parts[parts.length - 2] || 'unknown';
        return {
          id: repo.id,
          organizationId,
          name: repo.name,
          url: repo.url,
          provider: 'GITHUB' as any,
          owner,
        };
      });

      for (const repoData of repoCreates) {
        await this.prisma.repository.upsert({
          where: { id: repoData.id },
          update: {
            name: repoData.name,
            url: repoData.url,
            owner: repoData.owner,
            organizationId: repoData.organizationId,
          },
          create: repoData,
        });
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to sync repositories:', e);
      throw new Error('Failed to sync repositories');
    }
  }

  async connectGithub(organizationId: string, token: string) {
    await this.vcsAuthService.storeToken(organizationId, 'GITHUB', token);
    
    // Legacy PAT approach, kept for backward compatibility if needed, but not used by UI
    try {
      const provider = this.vcsProviderFactory.getProvider('GITHUB' as any);
      await provider.authenticate(token);
      const repos = await provider.getRepositories();
      
      const repoCreates = repos.map(repo => {
        const parts = repo.url.split('/');
        const owner = parts[parts.length - 2] || 'unknown';
        return {
          id: repo.id,
          organizationId,
          name: repo.name,
          url: repo.url,
          provider: 'GITHUB' as any,
          owner,
        };
      });

      for (const repoData of repoCreates) {
        await this.prisma.repository.upsert({
          where: { id: repoData.id },
          update: {
            name: repoData.name,
            url: repoData.url,
            owner: repoData.owner,
            organizationId: repoData.organizationId,
          },
          create: repoData,
        });
      }
    } catch (e) {
      console.error('Failed to sync repositories after GitHub connect:', e);
    }
    
    return { success: true };
  }

  async disconnectGithub(organizationId: string) {
    try {
      await this.prisma.repository.deleteMany({
        where: { organizationId, provider: 'GITHUB' },
      });
      await this.prisma.vcsIntegration.delete({
        where: { organizationId_provider: { organizationId, provider: 'GITHUB' } },
      });
      return { success: true };
    } catch (e) {
      // Ignore if not found
      return { success: true };
    }
  }

  // --- API Keys ---
  async getApiKeys(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async generateApiKey(organizationId: string, name: string) {
    const rawKey = 'cp_live_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name,
        keyHash,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      rawKey,
      createdAt: apiKey.createdAt,
    };
  }

  async revokeApiKey(organizationId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.organizationId !== organizationId) {
      throw new NotFoundException('API Key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
