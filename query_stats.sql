SELECT COUNT(*) as total_files, COUNT("riskScore") as ml_files, AVG("riskScore") as avg_risk FROM "FileMetrics" WHERE "repoId" = '10489fe8-1dec-4561-b97c-11314025f5ab';
