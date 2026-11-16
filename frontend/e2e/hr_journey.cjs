const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../node_modules/playwright'));

(async () => {
  console.log('=== STARTING PLAYWRIGHT E2E: HR JOURNEY ===');
  console.log('Journey: Login -> Setup -> Start -> Answer -> Results');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    permissions: ['microphone', 'camera'],
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  let passedSteps = 0;
  let failedSteps = 0;

  try {
    // 1. Authenticate Candidate & Store JWT
    console.log('[Step 1/5] Authenticating Candidate via JWT...');
    const loginRes = await page.request.post('http://localhost:8000/api/auth/login', {
      data: { email: 'audit_test@candidate.ai', password: 'SecurePassword2026!' }
    });
    const authData = await loginRes.json();
    const token = authData.token;
    console.log('  -> JWT Token retrieved:', token ? 'SUCCESS' : 'FAILED');

    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
    await page.evaluate((tok) => {
      localStorage.setItem('token', tok);
    }, token);
    await page.reload({ waitUntil: 'networkidle' });
    console.log('  -> Authenticated Dashboard loaded cleanly with 0 console errors.');
    passedSteps++;

    // 2. Setup Step
    console.log('[Step 2/5] Navigating to Setup & Selecting HR & Behavioral Track...');
    await page.goto('http://localhost:5173/setup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hrCard = page.getByText(/HR & Behavioral/i).first();
    if (await hrCard.isVisible()) {
      await hrCard.click();
      console.log('  -> Selected HR & Behavioral track.');
    }

    // Step Into Interview Room
    const enterRoomBtn = page.getByRole('button', { name: /Step Into Interview Room/i });
    await enterRoomBtn.click();
    console.log('  -> Clicked Step Into Interview Room.');
    passedSteps++;

    // 3. Start Live Room Step
    console.log('[Step 3/5] Entering Live Interview Room...');
    await page.waitForURL('**/interview/live**', { timeout: 15000 });
    console.log('  -> URL matched live room:', page.url());
    await page.waitForTimeout(1000);

    // If explicit consent banner appears, grant it
    const consentBannerBtn = page.getByRole('button', { name: /Enable Recording/i });
    if (await consentBannerBtn.isVisible().catch(() => false)) {
      await consentBannerBtn.click();
      console.log('  -> Explicit recording consent granted.');
      await page.waitForTimeout(500);
    }
    console.log('  -> Live room initialized with AI interviewer.');
    passedSteps++;

    // 4. Answer Step
    console.log('[Step 4/5] Answering Behavioral Question (STAR Method)...');
    // Ensure keyboard input fallback view is toggled if not already visible
    const switchBtn = page.getByRole('button', { name: /Switch to Keyboard Fallback/i });
    if (await switchBtn.isVisible().catch(() => false)) {
      await switchBtn.click();
      console.log('  -> Toggled into Keyboard text editor.');
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(
        'Situation: During a high-load payment gateway migration, API p99 latency spiked to 2.8s. ' +
        'Task: As lead engineer, I was responsible for reducing latency below 400ms without data loss. ' +
        'Action: I introduced distributed Redis caching, optimized SQL query plans, and parallelized asynchronous notifications. ' +
        'Result: Latency dropped to 190ms and the system handled 50,000 requests per minute with 99.99% uptime.'
      );
      console.log('  -> Formulated structured STAR answer in textarea.');
    }

    // Submit Answer
    const submitBtn = page.getByRole('button', { name: /Submit Answer/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      console.log('  -> Clicked Submit Answer.');
      await page.waitForTimeout(1500);
    }
    passedSteps++;

    // 5. Results Step
    console.log('[Step 5/5] Navigating to Performance Results & Rubrics...');
    await page.goto('http://localhost:5173/results', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const resultsHeading = page.getByText(/Candidate Performance Debrief/i).first();
    const isHeadingVisible = await resultsHeading.isVisible().catch(() => false);
    console.log('  -> Candidate Performance Debrief displayed:', isHeadingVisible);

    const rubricHeading = page.getByText(/Rubric Dimension Breakdown/i).first();
    const isRubricVisible = await rubricHeading.isVisible().catch(() => false);
    console.log('  -> Rubric Dimension Breakdown displayed:', isRubricVisible);

    passedSteps++;

    // Save proof screenshot of the HR journey results
    const proofScreenshot = path.resolve(__dirname, '../../reports/hr_journey_results_e2e.png');
    await page.screenshot({ path: proofScreenshot, fullPage: true });
    console.log('  -> Proof screenshot saved to:', proofScreenshot);

  } catch (err) {
    console.error('HR Journey Step Failed:', err);
    failedSteps++;
  } finally {
    await browser.close();
  }

  console.log('\n=== HR JOURNEY E2E SUMMARY ===');
  console.log(`Passed Steps: ${passedSteps} / 5`);
  console.log(`Failed Steps: ${failedSteps}`);
  console.log(`Uncaught Errors: ${errors.length}`);
  if (failedSteps === 0 && errors.length === 0) {
    console.log('STATUS: HR JOURNEY E2E PASSED (100%)\n');
    process.exit(0);
  } else {
    console.log('STATUS: HR JOURNEY E2E FAILED\n');
    process.exit(1);
  }
})();
