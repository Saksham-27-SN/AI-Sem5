// scripts/audit_live_tech.js
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
    name: 'live',
    url: 'http://localhost:5173/interview/live',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'live'),
    prefix: 'live',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;
        const html = document.body.innerHTML;

        // 1. Live Room: Absence of 'Full-Duplex' claim
        const hasFullDuplex = /full-duplex/i.test(text) || /full-duplex/i.test(html);

        // 2. Presence of 'Turn-based voice with live transcript'
        const hasTurnBasedVoice = text.includes('Turn-based voice with live transcript');

        // 3. Primary CTA 'Submit Answer' present
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitAnswerButtons = buttons.filter(b => b.innerText.includes('Submit Answer'));
        const hasSubmitAnswerCTA = submitAnswerButtons.length > 0;

        // Additional sanity checks
        const hasAgentBadge = text.includes('Agent Elena');
        const hasQuestionCard = text.includes('Question') || text.includes('Behavioral Simulation');

        return {
          absenceOfFullDuplex: !hasFullDuplex,
          hasFullDuplex,
          presenceOfTurnBasedVoice: hasTurnBasedVoice,
          hasSubmitAnswerCTA,
          submitAnswerButtonCount: submitAnswerButtons.length,
          hasAgentBadge,
          hasQuestionCard,
          passedAllContentCriteria: !hasFullDuplex && hasTurnBasedVoice && hasSubmitAnswerCTA
        };
      });
    }
  },
  {
    name: 'technical',
    url: 'http://localhost:5173/interview/technical',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'technical'),
    prefix: 'technical',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;

        // 1. Code Editor present
        const codeEditor = document.querySelector('textarea[aria-label="Code Editor"]') || document.querySelector('textarea');
        const hasCodeEditor = codeEditor !== null;

        // 2. Language selector present
        const langSelector = document.querySelector('select[aria-label="Select Programming Language"]') || document.querySelector('select');
        const hasLanguageSelector = langSelector !== null;

        // 3. Output / test case panel present
        const hasOutputPanel = text.includes('Test Execution Console') || text.includes('Targeted Test Cases') || text.includes('Test runner ready');

        // 4. Primary CTA 'Submit Solution' present
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitSolutionButtons = buttons.filter(b => b.innerText.includes('Submit Solution'));
        const hasSubmitSolutionCTA = submitSolutionButtons.length > 0;

        return {
          hasCodeEditor,
          hasLanguageSelector,
          hasOutputPanel,
          hasSubmitSolutionCTA,
          submitSolutionButtonCount: submitSolutionButtons.length,
          passedAllContentCriteria: hasCodeEditor && hasLanguageSelector && hasOutputPanel && hasSubmitSolutionCTA
        };
      });
    }
  }
];

async function runAudit() {
  console.log('--- Starting Playwright Multi-Viewport Audit (T-QA-02) ---');
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
        permissions: ['microphone', 'camera']
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
      await page.waitForTimeout(1000); // Allow any layout transitions / web font rendering

      // 1. Evaluate Overflow
      const overflowMetrics = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const maxScrollWidth = Math.max(scrollWidth, bodyScrollWidth);
        const pass = maxScrollWidth <= innerWidth;
        
        // Find elements contributing to overflow if any
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
  const reportPath = path.join(__dirname, '..', 'reports', 'ui-pass', 'T_QA_02_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Detailed report saved to: ${reportPath}`);
  
  return results;
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
