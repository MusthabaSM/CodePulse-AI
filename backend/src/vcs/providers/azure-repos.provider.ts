import { Injectable, Logger } from '@nestjs/common';
import {
  VersionControlProvider,
  Repository,
  Commit,
} from '../interfaces/version-control-provider.interface';

@Injectable()
export class AzureReposProvider implements VersionControlProvider {
  private readonly logger = new Logger(AzureReposProvider.name);
  private token: string | null = null;

  async authenticate(token: string): Promise<void> {
    this.token = token;
    this.logger.log('Authenticated with Azure Repos');
  }

  async getRepositories(): Promise<Repository[]> {
    if (!this.token) throw new Error('Not authenticated');
    this.logger.log('Fetching repositories from Azure');
    return [];
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    if (!this.token) throw new Error('Not authenticated');
    return {
      id: 'az-1',
      name: repo,
      url: `https://dev.azure.com/${owner}/_git/${repo}`,
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
