// scripts/audit_results_analytics.js
const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080, scale: 1, isMobile: false, fileSuffix: '1920' },
  { name: '1280x800', width: 1280, height: 800, scale: 1, isMobile: false, fileSuffix: '1280' },
  { name: '1024x768', width: 1024, height: 768, scale: 1, isMobile: false, fileSuffix: '1024' },
  { name: '390x844', width: 390, height: 844, scale: 1, isMobile: true, fileSuffix: '390' },
  { name: '1280x800_zoom125', width: 1280, height: 800, scale: 1.25, isMobile: false, fileSuffix: 'zoom125' },
];

const ROUTES = [
  {
    name: 'results',
    url: 'http://localhost:5173/results',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'results'),
    prefix: 'results',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        const html = document.body.innerHTML;

        // 1. Absence of 94% offer rate increase or invented stats
        const has94OfferRate = /94%/i.test(text) || /offer rate/i.test(text);
        const hasInventedStats = /\+3\s*stats/i.test(text) || /88%\s*readiness/i.test(text);
        const absenceOfInventedClaims = !has94OfferRate && !hasInventedStats;

        // 2. Absence of 'Full-Duplex' claim
        const hasFullDuplex = /full-duplex/i.test(text) || /full-duplex/i.test(html);

        // 3. Clean EmptyState or genuine rubric cards rendered
        const hasEmptyState = text.includes('No Evaluation Report Found') || text.includes('Start Practice');
        const hasRubricCards = text.includes('Rubric Dimension Breakdown') || text.includes('Candidate Performance Debrief');
        const cleanStateRendered = hasEmptyState || hasRubricCards;

        return {
          absenceOfInventedClaims,
          has94OfferRate,
          hasInventedStats,
          absenceOfFullDuplex: !hasFullDuplex,
          hasFullDuplex,
          cleanStateRendered,
          hasEmptyState,
          hasRubricCards,
          passedAllContentCriteria: absenceOfInventedClaims && !hasFullDuplex && cleanStateRendered
        };
      });
    }
  },
  {
    name: 'analytics',
    url: 'http://localhost:5173/analytics',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'analytics'),
    prefix: 'analytics',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        const html = document.body.innerHTML;

        // 1. Absence of 94% offer rate increase or invented stats
        const has94OfferRate = /94%/i.test(text) || /offer rate/i.test(text);
        const hasInventedStats = /\+3\s*stats/i.test(text) || /88%\s*readiness/i.test(text);
        const absenceOfInventedClaims = !has94OfferRate && !hasInventedStats;

        // 2. Absence of 'Full-Duplex' claim
        const hasFullDuplex = /full-duplex/i.test(text) || /full-duplex/i.test(html);

        // 3. Clean EmptyState or genuine rubric cards/KPIs rendered
        const hasEmptyState = text.includes('No Analytics Data Available') || text.includes('Complete your first interview simulation');
        const hasAnalyticsDashboard = text.includes('Performance Analytics') && (text.includes('Average Score') || text.includes('Simulations Completed'));
        const cleanStateRendered = hasEmptyState || hasAnalyticsDashboard;

        return {
          absenceOfInventedClaims,
          has94OfferRate,
          hasInventedStats,
          absenceOfFullDuplex: !hasFullDuplex,
          hasFullDuplex,
          cleanStateRendered,
          hasEmptyState,
          hasAnalyticsDashboard,
          passedAllContentCriteria: absenceOfInventedClaims && !hasFullDuplex && cleanStateRendered
        };
      });
    }
  }
];

async function runAudit() {
  console.log('--- Starting Playwright Multi-Viewport Audit (T-QA-04) ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];

  for (const route of ROUTES) {
    if (!fs.existsSync(route.dir)) {
      fs.mkdirSync(route.dir, { recursive: true });
    }

    console.log(`\nAuditing route: ${route.name} (${route.url})`);

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.scale,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });

      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      // Navigate to target route
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000); // Allow render settlement

      // 1. Evaluate Overflow
      const overflowMetrics = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const maxScrollWidth = Math.max(scrollWidth, bodyScrollWidth);
        const pass = maxScrollWidth <= innerWidth;
        
        let overflowingElements = [];
        if (!pass) {
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerWidth) {
              overflowingElements.push({
                tag: el.tagName,
                className: el.className ? (typeof el.className === 'string' ? el.className.slice(0, 80) : '') : '',
                id: el.id,
                right: rect.right,
                width: rect.width
              });
              if (overflowingElements.length >= 5) break;
            }
          }
        }

        return {
          scrollWidth: maxScrollWidth,
          innerWidth,
          overflowPx: Math.max(0, maxScrollWidth - innerWidth),
          pass,
          overflowingElements
        };
      });

      // 2. Verify Content Requirements
      const contentCheck = await route.verifyContent(page);

      // 3. Capture Screenshot
      const screenshotFileName = `${route.prefix}_${vp.fileSuffix}.png`;
      const screenshotPath = path.join(route.dir, screenshotFileName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Check file size
      const stats = fs.statSync(screenshotPath);

      const auditRecord = {
        route: route.name,
        url: route.url,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.scale,
        isMobile: vp.isMobile,
        overflow: overflowMetrics,
        consoleErrorsCount: consoleErrors.length,
        consoleErrors,
        pageErrorsCount: pageErrors.length,
        pageErrors,
        contentCheck,
        screenshotFile: screenshotFileName,
        screenshotPath: screenshotPath.replace(/\\/g, '/'),
        fileSizeBytes: stats.size,
      };

      results.push(auditRecord);
      console.log(`  [${vp.name}] Overflow: ${overflowMetrics.pass ? 'PASS' : 'FAIL'} (scrollWidth: ${overflowMetrics.scrollWidth}, innerWidth: ${overflowMetrics.innerWidth}) | Fatal Errors: ${pageErrors.length} | Screenshot: ${screenshotFileName} (${stats.size} bytes)`);
      if (!overflowMetrics.pass) {
        console.log(`    -> Overflowing elements:`, JSON.stringify(overflowMetrics.overflowingElements));
      }
      if (!contentCheck.passedAllContentCriteria) {
        console.log(`    -> Content verification FAIL:`, JSON.stringify(contentCheck));
      }

      await context.close();
    }
  }

  await browser.close();

  // Save audit report JSON
  const reportPath = path.join(__dirname, '..', 'reports', 'ui-pass', 'T_QA_04_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Detailed report saved to: ${reportPath}`);
  
  return results;
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
