// Simulation-clock motion signals. Invoked only by tick(), never by rendering.
// Idle gaze keeps its established RNG draws and call order.
let moveSpeed = 0,
  runBlend = 0,
  gait = 0,
  lean = 0,
  leanVelocity = 0,
  tailSwing = 0,
  tailVelocity = 0,
  motionX = x;
let chewTime = 0;
let gazeX = 0,
  gazeY = 0,
  gazeTarget = null;
let headTurn = 0,
  lookUp = 0,
  lookTarget = 0,
  idleLookTimer = 1;
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
