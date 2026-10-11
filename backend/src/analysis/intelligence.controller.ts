import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@Controller('api/intelligence')
@UseGuards(ClerkAuthGuard, TenantGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('evolution')
  async getEvolutionOverview() {
    return this.intelligenceService.getEvolutionOverview();
  }

  @Get('evolution/:repositoryId')
  async getEvolutionByRepository(@Param('repositoryId') repositoryId: string) {
    return this.intelligenceService.getEvolutionByRepository(repositoryId);
  }

  @Get('score')
  async getEngineeringIntelligenceOverview() {
    return this.intelligenceService.getEngineeringIntelligenceOverview();
  }

  @Get('score/:repositoryId')
  async getEngineeringIntelligenceByRepository(@Param('repositoryId') repositoryId: string) {
    return this.intelligenceService.getEngineeringIntelligenceByRepository(repositoryId);
  }

  @Get('score/:repositoryId/:component')
  async getEngineeringIntelligenceByComponent(
    @Param('repositoryId') repositoryId: string,
    @Param('component') component: string
  ) {
    return this.intelligenceService.getEngineeringIntelligenceByComponent(repositoryId, component);
  }

  @Get('knowledge-risk')
  async getKnowledgeRiskOverview() {
    return this.intelligenceService.getKnowledgeRiskOverview();
  }

  @Get('knowledge-risk/:repositoryId')
  async getKnowledgeRiskByRepository(@Param('repositoryId') repositoryId: string) {
    return this.intelligenceService.getKnowledgeRiskByRepository(repositoryId);
  }

  @Get('knowledge-risk/:repositoryId/:component')
  async getKnowledgeRiskByComponent(
    @Param('repositoryId') repositoryId: string,
    @Param('component') component: string
  ) {
    return this.intelligenceService.getKnowledgeRiskByComponent(repositoryId, component);
  }

  @Get('hotspots')
  async getHotspotsOverview() {
    return this.intelligenceService.getHotspotsOverview();
  }

  @Get('hotspots/:repositoryId')
  async getHotspotsByRepository(@Param('repositoryId') repositoryId: string) {
    return this.intelligenceService.getHotspotsByRepository(repositoryId);
  }

  @Get('hotspots/:repositoryId/:component')
  async getHotspotsByComponent(
    @Param('repositoryId') repositoryId: string,
    @Param('component') component: string
  ) {
    return this.intelligenceService.getHotspotsByComponent(repositoryId, component);
  }

  @Get('coupling')
  async getCouplingOverview() {
    return this.intelligenceService.getCouplingOverview();
  }

  @Get('coupling/:repositoryId')
  async getCouplingByRepository(@Param('repositoryId') repositoryId: string) {
    return this.intelligenceService.getCouplingByRepository(repositoryId);
  }

  @Get('coupling/:repositoryId/:component')
  async getCouplingByComponent(
    @Param('repositoryId') repositoryId: string,
    @Param('component') component: string
  ) {
    return this.intelligenceService.getCouplingByComponent(repositoryId, component);
  }
}
