import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  async generateQuarterlyReport(organizationId: string): Promise<string> {
    this.logger.log(`Generating Quarterly Executive Report for Org: ${organizationId}`);

    const metrics = await this.analyticsService.getOrganizationMetrics(organizationId);
    const insights = await this.analyticsService.getCrossRepositoryInsights(organizationId);
    const benchmarks = await this.analyticsService.getBenchmarks(organizationId);

    const reportContent = `
# Quarterly Engineering Health Report
**Date**: ${new Date().toISOString().split('T')[0]}
**Organization ID**: ${organizationId}

## 1. Executive Summary
- **Organization Health Score**: ${metrics.averageHealthScore.toFixed(1)}/100
- **Total Technical Debt**: ${metrics.totalDebtHours} hours
- **Annual Maintenance Cost**: $${metrics.totalMaintenanceCost.toLocaleString()}
- **Engineering Risk Index**: ${metrics.averageRiskIndex.toFixed(1)}/100
- **Total Active Repositories**: ${metrics.totalRepositories}

## 2. Business Impact & ROI
${insights?.mostExpensiveRepository ? `The most expensive repository to maintain is **${insights.mostExpensiveRepository.name}**, costing an estimated **$${insights.mostExpensiveRepository.cost.toLocaleString()}** annually due to technical debt and complexity.` : 'No cost data available.'}

${insights?.fastestImprovingRepository ? `**${insights.fastestImprovingRepository.name}** showed the fastest improvement in engineering health this quarter.` : ''}
${insights?.largestDebtReductionRepository ? `**${insights.largestDebtReductionRepository.name}** saw the largest reduction in technical debt, saving an estimated $${insights.largestDebtReductionRepository.reduction * 75} in future maintenance.` : ''}

## 3. Risk Assessment
${insights?.highestRiskRepository ? `**CRITICAL**: **${insights.highestRiskRepository.name}** currently holds the highest risk score (${insights.highestRiskRepository.score.toFixed(1)}/100). This repository should be prioritized for refactoring to prevent deployment failures and developer burnout.` : 'No critical risk repositories identified.'}

## 4. Benchmarks
### Top Performers
${benchmarks?.top10PercentHealthiest.map((r: any) => `- ${r.name}: ${r.score.toFixed(1)}/100`).join('\n') || 'N/A'}

### Attention Required
${benchmarks?.bottom10PercentHighestRisk.map((r: any) => `- ${r.name}: ${r.risk.toFixed(1)}/100 Risk`).join('\n') || 'N/A'}

## 5. Strategic Recommendations
1. Focus Q2 technical debt reduction efforts on ${insights?.highestRiskRepository?.name || 'high-risk components'}.
2. Celebrate the team working on ${insights?.fastestImprovingRepository?.name || 'improving repositories'} for their successful refactoring efforts.
3. Review architectural decisions in ${insights?.mostExpensiveRepository?.name || 'expensive repositories'} to reduce the $${metrics.totalMaintenanceCost.toLocaleString()} annual tax on engineering.
    `.trim();

    return reportContent;
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyReports() {
    this.logger.log('Automated Weekly Reporting Triggered');
    // In a real implementation:
    // 1. Fetch all organizations with weekly reporting enabled
    // 2. Generate report using generateQuarterlyReport logic (adapted for weekly)
    // 3. Send via SendGrid or AWS SES
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyReports() {
    this.logger.log('Automated Monthly Reporting Triggered');
    // Same as above, for monthly
  }
}
