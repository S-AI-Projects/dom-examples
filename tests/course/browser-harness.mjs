import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
};

export async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const requested = path.resolve(root, `.${pathname}`);
      assert.ok(requested === root || requested.startsWith(`${root}${path.sep}`), "request stays inside repo");
      let file = requested;
      try {
        const fileStat = await stat(requested);
        if (fileStat.isDirectory()) {
          file = path.join(requested, "index.html");
        }
      } catch {
        // file stat error will be handled below
      }
      const content = await readFile(file);
      const ext = path.extname(file).toLowerCase();
      response.writeHead(200, {
        "content-type": mimeTypes[ext] ?? "application/octet-stream",
        "access-control-allow-origin": "*",
      });
      response.end(content);
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
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await callback({ baseUrl, context, page, pageErrors, consoleErrors });

    assert.deepEqual(pageErrors, [], "unexpected page errors must fail the check");
    await context.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

export async function recordEvidence(taskId, evidence) {
  const dir = path.join(root, "work", taskId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "results.json"),
    JSON.stringify(evidence, null, 2),
    "utf-8"
  );
}

export async function saveScreenshot(page, taskId, name = "screenshot.png") {
  const destination = path.join(root, "work", taskId, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await page.screenshot({ path: destination, fullPage: true });
  return destination;
}
