import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const requested = path.resolve(root, `.${pathname}`);
      assert.ok(requested === root || requested.startsWith(`${root}${path.sep}`), "request stays inside the repository");
      const file = (await stat(requested)).isDirectory() ? path.join(requested, "index.html") : requested;
      response.writeHead(200, { "content-type": mimeTypes[path.extname(file)] ?? "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

export async function runBrowserTest(taskId, callback) {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.route("**/*", (route) =>
      route.request().url().startsWith(baseUrl) ? route.continue() : route.abort()
    );
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await callback({ baseUrl, context, page, pageErrors });
    assert.deepEqual(pageErrors, [], "page has no uncaught JavaScript errors");
    await context.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function saveScreenshot(page, taskId, name = "after.png") {
  const destination = path.join(root, "work", taskId, name);
  await (await import("node:fs/promises")).mkdir(path.dirname(destination), { recursive: true });
  await page.screenshot({ path: destination, fullPage: true });
  return destination;
}
