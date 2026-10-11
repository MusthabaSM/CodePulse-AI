const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("=== API AUDIT ===");
  
  // 1. Get Repositories
  const reposRes = await request('GET', '/api/analysis/repositories');
  console.log("Repositories Status:", reposRes.statusCode);
  const repos = reposRes.body;
  console.log("Found Repositories:", repos.length);
  
  if (repos.length > 0) {
    const repoId = repos[0].id;
    console.log("Targeting Repo:", repoId);
    
    // 2. Trigger Scan
    console.log("Triggering scan...");
    const payload = {
      repositoryId: repoId,
      url: repos[0].url,
      owner: repos[0].owner,
      repo: repos[0].name
    };
    const scanRes = await request('POST', '/api/analysis/trigger', payload);
    console.log("Scan Response:", scanRes.statusCode, JSON.stringify(scanRes.body).slice(0, 100));

    // Wait a bit to see if job status changes
    await new Promise(r => setTimeout(r, 2000));

    // 3. Check Intelligence APIs
    const endpoints = [
      `/api/intelligence/score/${repoId}`,
      `/api/intelligence/knowledge-risk/${repoId}`,
      `/api/intelligence/hotspots/${repoId}`,
      `/api/intelligence/coupling/${repoId}`,
      `/api/intelligence/evolution/${repoId}`
    ];
    
    for (const ep of endpoints) {
      const res = await request('GET', ep);
      console.log(`Endpoint ${ep}:`, res.statusCode, "Payload size:", JSON.stringify(res.body).length);
    }
  }
}

runAudit().catch(console.error);
