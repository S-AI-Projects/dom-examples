import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const workDir = path.resolve(repoRoot, 'work/R55-T002');

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

async function stubWebGPU(page) {
  await page.addInitScript(() => {
    if (!navigator.gpu) {
      const mockBufferData = new Float32Array(250);
      for (let i = 0; i < 250; i++) mockBufferData[i] = i * 1000 + (i % 64);

      window.GPUBufferUsage = { STORAGE: 1, COPY_SRC: 2, MAP_READ: 4, COPY_DST: 8 };
      window.GPUShaderStage = { COMPUTE: 4 };
      window.GPUMapMode = { READ: 1 };

      const mockBuffer = {
        mapAsync: async () => {},
        getMappedRange: () => mockBufferData.buffer,
        unmap: () => {}
      };

      const mockDevice = {
        createShaderModule: () => ({}),
        createBuffer: () => mockBuffer,
        createBindGroupLayout: () => ({}),
        createBindGroup: () => ({}),
        createPipelineLayout: () => ({}),
        createComputePipeline: () => ({}),
        createCommandEncoder: () => ({
          beginComputePass: () => ({
            setPipeline: () => {},
            setBindGroup: () => {},
            dispatchWorkgroups: () => {},
            end: () => {}
          }),
          copyBufferToBuffer: () => {},
          finish: () => ({})
        }),
        queue: {
          submit: () => {}
        }
      };

      navigator.gpu = {
        requestAdapter: async () => ({
          requestDevice: async () => mockDevice
        })
      };
    }
  });
}

async function runTest() {
  fs.mkdirSync(workDir, { recursive: true });
  const { server, baseUrl } = await startServer();
  let browser;
  const pageErrors = [];

  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(err));

    await stubWebGPU(page);

    // --- TEST AT 360x800 ---
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${baseUrl}/webgpu-compute-demo/index.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForFunction(() => {
      const status = document.querySelector('#status');
      return status && status.textContent.includes('completed');
    });

    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.map(e => e.message).join(', ')}`);

    // Verify main content region
    const mainRegion = page.locator('#main-content');
    assert.ok(await mainRegion.isVisible(), 'Main content region must be visible at 360x800');

    // Verify no document horizontal overflow at 360x800
    const overflow360 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    assert.ok(overflow360, 'Document must not horizontally overflow the viewport at 360x800');

    // Verify intentional scrollable container is labelled
    const scrollContainer = page.locator('#output-container');
    const scrollLabel = await scrollContainer.getAttribute('aria-label');
    assert.ok(scrollLabel && scrollLabel.length > 0, 'Horizontal scroll region must be labelled with aria-label');

    const isScrollable360 = await scrollContainer.evaluate(el => el.scrollWidth > el.clientWidth);
    assert.ok(isScrollable360, 'Output container must be intentionally horizontally scrollable at 360x800');

    await page.screenshot({ path: path.join(workDir, 'viewport-360x800.png') });

    // --- TEST AT 1280x800 ---
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(100);

    assert.equal(pageErrors.length, 0, 'No unexpected page errors at 1280x800');
    assert.ok(await mainRegion.isVisible(), 'Main content region must be visible at 1280x800');

    const overflow1280 = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    assert.ok(overflow1280, 'Document must not horizontally overflow the viewport at 1280x800');

    await page.screenshot({ path: path.join(workDir, 'viewport-1280x800.png') });

    // Check content order and visibility consistency
    const contentOrder = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent.trim();
      const status = document.querySelector('#status')?.textContent.trim();
      const code = document.querySelector('#output-code')?.textContent.trim();
      return { h1, status, hasCode: Boolean(code && code.length > 0) };
    });
    assert.equal(contentOrder.h1, 'WebGPU data');
    assert.ok(contentOrder.hasCode, 'Output data must be rendered');

    console.log('R55-T002 check passed: Layout protected at 360x800 and 1280x800.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('R55-T002 check failed:', err);
  process.exit(1);
});
