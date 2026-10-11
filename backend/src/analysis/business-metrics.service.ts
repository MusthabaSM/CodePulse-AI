import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BusinessConfig {
  hourlyRate: number;
  teamSize: number;
}

@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Translates abstract technical metrics into executive financial figures.
   */
  async calculateMetrics(repoId: string, config: BusinessConfig) {
    const { hourlyRate, teamSize } = config;

    let files: any[] = [];
    let repository: any = null;

    if (repoId === 'global' || !repoId) {
      files = await this.prisma.fileMetrics.findMany();
      repository = { name: 'Global Portfolio', owner: 'Multiple', healthScore: 0, id: 'global' };
    } else {
      files = await this.prisma.fileMetrics.findMany({
        where: { repoId },
      });
      repository = await this.prisma.repository.findUnique({
        where: { id: repoId }
      });
    }

    if (!repository && repoId !== 'global') {
      repository = { name: 'Unknown Repository', owner: 'Unknown', healthScore: 0, id: repoId };
    }

    let totalDebtHours = 0;
    const refactoringTargets: Array<{
      filePath: string;
      roiScore: number;
      costToFix: number;
      annualSavings: number;
      executiveSummary: string;
      riskLevel: string;
      complexity: number;
      churnCount: number;
      bugFixCount: number;
      authorEntropy: number;
      debtHours: number;
      mlExplanations: string[];
      topRiskFactors: string[];
    }> = [];

    files.forEach((file) => {
      const cc = file.complexity || 1;
      const churn = file.churnCount || 0;
      let debtHours = cc * 0.5;

      if (file.authorEntropy && file.authorEntropy > 2.0) {
        debtHours *= 1.2; 
      }
      totalDebtHours += debtHours;

      const roiScore = (debtHours * churn) / 10;

      if (roiScore > 5 || file.riskLevel === 'High') {
        const costToFix = debtHours * hourlyRate;
        const annualSavings = costToFix * 2.5;
        
        const mlExplanations = file.explanations || [];
        const topRiskFactors = mlExplanations.map((e: string) => {
          if (e.includes('Cyclomatic Complexity') || e.includes('Complexity')) return 'Cyclomatic Complexity';
          if (e.includes('High Churn') || e.includes('frequent')) return 'High Churn';
          if (e.includes('Bug') || e.includes('bug')) return 'Historical Bug Fixes';
          if (e.includes('Entropy') || e.includes('contributors')) return 'Author Entropy';
          return null;
        }).filter((v: string | null) => v !== null) as string[];

        // Unique risk factors
        const uniqueRiskFactors = Array.from(new Set(topRiskFactors));

        if (uniqueRiskFactors.length === 0) {
           if (cc > 15) uniqueRiskFactors.push('Cyclomatic Complexity');
           if (churn > 5) uniqueRiskFactors.push('High Churn');
        }

        const executiveSummary = mlExplanations.length > 0 
           ? mlExplanations.join(' ')
           : `This module combines high complexity (${cc}) with frequent modifications (${churn} times). Rewriting it will save an estimated $${Math.round(annualSavings).toLocaleString()} annually in debugging time.`;

        refactoringTargets.push({
          filePath: file.filePath,
          roiScore: Math.round(roiScore * 10) / 10,
          costToFix: Math.round(costToFix),
          annualSavings: Math.round(annualSavings),
          executiveSummary,
          riskLevel: file.riskLevel || 'Medium',
          complexity: cc,
          churnCount: churn,
          bugFixCount: file.bugFixCount || 0,
          authorEntropy: file.authorEntropy || 0,
          debtHours: Math.round(debtHours),
          mlExplanations,
          topRiskFactors: uniqueRiskFactors
        });
      }
    });

    const estimatedMaintenanceCost = totalDebtHours * hourlyRate;
    const totalTeamHours = teamSize * 2000;
    const productivityLossPercent = Math.min(
      (totalDebtHours / totalTeamHours) * 100,
      100,
    );

    const highRiskFiles = files.filter(f => f.riskLevel === 'High' || f.complexity > 20 || f.churnCount > 10).length;
    const releaseRiskPercent = files.length > 0 ? (highRiskFiles / files.length) * 100 : 0;

    refactoringTargets.sort((a, b) => b.roiScore - a.roiScore);

    return {
      repository: {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        healthScore: repository.healthScore || 0,
        lastAnalysisAt: repository.lastAnalysisAt || null,
      },
      assumptions: {
        hourlyRate,
        teamSize,
        disclaimer: `Estimated using $${hourlyRate}/hour developer rate across a team of ${teamSize}`,
      },
      metrics: {
        totalDebtHours: Math.round(totalDebtHours),
        estimatedMaintenanceCost: Math.round(estimatedMaintenanceCost),
        productivityLossPercent: Math.round(productivityLossPercent * 10) / 10,
        releaseRiskPercent: Math.round(releaseRiskPercent * 10) / 10,
        topRoiRefactoringTargets: refactoringTargets.slice(0, 10), // Top 10
      },
    };
  }
}
