const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Extracting dimensions...');
    const dimensions = await page.evaluate(() => {
      const getMetrics = (selectorOrEl) => {
        const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
        if (!el) return null;
        return {
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          offsetWidth: el.offsetWidth,
          renderedWidth: el.getBoundingClientRect().width
        };
      };

      // Best effort selectors based on class names
      return {
        Viewport: { width: window.innerWidth, height: window.innerHeight },
        Body: getMetrics('body'),
        Sidebar: getMetrics('[class*="Sidebar_sidebar"]'),
        DashboardLayout: getMetrics('[class*="DashboardLayout_layoutWrapper"]'),
        MainContent: getMetrics('[class*="DashboardLayout_mainContent"]'),
        EngineeringIntelligenceWidget: (() => {
          const els = Array.from(document.querySelectorAll('h2'));
          const h2 = els.find(e => e.innerText.includes("Engineering Intelligence"));
          return h2 ? getMetrics(h2.parentElement) : null;
        })(),
        // Using generic glass-panel search since CSS modules obfuscate class names somewhat,
        // but we know it's rendered as glass-panel or similar, let's find by text
        widgets: Array.from(document.querySelectorAll('.glass-panel')).map(el => {
          const title = el.querySelector('h2')?.innerText || 'Unknown';
          return {
            title,
            metrics: {
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
              renderedWidth: el.getBoundingClientRect().width
            }
          };
        })
      };
    });

    console.log('Dimensions extracted:', dimensions);
    
    const rootCause = {
      timestamp: new Date().toISOString(),
      measurements: dimensions,
      analysis: {
        cause: dimensions.Body && dimensions.Body.scrollWidth > dimensions.Viewport.width ? 'A) Sidebar layout causing horizontal overflow due to margin-left + flex:1' : 'B) Grid layout constraint',
        overflowDetected: dimensions.Body && dimensions.Body.scrollWidth > dimensions.Viewport.width
      }
    };
    
    fs.writeFileSync('ui_overflow_root_cause.json', JSON.stringify(rootCause, null, 2));
    console.log('Saved ui_overflow_root_cause.json');
    
    // Take before screenshots
    const resolutions = [1920, 1440, 1280, 1024];
    for (const res of resolutions) {
      await page.setViewport({ width: res, height: 1080 });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: `before_${res}.png` });
      console.log(`Saved before_${res}.png`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
