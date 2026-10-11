import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalysisController } from './analysis.controller';
import { RepositoriesController } from './repositories.controller';
import { AnalysisService } from './analysis.service';
import { BusinessMetricsService } from './business-metrics.service';
import { BenchmarkingService } from './benchmarking.service';
import { ReportService } from './report.service';
import { AnalysisProcessor } from './analysis.processor';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { VcsModule } from '../vcs/vcs.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analysis-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    }),
    forwardRef(() => VcsModule), 
    forwardRef(() => AiModule)
  ],
  controllers: [AnalysisController, RepositoriesController, IntelligenceController],
  providers: [
    AnalysisService,
    BusinessMetricsService,
    BenchmarkingService,
    ReportService,
    AnalysisProcessor,
    IntelligenceService,
  ],
  exports: [
    AnalysisService,
    BusinessMetricsService,
    BenchmarkingService,
    ReportService,
    IntelligenceService,
  ],
})
export class AnalysisModule {}
