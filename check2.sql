SELECT "repoId", r.name FROM "FileMetrics" f JOIN "Repository" r ON f."repoId" = r.id WHERE "filePath" = 'frontend/src/pages/DecisionExplorer.tsx' ORDER BY f.id DESC LIMIT 5;
