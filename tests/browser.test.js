// Optional browser regression check. Requires Playwright and an installed Chromium.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH can point to an existing external installation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.join(__dirname, "..");
function installDiagnostics() {
  window.audit = { renderer: null, frames: 0, pending: new Set(), peakPending: 0, disposed: {} };
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    // Playwright also uses RAF polling; count only the game's callback.
    if (callback.name !== "frame") return request(callback);
    const id = request((now) => { audit.pending.delete(id); audit.frames++; callback(now); });
    audit.pending.add(id);
    audit.peakPending = Math.max(audit.peakPending, audit.pending.size);
    return id;
  };
  window.cancelAnimationFrame = (id) => { audit.pending.delete(id); cancel(id); };
  Object.defineProperty(window, "THREE", { configurable: true, set(T) {
    Object.defineProperty(window, "THREE", { value: T });
    const Original = T.WebGLRenderer;
    T.WebGLRenderer = class extends Original {
      constructor(...args) {
        super(...args);
        audit.renderer = this;
        const dispose = this.dispose.bind(this);
        this.dispose = () => { audit.disposed.renderer = (audit.disposed.renderer || 0) + 1; dispose(); };
      }
    };
    for (const kind of ["BufferGeometry", "Material", "Texture", "InstancedMesh"]) {
      const dispose = T[kind].prototype.dispose;
      T[kind].prototype.dispose = function () {
        audit.disposed[kind] = (audit.disposed[kind] || 0) + 1;
        return dispose.call(this);
      };
    }
  }});
}
(async () => {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]).replace(/^\/pug-in-manhattan(?=\/|$)/, "") || "/";
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
    const errors = [], warnings = [], failures = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await context.addInitScript(installDiagnostics);
    const url = "http://127.0.0.1:" + server.address().port + "/pug-in-manhattan/";
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (["warning", "error"].includes(message.type())) warnings.push(message.text()); });
    page.on("response", (response) => { if (response.status() >= 400) failures.push(response.url()); });
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
    // Files must also resolve under the GitHub Pages repository prefix.
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
    for (const resource of ["./style.css", ...manifest.icons.map((icon) => icon.src), "./apple-touch-icon.png"]) {
      assert.equal((await context.request.get(new URL(resource, url).href)).status(), 200, resource);
    }
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
    assert.ok(await page.evaluate(() => {
      applyPower("shield"); frame(1000);
      const before = cv.toDataURL(); resize(); frame(1016);
      return before === cv.toDataURL();
    }), "same-size resize preserves paused feedback");
    assert.ok(await page.evaluate(() => {
      const before = cv.width;
      Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
      resize(); frame(1032);
      const visible = ctx.getImageData(0, 0, cv.width, cv.height).data.some((value, i) => i % 4 === 3 && value > 0);
      Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
      resize(); frame(1048);
      return before !== W && visible;
    }), "DPR-only resize repaints while paused");
    assert.ok(await page.evaluate(() => {
      const before = JSON.stringify([W, H, x]);
      const display = $("game").style.display;
      $("game").style.display = "none"; resize();
      $("game").style.display = display;
      return before === JSON.stringify([W, H, x]);
    }), "zero-sized layout does not corrupt game coordinates");
    assert.ok(await page.evaluate(() => {
      const oldHeight = H;
      items = [{ type: 0, x, y: 100, speed: 80, bounceV: -200 }];
      effects = [{ x: 100, y: 200, t: 0, text: "Resize", good: true }];
      Object.defineProperty(cv, "clientHeight", { value: oldHeight / 2, configurable: true });
      resize();
      const scaled = items[0].bounceV === -100 && effects[0].y === 100;
      delete cv.clientHeight; resize();
      return scaled;
    }), "resize scales bounce velocity and floating feedback");
    await page.evaluate(() => audioSystem.context.suspend());
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await page.waitForFunction(() => state === "play", null, { polling: 50 });
    assert.equal(await page.evaluate(() => audioSystem.context.state), "running", "resume unlocks audio after browser suspension");
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
      await page.goto(url + "?view=" + view);
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
    const memory = await page.evaluate(() => {
      const samples = [];
      prefs.sound = false;
      for (let batch = 0; batch < 3; batch++) {
        for (let cycle = 0; cycle < 10; cycle++) {
          W = cycle % 2 ? 390 : 320; H = cycle % 2 ? 844 : 568;
          activeView.resize(); start(); applyPower("helpers"); applyPower("birds");
          for (let i = 0; i < 300; i++) tick(1 / 60);
          render();
        }
        samples.push({ ...audit.renderer.info.memory, programs: audit.renderer.info.programs.length });
      }
      resize();
      return samples;
    });
    assert.deepEqual(memory[1], memory[0], "GPU resource counts stabilize after warmup");
    assert.deepEqual(memory[2], memory[0], "resize/restart does not accumulate GPU resources");
    console.log("GPU resource samples:", memory);
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
    assert.deepEqual(warnings, [], "no console warnings/errors during normal play");
    assert.deepEqual(failures, [], "no broken page resources");
    const resourcesBeforeLoss = await page.evaluate(() => ({ ...audit.renderer.info.memory }));
    await page.evaluate(() => { audit.disposed = {}; });
    await page.evaluate(() => document.getElementById("scene-3d").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
    await page.waitForFunction(() => document.getElementById("game").dataset.view === "2d", null, { polling: 50 });
    assert.equal(await page.evaluate(() => state), "pause", "context loss pauses and falls back");
    const disposed = await page.evaluate(() => audit.disposed);
    assert.equal(disposed.renderer, 1);
    assert.equal(disposed.BufferGeometry, resourcesBeforeLoss.geometries, "shared and environment geometries released");
    assert.ok(disposed.Material > 30 && disposed.Texture >= 3 && disposed.InstancedMesh > 10, "materials, textures and instances released");
    assert.equal(await page.locator("#scene-3d").count(), 0);
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
    // Keep the real RAF loop running: injected renderer errors must not freeze the app.
    const live = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await live.addInitScript(installDiagnostics);
    const livePage = await live.newPage();
    livePage.on("pageerror", (error) => errors.push(error.message));
    await livePage.goto(url);
    await livePage.getByRole("button", { name: "Старт", exact: true }).tap();
    await livePage.waitForFunction(() => elapsed > 0.2);
    await livePage.getByRole("button", { name: "Пауза", exact: true }).tap();
    assert.equal(await livePage.evaluate(() => state), "pause", "native touch activates pause");
    await livePage.getByRole("button", { name: "Продолжить", exact: true }).tap();
    await livePage.evaluate(() => { audit.renderer.render = () => { throw new Error("Injected render failure"); }; });
    await livePage.waitForFunction(() => state === "pause" && activeView === null);
    assert.equal(await livePage.evaluate(() => audit.disposed.renderer), 1);
    await livePage.getByRole("button", { name: "Продолжить", exact: true }).tap();
    const elapsedBefore = await livePage.evaluate(() => elapsed);
    await livePage.waitForFunction((before) => elapsed > before + 0.2, elapsedBefore);
    assert.equal(await livePage.evaluate(() => audit.peakPending), 1, "exactly one animation loop survives fallback");
    await livePage.goto(url);
    await livePage.evaluate(() => { start(); audit.renderer.setSize = () => { throw new Error("Injected resize failure"); }; resizeView(); });
    assert.equal(await livePage.evaluate(() => activeView === null && state === "pause"), true);
    // A failure during world construction must dispose the partially built world.
    await livePage.route("**/js/world-3d.js", async (route) => {
      const source = fs.readFileSync(path.join(root, "js/world-3d.js"), "utf8");
      await route.fulfill({ contentType: "text/javascript", body: source.replace('const tank =', 'throw new Error("Injected world setup failure");\n  const tank =') });
    });
    await livePage.goto(url);
    assert.equal(await livePage.locator("#game").getAttribute("data-view"), "2d");
    assert.equal(await livePage.evaluate(() => audit.disposed.renderer), 1);
    assert.equal(await livePage.evaluate(() => audit.disposed.Texture), 5, "partially built sky, facade and sign textures released");
    await livePage.unroute("**/js/world-3d.js");
    let releaseAudio;
    const audioGate = new Promise((resolve) => { releaseAudio = resolve; });
    await livePage.route("**/js/audio.js", async (route) => { await audioGate; await route.continue(); });
    await livePage.goto(url, { waitUntil: "commit" });
    await livePage.locator("#sound").click();
    releaseAudio();
    await livePage.waitForLoadState("load");
    assert.equal(await livePage.locator("#game").getAttribute("data-view"), "3d", "early sound click does not break deferred startup");
    await livePage.unroute("**/js/audio.js");
    await livePage.goto("file://" + path.join(root, "index.html"));
    assert.equal(await livePage.locator("#game").getAttribute("data-view"), "3d", "direct file startup still works");
    await livePage.route("**/js/vendor/three-r185.js", (route) => route.abort());
    await livePage.goto(url);
    assert.equal(await livePage.locator("#game").getAttribute("data-view"), "2d", "missing Three.js uses Canvas");
    await livePage.evaluate(() => { start(); tick(1 / 60); render(); });
    await live.close();
    assert.deepEqual(errors, [], "no browser exceptions");
    console.log("PASS: WebGL startup, touch controls, pause/blur/resume, 9 models, 17 effects, 2D/3D parity, resize/DPR/zero layout, resource stability and disposal, real RAF recovery, setup/render/resize failures, no normal-play console warnings or broken assets.");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
