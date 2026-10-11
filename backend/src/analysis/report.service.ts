import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiConsultantService } from '../ai/ai-consultant.service';
import { BusinessMetricsService } from './business-metrics.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiConsultantService,
    private readonly businessMetricsService: BusinessMetricsService,
  ) {}

  async generateExecutiveReport(snapshotId: string, orgId: string) {
    this.logger.log(`Generating Executive Report for snapshot: ${snapshotId}`);

    let snapshot;
    if (snapshotId === 'latest') {
      snapshot = await (this.prisma as any).analysisSnapshot.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      snapshot = await (this.prisma as any).analysisSnapshot.findUnique({
        where: { id: snapshotId },
      });
    }

    if (!snapshot) {
      throw new NotFoundException('No analysis snapshot found');
    }

    // Fetch Business Metrics to get Top ROI Targets
    const businessMetrics = await this.businessMetricsService.calculateMetrics(
      snapshot.repoId,
      { hourlyRate: 75, teamSize: 5 },
    );

    // Ask AI to generate a cohesive Executive Summary and Refactoring Roadmap
    const prompt = `
      Write a formal Executive Summary for a consulting report regarding the software repository '${snapshot.repoId}'.
      Current State: Health Score ${snapshot.healthScore}/100, Est. Annual Maintenance Cost $${snapshot.maintenanceCost.toLocaleString()}, Bug Risk ${snapshot.riskScore}%.
      Include a brief "Refactoring Roadmap" recommending what leadership should prioritize based on reducing technical debt.
      Format: 1 paragraph summary, followed by a bulleted roadmap.
    `;

    const aiInsights = await this.aiService.chat(snapshot.repoId, [
      { role: 'user', content: prompt },
    ]);

    const highRiskFiles = await this.prisma.fileMetrics.findMany({
      where: { repoId: snapshot.repoId, riskScore: { not: null } },
      orderBy: { riskScore: 'desc' },
      take: 5,
      select: { filePath: true, riskScore: true, explanations: true }
    });

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        repoId: snapshot.repoId,
        snapshotId: snapshot.id,
        version: snapshot.versionLabel,
        audience: 'Executive Leadership',
      },
      health: {
        score: snapshot.healthScore,
        grade:
          snapshot.healthScore > 80
            ? 'A'
            : snapshot.healthScore > 60
              ? 'B'
              : 'C',
      },
      businessImpact: {
        annualMaintenanceCost: snapshot.maintenanceCost,
        technicalDebtHours: snapshot.totalDebtHours,
        productivityLoss: businessMetrics.metrics.productivityLossPercent,
      },
      risk: {
        overallRisk: snapshot.riskScore,
        category:
          snapshot.riskScore > 20
            ? 'High'
            : snapshot.riskScore > 10
              ? 'Moderate'
              : 'Low',
      },
      priorities: businessMetrics.metrics.topRoiRefactoringTargets,
      executiveSummary: aiInsights,
      highRiskFiles: highRiskFiles.map(f => ({
        filePath: f.filePath,
        riskScore: f.riskScore ? Math.round(f.riskScore * 100) : 0,
        reason: f.explanations?.[0] || 'High ML Risk'
      })),
    };
  }
}
