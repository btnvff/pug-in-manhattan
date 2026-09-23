// Real DOM/WebGL fault injection. Like character-browser.test.js, this uses local
// content loading and does not claim coverage of HTTP navigation or Safari.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { installOfflinePages } = require("./browser-offline");
const root = path.join(__dirname, "..");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    installOfflinePages(context, root);
    await context.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const fault of ["model", "animation", "renderer", "resize", "context-loss", "dispose"]) {
      await page.goto("http://local.test/");
      assert.equal(await page.locator("#game").getAttribute("data-view"), "3d");
      await page.evaluate((fault) => {
        // Retire the initial view before installing allocation/disposal observers.
        activeView.dispose(); activeView = null;
        prefs.sound = false;
        const T = window.THREE, resources = new Map(), renderers = [];
        const track = (resource) => {
          if (!resource || resources.has(resource)) return;
          const record = { kind: resource.type || resource.constructor.name, disposed: 0 };
          resources.set(resource, record);
          resource.addEventListener("dispose", () => record.disposed++);
        };
        const trackTree = (root) => root.traverse((node) => {
          if (node.isInstancedMesh) track(node);
          if (node.geometry) track(node.geometry);
          if (node.material) for (const surface of [node.material].flat()) {
            track(surface);
            for (const value of Object.values(surface)) if (value?.isTexture) track(value);
          }
        });
        const Renderer = T.WebGLRenderer;
        T.WebGLRenderer = function (...args) {
          const renderer = new Renderer(...args);
          const record = { renderer, disposed: 0, lost: 0 };
          renderers.push(record);
          const render = renderer.render.bind(renderer), dispose = renderer.dispose.bind(renderer);
          const lose = renderer.forceContextLoss.bind(renderer);
          renderer.render = (scene, ...args) => { trackTree(scene); return render(scene, ...args); };
          renderer.dispose = () => { record.disposed++; dispose(); };
          renderer.forceContextLoss = () => { record.lost++; lose(); };
          return renderer;
        };
        const factory = createModelFactory, world = createThreeWorld;
        createModelFactory = () => {
          const model = factory(), pug = model.pugModel;
          Object.values(model.geometries).forEach(track);
          model.pugModel = () => { const hero = pug(); trackTree(hero); return hero; };
          return model;
        };
        createThreeWorld = (...args) => { const scene = world(...args); trackTree(scene.root); return scene; };
        window.lifecycleSnapshot = () => ({
          resources: [...resources.values()],
          renderers: renderers.map(({ disposed, lost }) => ({ disposed, lost })),
        });
        window.runSnapshot = () => JSON.stringify({ points, happy, elapsed, x, items, powerTimers, cats, flocks, catGifts });
        const fail = () => { throw new Error("injected " + fault + " failure"); };
        if (fault === "model") createPugModel = fail;
        initializeView();
        if (fault === "model") return;
        start(); spawnIn = 999;
        // Cover shared city/drop assets and private hero assets in the same teardown.
        items = Array.from({ length: 9 }, (_, type) => ({
          type, x: 70 + type % 3 * 125, y: 190 + Math.floor(type / 3) * 105,
          speed: 100, age: 0, variant: type % 8, angle: 0.15, used: false,
        }));
        applyPower("helpers"); applyPower("birds"); render();
        window.beforeFailure = runSnapshot();
        window.retiredView = activeView;
        window.retiredCanvas = document.getElementById("scene-3d");
        if (fault === "animation") animatePugModel = fail;
        if (fault === "renderer") renderers[0].renderer.render = fail;
        if (fault === "resize") { createThreeWorld = fail; W += 1; activeView.resize(); }
        else if (fault === "context-loss") {
          const extension = retiredCanvas.getContext("webgl2").getExtension("WEBGL_lose_context");
          if (!extension) throw new Error("WEBGL_lose_context is required for this test");
          extension.loseContext();
        } else if (fault === "dispose") {
          activeView = null;
          retiredView.dispose(); retiredView.dispose();
          document.getElementById("game").dataset.view = "2d";
        } else render();
      }, fault);
      await page.waitForFunction(() => document.getElementById("game").dataset.view === "2d", null, { polling: 50 });
      assert.equal(await page.locator("#scene-3d").count(), 0, fault + ": failed canvas is removed");
      assert.equal(await page.evaluate(() => activeView), null, fault + ": no retired view remains active");
      const metrics = await page.evaluate(() => lifecycleSnapshot());
      assert.ok(metrics.resources.length > 0, "observe actual owned resources, not just a disposal flag");
      assert.deepEqual(metrics.renderers, [{ disposed: 1, lost: 1 }], fault + ": dispose renderer and release context exactly once");
      for (const resource of metrics.resources)
        assert.equal(resource.disposed, 1, fault + ": " + resource.kind + " is disposed exactly once");
      if (fault !== "model" && fault !== "dispose") {
        assert.equal(await page.evaluate(() => state), "pause", fault + ": pause rather than dropping the run");
        assert.equal(await page.evaluate(() => runSnapshot()), await page.evaluate(() => beforeFailure), fault + ": preserve gameplay state");
        await page.getByRole("button", { name: "Продолжить", exact: true }).click();
      }
      const resumed = await page.evaluate((fault) => {
        if (fault === "model") start();
        // Repeated cleanup and late events from the old canvas must be harmless.
        if (fault !== "model") {
          retiredView.dispose(); retiredView.render(); retiredView.resize();
          retiredCanvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
        }
        let scheduled = 0;
        requestAnimationFrame = () => ++scheduled;
        frame(100);
        return { state, scheduled, view: document.getElementById("game").dataset.view };
      }, fault);
      assert.deepEqual(resumed, { state: "play", scheduled: 1, view: "2d" }, fault + ": Canvas run and RAF continue");
      assert.deepEqual(await page.evaluate(() => lifecycleSnapshot()), metrics, fault + ": no double disposal or reallocation");
    }
    assert.deepEqual(errors, [], "faults are contained, with no uncaught browser exceptions");
    console.log("PASS: model/animation/renderer/resize faults, real context loss and repeated disposal; all observed hero/world/shared resources disposed once; no stale canvas callbacks; gameplay preserved; Canvas resume and RAF continue.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
