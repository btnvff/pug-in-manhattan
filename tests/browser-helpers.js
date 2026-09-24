// Browser tests use HTTP by default. OFFLINE_BROWSER=1 explicitly tests local
// content in real Chromium without claiming HTTP navigation/asset-fetch coverage.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.join(__dirname, "..");
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png",
  ".webmanifest": "application/manifest+json", ".json": "application/json",
  ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};
function serveProject(prefix = "/") {
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch { response.writeHead(400).end(); return; }
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(prefix.length) || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      response.setHeader("Content-Type", contentTypes[path.extname(file)] || "application/octet-stream");
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}
function installOfflinePages(context, projectRoot = root) {
  const index = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const scripts = [...index.matchAll(/<script defer src="\.\/(.*?)"/g)].map((m) => m[1]);
  const html = index.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, "").replace(/<link[^>]*>/g, "");
  const newPage = context.newPage.bind(context);
  context.newPage = async (...args) => {
    const page = await newPage(...args), goto = page.goto.bind(page);
    page.goto = async (url) => {
      await goto("about:blank" + new URL(url).search);
      await page.setContent(html);
      await page.addStyleTag({ content: fs.readFileSync(path.join(projectRoot, "style.css"), "utf8") });
      for (const file of scripts)
        await page.addScriptTag({ content: fs.readFileSync(path.join(projectRoot, file), "utf8") });
      return null;
    };
    return page;
  };
}
async function openBrowser(options = {}) {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const server = await serveProject();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined, headless: true,
      args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
    if (process.env.OFFLINE_BROWSER === "1") installOfflinePages(context);
    await context.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    console.log("Browser transport:", process.env.OFFLINE_BROWSER === "1" ? "local content (not HTTP)" : "HTTP");
    return {
      browser, context, url: "http://127.0.0.1:" + server.address().port,
      async close() { try { await browser.close(); } finally { await new Promise((done) => server.close(done)); } },
    };
  } catch (error) {
    try { if (browser) await browser.close(); }
    finally { await new Promise((done) => server.close(done)); }
    throw error;
  }
}
async function captureViews(context) {
  // Inspection is installed by the tests, not shipped as an application global.
  await context.addInitScript(() => {
    let library;
    window.testViews = {};
    Object.defineProperty(window, "THREE", { configurable: true, get: () => library, set(value) {
      library = value;
      const Renderer = value.WebGLRenderer;
      value.WebGLRenderer = class extends Renderer {
        constructor(...args) {
          super(...args);
          const draw = this.render.bind(this);
          this.render = (scene, camera) => {
            const kind = camera.isPerspectiveCamera ? "world" : "gameplay";
            testViews[kind + "Scene"] = scene; testViews[kind + "Camera"] = camera;
            testViews.renderer = this; testViews.draws = (testViews.draws || 0) + 1;
            return draw(scene, camera);
          };
        }
      };
    } });
  });
}
module.exports = { openBrowser, captureViews, installOfflinePages, serveProject };
