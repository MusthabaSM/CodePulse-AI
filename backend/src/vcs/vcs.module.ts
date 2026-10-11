import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VcsProviderFactory } from './vcs-provider.factory';
import { VcsAuthService } from './vcs-auth.service';
import { GitHubProvider } from './providers/github.provider';
import { GitHubEnterpriseProvider } from './providers/github-enterprise.provider';
import { GitLabProvider } from './providers/gitlab.provider';
import { GitLabSelfHostedProvider } from './providers/gitlab-self-hosted.provider';
import { BitbucketProvider } from './providers/bitbucket.provider';
import { AzureReposProvider } from './providers/azure-repos.provider';
import { WebhooksController } from './webhooks.controller';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AnalysisModule)],
  controllers: [WebhooksController],
  providers: [
    VcsProviderFactory,
    VcsAuthService,
    GitHubProvider,
    GitHubEnterpriseProvider,
    GitLabProvider,
    GitLabSelfHostedProvider,
    BitbucketProvider,
    AzureReposProvider,
  ],
  exports: [VcsProviderFactory, VcsAuthService],
})
export class VcsModule {}
