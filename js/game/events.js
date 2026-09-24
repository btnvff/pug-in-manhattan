// Short event schedulers share simulation time and the same visible object budget.
let rainNext = 0,
  rainEmitted = 0,
  rainBudget = 0,
  trailNext = 0,
  trailEmitted = 0,
  trailBudget = 0,
  trailSerial = 0,
  chainStates = new Map(),
  windAge = 0,
  waveAge = 0,
  windDirection = 1,
  jackpotActive = false,
  jackpotPulse = 0,
  jackpotCooldown = 0,
  lastSpawnBrick = false;
const strongPowers = [
  "magnet",
  "shield",
  "double",
  "helpers",
  "birds",
  "rain",
  "slow",
  "trail",
];
function resetEvents() {
  rainNext =
    rainEmitted =
    rainBudget =
    trailNext =
    trailEmitted =
    trailBudget =
    trailSerial =
      0;
  chainStates.clear();
  windAge = waveAge = 0;
  windDirection = 1;
  jackpotActive = false;
  jackpotPulse = jackpotCooldown = 0;
  lastSpawnBrick = false;
  pointerTarget = x;
}
function cancelEventSpawns() {
  rainBudget = trailBudget = 0;
}
function awardScore(value) {
  points = Math.max(0, points + value);
  if (value > 0) runProgress += value;
}
function beginPositiveEvent(kind) {
  if (kind === "rain") {
    rainNext = 0.1;
    rainEmitted = 0;
    rainBudget = Math.round(BALANCE.event.rainCount * durationMultiplier());
    sound("feast");
  }
  if (kind === "trail") {
    trailNext = 0.1;
    trailEmitted = 0;
    trailBudget = BALANCE.event.trailChains * BALANCE.event.chainLength;
    trailSerial++;
  }
}
function beginDebuff(kind) {
  if (kind === "wind") {
    windAge = 0;
    windDirection = Math.random() < 0.5 ? -1 : 1;
    popup(
      windDirection < 0 ? "← Сквозняк" : "Сквозняк →",
      false,
      catchY() - 95,
    );
    sound("warning");
  }
  if (kind === "wave") {
    waveAge = 0;
    popup("Сейчас опасная волна!", false, catchY() - 95);
    sound("warning");
  }
}
function objectLimit() {
  return powerTimers.rain > 0 || powerTimers.trail > 0 || rhythmKind === "rush"
    ? BALANCE.spawning.eventMaxItems
    : BALANCE.spawning.maxItems;
}
function movementFactor() {
  return (
    (powerTimers.swift > 0 ? BALANCE.event.swiftFactor : 1) *
    (powerTimers.heavy > 0 ? BALANCE.event.heavyFactor : 1)
  );
}
function updateJackpot() {
  const active = strongPowers.filter((k) => powerTimers[k] > 0).length >= 2;
  if (active && !jackpotActive && jackpotCooldown <= 0) {
    popup("ПИР!", true, catchY() - 95, true);
    sound("feast");
    jackpotPulse = 1.2;
    jackpotCooldown = BALANCE.event.jackpotCue;
  }
  jackpotActive = active;
}
function tryEventFood(wantedX, extra = {}) {
  if (items.length >= objectLimit()) return false;
  const fall = Math.max(
    BALANCE.event.minFall,
    (challenge().fall[0] + challenge().fall[1]) / 2,
  );
  const speed = (catchY() - BALANCE.spawning.top) / fall;
  for (const shift of [0, 0.18, -0.18, 0.36, -0.36]) {
    const xx = clamp(wantedX + shift * W, margin(), W - margin());
    if (!trajectoryClear(xx, speed)) continue;
    items.push({
      type: 0,
      x: xx,
      y: BALANCE.spawning.top,
      speed,
      variant: Math.floor(Math.random() * 8),
      phase: Math.random() * Math.PI * 2,
      age: 0,
      spin: rand(-0.5, 0.5),
      angle: 0,
      used: false,
      eventFood: true,
      ...extra,
    });
    return true;
  }
  return false;
}
function stepEvents(dt) {
  if (powerTimers.wind > 0) windAge += dt;
  if (powerTimers.wave > 0) waveAge += dt;
  jackpotPulse = Math.max(0, jackpotPulse - dt);
  jackpotCooldown = Math.max(0, jackpotCooldown - dt);
  updateJackpot();
  if (powerTimers.rain > 0 && rainEmitted < rainBudget) {
    rainNext -= dt;
    if (rainNext <= 0) {
      const wave = Math.floor(rainEmitted / 4),
        step = rainEmitted % 4;
      const centre = [0.22, 0.74, 0.35, 0.78, 0.22, 0.65][wave % 6];
      if (tryEventFood(W * (centre + (step - 1.5) * 0.075))) {
        rainEmitted++;
        rainNext += BALANCE.event.rainInterval;
      } else rainNext = 0.06;
    }
  }
  if (powerTimers.trail > 0 && trailEmitted < trailBudget) {
    trailNext -= dt;
    if (trailNext <= 0) {
      const group = Math.floor(trailEmitted / BALANCE.event.chainLength),
        index = trailEmitted % BALANCE.event.chainLength;
      const id = trailSerial + ":" + group;
      const position = [0.2, 0.75, 0.38][group % 3] + (index - 1.5) * 0.04;
      if (tryEventFood(W * position, { chainId: id, chainIndex: index })) {
        if (!chainStates.has(id))
          chainStates.set(id, {
            last: -1,
            run: 0,
            paid: false,
            expiry: elapsed + 12,
          });
        trailEmitted++;
        trailNext +=
          BALANCE.event.chainInterval +
          (index === BALANCE.event.chainLength - 1
            ? BALANCE.event.chainGap
            : 0);
      } else trailNext = 0.06;
    }
  }
  for (const [id, chain] of chainStates)
    if (elapsed > chain.expiry) chainStates.delete(id);
}
function collectChain(item) {
  if (!item.chainId) return;
  const chain = chainStates.get(item.chainId);
  if (!chain || chain.paid) return;
  chain.run = item.chainIndex === chain.last + 1 ? chain.run + 1 : 1;
  chain.last = item.chainIndex;
  if (chain.run >= BALANCE.event.chainRequired) {
    chain.paid = true;
    const reward =
      BALANCE.event.chainReward *
      (powerTimers.double > 0 ? BALANCE.doubleMultiplier : 1);
    awardScore(reward);
    popup("Дорожка +" + reward, true, catchY() - 80, true);
    sound("combo");
  }
}
function tryBounce(item) {
  if (item.type !== 0 || item.bounced || powerTimers.chance <= 0) return false;
  powerTimers.chance = 0;
  item.bounced = true;
  item.bounceV = -H * BALANCE.event.bounceVelocity;
  item.y = landingY();
  popup("Ещё поймаешь!", true, catchY() - 80);
  sound("recover");
  powerHUD();
  return true;
}
