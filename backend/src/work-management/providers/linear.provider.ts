import { Injectable, Logger } from '@nestjs/common';
import { WorkManagementProvider, WorkItemRequest, WorkItemResponse } from '../interfaces/work-management.provider.interface';

@Injectable()
export class LinearProvider implements WorkManagementProvider {
  private readonly logger = new Logger(LinearProvider.name);

  async createWorkItem(request: WorkItemRequest): Promise<WorkItemResponse> {
    this.logger.log(`Creating Linear ${request.type}: ${request.title}`);
    
    // In a real implementation, we would use the Linear GraphQL API
    // e.g. POST https://api.linear.app/graphql

    const id = `LIN-${Math.random().toString(36).substring(7).toUpperCase()}`;

    return {
      id,
      url: `https://linear.app/org/issue/${id}`,
      key: id,
      status: 'created',
    };
  }
}
