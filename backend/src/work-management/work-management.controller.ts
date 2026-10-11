import { Controller, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { WorkItemRequest } from './interfaces/work-management.provider.interface';
import { JiraProvider } from './providers/jira.provider';
import { LinearProvider } from './providers/linear.provider';

@Controller('api/work-management')
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@Roles('manager') // Manager or higher to create tickets
export class WorkManagementController {
  constructor(
    private readonly jiraProvider: JiraProvider,
    private readonly linearProvider: LinearProvider,
  ) {}

  @Post('issue')
  async createIssue(
    @Query('provider') provider: string = 'jira',
    @Body() request: WorkItemRequest,
  ) {
    if (provider.toLowerCase() === 'linear') {
      return this.linearProvider.createWorkItem(request);
    }
    // Default to Jira
    return this.jiraProvider.createWorkItem(request);
  }
}
