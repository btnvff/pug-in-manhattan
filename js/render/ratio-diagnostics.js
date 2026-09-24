// Optional composition review overlays; no gameplay or ordinary scene drawing.
function drawRatioDiagnostics() {
  const C = PUG_WORLD_RATIO, width = C.reference_width, height = C.reference_height;
  if (!["blockout", "overlay", "reference"].includes(ratioMode))
    return;
  beginRatioPixels();
  ctx.save();
  ctx.font = "15px Arial";
  ctx.lineWidth = 1.3;
  const line = (y, color, label) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(0, y * height); ctx.lineTo(width, y * height); ctx.stroke(); ctx.fillStyle = color; ctx.fillText(label, 10, y * height - 6); };
  if (ratioMode !== "reference") {
    line(C.horizon_v, "#e2674a", "HORIZON " + C.horizon_v);
    line(C.pug_ground_v, "#eecc55", "PUG GROUND " + C.pug_ground_v);
    ctx.strokeStyle = "#eecc55";
    const pw = C.pug_height_ratio * C.pug_neutral_width_to_height * height;
    ctx.strokeRect(C.reference_pug_u * width - pw / 2, (C.pug_ground_v - C.pug_height_ratio) * height, pw, C.pug_height_ratio * height);
    ctx.fillStyle = "#eecc55";
    ctx.fillText("P = " + C.pug_height_ratio + " H", C.reference_pug_u * width + pw / 2 + 8, .8 * height);
    ctx.strokeStyle = "#e2674a";
    ctx.beginPath();
    ctx.arc(C.vanishing_u * width, C.horizon_v * height, 6, 0, Math.PI * 2);
    ctx.stroke();
    for (const d of C.reference_depth_anchors.slice(1)) {
      const p = WorldRatio.project(0, 0, d);
      ctx.fillStyle = "#f7f6da";
      ctx.fillText("d=" + d, C.vanishing_u * width + 5, p.v * height - 2);
    }
    for (const x of [...C.road_dimensions.sidewalk_edges, ...C.road_dimensions.road_edges]) {
      const a = WorldRatio.project(x, 0, 2.4), b = WorldRatio.project(x, 0, 35);
      ctx.strokeStyle = "#ead4a7";
      ctx.beginPath();
      ctx.moveTo(a.u * width, a.v * height);
      ctx.lineTo(b.u * width, b.v * height);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f7f6da";
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }
  ctx.fillStyle = "#203d49dd";
  ctx.fillRect(12, 12, 326, 53);
  ctx.fillStyle = "#fff3d9";
  ctx.fillText("PUG WORLD RATIO " + PUG_WORLD_RATIO.ratio_version, 23, 35);
  ctx.fillText(width + " × " + height + " · " + ratioMode, 23, 55);
  ctx.restore();
  beginRatioFeedback();
}
if (ratioMode === "reference" || ratioMode === "blockout")
  $("game").dataset.ratioDiagnostic = "true";
// Declare the coordinate space of DOM overlays.
for (const node of (document.querySelectorAll?.("#game > :not(canvas)") || []))
  node.dataset.coordinateSpace = "HUD";
