import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { BenchmarkingService } from './benchmarking.service';
import { ReportService } from './report.service';
import { VcsProviderFactory } from '../vcs/vcs-provider.factory';
import { VcsAuthService } from '../vcs/vcs-auth.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  // private webhookUrl = 'http://localhost:3000/api/analysis/webhook'; // Update for prod

  constructor(
    private readonly prisma: PrismaService,
    private readonly benchmarkingService: BenchmarkingService,
    private readonly reportService: ReportService,
    private readonly vcsFactory: VcsProviderFactory,
    private readonly vcsAuth: VcsAuthService,
    private readonly auditService: AuditService,
    @InjectQueue('analysis-queue') private readonly analysisQueue: Queue,
  ) {}

  getBenchmarkingService(): BenchmarkingService {
    return this.benchmarkingService;
  }

  getReportService(): ReportService {
    return this.reportService;
  }

  async triggerAnalysis(url: string, owner: string, name: string, organizationId: string, isPrivate: boolean = false) {
    // 1. Ensure Repository exists
    let repo = await this.prisma.repository.findUnique({ 
      where: { organizationId_url: { organizationId, url } } 
    });
    
    if (!repo) {
      repo = await this.prisma.repository.create({
        data: { url, owner, name, organizationId, isPrivate },
      });
    }

    // 2. Create Analysis Job
    const job = await this.prisma.analysisJob.create({
      data: {
        repoId: repo.id,
        organizationId: repo.organizationId,
        status: 'QUEUED',
        progress: 0,
      },
    });

    this.logger.log(`Created Analysis Job ${job.id} for repo ${url}`);

    // Fetch GitHub Token if private
    let cloneUrl = repo.url;
    if (repo.isPrivate) {
      const token = await this.vcsAuth.getToken(organizationId, repo.provider);
      if (!token) {
        throw new Error(
          `Repository is private but no authentication token found for provider ${repo.provider}`,
        );
      }
      
      const vcsProvider = this.vcsFactory.getProvider(repo.provider);
      await vcsProvider.authenticate(token);

      // Inject credentials into the URL based on provider type.
      // E.g., for GitHub: https://x-access-token:TOKEN@github.com/...
      // In production, this injection logic should be handled by the VcsProvider itself to support multiple URL schemas.
      try {
        const urlObj = new URL(repo.url);
        urlObj.username = 'oauth2'; // Common convention, works for Gitlab/Github
        urlObj.password = token;
        cloneUrl = urlObj.toString();
      } catch (e) {
        this.logger.error('Failed to parse repository URL', e);
      }
    }

    // 3. Trigger BullMQ Worker asynchronously
    await this.analysisQueue.add('analyze', {
      jobId: job.id,
      owner: repo.owner,
      repo: repo.name,
      url: cloneUrl,
      repoId: repo.id,
      organizationId: repo.organizationId,
      lastCommitHash: repo.lastCommitHash,
    });

    // 4. Audit Log
    await this.auditService.logEvent({
      organizationId,
      action: 'TRIGGER_ANALYSIS',
      resourceType: 'Repository',
      resourceId: repo.id,
      metadata: { jobId: job.id, repoName: repo.name, provider: repo.provider },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Analysis queued successfully',
    };
  }

  async getJobStatus(jobId: string, organizationId: string) {
    const job = await this.prisma.analysisJob.findFirst({
      where: { id: jobId, organizationId },
      include: { repository: true },
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  async updateJobStatus(
    jobId: string,
    status: string,
    error?: string,
    progress?: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { status };
    if (error) updateData.error = error;
    if (progress !== undefined) updateData.progress = progress;
    if (status === 'RUNNING' && !error) updateData.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED')
      updateData.completedAt = new Date();

    return this.prisma.analysisJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  async processWebhookResult(
    jobId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
  ) {
    this.logger.log(`Received webhook for Job ${jobId}`);

    const job = await this.prisma.analysisJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException();

    if (payload.status === 'failed') {
      await this.updateJobStatus(jobId, 'FAILED', payload.error);
      return { success: true };
    }

    if (payload.fileMetrics && Array.isArray(payload.fileMetrics)) {
      await this.prisma.fileMetrics.deleteMany({
        where: { repoId: job.repoId }
      });

      const metricsToInsert = payload.fileMetrics.map((fm: any) => ({
        repoId: job.repoId,
        organizationId: job.organizationId,
        filePath: fm.filePath,
        churnCount: fm.churn_count || 0,
        complexity: fm.cyclomatic_complexity || 0,
        authorEntropy: fm.author_entropy || 0,
        bugFixCount: fm.bug_fix_count || 0,
      }));

      if (metricsToInsert.length > 0) {
        await this.prisma.fileMetrics.createMany({
          data: metricsToInsert,
        });
      }
    }

    await this.prisma.repository.update({
      where: { id: job.repoId },
      data: {
        healthScore: payload.metrics?.healthScore || 85,
        lastScannedAt: new Date(),
      },
    });

    await this.updateJobStatus(jobId, 'COMPLETED', undefined, 100);
    return { success: true };
  }

  async getRepositories(organizationId: string) {
    return this.prisma.repository.findMany({
      where: { organizationId },
      orderBy: { lastScannedAt: 'desc' },
      include: {
        analysisJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }

  async getRepositoryDetails(id: string, organizationId: string) {
    const repo = await this.prisma.repository.findFirst({
      where: { id, organizationId },
      include: {
        fileMetrics: {
          orderBy: { complexity: 'desc' },
          take: 100
        },
        analysisJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    if (!repo) throw new NotFoundException(`Repository ${id} not found`);
    return repo;
  }
}
