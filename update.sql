UPDATE "AnalysisJob" SET status = 'FAILED' WHERE status = 'RUNNING' OR status = 'QUEUED';
