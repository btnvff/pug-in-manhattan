// Run-only state: no wall-clock timers, no persistence across restarts.
let conditionCache = {};
let runProgress = 0,
  streak = 0,
  bestStreak = 0,
  nearMisses = 0,
  nearCue = 0,
  healthCue = 0,
  healthPulse = 0,
  recoveryPulse = 0,
  shieldPulse = 0,
  impactPulse = 0,
  rhythmKind = "",
  rhythmRemaining = 0,
  rhythmNext = BALANCE.rhythm.first,
  rhythmIndex = 0;
function healthState(value = happy) {
  return value <= BALANCE.happiness.critical
    ? "critical"
    : value <= BALANCE.happiness.anxious
      ? "anxious"
      : "normal";
}
function resetRunState() {
  runProgress = streak = bestStreak = nearMisses = nearCue = healthCue = 0;
  healthPulse = recoveryPulse = shieldPulse = impactPulse = 0;
  rhythmKind = "";
  rhythmRemaining = 0;
  rhythmNext = BALANCE.rhythm.first;
  rhythmIndex = 0;
}
function popup(text, good = true, y = catchY() - 45, strong = false) {
  effects.push({ x, y, t: 0, text, good, strong });
}
function healthFeedback(before) {
  const old = healthState(before),
    current = healthState();
  if (happy > before) recoveryPulse = 0.5;
  if (current !== old && current === "critical" && happy > 0) {
    healthPulse = 1.4;
    popup("Мопс на грани! Лови еду", false, catchY() - 94);
    if (healthCue <= 0) {
      sound("critical");
      healthCue = BALANCE.happiness.cueCooldown;
    }
  } else if (happy > before && current !== old) {
    popup("Уже лучше!", true, catchY() - 85);
    sound("recover");
  }
}
function registerGoodCatch(item) {
  if (item.owner) return;
  streak++;
  bestStreak = Math.max(bestStreak, streak);
  if (BALANCE.combo.thresholds.includes(streak)) {
    awardScore(BALANCE.combo.reward);
    popup("Серия " + streak + "!", true, catchY() - 82, true);
    sound("combo");
  }
}
function catchRadius(type = 4) {
  const base =
    BALANCE.collision.halfWidth * heroScale() + BALANCE.collision.padding;
  return type < 4 && powerTimers.mouth > 0
    ? base * BALANCE.event.mouthFactor
    : base;
}
function checkNearMiss(it, oldY) {
  if (!isHazard(it.type) || it.used || it.nearChecked) return;
  const bottom = catchY() + BALANCE.collision.below;
  if (oldY <= bottom && it.y >= catchY() - BALANCE.collision.above)
    it.closest = Math.min(it.closest ?? Infinity, Math.abs(it.x - x));
  if (it.y > bottom) {
    it.nearChecked = true;
    if (
      !movementBlocked() &&
      it.closest > catchRadius() &&
      it.closest <= catchRadius() + BALANCE.nearMiss.distance
    ) {
      nearMisses++;
      awardScore(BALANCE.nearMiss.reward);
      if (nearCue <= 0) {
        popup("Увернулся!", true, catchY() - 70);
        sound("near");
        nearCue = BALANCE.nearMiss.cueCooldown;
      }
    }
  }
}
function stepRunState(dt) {
  nearCue = Math.max(0, nearCue - dt);
  healthCue = Math.max(0, healthCue - dt);
  healthPulse = Math.max(0, healthPulse - dt);
  recoveryPulse = Math.max(0, recoveryPulse - dt);
  shieldPulse = Math.max(0, shieldPulse - dt);
  impactPulse = Math.max(0, impactPulse - dt);
  if (rhythmRemaining > 0) {
    rhythmRemaining = Math.max(0, rhythmRemaining - dt);
    if (!rhythmRemaining) {
      if (rhythmKind !== "rest") {
        rhythmKind = "rest";
        rhythmRemaining = BALANCE.rhythm.rest;
      } else rhythmKind = "";
    }
  } else if (elapsed >= rhythmNext) {
    rhythmKind = rhythmIndex++ % 2 ? "wave" : "rush";
    rhythmRemaining = BALANCE.rhythm.duration;
    rhythmNext =
      elapsed +
      BALANCE.rhythm.gap +
      (BALANCE.rhythm.lateGap - BALANCE.rhythm.gap) * difficulty;
    popup(
      rhythmKind === "rush"
        ? "Сосисочный дождь!"
        : "Внимание: оживлённая улица",
      rhythmKind === "rush",
      catchY() - 90,
    );
    sound(rhythmKind === "rush" ? "combo" : "near");
  }
  updateCondition();
}
function updateCondition() {
  const node = $("condition"),
    mood = healthState();
  if (conditionCache.mood !== mood) {
    node.setAttribute("data-state", mood);
    conditionCache.mood = mood;
  }
  const healing = recoveryPulse > 0 ? "yes" : "no";
  if (conditionCache.healing !== healing) {
    node.setAttribute("data-heal", healing);
    conditionCache.healing = healing;
  }
  const label =
    mood === "critical"
      ? "Мопс в опасности"
      : mood === "anxious"
        ? "Мопс устал"
        : "Мопс в порядке";
  const content =
    label + (streak >= BALANCE.combo.thresholds[0] ? " · серия " + streak : "");
  if (node.textContent !== content) node.textContent = content;
  if (conditionCache.label !== label) {
    node.setAttribute("aria-label", label);
    conditionCache.label = label;
  }
  $("rhythm").textContent =
    rhythmKind === "rush"
      ? "Сосисочный дождь"
      : rhythmKind === "wave"
        ? "Оживлённая улица"
        : "";
}
function drawRunFeedback() {
  ctx.save();
  if (shieldPulse > 0 || recoveryPulse > 0) {
    ctx.globalAlpha = Math.min(0.7, shieldPulse || recoveryPulse);
    ellipse(
      x,
      ground() - 65,
      58 * heroScale(),
      80 * heroScale(),
      null,
      shieldPulse > 0 ? "#4fe4ff" : "#77e6b2",
      shieldPulse > 0 ? 5 : 2,
    );
  }
  if (healthPulse > 0) {
    ctx.globalAlpha = healthPulse * 0.15;
    ctx.strokeStyle = "#ed6754";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }
  if (impactPulse > 0) {
    ctx.globalAlpha = impactPulse / 0.35;
    for (let n = 0; n < 4; n++) {
      const a = (n * Math.PI) / 2;
      line(
        x + Math.cos(a) * 24,
        catchY() + Math.sin(a) * 16,
        x + Math.cos(a) * 39,
        catchY() + Math.sin(a) * 30,
        "#f6a15c",
        3,
      );
    }
  }
  ctx.restore();
}
function drawHazardCue(it) {
  if (!isHazard(it.type)) return;
  ctx.save();
  if (it.warning > 0) {
    const yy = Math.max(170, H * 0.25);
    ctx.globalAlpha = 0.85;
    path(
      `M${it.x} ${yy - 17} L${it.x + 17} ${yy + 13} L${it.x - 17} ${yy + 13} Z`,
      "#ffe6ae",
      "#b63a30",
      2,
    );
    txt("!", it.x, yy + 8, 21, "#9c302a");
  } else {
    ctx.globalAlpha = it.type === 8 ? 0.7 : 0.22;
    ellipse(
      it.x,
      it.y,
      it.type === 8 ? 31 : 26,
      it.type === 8 ? 24 : 27,
      null,
      it.type === 8 ? "#523b40" : "#426774",
      it.type === 8 ? 2 : 1.5,
    );
    if (it.type === 8) {
      rect(it.x - 10, it.y - 34, 20, 17, "#ae3428", 4);
      txt("!", it.x, it.y - 21, 14, "#fff8dc");
    }
  }
  ctx.restore();
}

// Only rare useful drops have a glow; ordinary food stays quiet and tactile.
function drawRareFoodAura(it) {
  if (it.type !== 7 && !usefulPowers.includes(it.power)) return;
  const pulse = 0.5 + 0.5 * Math.sin(clock * 2.8 + (it.phase ?? 0)),
    r = (it.type === 7 ? 38 : 34) + pulse * 3;
  ctx.save();
  ctx.translate(it.x, it.y);
  const glow = ctx.createRadialGradient(0, 0, 7, 0, 0, r);
  glow.addColorStop(0, "#ffdf9c55");
  glow.addColorStop(0.6, "#eab95a2c");
  glow.addColorStop(1, "#eab95a00");
  ellipse(0, 0, r, r, glow, null);
  const beat = (clock + (it.phase ?? 0)) % 2.2;
  if (beat < 0.5) {
    ctx.globalAlpha = Math.sin((beat / 0.5) * Math.PI) * 0.75;
    for (let i = 0; i < 2; i++) {
      const a = i * 3 + clock * 0.3,
        xx = Math.cos(a) * 29,
        yy = Math.sin(a) * 24;
      line(xx - 3, yy, xx + 3, yy, "#fff0ba", 1.3);
      line(xx, yy - 3, xx, yy + 3, "#fff0ba", 1.3);
    }
  }
  ctx.restore();
}
