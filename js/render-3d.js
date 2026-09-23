// Orthographic projection keeps (x, y) exactly aligned with existing hit detection.
// Models have depth and lighting; the simulation retains its original pixel units.
function createThreeView() {
  const T = window.THREE;
  if (!T) throw new Error("Three.js did not load");
  const canvas = document.createElement("canvas");
  canvas.id = "scene-3d";
  canvas.setAttribute("aria-hidden", "true");
  let renderer, model, hero, scene, camera, world = null, disposed = false;
  const visuals = new Map(), spare = new Map();
  let seen = new Set();
  function dispose() {
    if (disposed) return;
    disposed = true;
    // Unsubscribe before forceContextLoss: a retired view must not pause a new run.
    canvas.removeEventListener("webglcontextlost", onContextLost);
    world?.dispose();
    hero?.userData.dispose();
    model?.dispose();
    visuals.clear(); spare.clear(); seen.clear(); scene?.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas.remove();
  }
  function onContextLost(event) {
    event.preventDefault();
    fallbackToCanvas();
  }
  function guarded(action) {
    return () => {
      if (disposed) return;
      try { action(); }
      catch (error) { fallbackToCanvas(error); }
    };
  }
  // Cover model construction too, not only the final resize/DOM insertion.
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, BALANCE.frame.maxDpr));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    scene = new T.Scene();
    scene.background = new T.Color("#bce5eb");
    camera = new T.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 2400);
    camera.position.z = 1000;
    scene.add(new T.HemisphereLight("#fff6e2", "#718895", 2.4));
    const sun = new T.DirectionalLight("#fff1d4", 3.1);
    sun.position.set(-250, 500, 650); scene.add(sun);
    const fill = new T.DirectionalLight("#c5e4f1", 0.7);
    fill.position.set(300, 100, 300); scene.add(fill);
    model = createModelFactory();
    hero = model.pugModel(); scene.add(hero);
  } catch (error) {
    dispose();
    throw error;
  }
  const heroSignal = {};
  let worldWidth = 0, worldHeight = 0;
  function place(object, px, py, z = 0) {
    object.position.set(px - W / 2, H / 2 - py, z);
  }
  function visual(key, kind, build) {
    seen.add(key);
    let record = visuals.get(key);
    if (!record) {
      const pool = spare.get(kind);
      const mesh = pool?.length ? pool.pop() : build();
      scene.add(mesh); mesh.visible = true;
      record = { mesh, kind }; visuals.set(key, record);
    }
    return record.mesh;
  }
  function foodVisual(key, type, variant, px, py, angle = 0, scale = 1, z = 50) {
    const mesh = visual(key, "food:" + type + ":" + (variant % 8), () => model.foodModel(type, variant));
    place(mesh, px, py, z);
    mesh.scale.setScalar(scale);
    mesh.rotation.set(0.20, Math.sin(clock * 0.7 + variant) * 0.16, -angle);
    return mesh;
  }
  function catVisual(key, coat, px, py, direction, size, time, running) {
    const mesh = visual(key, "cat:" + coat, () => model.catModel(coat));
    place(mesh, px, py - (running ? Math.abs(Math.sin(time * 16)) * 2 : 0), 15);
    mesh.scale.set(size * direction, size, size);
    mesh.rotation.z = running ? Math.sin(time * 16) * 0.025 : 0;
  }
  function birdVisual(key, px, py, direction, size, time, flying = true) {
    const mesh = visual(key, "bird", model.birdModel);
    place(mesh, px, py, 35); mesh.scale.set(size * direction, size, size);
    mesh.userData.wings.forEach((wing, i) => wing.rotation.z = flying ? Math.sin(time * 22) * (i ? 1 : -1) * 0.7 : 0);
  }
  function animateHeroModel() {
    const landscape = W > 550;
    const menuMode = state === "menu";
    const hx = menuMode ? landscape ? W * 0.25 : W / 2 : landscape && (state === "win" || state === "lose") ? W * 0.25 : x;
    const hy = menuMode ? landscape ? H - 35 : H < 660 ? H - 256 : H * 0.61 : ground();
    const scale = menuMode ? landscape ? 1 : H < 660 ? 0.75 : 1.16 : heroScale();
    place(hero, hx, hy, 20); hero.scale.setScalar(scale);
    // Read-only presentation signals; collision/input and their smoothing stay unchanged.
    heroSignal.time = clock;
    heroSignal.state = state;
    heroSignal.runBlend = runBlend;
    heroSignal.gait = gait;
    // Fade visual lean near the edge without moving the catch/input coordinates.
    heroSignal.edgeBlend = clamp((Math.min(hx, W - hx) / scale - 50) / 20, 0, 1);
    heroSignal.lean = lean;
    heroSignal.headTurn = headTurn;
    heroSignal.lookUp = lookUp;
    heroSignal.gazeX = gazeX;
    heroSignal.gazeY = gazeY;
    heroSignal.hasTarget = Boolean(gazeTarget);
    heroSignal.tailSwing = tailSwing;
    heroSignal.react = react;
    heroSignal.reaction = reaction;
    heroSignal.chewTime = chewTime;
    heroSignal.reactionDuration = BALANCE.feedback.reaction;
    heroSignal.chewDuration = BALANCE.feedback.chew;
    animatePugModel(hero, heroSignal);
  }
  function render() {
    seen = new Set();
    world.animate(worldTime);
    animateHeroModel();
    if (state === "menu") {
      if (W <= 550) {
        foodVisual("menu-left", 0, 0, W * 0.17, H * 0.48, -0.4);
        foodVisual("menu-donut", 3, 0, W * 0.82, H * 0.44, 0.2);
        foodVisual("menu-right", 0, 2, W * 0.8, H * 0.59, 0.5);
      }
    } else {
      for (const item of items) {
        if (item.used || item.warning > 0) continue;
        foodVisual(item, item.type, item.variant ?? 0, item.x, item.y,
          (item.angle ?? 0) + (item.age ?? 0) * (item.spin ?? 0) + Math.sin((item.age ?? 0) * 2 + (item.phase ?? 0)) * 0.22);
      }
      for (const cat of cats) {
        const t = catTiming(cat), edge = cat.side < 0 ? -45 : W + 45;
        const inward = -cat.side, target = cat.x - inward * 27 * 1.1;
        const arriving = cat.t < t.leave;
        const px = arriving ? edge + (target - edge) * easeInOut((cat.t - t.wait) / t.travel) : target + (edge - target) * easeInOut((cat.t - t.leave) / t.travel);
        const direction = arriving ? inward : cat.side;
        catVisual(cat, cat.coat, px, landingY() + 12, direction, 1.1, cat.t, (cat.t > t.wait && cat.t < t.arrival) || cat.t > t.leave);
        foodVisual(catFoodKey(cat), 0, cat.variant, cat.t < t.pickup ? cat.x : px + direction * 28, cat.t < t.pickup ? landingY() : landingY() - 10, 0.2, cat.t < t.pickup ? 1 : 0.45);
      }
      for (const flock of flocks) {
        const t = flock.t, departure = 1.85;
        for (let n = 0; n < 2; n++) {
          const startX = flock.side < 0 ? -35 : W + 35;
          const startY = H * 0.55 + n * 25;
          const targetX = flock.x + (n ? 14 : -14);
          const leaving = t >= departure, u = easeInOut(leaving ? (t - departure) / 1.6 : t / 1.1);
          const px = leaving ? targetX + (startX - flock.x) * u : startX + (targetX - startX) * u;
          const py = leaving ? landingY() - 9 - H * 0.5 * u : startY + (landingY() - 9 - startY) * u;
          const direction = leaving ? flock.side : -flock.side;
          birdVisual(flockKey(flock, n), px, py, direction, 0.8, t + n, t < 1.1 || leaving);
          if (n === 0) foodVisual(flockKey(flock, 2), flock.type, flock.variant, t < 1.5 ? flock.x : px + direction * 13, t < 1.5 ? landingY() : py + 6, 0.1, t < 1.5 ? 1 : 0.42);
        }
      }
      if (powerTimers.helpers > 0) for (const side of [-1, 1])
        catVisual("helper:" + side, side < 0 ? 0 : 1, helperX(side), ground(), -side, 1.2, catAge, false);
      if (powerTimers.birds > 0) for (let n = 0; n < 3; n++) {
        const p = birdPosition(n);
        birdVisual("bird-helper:" + n, p.x, p.y + Math.sin(clock * 3 + n) * 3, n === 2 ? -1 : 1, 1, clock + n);
      }
      for (const gift of catGifts) {
        const u = clamp(gift.t / BALANCE.helpers.flight, 0, 1);
        foodVisual(gift, 0, gift.variant, gift.sx + (x + headTurn * 5 - gift.sx) * u,
          gift.sy + (ground() - 64 * heroScale() - gift.sy) * u - Math.sin(u * Math.PI) * 45, (1 - u) * 2, 0.65, 90);
      }
    }
    for (const [key, record] of visuals) if (!seen.has(key)) {
      scene.remove(record.mesh); visuals.delete(key);
      if (!spare.has(record.kind)) spare.set(record.kind, []);
      const pool = spare.get(record.kind);
      if (pool.length < BALANCE.spawning.eventMaxItems) pool.push(record.mesh);
    }
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, W, H);
    if (state !== "menu") {
      drawPowerAura(); drawRunFeedback(); drawEventFeedback();
      for (const item of items) {
        drawHazardCue(item);
        if (item.warning > 0) continue;
        drawRareFoodAura(item); drawSpecial(item);
      }
    }
    drawFloatingFeedback();
    drawVictoryFeedback();
  }
  // Weak keys add no properties to gameplay objects and expire with each run.
  const attachedKeys = new WeakMap();
  function flockKey(object, index) {
    if (!attachedKeys.has(object)) attachedKeys.set(object, [{}, {}, {}]);
    return attachedKeys.get(object)[index];
  }
  function catFoodKey(cat) { return flockKey(cat, 0); }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, BALANCE.frame.maxDpr));
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    if (worldWidth !== W || worldHeight !== H) {
      if (world) { scene.remove(world.root); world.dispose(); world = null; }
      const scale = Math.min(1, H / 700);
      world = createThreeWorld(model, W / scale, H / scale);
      world.root.scale.setScalar(scale);
      worldWidth = W; worldHeight = H; scene.add(world.root);
    }
  }
  try {
    canvas.addEventListener("webglcontextlost", onContextLost);
    resize();
    cv.parentNode.insertBefore(canvas, cv);
    return { render: guarded(render), resize: guarded(resize), dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
