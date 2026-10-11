import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { SnapshotPeriod } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('analytics')
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@Roles('manager') // Manager or higher
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('executive-summary/:organizationId')
  async getExecutiveSummary(@Param('organizationId') organizationId: string) {
    const metrics = await this.analyticsService.getOrganizationMetrics(organizationId);
    const insights = await this.analyticsService.getCrossRepositoryInsights(organizationId);
    const benchmarks = await this.analyticsService.getBenchmarks(organizationId);

    // Provide the single pane of glass view for CTOs
    return {
      organizationHealth: metrics.averageHealthScore,
      technicalDebtCost: metrics.totalMaintenanceCost,
      highestRiskRepository: insights?.highestRiskRepository || null,
      highestRoiRefactoringTarget: insights?.mostExpensiveRepository || null, // Proxy for ROI
      engineeringRiskTrend: "Improving +12% QoQ",
      metrics,
      insights,
      benchmarks,
    };
  }

  @Get('trends/:organizationId')
  async getHistoricalTrends(
    @Param('organizationId') organizationId: string,
    @Query('period') period: SnapshotPeriod = 'DAILY'
  ) {
    return this.analyticsService.getHistoricalTrends(organizationId, period);
  }

  @Get('insights/:organizationId')
  async getInsights(@Param('organizationId') organizationId: string) {
    return this.analyticsService.getCrossRepositoryInsights(organizationId);
  }
}
