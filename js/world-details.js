function brickTexture(bx, top, bw, base, id) {
  for (let row = 0, yy = top + 8; yy < base - 107; yy += 11, row++) {
    for (
      let col = 0, xx = bx + (row % 2) * 13;
      xx < bx + bw - 5;
      xx += 26, col++
    ) {
      const seed = (row * 13 + col * 37 + id * 11) % 17;
      rect(
        xx + 1,
        yy + 1,
        Math.min(23, bx + bw - xx - 1),
        8,
        seed % 3 === 0
          ? "#d2a07125"
          : seed % 3 === 1
            ? "#412f2d1b"
            : "#f7c39412",
        0.4,
      );
      if (seed < 4) line(xx + 4, yy + 7, xx + 10, yy + 7, "#f0c9a430", 0.7);
    }
  }
}
/** Static scenery is rasterized once per viewport; only living details redraw. */
let sceneScale = 1;
const sceneryCache = new Map();
let windowSlots = [],
  fanSlots = [];
function invalidateScenery() {
  sceneryCache.clear();
  windowSlots = [];
  fanSlots = [];
}
function sceneryLayer(name, paint) {
  let surface = sceneryCache.get(name);
  if (!surface) {
    surface = document.createElement("canvas");
    const ratio = Math.min(devicePixelRatio || 1, 1.5) * sceneScale;
    surface.width = Math.ceil(W * ratio);
    surface.height = Math.ceil(H * ratio);
    const display = ctx;
    ctx = surface.getContext("2d");
    ctx.scale(ratio, ratio);
    try {
      paint();
    } finally {
      ctx = display;
    }
    sceneryCache.set(name, surface);
  }
  ctx.drawImage(surface, 0, 0, W, H);
}
function buildingDetails(bx, top, bw, base, id) {
  // Individual sunlit brick faces, chips, cornice dentils, drainpipe and old repairs.
  for (let i = 0; i < bw; i += 10) {
    rect(bx + i, top - 11, 5, 5, "#594e43");
    rect(bx + i, top - 12, 6, 1, "#e3caa4");
  }
  line(bx + bw - 5, top, bx + bw - 5, base - 10, "#473f3430", 6);
  line(bx + bw - 6, top, bx + bw - 6, base - 10, "#697164", 2.5);
  for (let yy = top + 14; yy < base - 20; yy += 48)
    rect(bx + bw - 9, yy, 7, 2, "#3c4940");
  rect(bx + 4, top - 31, 15, 18, "#936d55");
  rect(bx + 2, top - 33, 19, 4, "#6f6553");
  rect(bx + bw - 34, top - 22, 20, 9, "#879081", 2);
  line(bx + bw - 25, top - 22, bx + bw - 25, top - 36, "#56645b", 1.4);
  line(bx + bw - 33, top - 30, bx + bw - 17, top - 30, "#56645b", 1);
  line(bx + bw - 30, top - 34, bx + bw - 20, top - 34, "#56645b", 1);
  let step = (base - top - 104) / 3;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 2; col++) {
      let wx = bx + 14 + col * bw * 0.46,
        wy = top + 15 + row * step,
        ww = bw * 0.29,
        hh = Math.max(32, step - 13);
      rect(wx - 5, wy - 6, ww + 10, 4, "#d0af86");
      rect(wx - 5, wy - 2, ww + 10, 2, "#513e302f");
      if ((row + col + id) % 3 === 0) {
        let acx = wx + ww - 17,
          acy = wy + hh - 3;
        rect(acx, acy, 21, 12, "#a7ada0", 1, "#686e5e");
        rect(acx + 1, acy + 2, 9, 7, "#6d8075", 1);
        for (let j = 0; j < 5; j++)
          line(
            acx + 12,
            acy + 2 + j * 1.5,
            acx + 19,
            acy + 2 + j * 1.5,
            "#727d70",
            0.6,
          );
        fanSlots.push({ x: acx + 5.5, y: acy + 5.5, id: row * 2 + col });
      }
    }
  // Fire-escape shadows give the brickwork relief without obscuring falling objects.
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 3; i++) {
    const yy = top + step * (i + 1) + 14;
    path(
      `M${bx + 20} ${yy} l${bw * 0.6} 0 l-12 10 l${-bw * 0.6} 0 Z`,
      "#272c26",
      null,
    );
  }
  ctx.globalAlpha = 1;
  let sx = bx + (id ? bw - 23 : 12),
    sy = top + 72;
  rect(sx - 3, sy - 3, 24, 67, "#5b4439", 2);
  rect(sx, sy, 18, 61, id ? "#b9693d" : "#37685d", 1, "#d3b588");
  const letters = id ? "DELI" : "PIZZA";
  for (let i = 0; i < letters.length; i++)
    txt(letters[i], sx + 9, sy + 10 + i * 11, 8, "#fff2c9");
}
function fireEscapeOverlay() {
  for (const b of [
    { x: -9, w: W * 0.31, top: H * 0.36, id: 0 },
    { x: W * 0.7, w: W * 0.32, top: H * 0.32, id: 1 },
  ]) {
    const step = (H * 0.7 - b.top - 104) / 3,
      fx = b.id ? b.x + 6 : b.x + b.w * 0.43,
      fw = b.w * 0.51;
    for (let j = 0; j < 3; j++) {
      const fy = b.top + step * (j + 1) + 10;
      rect(fx, fy, fw, 3, "#35463e");
      line(fx, fy - 15, fx + fw, fy - 15, "#43564b", 1.3);
      for (let n = 0; n < 7; n++)
        line(fx + (n * fw) / 6, fy - 15, fx + (n * fw) / 6, fy, "#43564b", 0.8);
      line(fx, fy - 16, fx + fw, fy - 16, "#a1a48a", 0.6);
      if (j < 2) {
        line(fx + 3, fy + 4, fx + fw - 7, fy + step - 7, "#35473e", 1.7);
        line(fx + 13, fy + 4, fx + fw + 3, fy + step - 7, "#35473e", 1.7);
        for (let n = 0; n < 8; n++) {
          const u = n / 8;
          line(
            fx + 3 + (fw - 10) * u,
            fy + 4 + (step - 11) * u,
            fx + 13 + (fw - 10) * u,
            fy + 4 + (step - 11) * u,
            "#35473e",
            1.3,
          );
        }
      }
    }
  }
}
function shopDetails(base) {
  // Produce crates, stacked deliveries, a sidewalk menu and a parked bicycle.
  const bx = W - 91,
    yy = base - 5;
  for (let j = 0; j < 2; j++) {
    rect(bx + j * 27, yy - 20, 25, 19, "#947247", 1, "#614d35");
    line(bx + j * 27 + 2, yy - 11, bx + j * 27 + 23, yy - 11, "#c69c64", 1.2);
    for (let k = 0; k < 8; k++)
      ellipse(
        bx + j * 27 + 5 + (k % 4) * 5,
        yy - 18 - Math.floor(k / 4) * 4,
        3.2,
        3,
        j ? "#d28549" : "#8eaa54",
        null,
      );
  }
  rect(W - 22, base - 31, 18, 27, "#aa895a", 1);
  line(W - 14, base - 30, W - 14, base - 5, "#d1b382", 2);
  txt("FRESH", W - 13, base - 16, 4, "#5c503b");
  ctx.save();
  ctx.translate(W * 0.34, base + 1);
  ctx.rotate(-0.06);
  path("M-11 0 L-8 -32 L12 -32 L15 0 Z", "#624d35", "#af9263", 1.5);
  rect(-6, -29, 17, 24, "#2e493f", 1);
  txt("COFFEE", 2, -21, 4, "#e5d2a7");
  txt("$2", 2, -12, 7, "#eee0b7");
  line(-3, -8, 8, -8, "#a8b799", 0.7);
  ctx.restore();
  let px = 49,
    py = base + 3;
  for (let xx of [px - 15, px + 17]) {
    ellipse(xx, py - 4, 10, 10, "#4252480a", "#4b574b", 1.4);
    for (let i = 0; i < 6; i++)
      line(
        xx,
        py - 4,
        xx + Math.cos(i) * 9,
        py - 4 + Math.sin(i) * 9,
        "#909d85",
        0.6,
      );
  }
  path(
    `M${px - 15} ${py - 4} l10 -16 l9 16 l-19 0 l14 -17 l10 0 l3 17`,
    null,
    "#a87b53",
    1.8,
  );
  line(px + 9, py - 21, px + 15, py - 22, "#434c3f", 2);
  line(px - 8, py - 22, px - 1, py - 22, "#454e43", 2);
  // Reflected diagonal sky strips in shop glass, door hardware and small posters.
  for (let b of [0, 1]) {
    let x = b ? W * 0.7 + 12 : 3;
    path(`M${x} ${base - 66} l11 0 l20 49 l-10 0 Z`, "#d9dfc620", null);
    rect(x + 17, base - 46, 13, 18, "#d7c394", 0.5);
    txt(b ? "LOCAL" : "SLICE", x + 23, base - 37, 4, "#704e38");
    line(x + 2, base - 27, x + 2, base - 17, "#c9b37d", 1.5);
  }
}
function pavementDetails(walk) {
  const light = ctx.createLinearGradient(0, walk, W, H);
  light.addColorStop(0, "#f9e1b135");
  light.addColorStop(0.65, "#e3ceab00");
  light.addColorStop(1, "#8c8a7618");
  rect(0, walk, W, H - walk, light);
  // Shallow puddle, drain, manhole, weathering, leaves and a folded newspaper.
  ellipse(W - 55, walk + 45, 28, 5, "#98b9b14b", null);
  line(W - 73, walk + 43, W - 36, walk + 43, "#e1ecd975", 1);
  ellipse(W * 0.68, H - 37, 21, 6, "#8e8b76", "#747b69", 1);
  ellipse(W * 0.68, H - 37, 16, 4, "#9a9780", "#6d7664", 0.7);
  for (let i = -2; i < 3; i++)
    line(
      W * 0.68 - 11,
      H - 37 + i,
      W * 0.68 + 11,
      H - 37 + i,
      "#747b6955",
      0.6,
    );
  ctx.save();
  ctx.translate(35, H - 45);
  ctx.rotate(0.18);
  rect(-8, -6, 18, 12, "#d6ccb2", 1);
  txt("NYC", 0, -1, 4, "#747763");
  for (let j = 0; j < 3; j++)
    line(-5, 2 + j * 2, 7, 2 + j * 2, "#8f958077", 0.6);
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    let xx = (i * 97 + 18) % W,
      yy = walk + 28 + ((i * 31) % 115);
    path(
      `M${xx} ${yy} q6 -6 10 -2 q-3 6 -10 2`,
      i % 2 ? "#a77e4360" : "#a0915160",
      null,
    );
  }
  // Hydrant chain, brass caps and a parking meter.
  path(`M8 ${walk - 5} Q9 ${walk + 12} 23 ${walk + 3}`, null, "#554f3d", 1);
  ellipse(20, walk - 11, 2, 2, "#dab179", null);
  line(W - 11, walk - 4, W - 11, walk - 65, "#526456", 3);
  rect(W - 18, walk - 75, 14, 20, "#638074", 5, "#3d554a");
  rect(W - 15, walk - 71, 8, 6, "#bdcbb0", 2);
  rect(W - 14, walk - 61, 6, 2, "#304c43");
}
function birds(t) {
  // Small flocks move on independent, continuous wing cycles.
  for (let i = 0; i < 9; i++) {
    let bx = ((t * (12 + (i % 3) * 3) + i * 73) % (W + 90)) - 45,
      by = H * (0.21 + (i % 3) * 0.052) + Math.sin(t * 0.7 + i) * 11,
      wing = Math.sin(t * (7 + (i % 3)) + i) * 5,
      s = i < 4 ? 0.72 : 0.48;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);
    ellipse(0, 0, 4, 1.7, "#657a76", null);
    path(
      `M-1 0 Q-6 ${-5 - wing} -12 ${-3 - wing} M1 0 Q6 ${-5 - wing} 12 ${-3 - wing}`,
      null,
      "#5b7573",
      1.7,
    );
    ctx.restore();
  }
}
function pigeon(px, py, t, id) {
  ctx.save();
  ctx.translate(px, py);
  let peck = Math.pow(Math.max(0, Math.sin(t * 1.3 + id)), 8);
  ellipse(0, 2, 9, 2, "#49534125", null);
  line(-3, -1, -4, 3, "#956a53", 1);
  line(4, -1, 5, 3, "#956a53", 1);
  ellipse(0, -6, 9, 5, "#85958f", "#627971", 0.6);
  ellipse(-2, -7, 6, 3, "#647d78", null);
  path("M-7 -5 l-6 -3 l3 7 Z", "#647971", null);
  ellipse(6 + peck * 4, -11 + peck * 8, 4, 4, "#5f817b", null);
  ellipse(7 + peck * 4, -12 + peck * 8, 0.7, 0.7, "#e5c99a", null);
  path(`M${9 + peck * 4} ${-10 + peck * 8} l4 1 l-4 1 Z`, "#a3a17a", null);
  line(-6, -7, 0, -4, "#c4c8ad", 1);
  ctx.restore();
}
function atmosphere(t, walk) {
  birds(t);
  for (let i = 0; i < 3; i++)
    pigeon(
      35 + i * 23 + Math.sin(t * 0.45 + i) * 9,
      walk - 8 - (i % 2) * 3,
      t,
      i,
    );
  for (let f of fanSlots) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(t * 4 + f.id);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ellipse(0, -1.6, 1, 2, "#afbaac", null);
    }
    ctx.restore();
  }
  // Motes remain at street level, away from falling food.
  for (let i = 0; i < 9; i++) {
    let u = (t * 0.08 + i * 0.117) % 1;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.33;
    ellipse((i * 59 + t * 4) % W, walk - 10 - u * 50, 1, 0.7, "#ffe8aa", null);
  }
  ctx.globalAlpha = 1;
}

let cachedSteam = null;
function steamSprite() {
  if (cachedSteam) return cachedSteam;
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d"),
    glow = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  glow.addColorStop(0, "#f1f7ff");
  glow.addColorStop(0.45, "#f1f7ffa0");
  glow.addColorStop(1, "#f1f7ff00");
  g.fillStyle = glow;
  g.fillRect(0, 0, 96, 96);
  cachedSteam = c;
  return c;
}
function driftingPaper(t, walk) {
  // Three fixed particles, driven by world time: freeze on pause, no timers or allocation.
  for (let i = 0; i < 3; i++) {
    const travel = (t * (15 + i * 3) + i * W * 0.4) % (W + 100),
      px = travel - 50;
    const py = walk - 24 - i * 24 - Math.sin(t * 0.8 + i * 2) * 14;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(t * 1.8 + i) * 0.6);
    ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(t * 2 + i)));
    path(
      "M-6 -4 L5 -5 L7 4 L-5 5 Z",
      i === 1 ? "#dcd5bb" : "#edf0e3",
      "#8b969655",
      0.6,
    );
    path("M-3 -2 L3 -2 M-3 0 L4 0 M-2 2 L1 2", null, "#657f8b77", 0.6);
    ctx.restore();
  }
}
