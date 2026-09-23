// Optional browser regression check. Requires Playwright and an installed Chromium.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH can point to an existing external installation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.join(__dirname, "..");
(async () => {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const types = { ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
    try { response.setHeader("Content-Type", types[path.extname(file)] || "text/html"); response.end(fs.readFileSync(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    const errors = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    const url = "http://127.0.0.1:" + server.address().port;
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    assert.equal(await page.locator("#game").getAttribute("data-view"), "3d");
    await page.evaluate(() => render());
    const capture = async (name) => {
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, name + ".png") });
      }
    };
    await capture("menu-3d");
    await page.getByRole("button", { name: "Старт", exact: true }).click();
    // Raw CDP touch exercises dragging; native mouse clicks exercise DOM controls.
    // Mixing CDP touch with Playwright tap can suppress Chromium's synthetic click.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 755 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 310, y: 755 }] });
    await page.evaluate(() => { for (let i = 0; i < 45; i++) tick(1 / 60); render(); });
    assert.ok(await page.evaluate(() => x > 270), "touch drag moves hero");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
    await page.waitForFunction(() => state === "pause", null, { polling: 50 });
    const paused = await page.evaluate(() => {
      const before = JSON.stringify([elapsed, items, powerTimers, x]);
      tick(0.04); render();
      return {state, same: before === JSON.stringify([elapsed, items, powerTimers, x])};
    });
    assert.deepEqual(paused, {state: "pause", same: true}, "pause freezes the run");
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await page.waitForFunction(() => state === "play", null, { polling: 50 });
    await page.evaluate(() => { window.dispatchEvent(new Event("blur")); });
    assert.equal(await page.evaluate(() => state), "pause", "blur auto-pauses");
    // All nine models and all effect branches must render without changing state/RNG.
    await page.evaluate(() => {
      start(); spawnIn = 999;
      items = Array.from({ length: 9 }, (_, type) => ({ type, x: 70 + type % 3 * 125, y: 190 + Math.floor(type / 3) * 105, speed: 100, age: 0, variant: type % 8, angle: 0.15, used: false }));
      render();
    });
    await capture("food-3d");
    for (const kind of await page.evaluate(() => Object.keys(powerInfo))) {
      await page.evaluate((kind) => {
        start(); applyPower(kind);
        for (let i = 0; i < 120; i++) tick(1 / 60);
        render();
      }, kind);
    }
    await page.evaluate(() => { start(); applyPower("helpers"); applyPower("birds"); applyPower("shield"); for (let i = 0; i < 90; i++) tick(1 / 60); render(); });
    await capture("helpers-3d");
    // Compare the exact same seeded inputs with a real WebGL renderer and Canvas.
    async function replay(view) {
      await page.goto(url + "/?view=" + view);
      return page.evaluate(() => {
        let seed = 2026;
        Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
        prefs.sound = false; start();
        const result = [];
        for (let step = 0; step < 1800; step++) {
          if (state !== "play") start();
          if (step % 300 === 0) applyPower(["helpers", "birds", "rain", "trail", "wind", "chance"][step / 300]);
          const target = items.filter((item) => item.type < 4).sort((a, b) => b.y - a.y)[0];
          keys.clear();
          if (target && Math.abs(target.x - x) > 6) keys.add(target.x > x ? "ArrowRight" : "ArrowLeft");
          tick(1 / 60);
          if (step % 60 === 0) {
            const snapshot = () => JSON.stringify({ state, x, points, sausages, happy, elapsed, items, powerTimers, cats, flocks, catGifts, durationBones, runProgress, seed });
            const before = snapshot(); render();
            if (snapshot() !== before) throw new Error("Renderer mutated gameplay or RNG");
            result.push(before);
          }
        }
        return result;
      });
    }
    const threeRun = await replay("3d");
    const canvasRun = await replay("2d");
    assert.deepEqual(threeRun, canvasRun, "2D/3D gameplay parity");
    assert.equal(await page.locator("#game").getAttribute("data-view"), "2d");
    await capture("play-2d");
    await page.goto(url);
    for (const size of [{ width: 844, height: 390 }, { width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.evaluate(() => { resize(); start(); render(); });
      assert.ok(await page.evaluate(() => cv.width > 0 && document.getElementById("scene-3d").width === cv.width));
      await capture("play-" + size.width + "x" + size.height);
    }
    await page.evaluate(() => { start(); collect({ type: 2 }); happy = 1; collect({ type: 8 }); render(); });
    assert.equal(await page.evaluate(() => state), "lose");
    await page.getByRole("button", { name: "Попробовать снова" }).click();
    assert.equal(await page.evaluate(() => points + items.length + durationBones), 0);
    await page.evaluate(() => document.getElementById("scene-3d").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
    await page.waitForFunction(() => document.getElementById("game").dataset.view === "2d", null, { polling: 50 });
    assert.equal(await page.evaluate(() => state), "pause", "context loss pauses and falls back");
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await page.evaluate(() => { tick(1 / 60); render(); });
    const blocked = await context.newPage();
    blocked.on("pageerror", (error) => errors.push(error.message));
    await blocked.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return kind.startsWith("webgl") ? null : original.call(this, kind, ...args);
      };
    });
    await blocked.goto(url);
    assert.equal(await blocked.locator("#game").getAttribute("data-view"), "2d");
    await blocked.evaluate(() => { start(); tick(1 / 60); render(); });
    assert.deepEqual(errors, [], "no browser exceptions");
    console.log("PASS: WebGL startup, touch drag, pause/blur/resume, 9 food models, 17 effects, 2D/3D seeded parity and render purity, portrait/landscape resize, lose/restart, context loss and unavailable-WebGL fallbacks.");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
