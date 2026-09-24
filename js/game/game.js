"use strict";
// Run state, spawn/collision rules and simulation clock. Presentation only reads these.
// Every caught sausage gently increases difficulty; transition is smoothed.
let difficulty = 0;
function challenge() {
  const b = BALANCE.difficulty,
    d = difficulty;
  const mix = (a, z) => a + (z - a) * d;
  let spawn = b.spawnStart.map((v, i) => mix(v, b.spawnEnd[i]));
  let veg = mix(b.hazardStart, b.hazardEnd);
  if (rhythmKind === "rush") {
    spawn = spawn.map((v) => v * BALANCE.rhythm.rushSpawn);
    veg *= BALANCE.rhythm.rushHazard;
  }
  if (rhythmKind === "wave") {
    spawn = spawn.map((v) => v * BALANCE.rhythm.waveSpawn);
    veg = Math.min(b.hazardEnd, veg + BALANCE.rhythm.waveHazard);
  }
  if (rhythmKind === "rest") {
    spawn = spawn.map((v) => v * BALANCE.rhythm.restSpawn);
    veg *= BALANCE.rhythm.restHazard;
  }
  if (powerTimers.wave > 0 && waveAge > BALANCE.event.warning)
    veg += BALANCE.event.waveExtra;
  if (powerTimers.rain > 0) {
    spawn = spawn.map((v) => v * 1.6);
    veg = Math.min(veg, 0.02);
  }
  if (powerTimers.trail > 0) spawn = spawn.map((v) => v * 1.25);
  return { fall: b.fallStart.map((v, i) => mix(v, b.fallEnd[i])), spawn, veg };
}
const food = BALANCE.food;
const { width: W, height: H } = PUG_WORLD_RATIO.logical_game;
let state = "menu",
  points = 0,
  sausages = 0,
  happy = BALANCE.happiness.start,
  elapsed = 0,
  items = [],
  effects = [],
  cats = [],
  spawnIn = BALANCE.spawning.first,
  clock = 0,
  x = 195,
  react = 0,
  reaction = 1,
  vegRun = 0;
let worldTime = 0;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  rand = (a, b) => a + Math.random() * (b - a);
function ground() {
  return H - 91;
}
function catchY() {
  return ground() - 85;
}
function heroScale() {
  return 1;
}
function margin() {
  return 49 * heroScale();
}
function menu() {
  if (graphicsUnavailable) return;
  state = "menu";
  resetStreetEvents();
  clearInput();
  items = [];
  effects = [];
  cats = [];
  resetPowers();
  resetRunState();
  x = W / 2;
  resetMotion();
  ui();
  sound("button");
}
function start() {
  if (graphicsUnavailable) return;
  unlockAudio();
  audioScene("restart");
  resetStreetEvents();
  difficulty = 0;
  resetRunState();
  clearInput();
  state = "play";
  points = 0;
  sausages = 0;
  happy = BALANCE.happiness.start;
  elapsed = 0;
  items = [];
  effects = [];
  cats = [];
  resetPowers();
  spawnIn = BALANCE.spawning.first;
  vegRun = 0;
  react = 0;
  x = W / 2;
  resetMotion();
  hud();
  ui();
  sound("start");
}
function pause() {
  if (state === "play") {
    state = "pause";
    clearInput();
    ui();
    if (!document.hidden) sound("pause");
  }
}
function finish(win) {
  state = win ? "win" : "lose";
  resetStreetEvents();
  clearInput();
  items = [];
  cats = [];
  resetPowers();
  prefs.best = Math.max(prefs.best, points);
  save();
  ui();
  sound(win ? "win" : "lose");
}
function collect(item) {
  if (item.used || state !== "play") return;
  item.used = true;
  if (item.type === 7) {
    collectBone();
    return;
  }
  const f = food[item.type];
  const beforeHappy = happy;
  if (isHazard(item.type) && powerTimers.shield > 0) {
    powerTimers.shield = 0;
    shieldPulse = 0.6;
    effects.push({ x, y: catchY() - 35, t: 0, text: "Щит!", good: true });
    sound("shield");
    powerHUD();
    return;
  }
  const earned =
    f.score > 0 && powerTimers.double > 0
      ? f.score * BALANCE.doubleMultiplier
      : f.score;
  awardScore(earned);
  happy = clamp(happy + f.happy, 0, BALANCE.happiness.max);
  // The pug keeps a fixed build regardless of food.
  if (item.type === 0) {
    sausages++;
  }
  if (item.type < 4) {
    registerGoodCatch(item);
    collectChain(item);
  } else streak = 0;
  healthFeedback(beforeHappy);
  if (item.type < 4) {
    // Keep this established RNG draw: future spawn parity depends on it.
    Math.random();
    chewTime = BALANCE.feedback.chew;
  } else chewTime = 0;
  react = BALANCE.feedback.reaction;
  reaction = item.type < 4 ? 1 : -1;
  effects.push({
    x: x,
    y: catchY() - 35,
    t: 0,
    text: (earned > 0 ? "+" : "") + earned,
    good: item.type < 4,
    strong: f.score >= 2,
    kind:
      item.type === 8
        ? "impact"
        : isHazard(item.type)
          ? "cold"
          : item.power
            ? "rare"
            : "food",
  });
  sound(
    [
      "eat",
      "dumpling",
      "chicken",
      "donut",
      "veg",
      "veg",
      "veg",
      "power",
      "veg",
    ][item.type],
    (x / W) * 2 - 1,
  );
  if (item.type >= 4) {
    try {
      navigator.vibrate?.(BALANCE.feedback.vibration);
    } catch {}
  }
  if (item.type === 8) {
    impactPulse = 0.35;
    applyPower("stun");
  } else if (item.power) applyPower(item.power);
  hud();
  if (happy === 0) finish(false);
}
function landingY() {
  return H - 61;
}
function catTiming(c) {
  const travel = c.travel ?? 1.2,
    wait = c.wait ?? 0.55,
    arrival = wait + travel,
    pickup = arrival + 0.4,
    leave = pickup + 0.25;
  return { travel, wait, arrival, pickup, leave, end: leave + travel };
}
function missSausage(it) {
  if (it.used || state !== "play") return;
  if (tryBounce(it)) return;
  it.used = true;
  const loss = Math.min(BALANCE.missedSausagePenalty, points);
  points -= loss;
  // Each missed sausage consumes one coat draw, even when no street cat appears.
  const coat = Math.floor(Math.random() * 3), streetCat = chooseStreetCat(it);
  if (streetCat) {
    sound("land", (it.x / W) * 2 - 1);
    cats.push({
      x: it.x,
      t: 0,
      wait: 0.55,
      travel: Math.max(0.9, Math.min(it.x + 40, W + 40 - it.x) / 150),
      side: it.x < W / 2 ? -1 : 1,
      variant: it.variant ?? 0,
      coat,
    });
  }
  if (loss || streetCat) effects.push({
    x: it.x,
    y: H - 97,
    t: 0,
    text: loss ? "−1" : "Кошке!",
    good: false,
  });
  hud();
  return streetCat;
}
function trajectoryClear(sx, speed) {
  return !items.some((it) => {
    if (it.used || Math.abs(it.x - sx) >= BALANCE.spawning.gapX) return false;
    if (it.warning > 0) return true;
    const end = Math.min(
      (catchY() - BALANCE.spawning.top) / speed,
      (catchY() - it.y) / it.speed,
    );
    if (end < 0) return false;
    const gap = it.y - BALANCE.spawning.top,
      relative = it.speed - speed;
    return (
      Math.min(Math.abs(gap), Math.abs(gap + relative * end)) <
        BALANCE.spawning.gapY || gap * (gap + relative * end) < 0
    );
  });
}
function spawn() {
  if (items.length >= objectLimit()) return;
  let m = challenge(),
    vegetable =
      elapsed >= BALANCE.introduction.hazards &&
      vegRun < BALANCE.spawning.maxHazardRun &&
      Math.random() < m.veg;
  let type = vegetable
    ? 4 + Math.floor(Math.random() * 3)
    : elapsed < BALANCE.introduction.otherFood ||
        Math.random() <
          (rhythmKind === "rush"
            ? BALANCE.rhythm.rushSausage
            : BALANCE.spawning.sausageChance)
      ? 0
      : 1 + Math.floor(Math.random() * 3);
  if (
    !vegetable &&
    elapsed >= BALANCE.introduction.bones &&
    Math.random() < BALANCE.spawning.boneChance
  )
    type = 7;
  if (
    vegetable &&
    !lastSpawnBrick &&
    elapsed >= BALANCE.introduction.bricks &&
    Math.random() < BALANCE.spawning.brickChance
  )
    type = 8;
  let speed =
      ((catchY() - BALANCE.spawning.top) / rand(...m.fall)) *
      (type === 8 ? BALANCE.spawning.brickSpeedMultiplier : 1),
    sx,
    ok = false;
  for (let attempt = 0; attempt < BALANCE.spawning.attempts; attempt++) {
    sx = rand(margin(), W - margin());
    ok = trajectoryClear(sx, speed);
    if (ok) break;
  }
  if (!ok) return;
  lastSpawnBrick = type === 8;
  if (type === 8) sound("warning", (sx / W) * 2 - 1);
  vegRun = vegetable ? vegRun + 1 : 0;
  items.push({
    type,
    x: sx,
    y: BALANCE.spawning.top,
    warning: type === 8 ? BALANCE.spawning.brickWarning : 0,
    speed,
    power: specialFor(type),
    variant: Math.floor(Math.random() * 8),
    phase: rand(0, Math.PI * 2),
    age: 0,
    spin: rand(-0.65, 0.65),
    angle: rand(-0.5, 0.5),
    used: false,
  });
}
function tick(dt) {
  if (graphicsUnavailable) return;
  if (state !== "pause") clock += dt;
  if (state === "menu" || state === "play") worldTime += dt;
  if (state === "play") {
    elapsed += dt;
    stepPowers(dt);
    stepRunState(dt);
    stepEvents(dt);
    difficulty = damp(
      difficulty,
      1 - Math.exp(-runProgress * BALANCE.difficulty.gain),
      BALANCE.difficulty.smoothing,
      dt,
    );
    let direction =
      (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) -
      (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
    x = clamp(
      x +
        (movementBlocked() ? 0 : direction) *
          W *
          BALANCE.input.keyboardSpeed *
          movementFactor() *
          dt,
      margin(),
      W - margin(),
    );
    if (drag !== null && !movementBlocked()) {
      const wanted = damp(
          x,
          pointerTarget,
          BALANCE.input.follow * movementFactor(),
          dt,
        ),
        limit = W * BALANCE.input.maxFollow * movementFactor() * dt;
      x += clamp(wanted - x, -limit, limit);
    }
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = rand(...challenge().spawn);
    }

    stepStreetEvents(dt);
    for (let it of items) {
      it.age = (it.age ?? 0) + dt;
      if (it.warning > 0) {
        it.warning = Math.max(0, it.warning - dt);
        continue;
      }
      let old = it.y;
      if (
        powerTimers.magnet > 0 &&
        it.type === 0 &&
        it.y > H * BALANCE.magnet.startHeight &&
        it.y < catchY() + BALANCE.magnet.belowCatch &&
        Math.abs(it.x - x) < W * BALANCE.magnet.range
      )
        it.x = damp(it.x, x, BALANCE.magnet.pull, dt);
      if (powerTimers.wind > 0 && windAge > BALANCE.event.warning)
        it.x = clamp(
          it.x + windDirection * W * BALANCE.event.windSpeed * dt,
          margin(),
          W - margin(),
        );
      if (it.bounceV !== undefined) {
        it.bounceV += H * BALANCE.event.bounceGravity * dt;
        it.y += it.bounceV * dt;
      } else
        it.y +=
          it.speed *
          dt *
          (isHazard(it.type) && powerTimers.slow > 0
            ? BALANCE.event.slowFactor
            : 1);
      const y = catchY();
      if (
        !it.used &&
        Math.min(old, it.y) <= y + BALANCE.collision.below &&
        Math.max(old, it.y) >= y - BALANCE.collision.above &&
        Math.abs(it.x - x) < catchRadius(it.type)
      )
        collect(it);
      if (state !== "play") break;
      checkNearMiss(it, old);
      if (!it.used && it.y >= landingY()) {
        let streetCat = false;
        if (it.type === 0) streetCat = missSausage(it);
        else if (it.type >= 4 && it.type <= 6) missVegetable(it);
        else it.used = true;
        if (it.used && !streetCat) continueMissedDrop(it, dt > 0 ? (it.y - old) / dt : it.speed);
      }
    }
    cats.forEach((c) => {
      const before = c.t;
      c.t += dt;
      if (before < catTiming(c).pickup && c.t >= catTiming(c).pickup)
        sound("cat", (c.x / W) * 2 - 1);
    });
    if (state === "play") stepCatHelpers(dt);
    cats = cats.filter((c) => c.t < catTiming(c).end);
    items = items.filter((it) => !it.used && it.y < H + 40);
    react = Math.max(0, react - dt);
    chewTime = Math.max(0, chewTime - dt);
  }
  if (state !== "pause") {
    animateHero(dt);
    effects.forEach((e) => (e.t += dt));
    effects = effects
      .filter((e) => e.t < BALANCE.feedback.life)
      .slice(-BALANCE.feedback.maxEffects);
  }
}
