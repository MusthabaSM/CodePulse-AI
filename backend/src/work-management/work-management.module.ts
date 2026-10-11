import { Module } from '@nestjs/common';
import { WorkManagementController } from './work-management.controller';
import { JiraProvider } from './providers/jira.provider';
import { LinearProvider } from './providers/linear.provider';

@Module({
  controllers: [WorkManagementController],
  providers: [JiraProvider, LinearProvider],
  exports: [JiraProvider, LinearProvider],
})
export class WorkManagementModule {}
