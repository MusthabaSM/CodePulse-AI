import { Injectable, Logger, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiConsultantService } from '../ai/ai-consultant.service';

@Injectable()
export class BenchmarkingService {
  private readonly logger = new Logger(BenchmarkingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiConsultantService))
    private readonly aiService: AiConsultantService,
  ) {}

  async compareSnapshots(snapshotIdA: string, snapshotIdB: string) {
    this.logger.log(`Comparing snapshots: ${snapshotIdA} vs ${snapshotIdB}`);

    // Fetch snapshots
    const snapshotA = await (this.prisma as any).analysisSnapshot.findUnique({
      where: { id: snapshotIdA },
    });
    const snapshotB = await (this.prisma as any).analysisSnapshot.findUnique({
      where: { id: snapshotIdB },
    });

    if (!snapshotA || !snapshotB) {
      throw new NotFoundException(`One or both snapshots not found in DB.`);
    }

    const deltas = {
      healthScoreDifference: snapshotB.healthScore - snapshotA.healthScore,
      technicalDebtDifference:
        snapshotB.totalDebtHours - snapshotA.totalDebtHours,
      costReduction: snapshotA.maintenanceCost - snapshotB.maintenanceCost, // Positive means savings
      riskReduction: snapshotA.riskScore - snapshotB.riskScore, // Positive means risk lowered
    };

    // Use Gemini to generate an Executive Summary of the comparison
    const prompt = `
      Compare these two repository snapshots:
      Snapshot A (${snapshotA.versionLabel}): Health ${snapshotA.healthScore}/100, Debt ${snapshotA.totalDebtHours}hrs, Cost $${snapshotA.maintenanceCost}/yr.
      Snapshot B (${snapshotB.versionLabel}): Health ${snapshotB.healthScore}/100, Debt ${snapshotB.totalDebtHours}hrs, Cost $${snapshotB.maintenanceCost}/yr.
      
      The refactoring saved $${deltas.costReduction}/yr and reduced debt by ${Math.abs(deltas.technicalDebtDifference)} hours.
      Write a 2-sentence executive summary highlighting the business impact and ROI of these improvements.
    `;

    const executiveSummary = await this.aiService.chat(snapshotA.repoId, [
      { role: 'user', content: prompt },
    ]);

    return {
      snapshotA,
      snapshotB,
      deltas,
      executiveSummary,
    };
  }
}
