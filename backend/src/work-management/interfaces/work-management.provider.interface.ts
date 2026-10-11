export interface WorkItemRequest {
  title: string;
  description: string;
  type: 'epic' | 'story' | 'task';
  metadata?: Record<string, any>;
}

export interface WorkItemResponse {
  id: string;
  url: string;
  key?: string;
  status: string;
}

export interface WorkManagementProvider {
  createWorkItem(request: WorkItemRequest): Promise<WorkItemResponse>;
}
