const puppeteer = require('puppeteer');
const fs = require('fs');

async function runAudit() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const results = {
    repositoryContext: {},
    pages: []
  };

  const pagesToVisit = [
    '/engineering-intelligence',
    '/architectural-hotspots',
    '/temporal-coupling',
    '/repository-evolution'
  ];

  const pageObj = await browser.newPage();
  
  // Inject Clerk Mock so API client sends test-token
  await pageObj.evaluateOnNewDocument(() => {
    window.Clerk = {
      session: {
        getToken: async () => 'test-token'
      }
    };
  });
  
  await pageObj.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  // Wait for repository fetch to complete
  await new Promise(r => setTimeout(r, 2000));

  // Set the selectedRepositoryId to the first available repo, or 1263997494
  await pageObj.evaluate(() => {
    let repos = [];
    try {
      repos = JSON.parse(localStorage.getItem('repositories') || '[]');
    } catch(e) {}
    if (repos.length > 0) {
      localStorage.setItem('selectedRepositoryId', repos[0].id);
    } else {
      localStorage.setItem('selectedRepositoryId', '1263997494');
    }
  });

  const contextData = await pageObj.evaluate(() => {
    return {
      selectedRepositoryId: localStorage.getItem('selectedRepositoryId') || null,
      repositoriesInStorage: localStorage.getItem('repositories') ? JSON.parse(localStorage.getItem('repositories')).length : 1
    };
  });
  
  results.repositoryContext = {
    selectedRepositoryId: contextData.selectedRepositoryId,
    repositoryCount: contextData.repositoriesInStorage,
    repositoryFetchStatus: contextData.repositoriesInStorage > 0 ? "SUCCESS" : "EMPTY"
  };

  for (const path of pagesToVisit) {
    console.log(`Auditing ${path}...`);
    const p = await browser.newPage();
    let apiSent = false;
    let requestUrl = null;
    let responseStatus = null;
    let payloadSize = 0;
    
    await p.evaluateOnNewDocument(() => {
      window.Clerk = {
        session: {
          getToken: async () => 'test-token'
        }
      };
    });

    p.on('request', req => {
      if (req.url().includes('/api/intelligence') || req.url().includes('/api/analysis')) {
        apiSent = true;
        requestUrl = req.url();
      }
    });

    p.on('response', async res => {
      if (res.url().includes('/api/intelligence') || res.url().includes('/api/analysis')) {
        responseStatus = res.status();
        try {
          const buffer = await res.buffer();
          payloadSize = buffer.length;
        } catch (e) {}
      }
    });

    await p.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    
    await new Promise(r => setTimeout(r, 4000));

    const domStats = await p.evaluate(() => {
      const text = document.body.innerText;
      const widgetsMounted = document.querySelectorAll('.widget, [class*="card"], [class*="widget"], [class*="metric"], [class*="glass-panel"]').length > 0;
      const failedToLoad = text.includes('Failed to load') || text.includes('error') || text.includes('404');
      const dataRendered = !failedToLoad && widgetsMounted && text.length > 300; 
      return {
        widgetsMounted,
        dataRendered,
        dataRenderedCount: document.querySelectorAll('[class*="metric"], [class*="value"], [class*="chart"]').length,
        rawTextLength: text.length
      };
    });

    results.pages.push({
      path,
      apiSent,
      requestUrl,
      responseStatus,
      payloadSize,
      widgetsMounted: domStats.widgetsMounted,
      dataRendered: domStats.dataRendered,
      dataRenderedCount: domStats.dataRenderedCount,
      classification: !apiSent ? "C) No API Requests Sent" : 
                      (responseStatus >= 400 ? "D) API Failures" : 
                      (domStats.dataRendered ? "A) Live Data Rendered" : "B) API Data Received But Not Rendered"))
    });
    
    await p.close();
  }

  await browser.close();
  
  fs.writeFileSync('phase16_runtime_reality_audit.json', JSON.stringify(results, null, 2));
  console.log('Audit completed. Results saved to phase16_runtime_reality_audit.json');
  process.exit(0);
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
