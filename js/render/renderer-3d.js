// Presentation only: the same orientation for live items and missed drops.
function foodAngle(item) {
  return (item.angle ?? 0) + (item.age ?? 0) * (item.spin ?? 0) +
    Math.sin((item.age ?? 0) * 2 + (item.phase ?? 0)) * 0.22;
}
// WORLD uses the calibrated perspective camera. GAMEPLAY_PLANE is rendered at
// fixed depth with an orthographic presentation camera; simulation stays read-only.
function createThreeView() {
  const T = window.THREE, C = PUG_WORLD_RATIO;
  if (!T || !ctx)
    throw new Error("3D presentation dependencies did not load");
  const canvas = document.createElement("canvas");
  canvas.id = "scene-3d";
  canvas.setAttribute("aria-hidden", "true");
  let renderer, model, hero, scene, camera, worldScene, worldCamera, world = null, disposed = false;
  const visuals = new Map(), spare = new Map();
  const seen = new Set();
  function dispose() {
    if (disposed)
      return;
    disposed = true;
    // Unsubscribe before forceContextLoss: a retired view must not pause a new run.
    canvas.removeEventListener("webglcontextlost", onContextLost);
    disposeThreeResources([world, hero?.userData, model]);
    visuals.clear();
    spare.clear();
    seen.clear();
    scene?.clear();
    worldScene?.clear();
    disposeThreeResources([renderer]);
    try {
      renderer?.forceContextLoss();
    }
    catch (error) {
      console.warn("Could not release WebGL context.", error);
    }
    finally {
      canvas.remove();
    }
  }
  function onContextLost(event) {
    event.preventDefault();
    showGraphicsError();
  }
  function guarded(action) {
    return () => {
      if (disposed)
        return;
      try {
        action();
      }
      catch (error) {
        showGraphicsError(error);
      }
    };
  }
  // Cover model construction too, not only the final resize/DOM insertion.
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    scene = new T.Scene();
    worldScene = new T.Scene();
    worldScene.background = new T.Color("#90c5db");
    worldScene.fog = new T.Fog("#b4ced5", 90, 360);
    worldCamera = WorldRatio.camera(T);
    camera = new T.OrthographicCamera(-WorldRatio.aspect / (2 * C.pug_height_ratio), WorldRatio.aspect / (2 * C.pug_height_ratio), C.pug_ground_v / C.pug_height_ratio, (C.pug_ground_v - 1) / C.pug_height_ratio, 1, 200);
    camera.position.z = 100;
    scene.add(new T.HemisphereLight("#e3f4ff", "#797168", 1.65));
    const sun = new T.DirectionalLight("#ffdfad", 2.35);
    sun.position.set(-250, 500, 650);
    scene.add(sun);
    const fill = new T.DirectionalLight("#bee2ff", 1.05);
    fill.position.set(300, 100, 300);
    scene.add(fill);
    model = createModelFactory();
    hero = createPugModel();
    hero.userData.space = "GAMEPLAY_PLANE";
    scene.add(hero);
    animatePugModel(hero, { time: 0, state: "play" });
    const neutral = WorldRatio.bounds(hero, T);
    hero.userData.ratioNormalization = { height: neutral.max.y - neutral.min.y, centerX: (neutral.min.x + neutral.max.x) / 2, ground: neutral.min.y };
    // World-only contrast and warm sun. Hero/food lighting above remains intact.
    for (const light of scene.children.filter(o => o.isLight)) {
      const streetLight=light.clone();
      if(light.isHemisphereLight) {
        streetLight.intensity=1.05;streetLight.color.set("#c7e0ef");streetLight.groundColor.set("#776e58");
      } else if(light===sun) {
        streetLight.intensity=2.8;streetLight.color.set("#ffe0ad");streetLight.position.set(-150,240,160);
      } else streetLight.intensity=.55;
      worldScene.add(streetLight);
    }
    world = createRatioWorld(model);
    worldScene.add(world.root);
    renderer.autoClear = false;
  }
  catch (error) {
    dispose();
    throw error;
  }
  const heroSignal = {};
  const catMouth = new T.Vector3();
  function place(object, px, py, z = 0) {
    object.position.set(RatioPresentation.worldX(px), RatioPresentation.worldY(py), z / 100);
    object.userData.space = "GAMEPLAY_PLANE";
  }
  function visual(key, kind, build) {
    seen.add(key);
    let record = visuals.get(key);
    if (!record) {
      const pool = spare.get(kind);
      const mesh = pool?.length ? pool.pop() : build();
      scene.add(mesh);
      mesh.visible = true;
      record = { mesh, kind };
      visuals.set(key, record);
    }
    return record.mesh;
  }
  function foodVisual(key, type, variant, px, py, angle = 0, scale = 1, z = 50) {
    const mesh = visual(key, "food:" + type + ":" + (variant % 8), () => model.foodModel(type, variant));
    place(mesh, px, py, z);
    mesh.scale.setScalar(scale * RatioPresentation.foodScale);
    mesh.rotation.set(0.20, Math.sin(clock * 0.7 + variant) * 0.16, -angle);
    return mesh;
  }
  function catVisual(key, coat, px, py, direction, size, time, running, pickup = 0, toss = 0) {
    const mesh = visual(key, "cat:" + coat, () => model.catModel(coat));
    place(mesh, px, py, 15);
    mesh.scale.set(size * direction * RatioPresentation.heroScale, size * RatioPresentation.heroScale, size * RatioPresentation.heroScale);
    mesh.rotation.z = 0;
    const rig = mesh.userData, stride = time * 14;
    rig.spine.position.y = 17 + (running ? Math.sin(stride * 2) * 1.1 : Math.sin(time * 2.4) * .35) - pickup * 2;
    rig.spine.scale.set(1 + (running ? Math.sin(stride * 2) * .035 : 0), 1 - pickup * .06, 1);
    rig.head.position.set(18 + pickup * 3, 29 - pickup * 12 + toss * 3, 2);
    rig.head.rotation.set(-toss * .12, .08 * Math.sin(time * 2), -pickup * .3 + (running ? Math.sin(stride - .4) * .045 : Math.sin(time * 1.8) * .035));
    rig.tail.rotation.set(Math.sin(time * 3) * .12, Math.sin(time * 3 - .6) * .2, (running ? -.22 : .12) + Math.sin(time * 4 - .8) * .16);
    rig.legs.forEach((leg, i) => {
      const phase = stride + [0, Math.PI, Math.PI * .7, Math.PI * 1.7][i];
      const step = running ? Math.sin(phase) : 0;
      leg.rotation.z = step * .4 + (i > 1 ? pickup * .15 : -pickup * .08) + (i === 3 ? -toss * .75 : 0);
      leg.position.y = 15 + Math.max(0, step) * 2 - pickup;
      rig.ankles[i].rotation.z = -Math.max(0, step) * .45;
    });
    return mesh;
  }
  function birdVisual(key, px, py, direction, size, time, flying = true) {
    const mesh = visual(key, "bird", model.birdModel);
    place(mesh, px, py, 35);
    mesh.scale.set(size * direction * RatioPresentation.heroScale, size * RatioPresentation.heroScale, size * RatioPresentation.heroScale);
    mesh.userData.wings.forEach((wing, i) => wing.rotation.z = flying ? Math.sin(time * 22) * (i ? 1 : -1) * 0.7 : 0);
  }
  function animateHeroModel() {
    const hx = ratioMode === "reference" || ratioMode === "blockout" ? W * PUG_WORLD_RATIO.reference_pug_u : x;
    const hy = ground();
    const scale = heroScale();
    place(hero, hx, hy, 20);
    hero.scale.setScalar(1 / hero.userData.ratioNormalization.height);
    hero.position.x -= hero.userData.ratioNormalization.centerX * hero.scale.x;
    hero.position.y -= hero.userData.ratioNormalization.ground * hero.scale.y;
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
    animatePugModel(hero, ratioMode === "reference" || ratioMode === "blockout" ? { time: 0, state: "play" } : heroSignal);
    hero.visible = ratioMode !== "blockout";
  }
  function render() {
    seen.clear();
    world.animate(ratioMode === "reference" || ratioMode === "blockout" ? 0 : worldTime);
    animateHeroModel();
    if (state === "menu") {
      if (!ratioMode) {
        foodVisual("menu-left", 0, 0, W * 0.17, H * 0.48, -0.4);
        foodVisual("menu-donut", 3, 0, W * 0.82, H * 0.44, 0.2);
        foodVisual("menu-right", 0, 2, W * 0.8, H * 0.59, 0.5);
      }
    }
    else {
      for (const item of items) {
        if (item.used || item.warning > 0)
          continue;
        foodVisual(item, item.type, item.variant ?? 0, item.x, item.y, foodAngle(item));
      }
      for (const drop of streetEvents.drops)
        foodVisual(drop, drop.type, drop.variant ?? 0, drop.x, drop.y, foodAngle(drop));
      for (const cat of cats) {
        const t = catTiming(cat), edge = cat.side < 0 ? -45 : W + 45;
        const inward = -cat.side, target = cat.x - inward * 27 * 1.1;
        const arriving = cat.t < t.leave;
        const px = arriving ? edge + (target - edge) * easeInOut((cat.t - t.wait) / t.travel) : target + (edge - target) * easeInOut((cat.t - t.leave) / t.travel);
        const direction = arriving ? inward : cat.side;
        const pickup = Math.sin(clamp((cat.t - t.arrival) / (t.leave - t.arrival), 0, 1) * Math.PI);
        const mesh = catVisual(cat, cat.coat, px, landingY() + 12, direction, 1.1, cat.t, (cat.t > t.wait && cat.t < t.arrival) || cat.t > t.leave, pickup);
        mesh.userData.mouthAnchor.getWorldPosition(catMouth);
        foodVisual(catFoodKey(cat), 0, cat.variant, cat.t < t.pickup ? cat.x : RatioPresentation.logicalX(catMouth.x), cat.t < t.pickup ? landingY() : RatioPresentation.fromWorldY(catMouth.y), cat.t < t.pickup ? .2 : .7, cat.t < t.pickup ? 1 : 0.45);
      }
      if (powerTimers.helpers > 0)
        for (const side of [-1, 1]) {
          const pose = helperPresentation(side);
          const toss = pose.running ? 0 : Math.max(0, Math.sin((catAge - BALANCE.helpers.first) / BALANCE.helpers.catsInterval * Math.PI * 2));
          catVisual("helper:" + side, side < 0 ? 0 : 1, pose.x, ground(), pose.direction, 1.2, catAge, pose.running, 0, toss);
        }
      if (powerTimers.birds > 0)
        for (let n = 0; n < 3; n++) {
          const p = birdPosition(n);
          birdVisual("bird-helper:" + n, p.x, p.y + Math.sin(clock * 3 + n) * 3, n === 2 ? -1 : 1, 1, clock + n);
        }
      for (const gift of catGifts) {
        const u = clamp(gift.t / BALANCE.helpers.flight, 0, 1);
        const origin = helperGiftOrigin(gift);
        foodVisual(gift, 0, gift.variant, origin.sx + (x + headTurn * 5 - origin.sx) * u, origin.sy + (ground() - 64 * heroScale() - origin.sy) * u - Math.sin(u * Math.PI) * 45, (1 - u) * 2, 0.65, 90);
      }
    }
    for (const [key, record] of visuals)
      if (!seen.has(key)) {
        scene.remove(record.mesh);
        visuals.delete(key);
        if (!spare.has(record.kind))
          spare.set(record.kind, []);
        const pool = spare.get(record.kind);
        if (pool.length < BALANCE.spawning.eventMaxItems)
          pool.push(record.mesh);
      }
    renderer.clear();
    renderer.render(worldScene, worldCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
    clearRatioCanvas();
    beginRatioFeedback();
    if (state !== "menu") {
      drawPowerAura();
      drawRunFeedback();
      drawEventFeedback();
      for (const item of items) {
        drawHazardCue(item);
        if (item.warning > 0)
          continue;
        drawRareFoodAura(item);
        drawSpecial(item);
      }
    }
    drawFloatingFeedback();
    drawVictoryFeedback();
    drawRatioDiagnostics();
  }
  // Weak keys add no properties to gameplay objects and expire with each run.
  const attachedKeys = new WeakMap();
  function catFoodKey(cat) {
    if (!attachedKeys.has(cat))
      attachedKeys.set(cat, {});
    return attachedKeys.get(cat);
  }
  function resize() {
    // game.resize() owns rounding and DPR for both canvases. Use its exact
    // drawing-buffer dimensions; CSS owns display size and the camera stays fixed.
    renderer.setSize(cv.width, cv.height, false);
  }
  try {
    canvas.addEventListener("webglcontextlost", onContextLost);
    resize();
    cv.parentNode.insertBefore(canvas, cv);
    return { render: guarded(render), resize: guarded(resize), dispose };
  }
  catch (error) {
    dispose();
    throw error;
  }
}
