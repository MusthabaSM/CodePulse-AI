import { Injectable, Logger } from '@nestjs/common';
import { VersionControlProvider } from './interfaces/version-control-provider.interface';
import { GitHubProvider } from './providers/github.provider';
import { GitHubEnterpriseProvider } from './providers/github-enterprise.provider';
import { GitLabProvider } from './providers/gitlab.provider';
import { GitLabSelfHostedProvider } from './providers/gitlab-self-hosted.provider';
import { BitbucketProvider } from './providers/bitbucket.provider';
import { AzureReposProvider } from './providers/azure-repos.provider';
import { ProviderType } from '@prisma/client';

@Injectable()
export class VcsProviderFactory {
  private readonly logger = new Logger(VcsProviderFactory.name);

  constructor(
    private readonly githubProvider: GitHubProvider,
    private readonly gheProvider: GitHubEnterpriseProvider,
    private readonly gitlabProvider: GitLabProvider,
    private readonly glshProvider: GitLabSelfHostedProvider,
    private readonly bitbucketProvider: BitbucketProvider,
    private readonly azureProvider: AzureReposProvider,
  ) {}

  getProvider(type: ProviderType): VersionControlProvider {
    this.logger.debug(`Resolving VCS Provider for type: ${type}`);
    switch (type) {
      case 'GITHUB':
        return this.githubProvider;
      case 'GITHUB_ENTERPRISE':
        return this.gheProvider;
      case 'GITLAB':
        return this.gitlabProvider;
      case 'GITLAB_SELF_HOSTED':
        return this.glshProvider;
      case 'BITBUCKET':
        return this.bitbucketProvider;
      case 'AZURE':
        return this.azureProvider;
      default:
        throw new Error(`Unsupported VCS provider type: ${type}`);
    }
  }
}
