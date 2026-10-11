import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
  InternalServerErrorException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { BusinessMetricsService } from './business-metrics.service';
import { Public } from '../auth/public.decorator';
import { WebhookGuard } from '../auth/webhook.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

import { IsString, IsOptional, IsBoolean } from 'class-validator';

class AnalyzeRequestDto {
  @IsString()
  url: string;

  @IsString()
  owner: string;

  @IsString()
  repo: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

@Controller('api/analysis')
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly businessService: BusinessMetricsService,
  ) {}

  @Post('trigger')
  @Roles('manager')
  async triggerAnalysis(@Body() body: AnalyzeRequestDto, @Req() req: any) {
    this.logger.log(`Received trigger request for body: ${JSON.stringify(body)}`);
    try {
      const organizationId = req.organizationId;
      return await this.analysisService.triggerAnalysis(
        body.url,
        body.owner,
        body.repo,
        organizationId,
        body.isPrivate || false,
      );
    } catch (err: any) {
      this.logger.error('Trigger error:', err);
      throw new InternalServerErrorException(err.message || 'Trigger failed');
    }
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string, @Req() req: any) {
    const organizationId = req.organizationId;
    return this.analysisService.getJobStatus(jobId, organizationId);
  }

  @Public()
  @UseGuards(WebhookGuard)
  @Post('webhook/:jobId')
  async handleWebhook(@Param('jobId') jobId: string, @Body() payload: any) {
    return this.analysisService.processWebhookResult(jobId, payload);
  }

  @Get('repositories')
  async getRepositories(@Req() req: any) {
    const organizationId = req.organizationId;
    return this.analysisService.getRepositories(organizationId);
  }

  @Get('repositories/:id')
  async getRepositoryDetails(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.organizationId;
    return this.analysisService.getRepositoryDetails(id, organizationId);
  }

  @Get('business-metrics/:repoId')
  async getBusinessMetrics(
    @Param('repoId') repoId: string,
    @Query('hourlyRate') hourlyRate: string,
    @Query('teamSize') teamSize: string,
  ) {
    const rate = hourlyRate ? parseFloat(hourlyRate) : 75;
    const size = teamSize ? parseInt(teamSize, 10) : 5;
    return this.businessService.calculateMetrics(repoId, {
      hourlyRate: rate,
      teamSize: size,
    });
  }

  @Get('compare')
  async compareSnapshots(
    @Query('snapshotIdA') snapshotIdA: string,
    @Query('snapshotIdB') snapshotIdB: string,
  ) {
    if (!snapshotIdA || !snapshotIdB) {
      throw new Error('snapshotIdA and snapshotIdB are required');
    }
    return this.analysisService
      .getBenchmarkingService()
      .compareSnapshots(snapshotIdA, snapshotIdB);
  }

  @Get('report/:snapshotId')
  @Roles('manager')
  async generateReport(@Param('snapshotId') snapshotId: string, @Req() req: any) {
    const orgId = req.organizationId;
    return this.analysisService
      .getReportService()
      .generateExecutiveReport(snapshotId, orgId);
  }
}
