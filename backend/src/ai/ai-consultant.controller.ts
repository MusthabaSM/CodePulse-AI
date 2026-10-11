import { Controller, Post, Body, Param, UseGuards, Get, Inject, Req } from '@nestjs/common';
import { AiConsultantService } from './ai-consultant.service';
import type { ChatMessage, LlmProvider } from './interfaces/llm.provider.interface';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

class ChatRequestDto {
  @IsString()
  @IsOptional()
  repoId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsArray()
  messages: ChatMessage[];
}

@Controller('api/consultant')
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@Roles('manager') // Manager or higher
export class AiConsultantController {
  constructor(
    private readonly aiService: AiConsultantService,
    @Inject('LLM_PROVIDER') private readonly llmProvider: LlmProvider,
  ) {}

  @Get('health')
  @Roles('admin', 'manager', 'viewer')
  async checkHealth() {
    const status = await this.llmProvider.checkHealth();
    return {
      provider: status.providerName,
      mode: status.mode,
      model: status.modelName,
      available: status.isAvailable
    };
  }

  @Post('chat')
  async handleChat(@Body() body: ChatRequestDto, @Req() req: any) {
    try {
      if (body.repoId) {
        const response = await this.aiService.chat(body.repoId, body.messages);
        return { success: true, response };
      } else if (body.organizationId) {
        const realOrganizationId = req.organizationId;
        const response = await this.aiService.organizationChat(realOrganizationId, body.messages);
        return { success: true, response };
      }
      throw new Error('Either repoId or organizationId must be provided');
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'INTERNAL_ERROR',
        retryAfter: error.message === 'RATE_LIMITED' ? 30 : undefined
      };
    }
  }
}
