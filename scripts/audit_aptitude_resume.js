// scripts/audit_aptitude_resume.js
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
    name: 'aptitude',
    url: 'http://localhost:5173/interview/aptitude',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'aptitude'),
    prefix: 'aptitude',
    verifyContent: async (page) => {
      // Wait for questions to load from API
      try {
        await page.waitForSelector('[role="radio"]', { timeout: 8000 });
      } catch (e) {
        console.warn('Timed out waiting for radio options on aptitude page:', e.message);
      }

      return await page.evaluate(() => {
        const text = document.body.innerText;

        // 1. Option selection cards
        const optionCards = Array.from(document.querySelectorAll('[role="radio"]'));
        const hasOptionSelectionCards = optionCards.length >= 4;

        // 2. Timer pill
        const hasTimerPill = text.includes('Time Left:');

        // 3. Question progress badge
        const hasQuestionProgressBadge = /Question\s+\d+\s+of\s+\d+/i.test(text);

        // 4. Primary CTA 'Submit Assessment'
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitAssessmentButtons = buttons.filter(b => b.innerText.includes('Submit Assessment'));
        const hasSubmitAssessmentCTA = submitAssessmentButtons.length >= 1;

        // Additional checks: Question Palette
        const hasQuestionPalette = text.includes('Question Palette');

        return {
          hasOptionSelectionCards,
          optionCardsCount: optionCards.length,
          hasTimerPill,
          hasQuestionProgressBadge,
          hasSubmitAssessmentCTA,
          submitAssessmentButtonCount: submitAssessmentButtons.length,
          hasQuestionPalette,
          passedAllContentCriteria: hasOptionSelectionCards && hasTimerPill && hasQuestionProgressBadge && hasSubmitAssessmentCTA
        };
      });
    }
  },
  {
    name: 'resume',
    url: 'http://localhost:5173/resume',
    dir: path.join(__dirname, '..', 'reports', 'ui-pass', 'resume'),
    prefix: 'resume',
    verifyContent: async (page) => {
      return await page.evaluate(() => {
        const text = document.body.innerText;

        // 1. Initial upload dropzone state
        const dropzoneEl = document.querySelector('[aria-label="Upload Resume File"]') || document.querySelector('[role="button"]');
        const hasDropzone = dropzoneEl !== null && (text.includes('Click to Upload or Drag & Drop') || text.includes('Resume Tailor'));

        // 2. Without hardcoded mock resume files
        const hasMockResumeFiles = /mock_resume|sample_resume\.pdf|john_doe_resume/i.test(text) ||
                                  text.includes('Tailored Interview Challenges') ||
                                  text.includes('Extracted Competencies');
        const withoutHardcodedMockResumes = !hasMockResumeFiles;

        // 3. PDF upload button
        const buttons = Array.from(document.querySelectorAll('button'));
        const pdfUploadButton = buttons.find(b => /upload\s*pdf/i.test(b.innerText) || /pdf/i.test(b.innerText));
        const hasPdfUploadButton = pdfUploadButton !== undefined;

        // 4. Security badges visible
        const hasGdprBadge = text.includes('GDPR Compliant') || text.includes('strict candidate privacy');
        const hasPdfLimitBadge = text.includes('PDF <= 10MB') || text.includes('10 MB');
        const hasSecurityBadges = hasGdprBadge && hasPdfLimitBadge;

        return {
          hasDropzone,
          withoutHardcodedMockResumes,
          hasMockResumeFiles,
          hasPdfUploadButton,
          pdfUploadButtonText: pdfUploadButton ? pdfUploadButton.innerText.trim() : null,
          hasSecurityBadges,
          hasGdprBadge,
          hasPdfLimitBadge,
          passedAllContentCriteria: hasDropzone && withoutHardcodedMockResumes && hasPdfUploadButton && hasSecurityBadges
        };
      });
    }
  }
];

async function runAudit() {
  console.log('--- Starting Playwright Multi-Viewport Audit (T-QA-03) ---');
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
  const reportPath = path.join(__dirname, '..', 'reports', 'ui-pass', 'T_QA_03_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Detailed report saved to: ${reportPath}`);
  
  return results;
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
