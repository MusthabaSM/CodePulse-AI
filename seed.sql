INSERT INTO "Repository" (id, "organizationId", provider, url, owner, name, "healthScore", "createdAt", "updatedAt") 
VALUES ('1240536533', 'undefined', 'GITHUB', 'https://github.com/codepulse/demo-repo', 'codepulse', 'demo-repo', 85.5, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "AnalysisSnapshot" (id, "organizationId", "repoId", "versionLabel", "healthScore", "totalDebtHours", "maintenanceCost", "riskScore", "createdAt") 
VALUES ('snapshot_123', 'undefined', '1240536533', 'v1.0.0', 85.5, 120, 15000, 12.5, NOW())
ON CONFLICT DO NOTHING;
