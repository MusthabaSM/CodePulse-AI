import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Processor('analysis-queue')
@Injectable()
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);
  private readonly pythonEngineUrl = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.data.jobId} for repo ${job.data.url}`);

    try {
      // 1. Start Analysis on Python Engine
      const startRes = await axios.post(`${this.pythonEngineUrl}/internal/analyze_async`, {
        jobId: job.data.jobId,
        url: job.data.url,
        owner: job.data.owner,
        repo: job.data.repo,
        repositoryId: job.data.repoId,
      });

      if (startRes.status !== 202 && startRes.status !== 200) {
        throw new Error(`Failed to start analysis: ${startRes.statusText}`);
      }

      await job.updateProgress(5); // Started

      // 2. Poll for Progress
      let isCompleted = false;
      let finalResult: any = null;

      while (!isCompleted) {
        // Wait 1 second between polls
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusRes = await axios.get(`${this.pythonEngineUrl}/internal/status/${job.data.jobId}`);
        const statusData = statusRes.data;

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Analysis failed in Python engine');
        }
        if (statusData.status === 'not_found') {
          throw new Error('Analysis job was lost by Python engine');
        }

        if (statusData.progress) {
          await job.updateProgress(statusData.progress);
          // Also persist it to the DB so the frontend can read it
          await this.updateJobStatus(job.data.jobId, 'RUNNING', undefined, statusData.progress);
        }

        if (statusData.status === 'completed') {
          isCompleted = true;
          finalResult = statusData.result;
        }
      }

      // 3. Persist Results
      await this.persistResults(job.data, finalResult);

      return { success: true, healthScore: finalResult?.metrics?.healthScore || 0 };

    } catch (error) {
      this.logger.error(`Job ${job.data.jobId} failed: ${error.message}`);
      await this.updateJobStatus(job.data.jobId, 'FAILED', error.message);
      throw error;
    }
  }

  private async persistResults(jobData: any, payload: any) {
    if (payload.isIncremental) {
      // Only delete metrics for files that were re-analyzed
      const updatedFiles = payload.fileMetrics.map((fm: any) => fm.filePath);
      if (updatedFiles.length > 0) {
        await this.prisma.fileMetrics.deleteMany({
          where: { repoId: jobData.repoId, filePath: { in: updatedFiles } }
        });
      }
    } else {
      // Full scan: delete all old metrics
      await this.prisma.fileMetrics.deleteMany({
        where: { repoId: jobData.repoId }
      });
    }

    const metricsToInsert = payload.fileMetrics.map((fm: any) => ({
      repoId: jobData.repoId,
      organizationId: jobData.organizationId,
      filePath: fm.filePath,
      churnCount: fm.churn_count || 0,
      complexity: fm.cyclomatic_complexity || 0,
      authorEntropy: fm.author_entropy || 0,
      bugFixCount: fm.bug_fix_count || 0,
      explanations: fm.explanations || [],
      riskScore: fm.bugPrediction?.riskScore || null,
      confidenceScore: fm.bugPrediction?.confidenceScore || null,
    }));

    if (metricsToInsert.length > 0) {
      await this.prisma.fileMetrics.createMany({
        data: metricsToInsert,
      });
    }

    await this.prisma.repository.update({
      where: { id: jobData.repoId },
      data: {
        healthScore: payload.metrics?.healthScore || 85,
        lastScannedAt: new Date(),
        lastAnalysisAt: new Date(),
        // lastCommitHash is updated if provided
        ...(payload.lastCommitHash && { lastCommitHash: payload.lastCommitHash }),
      },
    });

    await this.updateJobStatus(jobData.jobId, 'COMPLETED', undefined, 100);
  }

  private async updateJobStatus(jobId: string, status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED', error?: string, progress?: number) {
    const updateData: any = { status };
    if (error) updateData.error = error;
    if (progress !== undefined) updateData.progress = progress;
    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completedAt = new Date();
    }

    try {
      await this.prisma.analysisJob.update({
        where: { id: jobId },
        data: updateData,
      });
    } catch (e) {
      this.logger.warn(`Could not update AnalysisJob ${jobId} in DB: ${e.message}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.data.jobId} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.data.jobId} has failed: ${error.message}`);
  }
}
