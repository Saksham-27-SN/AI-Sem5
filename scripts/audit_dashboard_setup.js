// scripts/audit_dashboard_setup.js
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
    name: 'dashboard',
    url: 'http://localhost:5173/dashboard',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'dashboard'),
    prefix: 'dashboard',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        const html = document.body.innerHTML;
        
        // 1. Verify absence of invented metrics
        const has88Readiness = /88%\s*readiness/i.test(text);
        const hasMockCircle = html.includes('mock-circle') || /stroke-dasharray.*88/i.test(html);
        const hasFakePlus3Stats = /\+3\s*stats/i.test(text);
        
        // 2. Verify clean rendering of EmptyState or real session table
        const hasEmptyState = text.includes('No Interview Sessions Yet') || text.includes('Start your first simulation');
        const hasSessionTable = document.querySelector('table') !== null || text.includes('Completed Simulations');
        
        // 3. Accessibility / Structure checks
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim());
        const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean);

        return {
          has88Readiness,
          hasMockCircle,
          hasFakePlus3Stats,
          inventedMetricsAbsent: !has88Readiness && !hasMockCircle && !hasFakePlus3Stats,
          validDataOrEmptyState: hasEmptyState || hasSessionTable,
          hasEmptyState,
          hasSessionTable,
          headingsCount: headings.length,
          buttonsCount: buttons.length,
        };
      });
    }
  },
  {
    name: 'setup',
    url: 'http://localhost:5173/setup',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'setup'),
    prefix: 'setup',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        
        // 1. Verify visible input labels
        const hasRoleLabel = text.includes('Target Role') || text.includes('TARGET ROLE');
        const hasDomainLabel = text.includes('Primary Domain') || text.includes('PRIMARY DOMAIN');
        const hasDifficultyLabel = text.includes('Difficulty') || text.includes('DIFFICULTY');
        const hasQuestionCountLabel = text.includes('Question Count') || text.includes('QUESTION COUNT');
        const allLabelsVisible = hasRoleLabel && hasDomainLabel && hasDifficultyLabel && hasQuestionCountLabel;
        
        // 2. Verify track selection cards
        const hasHrCard = text.includes('HR & Behavioral');
        const hasTechCard = text.includes('Technical Coding');
        const hasAptitudeCard = text.includes('Aptitude & Logic');
        const hasResumeCard = text.includes('Resume-Tailored');
        const allTrackCardsPresent = hasHrCard && hasTechCard && hasAptitudeCard && hasResumeCard;

        // 3. Verify single primary CTA ('Launch Simulation')
        const buttons = Array.from(document.querySelectorAll('button'));
        const launchButtons = buttons.filter(b => b.innerText.includes('Launch Simulation'));
        const singlePrimaryCTA = launchButtons.length === 1;

        return {
          allLabelsVisible,
          hasRoleLabel,
          hasDomainLabel,
          hasDifficultyLabel,
          hasQuestionCountLabel,
          allTrackCardsPresent,
          hasHrCard,
          hasTechCard,
          hasAptitudeCard,
          hasResumeCard,
          singlePrimaryCTA,
          launchButtonCount: launchButtons.length,
        };
      });
    }
  }
];

async function runAudit() {
  console.log('--- Starting Playwright Multi-Viewport Audit (T-QA-01) ---');
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
      await page.waitForTimeout(1000); // Allow any layout transitions / font rendering

      // 1. Evaluate Overflow
      const overflowMetrics = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const maxScrollWidth = Math.max(scrollWidth, bodyScrollWidth);
        const pass = maxScrollWidth <= innerWidth;
        return {
          scrollWidth: maxScrollWidth,
          innerWidth,
          overflowPx: Math.max(0, maxScrollWidth - innerWidth),
          pass
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

      await context.close();
    }
  }

  await browser.close();

  // Save audit report JSON
  const reportPath = path.join(__dirname, '..', 'reports', 'ui-pass', 'T_QA_01_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Detailed report saved to: ${reportPath}`);
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
