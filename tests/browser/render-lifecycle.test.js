// Real DOM/WebGL fault injection, independent of source-loading transport.
const assert = require("node:assert/strict");
const path = require("node:path");
const { openBrowser, captureViews } = require("../helpers/browser");
(async () => {
  const session = await openBrowser({ deviceScaleFactor: 2 });
  try {
    const { context, url } = session;
    await captureViews(context);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const fault of ["model", "partial-model", "partial-hero", "world", "animation", "renderer", "resize", "context-loss", "dispose", "cleanup-error"]) {
      await page.goto(url);
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
        // Observe allocations before faulting constructors, not only completed scene trees.
        for (const name of ["SphereGeometry", "BoxGeometry", "CylinderGeometry", "ConeGeometry", "TorusGeometry", "CapsuleGeometry", "TubeGeometry", "BufferGeometry", "PlaneGeometry", "ExtrudeGeometry", "MeshStandardMaterial", "MeshBasicMaterial", "DataTexture", "CanvasTexture"]) {
          const Type = T[name];
          T[name] = new Proxy(Type, { construct(target, args) {
            const resource = Reflect.construct(target, args);
            track(resource); return resource;
          } });
        }
        const factory = createModelFactory, world = createRatioWorld, pug = createPugModel;
        let worldOwner;
        createPugModel = (...args) => { const hero = pug(...args); trackTree(hero); return hero; };
        createModelFactory = () => {
          const model = factory();
          Object.values(model.geometries).forEach(track);
          return model;
        };
        createRatioWorld = (...args) => { worldOwner = world(...args); trackTree(worldOwner.root); return worldOwner; };
        window.lifecycleSnapshot = () => ({
          resources: [...resources.values()],
          renderers: renderers.map(({ disposed, lost }) => ({ disposed, lost })),
        });
        window.runSnapshot = () => JSON.stringify({ points, happy, elapsed, x, items, powerTimers, cats, catGifts, streetEvents });
        const fail = () => { throw new Error("injected " + fault + " failure"); };
        if (fault === "model") createPugModel = fail;
        if (fault === "partial-model") T.BoxGeometry = fail;
        if (fault === "partial-hero") T.DataTexture = fail;
        if (fault === "world") T.CanvasTexture = fail;
        initializeView();
        if (["model", "partial-model", "partial-hero", "world"].includes(fault)) return;
        const view = activeView; initializeView();
        if (activeView !== view || renderers.length !== 1) throw new Error("duplicate renderer initialization");
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
        if (fault === "resize") { renderers[0].renderer.setSize = fail; resize(); }
        else if (fault === "context-loss") {
          const extension = retiredCanvas.getContext("webgl2").getExtension("WEBGL_lose_context");
          if (!extension) throw new Error("WEBGL_lose_context is required for this test");
          extension.loseContext();
        } else if (fault === "cleanup-error") {
          const release = worldOwner.dispose;
          worldOwner.dispose = () => { release(); fail(); };
          showGraphicsError();
        } else if (fault === "dispose") {
          activeView = null;
          retiredView.dispose(); retiredView.dispose();
          showGraphicsError();
        } else render();
      }, fault);
      await page.waitForFunction(() => document.getElementById("game").dataset.view === "unavailable", null, { polling: 50 });
      assert.equal(await page.locator("#scene-3d").count(), 0, fault + ": failed canvas is removed");
      assert.equal(await page.evaluate(() => activeView), null, fault + ": no retired view remains active");
      const metrics = await page.evaluate(() => lifecycleSnapshot());
      assert.ok(metrics.resources.length > 0, "observe actual owned resources, not just a disposal flag");
      assert.deepEqual(metrics.renderers, [{ disposed: 1, lost: 1 }], fault + ": dispose renderer and release context exactly once");
      for (const resource of metrics.resources)
        assert.equal(resource.disposed, 1, fault + ": " + resource.kind + " is disposed exactly once");
      if (!["model", "partial-model", "partial-hero", "world", "dispose"].includes(fault)) {
        assert.equal(await page.evaluate(() => state), "pause", fault + ": pause rather than dropping the run");
        assert.equal(await page.evaluate(() => runSnapshot()), await page.evaluate(() => beforeFailure), fault + ": preserve gameplay state");
      }
      assert.ok(await page.getByRole("alert").isVisible(), fault + ": clear WebGL failure message");
      assert.ok(await page.getByRole("button", { name: "Перезагрузить", exact: true }).isVisible());
      assert.equal(await page.locator("#start, #resume, #restart").count(), 0);
      const stopped = await page.evaluate((fault) => {
        const before = runSnapshot(), time = JSON.stringify([clock, worldTime]);
        // Repeated cleanup and late events from the old canvas must be harmless.
        if (!["model", "partial-model", "partial-hero", "world"].includes(fault)) {
          retiredView.dispose(); retiredView.render(); retiredView.resize();
          retiredCanvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
        }
        let scheduled = 0;
        requestAnimationFrame = () => ++scheduled;
        start(); menu(); tick(.04); frame(100); resize(); render(); initializeView();
        return { frozen: before === runSnapshot() && time === JSON.stringify([clock, worldTime]),
          scheduled, view: document.getElementById("game").dataset.view };
      }, fault);
      assert.deepEqual(stopped, { frozen: true, scheduled: 0, view: "unavailable" }, fault + ": game/RAF stop, no hidden retry loop");
      assert.deepEqual(await page.evaluate(() => lifecycleSnapshot()), metrics, fault + ": no double disposal or reallocation");
    }
    assert.deepEqual(errors, [], "faults are contained, with no uncaught browser exceptions");
    console.log("PASS: model/partial-model/partial-hero/world/animation/renderer/resize faults, real context loss, cleanup failure and repeated disposal; all observed hero/world/shared resources disposed once; no stale canvas callbacks; gameplay preserved; explicit WebGL error; input/RAF remain stopped with no alternate renderer.");
  } finally { await session.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
