import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceService.name);

  // Resolution order: process.env.ANALYSIS_DATA_PATH -> fallback local path
  private get basePath(): string {
    return process.env.ANALYSIS_DATA_PATH || path.join(process.cwd(), '..', 'analysis-engine', 'analyzers');
  }

  private getDynamicPath(repositoryId: string, filename: string): string {
    return path.join(this.basePath, 'dynamic', repositoryId, filename);
  }

  onModuleInit() {
    this.logger.log(`Initializing IntelligenceService. Analysis data path: ${this.basePath}`);
  }

  private safeReadFile(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB limit
    if (stats.size > MAX_SIZE) {
      this.logger.warn(`File ${filePath} is too large to load synchronously (${(stats.size / 1024 / 1024).toFixed(2)} MB). Skipping to prevent event loop block/crash.`);
      return {};
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  constructor(private prisma: PrismaService) {}

  private async getRepoName(repositoryId: string): Promise<string> {
    this.logger.log(`Resolving repo name for ID: ${repositoryId}`);
    const repo = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { name: true }
    });
    if (!repo) {
      this.logger.error(`Repository ${repositoryId} not found in DB!`);
      throw new NotFoundException(`Repository ${repositoryId} not found in database`);
    }
    return repo.name;
  }

  async getEvolutionOverview() {
    throw new Error('Overview not supported for dynamic repository data');
  }

  async getEvolutionByRepository(repositoryId: string) {
    try {
      const repoName = await this.getRepoName(repositoryId);
      const filePath = this.getDynamicPath(repositoryId, 'repository_evolution_report.json');
      const parsed = this.safeReadFile(filePath);
      
      let key = Object.keys(parsed).find(k => k.toLowerCase() === repoName.toLowerCase());
      if (!key) throw new NotFoundException(`Evolution data not found for ${repoName}`);
      return parsed[key];
    } catch (err) {
      this.logger.error(`Failed to read evolution report: ${err.message}`);
      throw new NotFoundException('Evolution report not available for this repository');
    }
  }

  async getEngineeringIntelligenceOverview() {
    throw new Error('Overview not supported for dynamic repository data');
  }

  async getEngineeringIntelligenceByRepository(repositoryId: string) {
    try {
      const repoName = await this.getRepoName(repositoryId);
      const filePath = this.getDynamicPath(repositoryId, 'engineering_intelligence_report.json');
      const parsed = this.safeReadFile(filePath);
      
      let key = Object.keys(parsed).find(k => k.toLowerCase() === repoName.toLowerCase());
      if (!key) throw new NotFoundException(`Engineering intelligence data not found for ${repoName}`);
      return parsed[key];
    } catch (err) {
      this.logger.error(`Failed to read engineering intelligence report: ${err.message}`);
      throw new NotFoundException('Engineering intelligence report not available for this repository');
    }
  }

  async getEngineeringIntelligenceByComponent(repositoryId: string, component: string) {
    const repoData = await this.getEngineeringIntelligenceByRepository(repositoryId);
    if (!repoData[component]) {
      throw new NotFoundException(`Component ${component} not found in repository ${repositoryId}`);
    }
    return repoData[component];
  }

  async getKnowledgeRiskOverview() {
    throw new Error('Overview not supported for dynamic repository data');
  }

  async getKnowledgeRiskByRepository(repositoryId: string) {
    try {
      const repoName = await this.getRepoName(repositoryId);
      const filePath = this.getDynamicPath(repositoryId, 'knowledge_loss_report.json');
      const parsed = this.safeReadFile(filePath);
      
      let key = Object.keys(parsed).find(k => k.toLowerCase() === repoName.toLowerCase());
      if (!key) throw new NotFoundException(`Knowledge risk data not found for ${repoName}`);
      return parsed[key];
    } catch (err) {
      this.logger.error(`Failed to read knowledge risk report: ${err.message}`);
      throw new NotFoundException('Knowledge risk report not available for this repository');
    }
  }

  async getKnowledgeRiskByComponent(repositoryId: string, component: string) {
    const repoData = await this.getKnowledgeRiskByRepository(repositoryId);
    if (!repoData.components || !repoData.components[component]) {
      throw new NotFoundException(`Component ${component} not found in repository ${repositoryId}`);
    }
    return repoData.components[component];
  }

  async getHotspotsOverview() {
    throw new Error('Overview not supported for dynamic repository data');
  }

  async getHotspotsByRepository(repositoryId: string) {
    try {
      const repoName = await this.getRepoName(repositoryId);
      const filePath = this.getDynamicPath(repositoryId, 'architectural_hotspots.json');
      const parsed = this.safeReadFile(filePath);
      
      let key = Object.keys(parsed).find(k => k.toLowerCase() === repoName.toLowerCase());
      if (!key) throw new NotFoundException(`Hotspot data not found for ${repoName}`);
      return parsed[key];
    } catch (err) {
      this.logger.error(`Failed to read hotspot report: ${err.message}`);
      throw new NotFoundException('Hotspot report not available for this repository');
    }
  }

  async getHotspotsByComponent(repositoryId: string, component: string) {
    const repoData = await this.getHotspotsByRepository(repositoryId);
    if (!repoData[component]) {
      throw new NotFoundException(`Component ${component} not found in repository ${repositoryId}`);
    }
    return repoData[component];
  }

  async getCouplingOverview() {
    throw new Error('Overview not supported for dynamic repository data');
  }

  async getCouplingByRepository(repositoryId: string) {
    try {
      const repoName = await this.getRepoName(repositoryId);
      const filePath = this.getDynamicPath(repositoryId, 'temporal_coupling_dashboard.json');
      const parsed = this.safeReadFile(filePath);
      
      let key = Object.keys(parsed).find(k => k.toLowerCase() === repoName.toLowerCase());
      if (!key) throw new NotFoundException(`Coupling data not found for ${repoName}`);
      return parsed[key];
    } catch (err) {
      this.logger.error(`Failed to read coupling report: ${err.message}`);
      throw new NotFoundException('Coupling report not available for this repository');
    }
  }

  async getCouplingByComponent(repositoryId: string, component: string) {
    const repoData = await this.getCouplingByRepository(repositoryId);
    const componentCouplings = (repoData.components || []).filter(
      (c: any) => c.entity_a === component || c.entity_b === component
    );
    return componentCouplings;
  }
}
