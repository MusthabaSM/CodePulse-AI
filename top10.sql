SELECT
    f."filePath",
    f."complexity",
    f."churnCount",
    f."bugFixCount",
    f."authorEntropy",
    f."explanations"[1] as explanation
FROM
    "FileMetrics" f
JOIN
    "Repository" r ON f."repoId" = r.id
WHERE
    r.name = 'DecisionLens'
ORDER BY
    f."churnCount" DESC, f."bugFixCount" DESC
LIMIT 10;
