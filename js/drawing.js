// The artwork is drawn in layers, with independent face, cheeks, belly and paws.
const C = { ink: "#533c30", cream: "#f4d9a0", dark: "#51413a" };
function ellipse(x, y, rx, ry, fill, stroke = C.ink, lw = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}
const pathCache = new Map();
function path(p, fill, stroke = C.ink, lw = 2) {
  let q = pathCache.get(p);
  if (!q) {
    q = new Path2D(p);
    if (pathCache.size >= 768) pathCache.delete(pathCache.keys().next().value);
  } else pathCache.delete(p);
  pathCache.set(p, q);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(q);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(q);
  }
}
function rect(x, y, w, h, c, r = 0, stroke = null) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = c;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function line(x, y, x2, y2, c, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = c;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function txt(s, x, y, size, color, align = "center") {
  ctx.font = "bold " + size + "px Georgia";
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
function shade(x, y, r, light, dark) {
  let g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}
