export interface Repository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface VersionControlProvider {
  /**
   * Initialize the provider with necessary credentials
   */
  authenticate(token: string): Promise<void>;

  /**
   * Fetch a list of repositories for the authenticated user or organization
   */
  getRepositories(): Promise<Repository[]>;

  /**
   * Get the details of a specific repository
   */
  getRepository(owner: string, repo: string): Promise<Repository>;

  /**
   * Get recent commits for a repository
   */
  getRecentCommits(
    owner: string,
    repo: string,
    limit?: number,
  ): Promise<Commit[]>;

  /**
   * Get recent commits for a repository
   */
  getFileContent(
    repositoryUrl: string,
    filePath: string,
    ref?: string,
  ): Promise<string>;

  registerWebhook(
    repositoryUrl: string,
    webhookUrl: string,
    secret: string,
  ): Promise<boolean>;
}
