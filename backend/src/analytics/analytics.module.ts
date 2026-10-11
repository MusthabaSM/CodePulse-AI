import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [PrismaModule],
  providers: [AnalyticsService, ReportingService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, ReportingService],
})
export class AnalyticsModule {}
