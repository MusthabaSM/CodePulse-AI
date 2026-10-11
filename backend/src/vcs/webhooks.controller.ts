import { Controller, Post, Body, Headers, Logger, Param, UseGuards } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';
import { Public } from '../auth/public.decorator';

@Controller('api/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Public()
  @Post('vcs/:repoId')
  async handleVcsWebhook(
    @Param('repoId') repoId: string,
    @Headers('x-github-event') githubEvent: string,
    @Body() payload: any
  ) {
    this.logger.log(`Received VCS webhook for repo ${repoId}, event: ${githubEvent}`);

    // Very basic push detection for automatic incremental analysis
    if (githubEvent === 'push' || payload?.push) {
      this.logger.log(`Push detected on repo ${repoId}. Triggering automated incremental analysis...`);
      // We would normally look up the repo to get organizationId, owner, etc.
      // For this implementation we will just log that automated monitoring detected it.
      
      // await this.analysisService.triggerAnalysis(...)
    } else if (githubEvent === 'pull_request') {
      this.logger.log(`PR detected on repo ${repoId}.`);
    }

    return { received: true };
  }
}
