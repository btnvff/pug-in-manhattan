"use strict";
const $ = (id) => document.getElementById(id),
  cv = $("scene"),
  overlay = $("overlay");
let ctx = cv.getContext("2d");
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
let prefs = { sound: true, best: 0 };
function readPreference(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
const loadedPreference = readPreference("manhattan-pug-progressive");
if (loadedPreference && typeof loadedPreference === "object") {
  prefs.sound = loadedPreference.sound !== false;
  prefs.best = Number.isSafeInteger(loadedPreference.best)
    ? Math.max(0, loadedPreference.best)
    : 0;
} else {
  const old = readPreference("manhattan-pug-v2");
  if (old && typeof old === "object") prefs.sound = old.sound !== false;
}
const save = () => {
  try {
    localStorage.setItem("manhattan-pug-progressive", JSON.stringify(prefs));
  } catch {}
};
let W = 390,
  H = 844,
  state = "menu",
  points = 0,
  sausages = 0,
  happy = BALANCE.happiness.start,
  fat = 15,
  visualFat = 15,
  elapsed = 0,
  items = [],
  effects = [],
  cats = [],
  spawnIn = BALANCE.spawning.first,
  clock = 0,
  last = 0,
  x = 195,
  pointerTarget = 195,
  react = 0,
  reaction = 1,
  drag = null,
  offset = 0,
  keys = new Set(),
  vegRun = 0;
let worldTime = 0,
  moveSpeed = 0,
  runBlend = 0,
  gait = 0,
  lean = 0,
  leanVelocity = 0,
  tailSwing = 0,
  tailVelocity = 0,
  motionX = x;
let chewTime = 0,
  chewVariant = 0,
  chewFood = 0,
  chewAppearance = 0;
let gazeX = 0,
  gazeY = 0,
  gazeTarget = null;
let headTurn = 0,
  lookUp = 0,
  lookTarget = 0,
  idleLookTimer = 1;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function resetMotion() {
  moveSpeed = runBlend = lean = leanVelocity = tailSwing = tailVelocity = 0;
  motionX = x;
  chewTime = 0;
  headTurn = lookUp = lookTarget = gazeX = gazeY = 0;
  gazeTarget = null;
  idleLookTimer = 1;
}
function animateHero(dt) {
  if (dt <= 0) return;
  const speed = clamp((x - motionX) / dt, -W * 5, W * 5);
  motionX = x;
  const movingNow =
    Math.abs(speed) > W * 0.025 || Math.abs(moveSpeed) > W * 0.07;
  let turnTarget = movingNow
    ? clamp((speed || moveSpeed) / (W * 0.5), -1, 1)
    : 0;
  if (movingNow) {
    lookTarget = 0;
    idleLookTimer = 0.7;
  } else {
    idleLookTimer -= dt;
    if (idleLookTimer <= 0) {
      lookTarget = Math.random() < 0.7 ? 1 : 0;
      idleLookTimer = rand(1.2, 3);
    }
  }
  const eligible = (it) => !it.used && it.type === 0 && it.y <= catchY() + 15;
  const distance = (it) => Math.hypot(it.x - x, catchY() - it.y);
  let nearest = null;
  if (state === "play") {
    for (const it of items)
      if (eligible(it) && (!nearest || distance(it) < distance(nearest)))
        nearest = it;
  }
  // Hysteresis avoids flickering between neighbouring sausages.
  if (
    !gazeTarget ||
    !items.includes(gazeTarget) ||
    !eligible(gazeTarget) ||
    state !== "play"
  )
    gazeTarget = nearest;
  else if (nearest && distance(nearest) < distance(gazeTarget) * 0.8)
    gazeTarget = nearest;
  let eyeX = 0,
    eyeY = 0;
  if (gazeTarget) {
    const dx = gazeTarget.x - x,
      dy = Math.max(12, catchY() - gazeTarget.y),
      length = Math.hypot(dx, dy);
    turnTarget = clamp(Math.atan2(dx, dy) / 0.8, -1, 1);
    lookTarget = dy / length;
    eyeX = clamp((dx / length) * 1.5, -1, 1);
    eyeY = -dy / length;
  } else {
    if (!movingNow && Math.abs(x - W / 2) < W * 0.07) lookTarget = 0;
    eyeX = turnTarget * 0.6;
    eyeY = -lookTarget * 0.65;
  }
  headTurn = damp(headTurn, turnTarget, 6, dt);
  lookUp = damp(lookUp, lookTarget, 5, dt);
  gazeX = damp(gazeX, eyeX, 14, dt);
  gazeY = damp(gazeY, eyeY, 14, dt);
  moveSpeed = damp(moveSpeed, speed, 12, dt);
  runBlend = damp(
    runBlend,
    Math.min(1, Math.abs(moveSpeed) / (W * 0.55)),
    10,
    dt,
  );
  gait += dt * (5 + runBlend * 13);
  let remain = dt;
  while (remain > 0) {
    const h = Math.min(remain, 1 / 120);
    leanVelocity +=
      (clamp(moveSpeed / W, -1, 1) * 0.08 - lean) * 100 * h -
      leanVelocity * 14 * h;
    lean += leanVelocity * h;
    tailVelocity += (-lean * 3 - tailSwing) * 65 * h - tailVelocity * 9 * h;
    tailSwing += tailVelocity * h;
    remain -= h;
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  rand = (a, b) => a + Math.random() * (b - a);
function ground() {
  return H - (H < 500 ? 60 : 91);
}
function catchY() {
  return ground() - 85;
}
function heroScale() {
  return W > 550 ? 0.85 : 1;
}
function margin() {
  return 49 * heroScale();
}
function soundUI() {
  $("sound").innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9h4l5-4v14l-5-4H4z"/>' +
    (prefs.sound
      ? '<path d="M17 8q5 4 0 8m-1-5q2 1 0 2"/>'
      : '<path d="m17 9 5 6m0-6-5 6"/>') +
    "</svg>";
  $("sound").setAttribute(
    "aria-label",
    prefs.sound ? "Выключить звук" : "Включить звук",
  );
}
$("sound").onclick = () => {
  prefs.sound = !prefs.sound;
  unlockAudio();
  syncAudioPreference();
  save();
  soundUI();
  sound("button");
};
function hud() {
  $("score").textContent = sausages;
  $("sausages").textContent = points;
  $("hint").textContent =
    happy <= BALANCE.happiness.critical
      ? "ЛОВИ ЕДУ — МОПСУ НУЖНО ВОССТАНОВИТЬСЯ"
      : "← ТЯНИ ЗДЕСЬ, ЧТОБЫ ДВИГАТЬ МОПСА →";
  updateCondition();
}
function clearInput() {
  keys.clear();
  if (drag !== null) {
    try {
      cv.releasePointerCapture(drag);
    } catch {}
  }
  drag = null;
  pointerTarget = x;
}
function ui() {
  audioScene(state);
  const playing = state === "play" || state === "pause";
  $("hud").style.display = playing ? "flex" : "none";
  $("powers").style.display = playing ? "flex" : "none";
  $("condition").style.display = $("rhythm").style.display = playing
    ? "block"
    : "none";
  $("hint").style.display = state === "play" ? "block" : "none";
  overlay.className = state === "win" || state === "lose" ? "result" : "";
  overlay.innerHTML = "";
  if (state === "menu") {
    overlay.innerHTML =
      '<header class="sky-heading"><h1 class="title"><div class="eyebrow">АРКАДА С ХАРАКТЕРОМ</div>Мопс <small style="font-size:.55em;font-weight:normal">на</small><span>Манхэттене</span></h1><p class="tagline">Большой город. Маленький мопс.<br>Огромный аппетит.</p></header><div class="menu-card"><button class="cta" id="start">Старт</button><p class="instruction">Тяни мопса пальцем. Лови вкусное. Избегай опасного. Побей рекорд.</p><p class="record">Лучший результат: ' +
      prefs.best +
      " очков</p></div>";
    $("start").onclick = start;
  } else if (state === "pause") {
    overlay.innerHTML =
      '<div class="panel"><div class="badge">Сосиски подождут</div><h2>Маленький привал</h2><p>Мопс переводит дух.<br>Город никуда не убежит.</p><button class="cta" id="resume">Продолжить</button><button class="secondary" id="restart">Заново</button><button class="secondary" id="menu">Главное меню</button></div>';
    $("resume").onclick = () => {
      state = "play";
      ui();
      sound("button");
    };
    $("restart").onclick = start;
    $("menu").onclick = menu;
  } else if (state === "win" || state === "lose") {
    let win = state === "win";
    overlay.innerHTML =
      '<div class="panel"><div class="badge">' +
      (win ? "Манхэттен у твоих лап" : "Завтра будет вкуснее") +
      "</div><h2>" +
      (win ? "Король сосисок!" : "Мопс выбился из сил") +
      "</h2><p>" +
      "Лучшая серия: " +
      bestStreak +
      " · Уклонений: " +
      nearMisses +
      "<br>Время: " +
      Math.floor(elapsed / 60) +
      ":" +
      String(Math.floor(elapsed % 60)).padStart(2, "0") +
      '</p><div class="resultstats"><div><b>' +
      points +
      "</b>очки</div><div><b>" +
      sausages +
      '</b>сосиски</div></div><button class="cta" id="restart">' +
      (win ? "Ещё раз" : "Попробовать снова") +
      '</button><button class="secondary" id="menu">Главное меню</button></div>';
    $("restart").onclick = start;
    $("menu").onclick = menu;
  }
}
function menu() {
  state = "menu";
  clearInput();
  items = [];
  effects = [];
  cats = [];
  resetPowers();
  resetRunState();
  fat = 15;
  x = W / 2;
  resetMotion();
  ui();
  sound("button");
}
function start() {
  unlockAudio();
  audioScene("restart");
  difficulty = 0;
  resetRunState();
  clearInput();
  state = "play";
  points = 0;
  sausages = 0;
  happy = BALANCE.happiness.start;
  fat = visualFat = 15;
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
$("pause").onclick = pause;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", () => {
  pause();
  clearInput();
});
function finish(win) {
  state = win ? "win" : "lose";
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
    chewVariant = Math.floor(Math.random() * 3);
    chewFood = item.type;
    chewAppearance = item.variant ?? 0;
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
  sound("land", (it.x / W) * 2 - 1);
  cats.push({
    x: it.x,
    t: 0,
    wait: 0.55,
    travel: Math.max(0.9, Math.min(it.x + 40, W + 40 - it.x) / 150),
    side: it.x < W / 2 ? -1 : 1,
    variant: it.variant ?? 0,
    coat: Math.floor(Math.random() * 3),
  });
  effects.push({
    x: it.x,
    y: H - 97,
    t: 0,
    text: loss ? "−1" : "Кошке!",
    good: false,
  });
  hud();
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
        if (it.type === 0) missSausage(it);
        else if (it.type >= 4 && it.type <= 6) missVegetable(it);
        else it.used = true;
      }
    }
    cats.forEach((c) => {
      const before = c.t;
      c.t += dt;
      if (before < catTiming(c).pickup && c.t >= catTiming(c).pickup)
        sound("cat", (c.x / W) * 2 - 1);
    });
    if (state === "play") stepCatHelpers(dt);
    flocks.forEach((f) => (f.t += dt));
    flocks = flocks.filter((f) => f.t < 3.5);
    cats = cats.filter((c) => c.t < catTiming(c).end);
    items = items.filter((it) => !it.used && it.y < H + 40);
    react = Math.max(0, react - dt);
    chewTime = Math.max(0, chewTime - dt);
  }
  if (state !== "pause") {
    animateHero(dt);
    visualFat = 15;
    effects.forEach((e) => (e.t += dt));
    effects = effects
      .filter((e) => e.t < BALANCE.feedback.life)
      .slice(-BALANCE.feedback.maxEffects);
  }
}
cv.addEventListener("pointerdown", (e) => {
  if (state !== "play" || drag !== null) return;
  let r = cv.getBoundingClientRect(),
    px = e.clientX - r.left,
    py = e.clientY - r.top;
  if (py < ground() - 145) return;
  drag = e.pointerId;
  offset = px - x;
  pointerTarget = x;
  cv.setPointerCapture(drag);
  e.preventDefault();
});
cv.addEventListener("pointermove", (e) => {
  if (e.pointerId !== drag || state !== "play") return;
  let r = cv.getBoundingClientRect();
  if (movementBlocked()) {
    offset = e.clientX - r.left - x;
    pointerTarget = x;
    e.preventDefault();
    return;
  }
  pointerTarget = clamp(e.clientX - r.left - offset, margin(), W - margin());
  e.preventDefault();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
  cv.addEventListener(ev, (e) => {
    if (e.pointerId === drag) {
      drag = null;
      pointerTarget = x;
    }
  }),
);
window.addEventListener("keydown", (e) => {
  let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (["ArrowLeft", "ArrowRight", "a", "d"].includes(k) && state === "play") {
    if (e.target?.closest?.("button")) return;
    keys.add(k);
    e.preventDefault();
  }
  if (e.key === "Escape") pause();
});
window.addEventListener("keyup", (e) =>
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
function resize() {
  const oldW = W,
    oldH = H;
  W = cv.clientWidth;
  H = cv.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, BALANCE.frame.maxDpr);
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  x = clamp((x / oldW) * W, margin(), W - margin());
  items.forEach((it) => {
    it.x *= W / oldW;
    it.y = (it.y / oldH) * H;
    it.speed *= H / oldH;
  });
  cats.forEach((c) => (c.x *= W / oldW));
  flocks.forEach((f) => (f.x *= W / oldW));
  catGifts.forEach((g) => {
    g.sx *= W / oldW;
    g.sy *= H / oldH;
  });
  clearInput();
  resetMotion();
  invalidateScenery();
  if (activeView) activeView.resize();
}
