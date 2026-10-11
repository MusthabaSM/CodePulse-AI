import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BusinessMetricsService } from './business-metrics.service';

@Controller('api/repositories')
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
export class RepositoriesController {
  constructor(private readonly businessService: BusinessMetricsService) {}

  @Get(':id/summary')
  async getRepositorySummary(@Param('id') id: string, @Req() req: any) {
    const metrics = await this.businessService.calculateMetrics(id, {
      hourlyRate: 75,
      teamSize: 5,
    });

    if (!metrics || !metrics.repository) {
      throw new NotFoundException('Repository not found or metrics unavailable');
    }

    return {
      id: metrics.repository.id,
      name: metrics.repository.name,
      healthScore: metrics.repository.healthScore,
      technicalDebtHours: metrics.metrics.totalDebtHours,
      maintenanceCost: metrics.metrics.estimatedMaintenanceCost,
      lastAnalysisAt: metrics.repository.lastAnalysisAt || new Date().toISOString(),
    };
  }
}
