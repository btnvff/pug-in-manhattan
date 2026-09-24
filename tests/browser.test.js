// Optional browser regression check. Requires Playwright and an installed Chromium.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH can point to an existing external installation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { openBrowser, captureViews } = require("./browser-helpers");
(async () => {
  const session = await openBrowser({ isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  try {
    const { context, url } = session, errors = [];
    await captureViews(context);
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
    const bounds = await page.locator("#scene").boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bounds.x + bounds.width * .5, y: bounds.y + bounds.height * .9 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: bounds.x + bounds.width * .8, y: bounds.y + bounds.height * .9 }] });
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
    assert.equal(await page.evaluate(() => {
      frame(100); const before = testViews.draws; resize(); frame(120);
      return testViews.draws - before;
    }), 2, "paused resize redraws both 3D scenes, even when W/H stay fixed");
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await page.waitForFunction(() => state === "play", null, { polling: 50 });
    await page.evaluate(() => { window.dispatchEvent(new Event("blur")); });
    assert.equal(await page.evaluate(() => state), "pause", "blur auto-pauses");
    await page.evaluate(() => { start(); spawnIn = 999; });
    await page.keyboard.down("ArrowRight");
    await page.evaluate(() => { for (let i=0;i<20;i++) tick(1/60); });
    await page.keyboard.up("ArrowRight");
    assert.ok(await page.evaluate(() => x > W/2), "keyboard movement");
    const pickups = await page.evaluate(() => {
      start(); spawnIn=999;
      const drop = type => ({type,x,y:catchY(),speed:120,age:0,variant:0,used:false});
      items=[drop(0)]; tick(1/60);
      const good={points,sausages,happy};
      items=[drop(4)]; tick(1/60);
      return {good,bad:{points,sausages,happy},hud:[$("points").textContent,$("sausages").textContent]};
    });
    assert.equal(pickups.good.points,1); assert.equal(pickups.good.sausages,1);
    assert.ok(pickups.bad.happy < pickups.good.happy, "bad-food collision applies penalty");
    assert.deepEqual(pickups.hud, [String(pickups.bad.points),String(pickups.bad.sausages)]);
    // All nine models and all effect branches must render without changing state/RNG.
    await page.evaluate(() => {
      start(); spawnIn = 999;
      items = Array.from({ length: 9 }, (_, type) => ({ type, x: 70 + type % 3 * 125, y: 190 + Math.floor(type / 3) * 105, speed: 100, age: 0, variant: type % 8, angle: 0.15, used: false }));
      render();
    });
    await capture("food-3d");
    const continuation = await page.evaluate(() => {
      start(); spawnIn = 999; prefs.sound = false; x = 320;
      items = [{ type: 0, x: 65, y: landingY() - 1, speed: 240, variant: 2, age: 1, used: false }];
      tick(1 / 60); render();
      const drop = streetEvents.drops[0];
      const mesh = testViews.gameplayScene.children.find((node) => node.isGroup && node.position.z === .5);
      const first = { x: RatioPresentation.logicalX(mesh.position.x), y: RatioPresentation.fromWorldY(mesh.position.y) };
      for (let i = 0; i < 18; i++) tick(1 / 60);
      render();
      const after = testViews.gameplayScene.children.find((node) => node.isGroup && node.position.z === .5);
      return { first, last: RatioPresentation.fromWorldY(after.position.y), expected: drop.y, h: H, same: mesh === after };
    });
    assert.ok(Math.abs(continuation.first.x - 65) < 1e-8);
    assert.ok(Math.abs(continuation.last - continuation.expected) < 1e-8);
    assert.ok(continuation.last > continuation.h && continuation.same, "same pooled 3D object remains visible through the lower edge");
    await capture("miss-bottom-3d");
    await page.evaluate(() => {
      start(); spawnIn = 999; x = 320; points = 20;
      streetEvents.eligible = 11;
      items = [{ type: 0, x: 65, y: landingY() - 1, speed: 240, variant: 2, age: 1, used: false }];
      tick(1 / 60); render();
    });
    assert.equal(await page.evaluate(() => cats.length), 1);
    assert.equal(await page.evaluate(() => streetEvents.drops.length), 0, "event does not duplicate the missed sausage");
    for (const moment of ["land", "approach", "pickup", "leave"]) {
      if (moment !== "land") await page.evaluate(() => { for (let i = 0; i < 55; i++) tick(1 / 60); render(); });
      await capture("street-cat-" + moment);
      assert.equal(await page.evaluate(() => points), 19, "cat never adds rewards or extra penalties");
    }
    await page.evaluate(() => { for (let i = 0; i < 120; i++) tick(1 / 60); render(); });
    assert.equal(await page.evaluate(() => cats.length), 0);
    const dropResources = await page.evaluate(() => {
      const samples = [];
      // WebGL uploads hidden hero branches lazily. Warm them explicitly so a
      // first blink/breath cannot be mistaken for a resource leak after restart.
      for (const time of [2.925, .7, 5.65]) {
        start(); spawnIn=999; clock=time;
        if (time === .7) { react=.25; chewTime=.1; }
        render();
      }
      for (let batch = 0; batch < 3; batch++) {
        for (let cycle = 0; cycle < 8; cycle++) {
          start(); spawnIn = 999; x = 320;
          items = Array.from({ length: 9 }, (_, type) => ({ type, x: 60 + type * 22,
            y: landingY() - 1, speed: 240, age: 1, variant: type % 8, used: false }));
          tick(1 / 60); render();
          for (let i = 0; i < 70; i++) tick(1 / 60);
          render();
        }
        samples.push({ ...testViews.renderer.info.memory, programs: testViews.renderer.info.programs.length });
      }
      return samples;
    });
    assert.deepEqual(dropResources[1], dropResources[0]);
    assert.deepEqual(dropResources[2], dropResources[0], "24 restart/miss cycles do not accumulate GPU resources");
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
      assert.equal(await page.locator("#game").getAttribute("data-view"), view, "parity replay uses the requested renderer");
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
            const snapshot = () => JSON.stringify({ state, x, points, sausages, happy, elapsed, items, powerTimers, cats, catGifts, streetEvents, durationBones, runProgress, seed });
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
    assert.equal(await page.evaluate(() => {
      pause(); frame(100); let paints=0;
      const draw=renderCanvasScene; renderCanvasScene=()=>{paints++;draw();};
      resize(); frame(120); return paints;
    }),1,"paused Canvas redraws after raster resize");
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
    console.log("PASS: WebGL startup, touch/keyboard, good/bad pickups, HUD, pause/blur/resume and paused resize, 9 food models, 17 effects, 2D/3D seeded parity and render purity, portrait/landscape resize, lose/restart, context loss and unavailable-WebGL fallbacks.");
  } finally {
    await session.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
