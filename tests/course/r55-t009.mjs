import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T009');

function startServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png'
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    let filePath = path.join(repoRoot, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

async function launchBrowser() {
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (fs.existsSync(chromePath) ? chromePath : undefined);
  return await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
}

async function testWidthWithReducedMotion(browser, baseUrl, width, height, pageErrors) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => pageErrors.push(err));

  await page.goto(`${baseUrl}/visual-viewport-api/index.html`);
  await page.waitForLoadState('domcontentloaded');

  // Verify all source anchors are present and visible
  const instructions = page.locator('#instructions');
  const output = page.locator('#output');
  const visualInfo = page.locator('#visual-info');
  const windowInfo = page.locator('#window-info');

  assert.ok(await instructions.isVisible(), `Instructions must be visible at ${width}px`);
  assert.ok(await output.isVisible(), `Output container must be visible at ${width}px`);
  assert.ok(await visualInfo.isVisible(), `Visual info must be visible at ${width}px`);
  assert.ok(await windowInfo.isVisible(), `Window info must be visible at ${width}px`);

  // Verify prefers-reduced-motion media query evaluates to reduce
  const prefersReduced = await page.evaluate(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  assert.ok(prefersReduced, `prefers-reduced-motion: reduce must be active at ${width}px`);

  // Test visible focus on #output
  await output.focus();
  const outputFocusStyles = await output.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      isActive: document.activeElement === el
    };
  });
  assert.ok(outputFocusStyles.isActive, `Output element must be active element when focused at ${width}px`);
  assert.notEqual(outputFocusStyles.outlineStyle, 'none', `Output outline style must not be 'none' at ${width}px`);

  // Test visible focus on #instructions
  await instructions.focus();
  const instructionsFocusStyles = await instructions.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      outlineStyle: computed.outlineStyle,
      isActive: document.activeElement === el
    };
  });
  assert.ok(instructionsFocusStyles.isActive, `#instructions must receive focus at ${width}px`);
  assert.notEqual(instructionsFocusStyles.outlineStyle, 'none', `#instructions outline style must not be 'none' at ${width}px`);

  await context.close();
}

async function runTest() {
  fs.mkdirSync(workDir, { recursive: true });
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();

    // 1. Test at 360x800 with reduced motion
    await testWidthWithReducedMotion(browser, baseUrl, 360, 800, pageErrors);

    // 2. Test at 1280x800 with reduced motion
    await testWidthWithReducedMotion(browser, baseUrl, 1280, 800, pageErrors);

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    console.log('R55-T009 check passed: Motion preference and visible keyboard focus verified at both widths.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T009 check failed:', err);
  process.exit(1);
});
