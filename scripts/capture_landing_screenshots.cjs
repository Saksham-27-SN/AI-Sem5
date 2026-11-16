const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

async function main() {
  const screenshotsDirDesktop = path.resolve(__dirname, '../docs/screenshots/desktop');
  const screenshotsDirMobile = path.resolve(__dirname, '../docs/screenshots/mobile');
  fs.mkdirSync(screenshotsDirDesktop, { recursive: true });
  fs.mkdirSync(screenshotsDirMobile, { recursive: true });

  // Use preview server or start static server for dist
  const distDir = path.resolve(__dirname, '../frontend/dist');
  console.log('Serving from:', distDir);

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(4173, '127.0.0.1', resolve));
  console.log('Static server listening on http://127.0.0.1:4173');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Desktop 1440px
  console.log('Capturing Desktop 1440px...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  const desktopOverflow = await desktopPage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log('Desktop 1440px horizontal overflow detected:', desktopOverflow);

  const desktopScreenshotPath = path.join(screenshotsDirDesktop, 'landing_page_1440px.png');
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log('Desktop screenshot saved to:', desktopScreenshotPath);

  // 2. Mobile 390px
  console.log('Capturing Mobile 390px...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  const mobileOverflow = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log('Mobile 390px horizontal overflow detected:', mobileOverflow);

  const mobileScreenshotPath = path.join(screenshotsDirMobile, 'landing_page_390px.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log('Mobile screenshot saved to:', mobileScreenshotPath);

  await browser.close();
  server.close();
  console.log('Completed screenshot capture successfully.');
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
