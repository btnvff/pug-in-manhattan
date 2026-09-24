const easeInOut = (u) => {
  u = Math.max(0, Math.min(1, u));
  return u * u * (3 - 2 * u);
};
/** Fixed spacing and a shared speed prevent traffic overtaking and sprite crossings. */
function streetLife(t, base) {
  const walkerRoute = W + 180;
  for (let i = 0; i < 3; i++) {
    const xx = ((t * 13 + (i * walkerRoute) / 3) % walkerRoute) - 90;
    ctx.save();
    ctx.translate(xx, base + 4);
    ctx.scale(0.66, 0.66);
    person(0, 0, t + i * 1.7, i);
    ctx.restore();
  }
  // One orderly stream: cars and bicycles occupy separate, widely spaced slots.
  const spacing = Math.max(300, W * 0.7),
    route = spacing * 3;
  for (let i = 0; i < 3; i++) {
    const xx = ((t * 29 + i * spacing) % route) - 150;
    if (xx < -140 || xx > W + 140) continue;
    if (i === 2) cyclist(xx, base + 45, t);
    else vehicle(xx, base + 45, t, i === 0 ? "taxi" : "truck", 0.72, 1);
  }
}
function wheel(x, y, r, t) {
  ellipse(x, y, r, r, "#303b38", "#465247", 1);
  ellipse(x, y, r * 0.63, r * 0.63, "#919d91", "#283f37", 1);
  ellipse(x, y, r * 0.25, r * 0.25, "#c6c8b1", null);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 3);
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    line(0, -r * 0.3, 0, -r * 0.56, "#dae1cc", 1);
  }
  ctx.restore();
  path(
    `M${x - r * 0.72} ${y - r * 0.4} Q${x} ${y - r * 1.1} ${x + r * 0.7} ${y - r * 0.4}`,
    null,
    "#829086",
    0.7,
  );
}
function driver(x, y, id = 0) {
  rect(x - 5, y + 4, 12, 11, id ? "#987259" : "#516961", 3);
  ellipse(x, y, 4.5, 5.5, id ? "#b68965" : "#d3ab82", null);
  path(
    `M${x - 5} ${y - 1} q-1 -9 8 -6 l2 5 l-3 -1 l-2 -2 l-5 3 Z`,
    "#484942",
    null,
  );
  ellipse(x + 3, y, 0.7, 0.7, "#323e34", null);
  line(x + 3, y + 8, x + 12, y + 11, id ? "#b68965" : "#d3ab82", 2);
  ellipse(x + 14, y + 11, 3, 5, "#a8c0b00a", "#384f46", 1);
}
function vehicle(px, py, t, type = "taxi", scale = 1, dir = 1) {
  const label = (text, x, y, size, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    txt(text, 0, 0, size, color);
    ctx.restore();
  };
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(dir * scale * 1.12, scale * 0.88);
  const suspension = Math.sin(t * 5 + px * 0.01) * 0.45;
  ellipse(0, 9, type === "truck" ? 83 : 65, 5, "#293c3825", null);
  ctx.translate(0, suspension);
  let truck = type === "truck" || type === "van";
  if (truck) {
    const paint = ctx.createLinearGradient(0, -64, 0, 4);
    paint.addColorStop(0, "#eff5fa");
    paint.addColorStop(0.55, "#c6d6e4");
    paint.addColorStop(1, "#778ba2");
    rect(-78, -64, 104, 63, paint, 3, "#63756b");
    rect(-75, -61, 98, 3, "#fff7dc");
    rect(-75, -19, 98, 4, type === "truck" ? "#508774" : "#9b6550");
    for (let i = 0; i < 9; i++)
      line(-72, -53 + i * 5, 20, -53 + i * 5, "#5b7e6d18", 0.6);
    label(type === "truck" ? "HUDSON" : "CANAL", -25, -41, 13, "#426c5d");
    label(
      type === "truck" ? "FRESH PRODUCE" : "BAKERY DELIVERY",
      -25,
      -29,
      6,
      "#61765f",
    );
    if (type === "truck") {
      ellipse(-58, -39, 7, 7, "#c38347", null);
      path("M-59 -44 l2 -7 l4 5", null, "#5b8853", 2);
    }
    const cab = ctx.createLinearGradient(0, -45, 0, 5);
    cab.addColorStop(0, "#24ae9e");
    cab.addColorStop(1, "#087b77");
    path(
      "M26 -43 L57 -43 Q63 -43 67 -34 L79 -11 L79 3 L26 3 Z",
      cab,
      "#385f55",
      1.3,
    );
    path("M32 -38 L56 -38 L67 -17 L32 -17 Z", "#41665f", null);
    driver(47, -29, 1);
    path("M32 -38 L41 -38 L51 -17 L43 -17 Z", "#e4f1d92c", null);
    path("M55 -38 L59 -33 L68 -18 L65 -18 Z", "#e6ecd782", null);
    rect(28, -12, 49, 2, "#85ad98");
    rect(32, -8, 8, 2, "#b8c4aa", 1);
    line(30, -16, 30, 0, "#315d52", 1);
    rect(70, -8, 8, 7, "#e3d39c", 1);
    rect(74, 2, 9, 4, "#88988b", 1);
    rect(-82, -4, 5, 5, "#b25e46", 1);
    rect(-75, 0, 145, 4, "#526a5d", 1);
    for (let xx of [-51, 52]) wheel(xx, 5, 12, t);
    for (let xx of [-69, 16]) {
      line(xx, -59, xx, -23, "#8d9f8d", 1);
      ellipse(xx, -57, 1, 1, "#ecedda", null);
    }
  } else {
    const taxi = type === "taxi",
      col = taxi ? "#ffc400" : "#2874b7";
    let paint = ctx.createLinearGradient(0, -28, 0, 8);
    paint.addColorStop(0, taxi ? "#ffe66b" : "#69b3ed");
    paint.addColorStop(0.5, col);
    paint.addColorStop(1, taxi ? "#c98108" : "#244968");
    path(
      "M-62 -9 Q-60 -21 -40 -23 L-27 -43 Q-22 -48 -11 -48 L22 -48 Q31 -47 37 -37 L46 -23 L66 -19 Q73 -17 74 -7 L74 3 L-64 3 Z",
      paint,
      taxi ? "#967333" : "#476775",
      1.3,
    );
    path("M-34 -24 L-22 -42 L-7 -42 L-7 -24 Z", "#537a75", null);
    path("M-2 -43 L20 -43 Q26 -42 31 -34 L38 -24 L-2 -24 Z", "#466b67", null);
    driver(15, -35, 0);
    if (taxi) {
      ellipse(-18, -33, 4, 5, "#a8805f", null);
      rect(-22, -28, 10, 4, "#92705e", 2);
    }
    path(
      "M-26 -41 L-19 -41 L-11 -24 L-17 -24 Z M3 -42 L9 -42 L20 -25 L14 -25 Z",
      "#e4efe04b",
      null,
    );
    line(-1, -22, -1, 1, "#7f784938", 1);
    line(-38, -19, -38, -1, "#786b442e", 1);
    rect(-14, -18, 8, 2, "#fff1b8", 1);
    rect(22, -18, 8, 2, "#fff1b8", 1);
    rect(36, -26, 8, 4, col, 2, "#59785a");
    path("M-57 -13 Q1 -19 63 -12", null, taxi ? "#ffe9a480" : "#b4d5ce80", 1.5);
    path("M-53 -5 L61 -5", null, taxi ? "#bb8a3555" : "#3b5e6e55", 2);
    rect(65, -12, 8, 6, "#fff0b1", 2);
    rect(-63, -9, 5, 6, "#b8563c", 1);
    rect(63, 1, 12, 3, "#b4b69a", 1);
    rect(-65, 1, 11, 3, "#b4b69a", 1);
    rect(54, -5, 9, 4, "#e2c67f", 1);
    if (taxi) {
      rect(-12, -56, 31, 8, "#f3d275", 2, "#aa8742");
      label("TAXI", 3, -50, 6, "#605d3f");
      ellipse(14, -10, 9, 7, "#d8a43f", "#a48a45", 0.6);
      label("NYC", 14, -8, 5, "#635e36");
      for (let i = 0; i < 8; i++)
        for (let row = 0; row < 2; row++)
          if ((i + row) % 2 === 0)
            rect(-31 + i * 4, -12 + row * 3, 4, 3, "#655e3a");
    }
    for (const wx of [-38, 44]) {
      path(
        `M${wx - 14} 4 A14 14 0 0 1 ${wx + 14} 4`,
        null,
        taxi ? "#94651c" : "#243951",
        3,
      );
    }
    path(
      "M-33 -23 L-22 -42 Q-17 -46 -7 -45 L20 -45 Q29 -44 39 -23",
      null,
      "#c4dee6",
      1,
    );
    line(-4, -43, -4, -24, "#253d49", 2);
    line(69, -4, 74, -4, "#263b46", 2);
    wheel(-38, 5, 12, t);
    wheel(44, 5, 12, t);
  }
  ctx.restore();
}
function limb(
  x,
  y,
  length,
  angle,
  lowerAngle,
  color,
  width,
  shoe = false,
  skin = "#c09572",
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const kx = 0,
    ky = length,
    ex = -Math.sin(lowerAngle) * length * 0.94,
    ey = length + Math.cos(lowerAngle) * length * 0.94;
  const r = width * 0.5;
  path(
    `M${-r} -2 Q${-r - 1} ${length * 0.5} ${kx - r * 0.8} ${ky} L${ex - r * 0.65} ${ey} Q${ex} ${ey + 2} ${ex + r * 0.65} ${ey} L${kx + r * 0.8} ${ky} Q${r + 1} ${length * 0.5} ${r} -2 Z`,
    color,
    null,
  );
  if (shoe)
    path(
      `M${ex - r} ${ey - 2} Q${ex + 2} ${ey - 2} ${ex + 6} ${ey + 1} L${ex + 6} ${ey + 3} L${ex - r} ${ey + 3} Z`,
      "#202c38",
      null,
    );
  else ellipse(ex, ey, 1.6, 2.5, skin, null);
  ctx.restore();
}
function person(px, py, t, id = 0, walk = 1) {
  ctx.save();
  ctx.translate(px, py);
  const phase = t * (3.4 + (id % 3) * 0.3),
    stride = Math.sin(phase) * walk,
    bob = (1 - Math.cos(phase * 2)) * 0.65 * walk;
  let skin = [
      "#c69773",
      "#946648",
      "#d4ab85",
      "#b18162",
      "#815943",
      "#bd9270",
      "#d9b08b",
    ][id % 7],
    cloth = [
      "#244b7e",
      "#20795e",
      "#de603e",
      "#8551ad",
      "#dfa029",
      "#287fa6",
      "#db5c80",
    ][id % 7];
  ellipse(0, 2, 10, 2.5, "#344f4122", null);
  ctx.translate(0, -bob);
  ctx.rotate(stride * 0.012);
  limb(
    -3,
    -24,
    11,
    -stride * 0.42,
    Math.max(0, stride) * 0.35,
    "#3f4d4a",
    4.5,
    true,
  );
  limb(
    3,
    -24,
    11,
    stride * 0.42,
    Math.max(0, -stride) * 0.35,
    "#48534b",
    4.5,
    true,
  );
  limb(-6, -47, 9, stride * 0.33 + 0.08, 0.13, cloth, 4.2, false, skin);
  path(
    "M-3 -54 L3 -54 L4 -50 Q10 -49 9 -44 L6 -32 L7 -24 Q0 -21 -7 -24 L-6 -32 L-9 -44 Q-10 -49 -4 -50 Z",
    cloth,
    null,
  );
  path("M-7 -27 Q0 -25 7 -27 L6 -19 L-6 -19 Z", "#344154", null);
  path("M-3 -50 L0 -46 L3 -50", null, "#e7e4dbbb", 0.65);
  line(0, -45, 0, -30, "#202e4438", 0.6);
  if (id % 2 === 0)
    for (let button = 0; button < 3; button++)
      ellipse(1, -41 + button * 4, 0.45, 0.45, "#e7e1cf", null);
  path("M2 -43 L5 -43 L5 -40 L2 -40 Z", null, "#142b4033", 0.6);
  path("M-5 -32 Q-2 -34 0 -32 M2 -29 L5 -30", null, "#12253933", 0.65);
  line(-4, -46, -3, -30, "#eee0bd2d", 1);
  line(6, -41, 5, -29, "#2b403329", 1);
  let gesture = walk ? stride * 0.33 : Math.sin(t * 1.4 + id) * 0.16;
  limb(
    7,
    -47,
    9,
    -gesture - 0.1,
    id === 3 ? -0.9 : 0.18,
    cloth,
    4.2,
    false,
    skin,
  );
  rect(-2, -55, 4, 6, skin, 1);
  ctx.save();
  ctx.translate(0, -62);
  ctx.rotate(walk ? Math.sin(phase) * 0.025 : Math.sin(t * 0.7 + id) * 0.07);
  path("M-4 -6 Q0 -10 4 -6 L5 1 L3 6 Q0 8 -3 5 L-5 0 Z", skin, null);
  ellipse(5, 1, 1.8, 2, skin, null);
  path(
    "M-6 -1 Q-8 -11 2 -10 Q8 -9 7 -2 L4 -4 L2 -7 L-4 -4 Z",
    id === 2 ? "#785041" : "#39413a",
    null,
  );
  path("M0 -2 Q2 -3 3 -2", null, "#403732", 0.6);
  line(1, 0, 3, 0, "#394b3f", 0.8);
  if (id % 3 === 0) {
    rect(-1, -1.3, 4, 2.6, "#7397a344", 0.6, "#384250");
    line(3, 0, 5, -0.5, "#384250", 0.6);
  }
  if (id === 1 || id === 4) path("M-2 4 Q1 8 4 4", null, "#45383066", 1.3);
  path("M-4 -5 Q0 -9 3 -6", null, "#aaa39455", 0.6);
  path("M4 0 l2 3 l-2 0", null, "#856b50", 0.6);
  line(1, 5, 3, 5, "#8c6252", 0.6);
  ctx.restore();
  if (id % 7 === 0) {
    path("M-4 -49 L0 -38 L4 -49 Z", "#ece4cd", null);
    path("M-1 -46 L1 -46 L2 -35 L0 -32 L-2 -35 Z", "#9f7360", null);
    ctx.save();
    ctx.translate(-10 + stride * 3, -24);
    ctx.rotate(stride * 0.12);
    rect(-5, 0, 12, 10, "#755844", 1);
    path("M-2 0 v-3 h6 v3", null, "#5d4d38", 1);
    line(-3, 3, 5, 3, "#b6976a", 0.7);
    ctx.restore();
  }
  if (id % 7 === 1) {
    path(
      "M-7 -48 Q-12 -59 -3 -60 L4 -60 Q12 -59 7 -48 L4 -52 L-4 -52 Z",
      "#718574",
      null,
    );
    line(-3, -50, -2, -39, "#cfcab0", 0.7);
    line(3, -50, 2, -39, "#cfcab0", 0.7);
    rect(-5, -31, 10, 4, "#405b4b", 2);
  }
  if (id % 7 === 2) {
    path("M-5 -68 Q-12 -60 -7 -50 L-4 -59 Z", "#7c5340", null);
    ctx.save();
    ctx.translate(11 - stride * 3, -26);
    ctx.rotate(-stride * 0.1);
    rect(-4, 0, 12, 16, "#d8be8b", 1);
    path("M-2 0 q4 -9 8 0", null, "#a78a60", 1);
    ellipse(1, 4, 3, 2, "#758457", null);
    ctx.restore();
  }
  if (id % 7 === 3) {
    rect(9, -37, 5, 9, "#34433b", 1);
    rect(10, -36, 3, 5, "#a2b9a2");
    line(-6, -47, 6, -29, "#c2b394", 2);
    rect(-9, -31, 7, 10, "#9a855f", 2);
  }
  if (id % 7 === 4) {
    rect(-7, -50, 4, 23, "#756745", 2);
    rect(4, -50, 4, 23, "#756745", 2);
    rect(-6, -34, 12, 10, "#86764f", 2);
    ellipse(1, -72, 8, 2, "#bc9457", null);
    path("M-5 -74 Q0 -86 7 -74 Z", "#bca064", null);
  }
  if (id === 5) {
    line(7, -34, 13, -40, skin, 2);
    rect(11, -44, 5, 6, "#e1c9a2", 1);
    rect(10, -45, 7, 1, "#7f7359");
  }
  if (id === 6) {
    line(8, -32, 12, -44 + Math.sin(t * 2) * 3, skin, 2);
    ellipse(12, -44 + Math.sin(t * 2) * 3, 2, 3, skin, null);
  }
  ctx.restore();
}
function cyclist(px, py, t) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(0.78, 0.78);
  for (let wx of [-22, 22]) wheel(wx, 0, 15, t * 1.8);
  path(
    "M-22 0 L-10 -23 L5 0 L-22 0 L2 -25 L15 -25 L22 0",
    null,
    "#6b8b71",
    2.3,
  );
  line(14, -28, 23, -30, "#344e42", 2);
  line(-14, -28, -5, -28, "#344e42", 3);
  ellipse(-3, -58, 6, 7, "#c39472", null);
  path("M-10 -60 Q-7 -70 2 -65 L5 -59 Z", "#d2a754", "#826f42", 1);
  path("M-5 -51 Q6 -52 13 -34 L3 -31 L-12 -43 Z", "#718b75", null);
  line(9, -43, 23, -31, "#b18e69", 3);
  for (let i = 0; i < 2; i++) {
    let a = t * 6 + i * Math.PI,
      fx = 1 + Math.cos(a) * 7,
      fy = -3 + Math.sin(a) * 6;
    line(1, -31, -9 + Math.cos(a) * 7, -18, "#4b5d54", 5);
    line(-9 + Math.cos(a) * 7, -18, fx, fy, "#4b5d54", 4);
    line(fx - 3, fy, fx + 3, fy, "#283f36", 2);
  }
  rect(-23, -53, 14, 21, "#ba8a51", 3, "#7b6748");
  line(-23, -47, -10, -47, "#d4b47c", 1);
  ctx.restore();
}
function pug(px, py, t, scale = 1) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale * RatioPresentation.unit / (600 / 390), scale);
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
