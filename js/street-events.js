// Presentation after a miss: no hitboxes, rewards or gameplay RNG.
// Live items still retire at the original line, so spawn/bonus rules stay unchanged.
const streetEvents = { drops: [], eligible: 0, untilCat: 12, cycle: 0, cooldown: 0 };
function resetStreetEvents() {
  streetEvents.drops.length = 0;
  streetEvents.eligible = streetEvents.cycle = streetEvents.cooldown = 0;
  streetEvents.untilCat = 12;
}
function chooseStreetCat(item) {
  if (streetEvents.cooldown > 0 || cats.length || powerTimers.helpers > 0 ||
      item.x < 30 || item.x > W - 30 || Math.abs(item.x - x) < 75 * heroScale()) return false;
  if (++streetEvents.eligible < streetEvents.untilCat) return false;
  streetEvents.eligible = 0;
  streetEvents.untilCat = [10, 15, 11, 14, 13, 12][streetEvents.cycle++ % 6];
  streetEvents.cooldown = 14;
  return true;
}
function continueMissedDrop(item, velocity) {
  streetEvents.drops.push({ ...item, speed: velocity, used: false });
}
function stepStreetEvents(dt) {
  streetEvents.cooldown = Math.max(0, streetEvents.cooldown - dt);
  for (const drop of streetEvents.drops) {
    drop.age = (drop.age ?? 0) + dt;
    if (drop.bounceV !== undefined) {
      drop.bounceV += H * BALANCE.event.bounceGravity * dt;
      drop.y += drop.bounceV * dt;
    } else drop.y += drop.speed * dt;
  }
  // Include the entire rotated silhouette before retiring its pooled model.
  streetEvents.drops = streetEvents.drops.filter((drop) => drop.y < H + 80);
}
function resizeStreetEvents(sx, sy) {
  for (const drop of streetEvents.drops) {
    drop.x *= sx; drop.y *= sy; drop.speed *= sy;
    if (drop.bounceV !== undefined) drop.bounceV *= sy;
  }
}

// Helpers move visually; their original gift cadence and rewards stay unchanged.
function helperPresentation(side, age = catAge, remaining = powerTimers.helpers) {
  const enter = easeInOut(clamp(age / .65, 0, 1));
  const leave = easeInOut(clamp(1 - remaining / .5, 0, 1));
  const edge = side < 0 ? -65 : W + 65;
  return { x: edge + (helperX(side) - edge) * enter * (1 - leave),
    direction: leave > 0 ? side : -side, running: enter < 1 || leave > 0 };
}
function helperGiftOrigin(gift) {
  if (gift.owner !== "helpers") return gift;
  const side = gift.sx < W / 2 ? -1 : 1;
  const pose = helperPresentation(side, Math.max(0, catAge - gift.t), powerTimers.helpers + gift.t);
  return { sx: pose.x - side * 27 * 1.2, sy: gift.sy };
}
