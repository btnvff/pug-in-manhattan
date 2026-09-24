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
let goodSpecialReady = BALANCE.introduction.specials,
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
  // Its visual continues below the catch area; active bird helpers are unchanged.
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
