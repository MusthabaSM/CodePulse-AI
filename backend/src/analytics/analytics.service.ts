import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SnapshotPeriod } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateSnapshot(organizationId: string, period: SnapshotPeriod = 'DAILY') {
    this.logger.log(`Generating ${period} organization snapshot for ${organizationId}`);

    // Get the most recent snapshot for each repository
    const repos = await this.prisma.repository.findMany({
      where: { organizationId },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const activeRepos = repos.filter(r => r.snapshots.length > 0);
    const totalRepositories = repos.length;

    if (activeRepos.length === 0) {
      return this.prisma.organizationSnapshot.create({
        data: {
          organizationId,
          period,
          totalRepositories,
        },
      });
    }

    let totalDebtHours = 0;
    let totalMaintenanceCost = 0;
    let totalHealthScore = 0;
    let totalRiskIndex = 0;

    let topRiskRepo = activeRepos[0];
    let topCostRepo = activeRepos[0];

    for (const repo of activeRepos) {
      const snap = repo.snapshots[0];
      totalDebtHours += snap.totalDebtHours;
      totalMaintenanceCost += snap.maintenanceCost;
      totalHealthScore += snap.healthScore;
      totalRiskIndex += snap.riskScore;

      if (snap.riskScore > topRiskRepo.snapshots[0].riskScore) {
        topRiskRepo = repo;
      }
      if (snap.maintenanceCost > topCostRepo.snapshots[0].maintenanceCost) {
        topCostRepo = repo;
      }
    }

    const averageHealthScore = totalHealthScore / activeRepos.length;
    const averageRiskIndex = totalRiskIndex / activeRepos.length;

    // We can also count open jobs
    const totalOpenAnalysisJobs = await this.prisma.analysisJob.count({
      where: {
        organizationId,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    // Create the snapshot (using upsert by unique key to prevent duplicates if run multiple times a day)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.prisma.organizationSnapshot.upsert({
      where: {
        organizationId_period_snapshotDate: {
          organizationId,
          period,
          snapshotDate: today,
        },
      },
      update: {
        totalRepositories,
        totalDebtHours,
        totalMaintenanceCost,
        averageHealthScore,
        averageRiskIndex,
        topRiskRepositoryId: topRiskRepo.id,
        topCostRepositoryId: topCostRepo.id,
        totalOpenAnalysisJobs,
      },
      create: {
        organizationId,
        period,
        totalRepositories,
        totalDebtHours,
        totalMaintenanceCost,
        averageHealthScore,
        averageRiskIndex,
        topRiskRepositoryId: topRiskRepo.id,
        topCostRepositoryId: topCostRepo.id,
        totalOpenAnalysisJobs,
        snapshotDate: today,
      },
    });
  }

  async getOrganizationMetrics(organizationId: string) {
    const latestSnapshot = await this.prisma.organizationSnapshot.findFirst({
      where: { organizationId, period: 'DAILY' },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!latestSnapshot) {
      return this.generateSnapshot(organizationId, 'DAILY');
    }
    return latestSnapshot;
  }

  async getHistoricalTrends(organizationId: string, period: SnapshotPeriod) {
    return this.prisma.organizationSnapshot.findMany({
      where: { organizationId, period },
      orderBy: { snapshotDate: 'asc' },
    });
  }

  async getCrossRepositoryInsights(organizationId: string) {
    const repos = await this.prisma.repository.findMany({
      where: { organizationId },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 2, // Take 2 to compare trends
        },
      },
    });

    const activeRepos = repos.filter(r => r.snapshots.length > 0);
    
    if (activeRepos.length === 0) return null;

    let highestRisk = activeRepos[0];
    let mostExpensive = activeRepos[0];
    let fastestImproving: any = null;
    let largestDebtReduction: any = null;

    let maxImprovement = 0;
    let maxDebtReduction = 0;

    for (const repo of activeRepos) {
      const current = repo.snapshots[0];
      const previous = repo.snapshots[1]; // might be undefined

      if (current.riskScore > highestRisk.snapshots[0].riskScore) highestRisk = repo;
      if (current.maintenanceCost > mostExpensive.snapshots[0].maintenanceCost) mostExpensive = repo;

      if (previous) {
        const improvement = current.healthScore - previous.healthScore;
        const debtReduction = previous.totalDebtHours - current.totalDebtHours;

        if (improvement > maxImprovement) {
          maxImprovement = improvement;
          fastestImproving = repo;
        }

        if (debtReduction > maxDebtReduction) {
          maxDebtReduction = debtReduction;
          largestDebtReduction = repo;
        }
      }
    }

    return {
      highestRiskRepository: highestRisk ? { id: highestRisk.id, name: highestRisk.name, score: highestRisk.snapshots[0].riskScore } : null,
      mostExpensiveRepository: mostExpensive ? { id: mostExpensive.id, name: mostExpensive.name, cost: mostExpensive.snapshots[0].maintenanceCost } : null,
      fastestImprovingRepository: fastestImproving ? { id: fastestImproving.id, name: fastestImproving.name, improvement: maxImprovement } : null,
      largestDebtReductionRepository: largestDebtReduction ? { id: largestDebtReduction.id, name: largestDebtReduction.name, reduction: maxDebtReduction } : null,
    };
  }

  async getBenchmarks(organizationId: string) {
    const repos = await this.prisma.repository.findMany({
      where: { organizationId },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const activeRepos = repos.filter(r => r.snapshots.length > 0);
    if (activeRepos.length === 0) return null;

    const tenPercentCount = Math.max(1, Math.floor(activeRepos.length * 0.1));

    const sortedByHealth = [...activeRepos].sort((a, b) => b.snapshots[0].healthScore - a.snapshots[0].healthScore);
    const topHealthiest = sortedByHealth.slice(0, tenPercentCount).map(r => ({ name: r.name, score: r.snapshots[0].healthScore }));

    const sortedByRisk = [...activeRepos].sort((a, b) => b.snapshots[0].riskScore - a.snapshots[0].riskScore);
    const bottomHighestRisk = sortedByRisk.slice(0, tenPercentCount).map(r => ({ name: r.name, risk: r.snapshots[0].riskScore }));

    return {
      top10PercentHealthiest: topHealthiest,
      bottom10PercentHighestRisk: bottomHighestRisk,
    };
  }
}
