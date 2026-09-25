// The pilot runs over the existing Live Server with TEST_BASE_URL, never file://.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { openBrowser, captureViews } = require("../helpers/browser");
(async () => {
  const session = await openBrowser({ deviceScaleFactor: 1 });
  try {
    await captureViews(session.context);
    async function inspect(mode) {
      const page = await session.context.newPage(), errors = [], warnings = [];
      let requests = 0;
      page.on("request", r => { if (r.url().endsWith("/nyc-taxi.glb")) requests++; });
      page.on("pageerror", e => errors.push(e.message));
      page.on("console", m => {
        if (m.type() === "error") errors.push(m.text());
        if (m.type() === "warning") warnings.push(m.text());
      });
      if (mode === "unavailable") await page.route("**/nyc-taxi.glb", route => route.fulfill({ status: 404, body: "unavailable" }));
      if (mode === "invalid") await page.route("**/nyc-taxi.glb", route => route.fulfill({ status: 200, body: "invalid GLB" }));
      await page.goto(session.url);
      await page.waitForFunction(() => activeView);
      await page.evaluate(() => render());
      if (mode === "success") await page.waitForFunction(() => testViews.worldScene.getObjectByName("nyc-taxi-visual"));
      else await page.waitForFunction(() => !testViews.worldScene.getObjectByName("nyc-taxi-visual") && !!activeView);
      // Await fetch/parse handling, including the caught failure path.
      if (mode !== "success") await page.waitForFunction(() => performance.getEntriesByType("resource").some(r => r.name.endsWith("/nyc-taxi.glb")));
      await page.waitForTimeout(100);
      const data = await page.evaluate(() => {
        const T = THREE, world = testViews.worldScene.getObjectByName("ratio-world");
        const cars = world.children.filter(n => n.userData.kind === "car");
        const visuals = cars.map(car => car.getObjectByName("nyc-taxi-visual"));
        const samples = [];
        for (const time of [0, 1, 8, 12, 24, 30, 48, 52, 70, 95, 150, 300]) {
          worldTime = time; render();
          samples.push(cars.map(car => [car.position.toArray(), car.quaternion.toArray()]));
        }
        const bounds = visuals.map((visual, i) => {
          if (!visual) return null;
          const car = cars[i], p = car.position.clone(), q = car.quaternion.clone();
          car.position.set(0, 0, 0); car.quaternion.identity();
          // Neutral tire phase for exact authored grounding.
          visual.traverse(n => { if (/^WHEEL_/.test(n.name)) n.rotation.x = 0; });
          car.updateMatrixWorld(true);
          const b = new T.Box3().setFromObject(visual, true);
          const lights = new T.Box3().setFromObject(visual.getObjectByName("FRONT_LIGHTS"), true);
          car.position.copy(p); car.quaternion.copy(q);
          return { min:b.min.toArray(), max:b.max.toArray(), frontZ:lights.getCenter(new T.Vector3()).z };
        });
        const meshLists = visuals.map(v => { const list=[]; if(v)v.traverse(n=>{if(n.isMesh)list.push(n);}); return list; });
        const shared = meshLists[0].length > 0 && meshLists[0].every((m,i) => meshLists[1][i] !== m && meshLists[1][i].geometry === m.geometry && meshLists[1][i].material === m.material);
        worldTime = 12; render();
        start(); for(let i=0;i<60;i++)tick(1/60); pause(); render();
        const playable = state === "pause" && elapsed > .9 && !!activeView;
        const fallbackVisible = cars.every(c => c.children.filter(n=>n.name!=="nyc-taxi-visual").every(n=>n.visible));
        return { count:visuals.filter(Boolean).length, samples, bounds, shared, playable, fallbackVisible, revision:T.REVISION };
      });
      if (mode === "success") {
        assert.equal(data.count, 3); assert.ok(data.shared);
        assert.equal(data.fallbackVisible, false);
        for (const b of data.bounds) {
          assert.ok(b.min[0] >= -1 && b.max[0] <= 1);
          assert.ok(b.min[2] >= -2.05 && b.max[2] <= 2.10);
          assert.ok(Math.abs(b.min[1]) < 1e-6 && b.max[1] < 1.35);
          assert.ok(b.frontZ > 1.8, "headlights face existing +Z travel direction");
        }
        if (process.env.SCREENSHOT_DIR) {
          fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive:true });
          await page.getByRole("button", { name:"Продолжить", exact:true }).click();
          await page.evaluate(() => { worldTime=12; render(); });
          await page.screenshot({ path:path.join(process.env.SCREENSHOT_DIR,"taxi-pilot-portrait.png") });
          await page.evaluate(() => { worldTime=0; render(); });
          await page.screenshot({ path:path.join(process.env.SCREENSHOT_DIR,"taxi-pilot-avenue.png") });
        }
        assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
        // GPU ownership: every loaded resource is released exactly once.
        const disposal = await page.evaluate(() => {
          const resources=new Set(), counts=[];
          testViews.worldScene.getObjectByName("nyc-taxi-visual").traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.material)resources.add(n.material);});
          for(const r of resources){const counter={n:0};counts.push(counter);r.addEventListener("dispose",()=>counter.n++);}
          disposeApplication(); disposeApplication();
          return counts.map(c=>c.n);
        });
        assert.ok(disposal.length > 0 && disposal.every(n=>n===1));
      } else {
        assert.equal(data.count, 0); assert.ok(data.fallbackVisible);
        assert.ok(warnings.some(w=>w.includes("using procedural cars")));
        assert.deepEqual(errors.filter(e=>!e.includes("404")), []);
      }
      assert.ok(data.playable); assert.equal(requests, 1);
      console.log(mode, JSON.stringify({ requests, bounds:data.bounds, errors, warnings:warnings.length }));
      await page.close(); return data.samples;
    }
    const imported = await inspect("success");
    assert.deepEqual(await inspect("unavailable"), imported, "fallback and GLB use identical motion containers at all sampled times");
    assert.deepEqual(await inspect("invalid"), imported);
    console.log("PASS: one GLB request, three shared clones, direction/grounding/footprint, exact parent motion, playable missing/invalid fallbacks and owned GPU disposal.");
  } finally { await session.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
