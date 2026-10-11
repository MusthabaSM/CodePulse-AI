import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import type { ChatMessage, LlmProvider } from './interfaces/llm.provider.interface';
import { BusinessMetricsService } from '../analysis/business-metrics.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AiConsultantService {
  private readonly logger = new Logger(AiConsultantService.name);

  // In the future, we can inject LlmProvider via an IoC token to easily swap to ClaudeProvider.
  // For MVP, we instantiate the GeminiProvider directly.
  constructor(
    @Inject('LLM_PROVIDER')
    private readonly llmProvider: LlmProvider,
    @Inject(forwardRef(() => BusinessMetricsService))
    private readonly businessMetricsService: BusinessMetricsService,
    @Inject(forwardRef(() => AnalysisService))
    private readonly analysisService: AnalysisService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async chat(repoId: string, conversation: ChatMessage[]): Promise<string> {
    this.logger.log(`Handling chat request for repo: ${repoId}`);

    // Fetch context
    const businessMetrics = await this.businessMetricsService.calculateMetrics(
      repoId,
      { hourlyRate: 75, teamSize: 5 },
    );

    this.logger.log(`[DEBUG] repository lookup result for repoId ${repoId}: ${JSON.stringify(businessMetrics.repository)}`);
    this.logger.log(`[DEBUG] generated metrics payload: ${JSON.stringify(businessMetrics.metrics)}`);

    // In a real implementation, we'd also fetch specific technical debt scores and health trends.
    // We serialize the metrics into a clear text prompt for the LLM.
    const systemPrompt = this.buildSystemPrompt(businessMetrics);
    
    this.logger.log(`[DEBUG] generated system prompt:\n${systemPrompt}`);

    // Call LLM
    const response = await this.llmProvider.generateResponse(
      systemPrompt,
      conversation,
    );

    return response;
  }

  async organizationChat(organizationId: string, conversation: ChatMessage[]): Promise<string> {
    this.logger.log(`Handling organization chat request for org: ${organizationId}`);

    // Context Builder Layer
    const orgMetrics = await this.analyticsService.getOrganizationMetrics(organizationId);
    const benchmarks = await this.analyticsService.getBenchmarks(organizationId);
    const insights = await this.analyticsService.getCrossRepositoryInsights(organizationId);

    const systemPrompt = this.buildOrganizationSystemPrompt(orgMetrics, benchmarks, insights);

    // Call LLM
    const response = await this.llmProvider.generateResponse(
      systemPrompt,
      conversation,
    );

    return response;
  }

  private buildSystemPrompt(businessMetrics: any): string {
    const { repository, metrics } = businessMetrics;
    const topTargets = metrics.topRoiRefactoringTargets
      .map(
        (t: any) => `
${t.filePath}
Risk: ${t.riskLevel}
Complexity: ${t.complexity}
Churn: ${t.churnCount}
Bug Fixes: ${t.bugFixCount}
Author Entropy: ${t.authorEntropy}
Debt Hours: ${t.debtHours}
Annual Savings: $${t.annualSavings}

Top Risk Factors:
${t.topRiskFactors.map((rf: string) => `* ${rf}`).join('\n')}

ML Explanation:
${t.executiveSummary}
`
      )
      .join('\n');

    return `
You are CodePulse AI, a Senior Engineering Consultant and CTO Advisor.
You are analyzing a software repository to provide actionable advice to Engineering Managers and Executives.

CURRENT REPOSITORY CONTEXT:
- Repository Name: ${repository?.name || 'Unknown'}
- Repository Owner: ${repository?.owner || 'Unknown'}
- Health Score: ${repository?.healthScore || 0}/100
- Estimated Maintenance Cost: $${metrics.estimatedMaintenanceCost.toLocaleString()}/yr
- Total Technical Debt: ${metrics.totalDebtHours} hours
- Productivity Loss: ${metrics.productivityLossPercent}%
- Release Risk: ${metrics.releaseRiskPercent}%

TOP REFACTORING TARGETS (High ROI):
${topTargets}

INSTRUCTIONS:
1. Answer the user's questions professionally, using the provided data to back up your claims.
2. Focus on business impact, risk assessment, and actionable engineering priorities.
3. Be concise and authoritative. 
4. Do not list out raw metrics blindly; interpret them for an executive audience.
5. Explain why a file is risky, which factors contributed most, which file should be fixed first, expected business impact, and refactoring priority.
    `.trim();
  }

  private buildOrganizationSystemPrompt(orgMetrics: any, benchmarks: any, insights: any): string {
    const topHealthiest = benchmarks?.top10PercentHealthiest.map((r: any) => `- ${r.name}: ${r.score.toFixed(1)}`).join('\n') || 'None';
    const bottomRisk = benchmarks?.bottom10PercentHighestRisk.map((r: any) => `- ${r.name}: ${r.risk.toFixed(1)}`).join('\n') || 'None';

    return `
You are CodePulse AI, an Executive Engineering Consultant and CTO Advisor.
You are analyzing an entire organization's engineering portfolio to provide strategic advice.

LEVEL 1: ORGANIZATION METRICS
- Total Repositories: ${orgMetrics.totalRepositories}
- Total Technical Debt: ${orgMetrics.totalDebtHours} hours
- Annual Maintenance Cost: $${orgMetrics.totalMaintenanceCost.toLocaleString()}
- Average Health Score: ${orgMetrics.averageHealthScore.toFixed(1)}/100
- Average Risk Index: ${orgMetrics.averageRiskIndex.toFixed(1)}/100
- Total Open Analysis Jobs: ${orgMetrics.totalOpenAnalysisJobs}

LEVEL 2: REPOSITORY BENCHMARKS
Top 10% Healthiest:
${topHealthiest}

Bottom 10% Highest Risk:
${bottomRisk}

LEVEL 3: CROSS-REPOSITORY INSIGHTS
- Highest Risk Repository: ${insights?.highestRiskRepository?.name || 'N/A'} (Score: ${insights?.highestRiskRepository?.score?.toFixed(1) || 'N/A'})
- Most Expensive Repository: ${insights?.mostExpensiveRepository?.name || 'N/A'} (Cost: $${insights?.mostExpensiveRepository?.cost?.toLocaleString() || 'N/A'})
- Fastest Improving Repository: ${insights?.fastestImprovingRepository?.name || 'N/A'}
- Largest Debt Reduction: ${insights?.largestDebtReductionRepository?.name || 'N/A'}

INSTRUCTIONS:
1. Answer the user's questions professionally, focusing on executive-level strategy, resource allocation, and risk management.
2. Use the summarized intelligence above to back up recommendations. Do NOT ask the user for specific repository details unless absolutely necessary.
3. If asked where to focus engineering effort, prioritize the 'Highest Risk' and 'Most Expensive' repositories.
4. Be concise, authoritative, and business-focused.
    `.trim();
  }
}
