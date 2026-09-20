// Gameplay effects use simulation time only: no timers survive pause/restart.
const powerInfo = {
  rain: {
    label: "Сосисочный дождь",
    mark: "ДЖ",
    color: "#d9a249",
    seconds: BALANCE.durations.rain,
  },
  slow: {
    label: "Медленное время",
    mark: "Ч",
    color: "#577bb6",
    seconds: BALANCE.durations.slow,
  },
  trail: {
    label: "Сосисочная дорожка",
    mark: "ДР",
    color: "#d67b52",
    seconds: BALANCE.durations.trail,
  },
  mouth: {
    label: "Большая пасть",
    mark: "П",
    color: "#b68a4d",
    seconds: BALANCE.durations.mouth,
  },
  swift: {
    label: "Шустрые лапы",
    mark: "Л+",
    color: "#589e86",
    seconds: BALANCE.durations.swift,
  },
  chance: {
    label: "Второй шанс",
    mark: "↶",
    color: "#ba9949",
    seconds: BALANCE.durations.chance,
  },
  wind: {
    label: "Сквозняк",
    mark: "В",
    color: "#668d9c",
    seconds: BALANCE.durations.wind,
  },
  heavy: {
    label: "Тяжёлые лапы",
    mark: "Л−",
    color: "#7c7685",
    seconds: BALANCE.durations.heavy,
  },
  wave: {
    label: "Опасная волна",
    mark: "!!",
    color: "#aa5c57",
    seconds: BALANCE.durations.wave,
  },

  stun: {
    label: "Оглушение",
    mark: "!",
    color: "#b34f38",
    seconds: BALANCE.durations.stun,
  },
  birds: {
    label: "3 воробья",
    mark: "3П",
    color: "#398db1",
    seconds: BALANCE.durations.birds,
  },
  helpers: {
    label: "Кошачья помощь",
    mark: "К",
    color: "#d27135",
    seconds: BALANCE.durations.helpers,
  },
  magnet: {
    label: "Магнит",
    mark: "∩",
    color: "#a642b2",
    seconds: BALANCE.durations.magnet,
  },
  shield: {
    label: "Щит",
    mark: "◇",
    color: "#168eb0",
    seconds: BALANCE.durations.shield,
  },
  double: {
    label: "Очки ×2",
    mark: "×2",
    color: "#b78014",
    seconds: BALANCE.durations.double,
  },
  freeze: {
    label: "Заморозка",
    mark: "❄",
    color: "#3266aa",
    seconds: BALANCE.durations.freeze,
  },
  jam: {
    label: "Без бонусов",
    mark: "×",
    color: "#815572",
    seconds: BALANCE.durations.jam,
  },
};
const powerTimers = {
  rain: 0,
  slow: 0,
  trail: 0,
  mouth: 0,
  swift: 0,
  chance: 0,
  wind: 0,
  heavy: 0,
  wave: 0,

  stun: 0,
  birds: 0,
  helpers: 0,
  magnet: 0,
  shield: 0,
  double: 0,
  freeze: 0,
  jam: 0,
};
let durationBones = 0,
  birdNext = BALANCE.helpers.first,
  birdShots = 0,
  catAge = 0,
  birdAge = 0;
const usefulPowers = [
  "helpers",
  "birds",
  "magnet",
  "shield",
  "double",
  "rain",
  "slow",
  "trail",
  "mouth",
  "swift",
  "chance",
];
function durationMultiplier() {
  return boneMultiplier(durationBones);
}
function collectBone() {
  const before = durationMultiplier();
  durationBones++;
  const gained = durationMultiplier() - before;
  for (const k of usefulPowers)
    if (powerTimers[k] > 0) powerTimers[k] += powerInfo[k].seconds * gained;
  effects.push({
    x,
    y: catchY() - 65,
    t: 0,
    text: "Время бонусов +" + Math.round(gained * 100) + "%",
    kind: "rare",
    strong: true,
    good: true,
  });
  sound("power");
  powerHUD();
}
let catGifts = [],
  helperNext = BALANCE.helpers.first,
  helperShots = 0;
let flocks = [],
  goodSpecialReady = BALANCE.introduction.specials,
  badSpecialReady = BALANCE.introduction.badSpecials,
  goodSpecialDeadline = BALANCE.introduction.specials,
  freezeGrace = 0,
  statusText = "";
function resetPowers() {
  durationBones = 0;
  birdNext = BALANCE.helpers.first;
  birdShots = 0;
  catAge = birdAge = 0;
  for (const k in powerTimers) powerTimers[k] = 0;
  catGifts = [];
  helperNext = BALANCE.helpers.first;
  helperShots = 0;
  freezeGrace = 0;
  goodSpecialReady = goodSpecialDeadline = BALANCE.introduction.specials;
  badSpecialReady = BALANCE.introduction.badSpecials;
  resetEvents();
  flocks = [];
  powerHUD();
}
function powerHUD() {
  const text =
    (durationBones
      ? `<span style="border-color:#c29444">Бонусы +${Math.round((durationMultiplier() - 1) * 100)}%</span>`
      : "") +
    Object.keys(powerTimers)
      .filter((k) => powerTimers[k] > 0)
      .map(
        (k) =>
          `<span style="border-color:${powerInfo[k].color}">${powerInfo[k].label} ${powerTimers[k].toFixed(1)} с</span>`,
      )
      .join("");
  if (text !== statusText) {
    $("powers").innerHTML = text;
    statusText = text;
  }
}
function movementBlocked() {
  return powerTimers.freeze > 0 || powerTimers.stun > 0;
}
function applyPower(kind) {
  if (!powerInfo[kind]) return;
  if (kind === "stun") {
    if (freezeGrace > 0) return;
    powerTimers.stun = BALANCE.durations.stun;
    freezeGrace = BALANCE.durations.stun + BALANCE.immunity;
  } else if (kind === "freeze") {
    if (freezeGrace > 0) return;
    powerTimers.freeze = BALANCE.durations.freeze;
    freezeGrace = BALANCE.durations.freeze + BALANCE.immunity;
  } else if (kind === "jam") {
    powerTimers.helpers = powerTimers.birds = 0;
    catGifts = [];
    for (const key of usefulPowers) powerTimers[key] = 0;
    cancelEventSpawns();
    powerTimers.jam = BALANCE.durations.jam;
  } else if (["wind", "heavy", "wave"].includes(kind)) {
    powerTimers[kind] = powerInfo[kind].seconds;
    beginDebuff(kind);
  } else {
    if (powerTimers.jam > 0) return;
    powerTimers[kind] = powerInfo[kind].seconds * durationMultiplier();
    beginPositiveEvent(kind);
    if (kind === "helpers") {
      helperNext = BALANCE.helpers.first;
      helperShots = 0;
      catAge = 0;
      catGifts = catGifts.filter((g) => g.owner !== "helpers");
    }
    if (kind === "birds") {
      birdNext = BALANCE.helpers.first;
      birdShots = 0;
      birdAge = 0;
      catGifts = catGifts.filter((g) => g.owner !== "birds");
    }
  }
  effects.push({
    x,
    y: catchY() - 65,
    t: 0,
    text: powerInfo[kind].label,
    kind: usefulPowers.includes(kind) ? "rare" : "cold",
    good: usefulPowers.includes(kind),
  });
  sound(usefulPowers.includes(kind) ? "power" : "debuff");
  updateJackpot();
  powerHUD();
}
function stepPowers(dt) {
  for (const k in powerTimers)
    powerTimers[k] = Math.max(0, powerTimers[k] - dt);
  freezeGrace = Math.max(0, freezeGrace - dt);
  powerHUD();
}
function specialFor(type) {
  const b = BALANCE.specials;
  if (
    type < 4 &&
    elapsed >= goodSpecialReady &&
    (elapsed >= goodSpecialDeadline || Math.random() < b.goodChance)
  ) {
    goodSpecialReady = elapsed + b.goodCooldown;
    goodSpecialDeadline = elapsed + b.goodPity;
    return b.goodPool[Math.floor(Math.random() * b.goodPool.length)];
  }
  if (
    type >= 4 &&
    type <= 6 &&
    elapsed >= badSpecialReady &&
    Math.random() < b.badChance
  ) {
    badSpecialReady = elapsed + b.badCooldown;
    return b.badPool[Math.floor(Math.random() * b.badPool.length)];
  }
  return null;
}
function missVegetable(it) {
  if (it.used || state !== "play") return;
  it.used = true;
  flocks.push({
    x: it.x,
    type: it.type,
    variant: it.variant ?? 0,
    t: 0,
    side: it.x < W / 2 ? -1 : 1,
  });
}
function drawSpecial(it) {
  if (!it.power) return;
  const p = powerInfo[it.power];
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.globalAlpha = usefulPowers.includes(it.power) ? 0.07 : 0.13;
  ellipse(0, 0, 32, 29, p.color, null);
  ctx.globalAlpha = 1;
  ellipse(19, -20, 12, 12, "#fffdf4", p.color, 2);
  if (it.power === "magnet")
    path("M13 -24 V-17 Q19 -9 25 -17 V-24", null, p.color, 3);
  else if (it.power === "shield")
    path(
      "M19 -28 L26 -25 V-19 Q25 -14 19 -12 Q13 -14 12 -19 V-25 Z",
      null,
      p.color,
      1.8,
    );
  else if (it.power === "helpers") {
    path(
      "M11 -16 L12 -26 L17 -23 L22 -26 L27 -16 Q19 -9 11 -16 Z",
      null,
      p.color,
      1.4,
    );
    ellipse(16, -18, 1, 1, p.color, null);
    ellipse(22, -18, 1, 1, p.color, null);
    line(18, -14, 20, -14, p.color, 1);
  } else if (it.power === "birds") {
    path("M10 -20 Q14 -29 19 -20 Q24 -29 28 -20", null, p.color, 2);
    txt("3", 19, -13, 9, p.color);
  } else if (it.power === "jam") {
    path("M14 -26 L24 -14 M24 -26 L14 -14", null, p.color, 2);
  } else if (it.power === "freeze") {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(19, -20);
      ctx.rotate((i * Math.PI) / 3);
      line(-7, 0, 7, 0, p.color, 1.6);
      ctx.restore();
    }
  } else txt(p.mark, 19, -15, p.mark.length > 1 ? 10 : 15, p.color);
  ctx.restore();
}
function drawPowerAura() {
  ctx.save();
  if (powerTimers.stun > 0) {
    for (let n = 0; n < 3; n++) {
      const a = clock * 3 + (n * Math.PI * 2) / 3;
      txt(
        "✦",
        x + Math.cos(a) * 36,
        ground() - 145 * heroScale() + Math.sin(a) * 7,
        16,
        "#ffd05b",
      );
    }
  }
  if (powerTimers.magnet > 0) {
    ctx.globalAlpha = 0.48;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        catchY() + 30,
        60 + i * 15,
        58 + i * 12,
        0,
        Math.PI,
        Math.PI * 2,
      );
      ctx.strokeStyle = "#af4bb4";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  if (powerTimers.shield > 0) {
    ctx.globalAlpha = 0.24;
    ellipse(
      x,
      ground() - 65,
      59 * heroScale(),
      79 * heroScale(),
      "#a2eeff",
      "#149fc0",
      3,
    );
  }
  if (powerTimers.freeze > 0) {
    ctx.globalAlpha = 0.5;
    path(
      `M${x - 35} ${ground() + 3} L${x - 39} ${ground() - 25} L${x - 20} ${ground() - 34} L${x + 35} ${ground() - 23} L${x + 39} ${ground() + 3} Z`,
      "#b9edff",
      "#487db5",
      2,
    );
  }
  ctx.restore();
}
function drawSparrows(f) {
  const pickup = 1.5,
    departure = 1.85,
    t = f.t;
  if (t < pickup) drawFood(f.type, f.x, landingY(), 0.1, f.variant);
  // Soft air rings at touchdown and takeoff, evaluated from the same timeline.
  for (const moment of [1.1, departure]) {
    const age = t - moment;
    if (age >= 0 && age < 0.45) {
      ctx.save();
      ctx.globalAlpha = (1 - age / 0.45) * 0.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          f.x + side * (14 + age * 28),
          landingY() + 4,
          8 + age * 22,
          2 + age * 4,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "#e9f1ef";
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  for (let n = 0; n < 2; n++) {
    const startX = f.side < 0 ? -35 : W + 35,
      startY = H * 0.55 + n * 25;
    const u = easeInOut(t / 1.1),
      exit = easeInOut((t - departure) / 1.6);
    const px =
      t < departure
        ? startX + (f.x + (n ? 14 : -14) - startX) * u
        : f.x + (n ? 14 : -14) + (startX - f.x) * exit;
    const py =
      t < departure
        ? startY + (landingY() - 9 - startY) * u
        : landingY() - 9 - H * 0.5 * exit;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(t < departure ? -f.side : f.side, 1);
    const flying = t < 1.1 || t > departure;
    ellipse(0, 0, 10, 6, "#a28a6a", "#675444", 0.7);
    ellipse(7, -5, 5, 5, "#75583e", null);
    ellipse(8, -4, 3, 2, "#e4d7b6", null);
    ellipse(9, -6, 1, 1, "#25303a", null);
    path("M11 -4 L16 -3 L11 -1 Z", "#9b7e42", null);
    path("M-7 0 L-18 -5 L-14 2 Z", "#645143", null);
    path(
      `M-5 -2 Q-4 ${flying ? -8 - Math.sin(t * 32 + n) * 9 : -6} 7 -1 Q1 4 -5 -2 Z`,
      "#725e4c",
      "#c5ae88",
      0.8,
    );
    line(-2, 4, -3, 9, "#695943", 0.8);
    line(3, 4, 2, 9, "#695943", 0.8);
    ctx.restore();
    if (n === 0 && t >= pickup) {
      ctx.save();
      ctx.translate(px + (t < departure ? -f.side : f.side) * 13, py + 6);
      ctx.scale(0.42, 0.42);
      drawFood(f.type, 0, 0, 0.4, f.variant);
      ctx.restore();
    }
  }
}

function helperX(side) {
  return W * (side < 0 ? 0.17 : 0.83);
}
function birdPosition(n) {
  return {
    x: W * (0.22 + n * 0.28),
    y: ground() - (n === 1 ? 190 : 145) * heroScale(),
  };
}
function stepCatHelpers(dt) {
  if (powerTimers.helpers > 0) {
    catAge += dt;
    helperNext -= dt;
    if (helperNext <= 0 && powerTimers.helpers > BALANCE.helpers.cutoff) {
      const side = helperShots % 2 ? -1 : 1;
      catGifts.push({
        owner: "helpers",
        sx: helperX(side) - side * 27 * 1.2,
        sy: ground() - 12 * 1.2,
        t: 0,
        type: 0,
        variant: helperShots % 8,
        used: false,
      });
      helperShots++;
      helperNext += BALANCE.helpers.catsInterval;
    }
  }
  if (powerTimers.birds > 0) {
    birdAge += dt;
    birdNext -= dt;
    if (birdNext <= 0 && powerTimers.birds > BALANCE.helpers.cutoff) {
      const p = birdPosition(birdShots % 3);
      catGifts.push({
        owner: "birds",
        sx: p.x,
        sy: p.y + 8,
        t: 0,
        type: 0,
        variant: birdShots % 8,
        used: false,
      });
      birdShots++;
      birdNext += BALANCE.helpers.birdsInterval;
    }
  }
  catGifts = catGifts.filter((g) => powerTimers[g.owner] > 0);
  for (const gift of catGifts) {
    gift.t += dt;
    if (gift.t >= BALANCE.helpers.flight) collect(gift);
  }
  catGifts = catGifts.filter((g) => !g.used);
}
function drawBirdHelpers() {
  if (powerTimers.birds <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, birdAge / 0.22, powerTimers.birds / 0.3);
  for (let n = 0; n < 3; n++) {
    const p = birdPosition(n),
      flap = Math.sin(clock * 22 + n * 2);
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(clock * 3 + n) * 3);
    ctx.scale(n === 2 ? -1 : 1, 1);
    ellipse(0, 0, 13, 8, "#a68155", "#5d4939", 1);
    path(
      `M-5 -3 Q-21 ${-12 - flap * 12} -22 ${-19 - flap * 9} Q-4 -13 5 -2 Z`,
      "#76604b",
      "#d0ad74",
      1,
    );
    path("M-10 1 L-24 -5 L-20 4 Z", "#685544", null);
    ellipse(9, -6, 7, 6, "#73523b", null);
    ellipse(11, -4, 4, 3, "#f2ddb0", null);
    ellipse(12, -8, 1.6, 1.6, "#172e37", null);
    ellipse(12.4, -8.5, 0.5, 0.5, "#fff", null);
    path("M15 -5 L22 -3 L15 -1 Z", "#dfa549", null);
    line(-3, 6, -1, 10, "#82633c", 1);
    line(3, 6, 5, 10, "#82633c", 1);
    ctx.restore();
  }
  ctx.restore();
}
function drawCatHelpers() {
  if (powerTimers.helpers <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, catAge / 0.22, powerTimers.helpers / 0.3);
  for (const side of [-1, 1]) {
    const c = {
      x: helperX(side) - side * 27,
      t: 1.85,
      side,
      coat: side < 0 ? 0 : 1,
      helper: true,
    };
    drawCat(c);
  }
  ctx.restore();
}
function drawCatGifts() {
  for (const g of catGifts) {
    const u = clamp(g.t / BALANCE.helpers.flight, 0, 1),
      mouthY = ground() - 64 * heroScale();
    const gx = g.sx + (x + headTurn * 5 - g.sx) * u,
      gy = g.sy + (mouthY - g.sy) * u - Math.sin(u * Math.PI) * 45;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(0.65, 0.65);
    drawFood(0, 0, 0, (1 - u) * 2, g.variant);
    ctx.restore();
  }
}
