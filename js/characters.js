const easeInOut = (u) => {
  u = Math.max(0, Math.min(1, u));
  return u * u * (3 - 2 * u);
};
function pug(px, py, t, scale = 1) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale * RatioPresentation.unit / (PUG_WORLD_RATIO.reference_width / PUG_WORLD_RATIO.logical_game.width), scale);
  const win = state === "win",
    sad = state === "lose",
    angry = react > 0 && reaction < 0;
  const breath = Math.sin(t * 2.6),
    wobble = Math.sin(gait) * runBlend * 1.4 + breath * 0.5,
    hop = win
      ? (1 - Math.cos(t * 5)) * 4
      : react > 0
        ? Math.sin((react / BALANCE.feedback.reaction) * Math.PI) *
          (jackpotActive ? 3.7 : 3)
        : 0;
  ellipse(0, 5, 48 + 15 * 0.13, 8, "#3b352c35", null);
  ctx.translate(win ? Math.sin(t * 5) * 4 : 0, -hop);
  ctx.rotate(win ? Math.sin(t * 5) * 0.04 : lean);
  const squash =
    react > 0 && reaction > 0
      ? Math.sin((react / BALANCE.feedback.reaction) * Math.PI) * 0.018
      : 0;
  ctx.scale(1 + squash, 1 - squash);
  let belly = 31 + 15 * 0.2;
  // A tightly curled tail, a stocky barrel and short sturdy paws.
  ctx.save();
  ctx.translate(belly - 2, -38);
  ctx.rotate(
    tailSwing + Math.sin(t * 4) * 0.07 + Math.sin(gait) * runBlend * 0.05,
  );
  path(
    "M0 0 C26 4 32 -28 13 -30 C-4 -33 -10 -9 7 -7 C21 -5 23 -24 11 -22 C4 -22 5 -15 10 -16",
    null,
    "#82684e",
    10,
  );
  path(
    "M0 -1 C26 3 31 -27 13 -29 C-3 -31 -8 -10 7 -9 C19 -7 20 -23 11 -21",
    null,
    "#d4bc92",
    7,
  );
  ctx.restore();
  // Rear legs join the pelvis beneath the barrel, with alternating planted steps.
  for (const side of [-1, 1]) {
    const step = Math.sin(gait + (side * Math.PI) / 2) * runBlend;
    const fx = side * 26 + step * 5,
      fy = -Math.max(0, step) * 5;
    path(
      `M${side * 22 - 10} -35 Q${side * 31} -24 ${fx + 9} ${fy - 9} Q${fx + 15} ${fy + 6} ${fx} ${fy + 6} Q${fx - 13} ${fy + 5} ${fx - 10} ${fy - 6} L${side * 22 - 11} -22 Z`,
      shade(side * 24, -21, 28, "#c7a370", "#806044"),
      null,
    );
  }
  ellipse(
    wobble,
    -37,
    belly + 4,
    32 + 15 * 0.085,
    shade(-5, -49, belly + 16, "#e1c9a1", "#a58a64"),
    "#78664e",
    1.2,
  );
  ellipse(
    wobble - 3,
    -31,
    belly * 0.66,
    23 + 15 * 0.045,
    shade(-6, -40, 37, "#eddbb6", "#bfa47b"),
    null,
  );
  // Continuous shoulder-to-toe contours; the top blends into the chest.
  for (const side of [-1, 1]) {
    const step = Math.sin(gait + (side * Math.PI) / 2 + Math.PI) * runBlend;
    const fx = side * 18 + step * 5,
      fy = -Math.max(0, step) * 7;
    const kneeX = side * 19 - step * 2,
      kneeY = -20 - Math.max(0, step) * 3;
    path(
      `M${side * 18 - 10} -49 Q${side * 18 - 14} -36 ${kneeX - 8} ${kneeY} L${fx - 8} ${fy - 6} Q${fx - 14} ${fy + 4} ${fx - 4} ${fy + 6} Q${fx + 15} ${fy + 8} ${fx + 12} ${fy - 3} Q${fx + 9} ${fy - 8} ${fx + 7} ${fy - 11} L${kneeX + 8} ${kneeY - 1} Q${side * 18 + 13} -38 ${side * 18 + 9} -49 Z`,
      shade(side * 18 - 3, -29, 39, "#f1cd8c", "#bc8b53"),
      null,
    );
    path(
      `M${side * 18 + 9} -39 Q${kneeX + 9} -20 ${fx + 8} ${fy - 9}`,
      null,
      "#a5784a66",
      0.8,
    );
    for (let n = -1; n <= 1; n++)
      line(fx + n * 4, fy + 1, fx + n * 4 + 0.4, fy + 4, "#926b42", 0.7);
  }
  // Sparse short-coat strokes, fixed to the shoulder and belly surface.
  for (let i = 0; i < 28; i++) {
    const a = i * 2.399,
      rx = Math.cos(a) * (belly * 0.72),
      ry = -40 + Math.sin(a) * 20;
    line(rx, ry, rx + Math.cos(a) * 1.2, ry + 2, "#805b3538", 0.65);
  }
  // A broad neck overlaps both torso and skull, preventing a floating head.
  path(
    "M-25 -76 Q0 -85 25 -76 L28 -51 Q0 -43 -28 -51 Z",
    shade(-4, -65, 35, "#e7bb7c", "#b38b55"),
    null,
  );
  path(
    "M-29 -72 Q0 -56 29 -72 L26 -58 Q0 -47 -26 -58 Z",
    "#d83932",
    "#763c2d",
    1,
  );
  path(
    `M20 -61 Q${37 - tailSwing * 12} -56 ${38 - tailSwing * 15} -44 L33 -69 Z`,
    "#a62639",
    "#713d2d",
    1,
  );
  line(-23, -64, 20, -58, "#d07856", 1);
  for (let i = 0; i < 4; i++)
    line(29 + i, -51 + i, 28 + i, -47 + i, "#d2a077", 0.7);
  const eating = chewTime > 0 && !sad && !angry;
  const chewPhase = eating ? 1 - chewTime / 0.78 : 0;
  const chewEnvelope = eating
    ? Math.pow(Math.sin(Math.PI * chewPhase), 0.7)
    : 0;
  const jawOpen =
    chewEnvelope *
    (3 +
      7 *
        Math.pow(
          Math.cos(chewPhase * Math.PI * (chewVariant === 1 ? 3 : 2)),
          2,
        ));
  const jawSide =
    chewVariant === 1
      ? Math.sin(chewPhase * Math.PI * 6) * chewEnvelope * 1.5
      : 0;
  ctx.translate(headTurn * 3, 5 + wobble * 0.2 - lookUp * 3 + jawOpen * 0.08);
  ctx.translate(0, -61);
  ctx.rotate(headTurn * 0.13 - lean * 0.2);
  ctx.scale(1 - Math.abs(headTurn) * 0.09, 1 - lookUp * 0.1);
  ctx.translate(0, 61);
  // Wide rounded skull, folded button ears, a soft smooth forehead and an unmistakably flat black mask.
  ellipse(
    0,
    -96,
    44,
    38,
    shade(-8, -108, 51, "#ffe3b6", "#d8b27e"),
    "#b18e65",
    0.8,
  );
  ellipse(-31, -85, 10 + 15 * 0.045, 16, "#e2bd8a", null);
  ellipse(31, -85, 10 + 15 * 0.045, 16, "#e2bd8a", null);
  path(
    "M-26 -122 Q-44 -134 -43 -111 Q-42 -103 -35 -99 Q-28 -104 -25 -118 Z",
    shade(-34, -116, 19, "#534d44", "#282b29"),
    "#4a443b",
    1,
  );
  path(
    "M26 -122 Q44 -134 43 -111 Q42 -103 35 -99 Q28 -104 25 -118 Z",
    shade(33, -117, 19, "#514b41", "#252b29"),
    "#4a443b",
    1,
  );
  path(
    "M-37 -120 Q-34 -110 -35 -104 M37 -120 Q34 -110 35 -104",
    null,
    "#797061",
    1.4,
  );
  // Only two subtle folds beside the nose; no etched forehead wrinkles.
  path(
    "M-11 -110 Q-5 -113 -3 -107 M3 -107 Q5 -113 11 -110",
    null,
    "#c9a573",
    1,
  );
  path(
    "M-31 -101 Q-21 -113 -10 -103 Q0 -100 10 -103 Q21 -113 31 -101 Q40 -85 29 -73 Q23 -60 0 -62 Q-23 -60 -29 -73 Q-40 -85 -31 -101 Z",
    shade(-7, -91, 38, "#7a6150", "#443c37"),
    null,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const fx = side * (32 + (i % 3) * 2),
        fy = -105 + i * 4;
      line(fx, fy, fx + side * 1.6, fy + 2, "#8d663d55", 0.65);
    }
  const blinkPhase = (t + 1.3) % 4.7,
    blinkAmount =
      blinkPhase < 0.24 ? Math.sin((blinkPhase / 0.24) * Math.PI) : 0,
    blink = blinkAmount > 0.95;
  for (let side of [-1, 1]) {
    let ex = side * 21,
      ey = -96;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(0.57, 0.6);
    ctx.translate(-ex, -ey);
    ellipse(ex, ey, 14.5, 14.5, "#c5a176", null);
    ellipse(ex, ey + 0.8, 13.5, 13.5, "#262b29", "#181e1c", 1);
    if (blink) {
      path(
        `M${ex - 10} ${ey} Q${ex} ${ey + 4} ${ex + 10} ${ey}`,
        null,
        "#96836a",
        2,
      );
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 12.5, 12.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ellipse(ex, ey, 13, 13, "#817761", null);
      const ix = ex + gazeX * 4.8,
        iy = ey + gazeY * 4.5;
      ellipse(
        ix,
        iy,
        10,
        10.7,
        shade(ix - 2, iy - 2, 12, "#956c42", "#3d3026"),
        null,
      );
      ellipse(ix, iy, 6.3, 7, "#151d1a", null);
      ellipse(ix - 2.5, iy - 3.4, 1.65, 1.9, "#e8e6d6", null);
      ctx.restore();
    }
    if (blinkAmount > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 13, 13, 0, 0, Math.PI * 2);
      ctx.clip();
      rect(ex - 14, ey - 14, 28, blinkAmount * 24, "#8f7355");
      ctx.restore();
    }
    if (sad || angry)
      path(
        `M${ex - 10} ${ey - 12 + side * 2} Q${ex} ${ey - 16} ${ex + 10} ${ey - 12 - side * 2}`,
        null,
        "#8a795f",
        2.5,
      );
    ctx.restore();
  }
  ctx.translate(headTurn * 5, -lookUp * 1.8);
  // The chin and mouth belong to one mask, hinged at the muzzle corners.
  path(
    `M-28 -86 Q0 -98 28 -86 L28 -73 Q27 ${-57 + jawOpen} ${jawSide} ${-58 + jawOpen} Q-27 ${-57 + jawOpen} -28 -73 Z`,
    shade(-4, -77, 35, "#705c49", "#443c33"),
    null,
  );
  if (eating) {
    const opening = `M-17 -72 Q0 -69 17 -72 Q16 ${-65 + jawOpen} ${jawSide} ${-64 + jawOpen} Q-16 ${-65 + jawOpen} -17 -72 Z`;
    path(opening, "#211b19", null);
    ctx.save();
    ctx.clip(new Path2D(opening));
    if (chewPhase < 0.55) {
      ctx.translate(jawSide, -69 + jawOpen * 0.2);
      const portion = 0.45 * (1 - chewPhase / 0.62);
      ctx.scale(portion, portion);
      drawFood(chewFood, 0, 0, (chewVariant - 1) * 0.15, chewAppearance);
    }
    ctx.restore();
    path(
      `M-16 ${-68 + jawOpen * 0.5} Q${jawSide} ${-59 + jawOpen} 16 ${-68 + jawOpen * 0.5}`,
      null,
      "#987b59",
      1.2,
    );
  }
  // Squashed muzzle: nose sits high between the eyes, no projecting dog snout.
  ellipse(0, -85, 16, 8, shade(-3, -90, 20, "#ad8d65", "#695442"), null);
  ellipse(
    -10,
    -76 - jawOpen * 0.12,
    15 + 15 * 0.015,
    10 - jawOpen * 0.13,
    shade(-11, -81, 19, "#a48667", "#645044"),
    null,
  );
  ellipse(
    10,
    -76 - jawOpen * 0.12,
    15 + 15 * 0.015,
    10 - jawOpen * 0.13,
    shade(6, -81, 20, "#a48667", "#645044"),
    null,
  );
  path(
    "M-10 -88 Q0 -94 10 -88 Q11 -81 4 -79 L0 -77 L-4 -79 Q-11 -81 -10 -88 Z",
    shade(-3, -87, 12, "#474c44", "#131d19"),
    "#1b211c",
    1,
  );
  ellipse(-5, -85, 2.7, 1.8, "#09130f", null);
  ellipse(5, -85, 2.7, 1.8, "#09130f", null);
  ellipse(-1.5, -89, 3, 1, "#9a9c87", null);
  line(0, -79, 0, -73, "#17231b", 1.5);
  for (let side of [-1, 1])
    for (let i = 0; i < 3; i++)
      ellipse(side * (9 + (i % 2) * 6), -77 + i * 3, 1, 1, "#222d24", null);
  if (sad || angry) {
    path("M-13 -68 Q0 -75 13 -68", null, "#19271f", 2);
  } else if (!eating) {
    path("M-14 -71 Q-6 -66 0 -71 Q6 -66 14 -71", null, "#19271f", 1.8);
  }
  ctx.restore();
}

function drawCat(c) {
  const u = c.t,
    timing = catTiming(c),
    edge = c.side < 0 ? -45 : W + 45,
    inward = -c.side,
    target = c.x - inward * 27 * (c.helper ? 1 : 1.1),
    runIn = easeInOut((u - timing.wait) / timing.travel),
    exit = easeInOut((u - timing.leave) / timing.travel),
    px = c.presentation ? c.presentation.x :
      u < timing.leave
        ? edge + (target - edge) * runIn
        : target + (edge - target) * exit,
    dir = c.presentation ? c.presentation.direction : u < timing.leave ? inward : c.side,
    coat = ["#d18c4c", "#787e80", "#e2d8c5"][c.coat],
    running = c.presentation ? c.presentation.running : (u > timing.wait && u < timing.arrival) || u > timing.leave;
  if (!c.helper && u < timing.pickup) {
    ellipse(c.x, landingY() + 10, 25, 3, "#29353130", null);
    drawFood(0, c.x, landingY(), 0.2, c.variant);
  }
  ctx.save();
  ctx.translate(px, c.helper ? ground() : landingY() + 12);
  ctx.scale(dir * (c.helper ? 1.2 : 1.1), c.helper ? 1.2 : 1.1);
  const bob = running ? Math.sin(u * 32) * 2 : 0;
  ctx.translate(0, bob);
  ellipse(0, 4, 27, 4, "#584c3930", null);
  path("M-17 -13 Q-40 -22 -32 -37", null, coat, 6);
  ellipse(-1, -14, 23, 12, coat, "#6c5b49", 1);
  for (let i = 0; i < 4; i++) {
    let lx = -15 + i * 9,
      step = running ? Math.sin(u * 32 + i * 2) * 4 : 0;
    line(lx, -9, lx + step, 2, coat, 5);
  }
  ellipse(18, -23, 12, 11, coat, "#6c5b49", 1);
  path("M8 -28 L8 -42 L18 -32 L25 -40 L29 -26 Z", coat, "#6c5b49", 1);
  path("M11 -32 L11 -37 L15 -32 M22 -32 L25 -36 L26 -30", "#ba8d7f", null);
  for (let ex of [14, 24]) {
    ellipse(ex, -23, 2.5, 3, "#ccd694", null);
    line(ex, -25, ex, -21, "#273d33", 1);
  }
  ellipse(21, -18, 2, 1.5, "#7b534b", null);
  line(7, -18, 17, -17, "#eee3c9", 0.8);
  line(24, -17, 35, -19, "#eee3c9", 0.8);
  for (let j = 0; j < 3; j++)
    line(-11 + j * 8, -23, -8 + j * 8, -15, "#68564755", 2);
  if (c.helper) {
    path("M10 -15 Q18 -10 26 -16 L22 -8 L12 -9 Z", "#368d91", null);
    const toss = Math.sin(((5 - powerTimers.helpers) * Math.PI * 2) / 0.65);
    line(12, -9, 25, -14 - Math.max(0, toss) * 9, coat, 5);
  }
  if (!c.helper && u >= timing.pickup) {
    ctx.save();
    ctx.translate(27, -12);
    ctx.scale(0.45, 0.45);
    drawFood(0, 0, 0, 0.2, c.variant);
    ctx.restore();
  }
  ctx.restore();
}
