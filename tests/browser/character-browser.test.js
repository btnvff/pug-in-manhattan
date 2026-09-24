// Run with externally installed Playwright, like browser.test.js.
// HTTP by default; OFFLINE_BROWSER=1 opts into local-content loading.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { openBrowser, captureViews } = require("../helpers/browser");
(async () => {
  const session = await openBrowser({ deviceScaleFactor: 2 });
  try {
    const { context, url } = session;
    await captureViews(context);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(url);
    assert.equal(await page.locator("#game").getAttribute("data-view"), "3d");
    await page.evaluate(() => {
      const animate = animatePugModel;
      animatePugModel = (hero, signal) => { window.reviewHero = hero; return animate(hero, signal); };
      window.reviewSnapshot = () => {
        const matrices = [];
        reviewHero.updateMatrixWorld(true);
        reviewHero.traverse((node) => matrices.push([node.matrixWorld.elements, node.visible, node.material?.opacity]));
        return JSON.stringify([reviewHero.userData.pose, matrices]);
      };
      prefs.sound = false; start(); render();
    });
    const trace = (...args) => { if (process.env.TRACE_CHARACTER) console.log(...args); };
    const capture = async (name) => {
      if (!process.env.SCREENSHOT_DIR) return;
      fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, name + ".png"), timeout: 20000 });
    };
    for (const pose of ["idle", "look", "move", "catch", "bad", "blink", "breath", "win", "lose"]) {
      trace("Rendering", pose);
      await page.evaluate((pose) => {
        start(); spawnIn = 999; clock = 0.7;
        if (pose === "look") { headTurn = 0.8; lookUp = 0.7; gazeX = 0.8; gazeY = -0.7; }
        if (pose === "move") { runBlend = 0.9; gait = 1.3; lean = 0.06; }
        if (pose === "catch") { collect({ type: 0 }); react = 0.25; chewTime = 0.39; }
        if (pose === "bad") { collect({ type: 4 }); react = 0.25; }
        if (pose === "blink") clock = 2.925;
        if (pose === "breath") clock = 5.65;
        if (pose === "win") finish(true);
        if (pose === "lose") finish(false);
        render();
      }, pose);
      await capture("character-" + pose);
      if (pose !== "win" && pose !== "lose") {
        const before = await page.evaluate(() => reviewSnapshot());
        await page.evaluate(() => { pause(); for (let frame = 0; frame < 3; frame++) { tick(0.04); render(); } });
        assert.equal(await page.evaluate(() => reviewSnapshot()), before, pose + " freezes the exact pose, transforms, shadow and steam on pause");
      }
    }
    for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      trace("Resizing", size);
      await page.setViewportSize(size);
      for (const side of [-1, 1]) {
        const bounds = await page.evaluate((side) => {
          resize(); start(); x = side < 0 ? margin() : W - margin();
          headTurn = side; lookUp = 0.8; lean = side * 0.08; gait = 1.8; runBlend = 1; render();
          reviewHero.updateMatrixWorld(true);
          const point = new THREE.Vector3();
          let min = Infinity, max = -Infinity;
          reviewHero.traverseVisible((mesh) => {
            if (!mesh.isMesh || /shadow|contact|wisp/.test(mesh.name)) return;
            const positions = mesh.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(testViews.gameplayCamera);
              const u = (point.x + 1) / 2;
              min = Math.min(min, u); max = Math.max(max, u);
            }
          });
          return { min, max, width: 1 };
        }, side);
        assert.ok(bounds.min >= 0 && bounds.max <= bounds.width, "hero stays inside unchanged screen/input bounds");
        await capture("edge-" + size.width + "-" + side);
      }
    }
    // Exercise real GPU allocations, including the shared shadow/breath DataTexture.
    trace("Testing GPU lifecycle");
    const gpu = await page.evaluate(() => {
      const T = window.THREE;
      const renderer = new T.WebGLRenderer({ antialias: false });
      renderer.setSize(192, 192);
      const scene = new T.Scene(), camera = new T.OrthographicCamera(-90, 90, 155, -25, 1, 2000);
      camera.position.z = 1000;
      scene.add(new T.HemisphereLight("#ffffff", "#777777", 2));
      const metrics = [];
      const snapshot = () => ({ ...renderer.info.memory, programs: renderer.info.programs.length });
      // r185 lazily uploads a renderer-owned DFG LUT for all standard materials.
      // Warm it independently of the hero so a retained hero texture cannot hide in the baseline.
      const probe = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial());
      scene.add(probe); renderer.render(scene, camera); scene.remove(probe);
      probe.geometry.dispose(); probe.material.dispose(); renderer.render(scene, camera);
      const baseline = snapshot();
      try {
        for (let cycle = 0; cycle < 6; cycle++) {
          const hero = createPugModel(); scene.add(hero);
          // Upload every visibility branch before comparing steady-state memory.
          for (const signal of [
            { time: 2.925, state: "menu" },
            { time: 0.7, state: "play", chewTime: 0.1, reaction: 1 },
            { time: 5.65, state: "menu" },
          ]) { animatePugModel(hero, signal); renderer.render(scene, camera); }
          const warm = snapshot();
          for (let frame = 0; frame < 60; frame++) {
            animatePugModel(hero, { time: frame / 10, state: "play", runBlend: 0.8, gait: frame / 3 });
            renderer.render(scene, camera);
          }
          const after = snapshot();
          scene.remove(hero); hero.userData.dispose(); hero.userData.dispose();
          renderer.render(scene, camera);
          metrics.push({ warm, after, released: snapshot() });
        }
      } finally { renderer.dispose(); renderer.forceContextLoss(); }
      return { baseline, metrics };
    });
    for (const metric of gpu.metrics) {
      assert.deepEqual(metric.after, metric.warm, "animation does not grow GPU resources");
      assert.deepEqual(metric.released, gpu.baseline, "all hero-owned resources release back to the independent renderer baseline");
    }
    assert.deepEqual(errors, [], "no exceptions or WebGL/shader errors");
    console.log("PASS: 9 rendered character states; exact pause including transforms/steam; edge-safe silhouette at 320x568, 390x844 and 844x390; 6 GPU lifecycle cycles with zero retained hero resources; no shader/browser errors.");
  } finally { await session.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
