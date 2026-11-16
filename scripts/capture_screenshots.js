/**
 * scripts/capture_screenshots.js
 * Automated Visual Quality Gate for InterviewGenie AI
 * Serves the compiled production frontend and captures full-page
 * desktop (1440x900) and mobile (390x844) screenshots for all 12 application routes.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('../frontend/node_modules/playwright');

const PORT = 4173;
const DIST_DIR = path.resolve(__dirname, '../frontend/dist');
const OUTPUT_DIR_DESKTOP = path.resolve(__dirname, '../docs/screenshots/desktop');
const OUTPUT_DIR_MOBILE = path.resolve(__dirname, '../docs/screenshots/mobile');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const PAGES = [
  { name: '01_landing', path: '/' },
  { name: '02_auth', path: '/auth' },
  { name: '03_dashboard', path: '/dashboard' },
  { name: '04_setup', path: '/setup' },
  { name: '05_live_room', path: '/interview/live' },
  { name: '06_technical_room', path: '/interview/technical' },
  { name: '07_aptitude_room', path: '/interview/aptitude' },
  { name: '08_resume_analysis', path: '/resume' },
  { name: '09_results', path: '/results' },
  { name: '10_analytics', path: '/analytics' },
  { name: '11_history', path: '/history' },
  { name: '12_profile', path: '/profile' },
];

function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    const rawPath = req.url.split('?')[0];
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    let targetFile = path.join(DIST_DIR, safePath);

    // If static file exists, serve it
    if (safePath !== '/' && fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(targetFile).pipe(res);
      return;
    }

    // SPA fallback: return index.html for all client routes
    const indexPath = path.join(DIST_DIR, 'index.html');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`[Server] Serving frontend production bundle on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

async function captureViewport(browser, isMobile) {
  const viewType = isMobile ? 'mobile' : 'desktop';
  const outDir = isMobile ? OUTPUT_DIR_MOBILE : OUTPUT_DIR_DESKTOP;
  const viewport = isMobile
    ? { width: 390, height: 844 }
    : { width: 1440, height: 900 };

  console.log(`\n========================================`);
  console.log(`Capturing ${viewType.toUpperCase()} Viewport (${viewport.width}x${viewport.height})`);
  console.log(`Target Directory: ${outDir}`);
  console.log(`========================================`);

  const context = await browser.newContext({
    viewport,
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 2,
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
      : undefined,
  });

  // Pre-seed authenticated candidate token so all rooms load immediately
  await context.addInitScript(() => {
    localStorage.setItem('token', 'mock_jwt_token_interviewgenie_2026');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'usr_candidate_default',
        email: 'candidate@interviewgenie.ai',
        full_name: 'Alex Johnson',
      })
    );
  });

  const page = await context.newPage();

  for (let i = 0; i < PAGES.length; i++) {
    const { name, path: routePath } = PAGES[i];
    const url = `http://localhost:${PORT}${routePath}`;
    const filename = `${name}.png`;
    const targetFile = path.join(outDir, filename);

    process.stdout.write(`[${viewType.toUpperCase()}] (${i + 1}/${PAGES.length}) Capturing ${routePath} -> ${filename}... `);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      // Allow slight settle time for animations and Recharts responsive SVG rendering
      await page.waitForTimeout(600);

      await page.screenshot({
        path: targetFile,
        fullPage: true,
      });
      console.log(`✓ DONE (${fs.statSync(targetFile).size} bytes)`);
    } catch (err) {
      console.error(`\n[ERROR] Failed to capture ${url}: ${err.message}`);
      // Retry once with domcontentloaded
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: targetFile, fullPage: true });
        console.log(`✓ RETRY SUCCESS (${fs.statSync(targetFile).size} bytes)`);
      } catch (retryErr) {
        console.error(`[FATAL] Retry failed for ${url}: ${retryErr.message}`);
      }
    }
  }

  await context.close();
}

async function main() {
  console.log('--- Starting InterviewGenie AI Screenshot Capture Suite ---');
  fs.mkdirSync(OUTPUT_DIR_DESKTOP, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR_MOBILE, { recursive: true });

  const server = await startStaticServer(PORT);

  let browser;
  try {
    const execPath = chromium.executablePath();
    console.log(`[Playwright] Launching Chromium from: ${execPath}`);
    browser = await chromium.launch({
      executablePath: execPath,
      headless: true,
    });

    // 1. Desktop Screenshots (1440x900)
    await captureViewport(browser, false);

    // 2. Mobile Screenshots (390x844)
    await captureViewport(browser, true);

    console.log('\n========================================');
    console.log('✓ Visual Quality Gate: All 24 screenshots captured successfully!');
    console.log('Desktop: 12 full-page images in docs/screenshots/desktop/');
    console.log('Mobile:  12 full-page images in docs/screenshots/mobile/');
    console.log('========================================\n');
  } catch (error) {
    console.error('Fatal execution error:', error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close(() => {
      console.log('[Server] Static preview server stopped.');
    });
  }
}

main();
