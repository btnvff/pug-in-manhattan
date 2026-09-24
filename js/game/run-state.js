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
