// Canvas background cache and gameplay projection share the ratio contract.
let ratioRaster = 1, ratioCanvasWorld = null;
function clearRatioCanvas() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
function beginRatioFeedback() { const a = RatioPresentation; ctx.setTransform(ratioRaster * PUG_WORLD_RATIO.reference_width / PUG_WORLD_RATIO.logical_game.width, 0, 0, ratioRaster * a.unit, 0, ratioRaster * (a.py(0))); }
function beginRatioPixels() { ctx.setTransform(ratioRaster, 0, 0, ratioRaster, 0, 0); }
function drawRatioWorldCanvas() {
  const C = PUG_WORLD_RATIO, width = C.reference_width, height = C.reference_height;
  const depthUnit = C.projection_calibration.pug_camera_depth;
  if (!ratioCanvasWorld) {
    ratioCanvasWorld = document.createElement("canvas");
    ratioCanvasWorld.width = width;
    ratioCanvasWorld.height = height;
    const pen = ratioCanvasWorld.getContext("2d"), faces = [];
    const sky = pen.createLinearGradient(0, 0, 0, 760);
    sky.addColorStop(0, "#80bbd8");
    sky.addColorStop(1, "#d1dad4");
    pen.fillStyle = sky;
    pen.fillRect(0, 0, width, height);
    for (const o of RATIO_LAYOUT.objects) {
      if (o.kind === "sign" || ratioMode === "blockout" && !o.role && !o.surface)
        continue;
      if (o.kind === "rod") {
        const a = WorldRatio.project(o.a[0], o.a[1], o.a[2] / depthUnit), b = WorldRatio.project(o.b[0], o.b[1], o.b[2] / depthUnit);
        faces.push({ depth: o.d, points: [a, b], color: o.color, line: Math.max(.35, C.pug_height_ratio * height * o.width / o.d) });
        continue;
      }
      const l = o.x - o.width / 2, r = o.x + o.width / 2, b = o.y - o.height / 2, t = o.y + o.height / 2, n = Math.max(.06, o.d - o.length / (2 * depthUnit)), f = o.d + o.length / (2 * depthUnit);
      const vertices = [[l, b, n], [r, b, n], [r, t, n], [l, t, n], [l, b, f], [r, b, f], [r, t, f], [l, t, f]];
      for (const [indices, shade] of [[[0, 1, 2, 3], 1], [[1, 5, 6, 2], .78], [[4, 0, 3, 7], .91], [[3, 2, 6, 7], 1.12]]) {
        const points = indices.map(i => WorldRatio.project(...vertices[i]));
        if (points.every(p => p.u < -.5) || points.every(p => p.u > 1.5))
          continue;
        const rgb = o.color.match(/[a-f\d]{2}/gi).map(v => Math.min(255, Math.round(parseInt(v, 16) * shade)));
        faces.push({ depth: indices.reduce((s, i) => s + vertices[i][2], 0) / 4, points, color: "rgb(" + rgb.join(",") + ")" });
      }
    }
    faces.sort((a, b) => b.depth - a.depth);
    for (const face of faces) {
      pen.beginPath();
      face.points.forEach((p, i) => i ? pen.lineTo(p.u * width, p.v * height) : pen.moveTo(p.u * width, p.v * height));
      if (face.line) {
        pen.strokeStyle = face.color;
        pen.lineWidth = face.line;
        pen.stroke();
      }
      else {
        pen.closePath();
        pen.fillStyle = face.color;
        pen.fill();
      }
    }
  }
  beginRatioPixels();
  ctx.drawImage(ratioCanvasWorld, 0, 0);
  beginRatioFeedback();
}
// Canvas fallback renderer. Gameplay state is read-only here.
function renderCanvasScene() {
  clearRatioCanvas();
  drawRatioWorldCanvas();
  if (state === "menu") {
    pug(ratioMode === "reference" || ratioMode === "blockout" ? W * PUG_WORLD_RATIO.reference_pug_u : x, ground(), ratioMode === "reference" ? 0 : clock, heroScale());
    drawFood(0, W * 0.17, H * 0.48, -0.4);
    drawFood(3, W * 0.82, H * 0.44, 0.2);
    drawFood(0, W * 0.8, H * 0.59, 0.5);
  }
  else {
    for (const drop of streetEvents.drops)
      drawFood(drop.type, drop.x, drop.y, foodAngle(drop), drop.variant);
    for (let cat of cats)
      drawCat(cat);
    drawPowerAura();
    drawCatHelpers();
    drawBirdHelpers();
    pug(x, ground(), clock, heroScale());
    drawCatGifts();
    drawRunFeedback();
    drawEventFeedback();
    for (let it of items) {
      drawHazardCue(it);
      if (it.warning > 0)
        continue;
      drawRareFoodAura(it);
      ctx.save();
      if (it.type === 7) {
        ctx.translate(it.x, it.y);
        const pulse = 1 + Math.sin(clock * 2.8) * 0.025;
        ctx.scale(pulse, pulse);
        ctx.translate(-it.x, -it.y);
      }
      drawFood(it.type, it.x, it.y, foodAngle(it), it.variant);
      ctx.restore();
      drawSpecial(it);
    }
  }
  drawFloatingFeedback();
  drawVictoryFeedback();
  drawRatioDiagnostics();
}
