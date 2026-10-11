SELECT "repoId", "filePath", "riskScore", "confidenceScore" FROM "FileMetrics" WHERE "riskScore" IS NOT NULL LIMIT 5;
