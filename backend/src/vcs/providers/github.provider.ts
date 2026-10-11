import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  VersionControlProvider,
  Repository,
  Commit,
} from '../interfaces/version-control-provider.interface';

@Injectable()
export class GitHubProvider implements VersionControlProvider {
  private readonly logger = new Logger(GitHubProvider.name);
  private token: string | null = null;

  async authenticate(token: string): Promise<void> {
    this.token = token;
    this.logger.log('Authenticated with GitHub');
    // Validate token
    try {
      await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (e) {
      throw new Error('Invalid GitHub token');
    }
  }

  async getRepositories(): Promise<Repository[]> {
    if (!this.token) throw new Error('Not authenticated');
    
    this.logger.log('Fetching repositories from GitHub');
    try {
      const response = await axios.get('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' }
      });
      
      return response.data.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch repositories', error);
      throw error;
    }
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    if (!this.token) throw new Error('Not authenticated');

    this.logger.log(`Fetching repository ${owner}/${repo} from GitHub`);
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' }
      });
      
      return {
        id: response.data.id.toString(),
        name: response.data.name,
        url: response.data.html_url,
        defaultBranch: response.data.default_branch,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch repository ${owner}/${repo}`, error);
      throw error;
    }
  }

  async getFileContent(
    repositoryUrl: string,
    filePath: string,
    ref?: string,
  ): Promise<string> {
    return '';
  }

  async registerWebhook(
    repositoryUrl: string,
    webhookUrl: string,
    secret: string,
  ): Promise<boolean> {
    return true;
  }

  async getRecentCommits(
    owner: string,
    repo: string,
    limit: number = 10,
  ): Promise<Commit[]> {
    if (!this.token) throw new Error('Not authenticated');

    this.logger.log(`Fetching ${limit} recent commits for ${owner}/${repo} from GitHub`);
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' }
      });
      
      return response.data.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.email || c.commit.author.name,
        date: c.commit.author.date,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch commits for ${owner}/${repo}`, error);
      throw error;
    }
  }
}
