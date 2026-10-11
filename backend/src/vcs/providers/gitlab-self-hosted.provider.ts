import { Injectable, Logger } from '@nestjs/common';
import {
  VersionControlProvider,
  Repository,
  Commit,
} from '../interfaces/version-control-provider.interface';

@Injectable()
export class GitLabSelfHostedProvider implements VersionControlProvider {
  private readonly logger = new Logger(GitLabSelfHostedProvider.name);
  private token: string | null = null;

  async authenticate(token: string): Promise<void> {
    this.token = token;
    this.logger.log('Authenticated with GitLab Self-Hosted');
  }

  async getRepositories(): Promise<Repository[]> {
    if (!this.token) throw new Error('Not authenticated');
    this.logger.log('Fetching repositories from GitLab On-Prem');
    return [];
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    if (!this.token) throw new Error('Not authenticated');
    return {
      id: 'glsh-1',
      name: repo,
      url: `https://gitlab.internal/${owner}/${repo}`,
      defaultBranch: 'main',
    };
  }

  async getRecentCommits(owner: string, repo: string, limit: number = 10): Promise<Commit[]> {
    if (!this.token) throw new Error('Not authenticated');
    return [];
  }

  async getFileContent(repositoryUrl: string, filePath: string, ref?: string): Promise<string> {
    return '';
  }

  async registerWebhook(repositoryUrl: string, webhookUrl: string, secret: string): Promise<boolean> {
    return true;
  }
}
