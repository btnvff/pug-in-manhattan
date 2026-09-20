function render() {
  ctx.clearRect(0, 0, W, H);
  city(worldTime);
  // Neutral translucent mist reduces background chroma without filtering foreground.
  ctx.save();
  ctx.fillStyle = "rgba(210,218,223,.39)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (state === "menu") {
    let landscape = W > 550;
    pug(
      landscape ? W * 0.25 : W / 2,
      landscape ? H - 35 : H < 660 ? H - 256 : H * 0.61,
      clock,
      landscape ? 1 : H < 660 ? 0.75 : 1.16,
    );
    if (!landscape) {
      drawFood(0, W * 0.17, H * 0.48, -0.4);
      drawFood(3, W * 0.82, H * 0.44, 0.2);
      drawFood(0, W * 0.8, H * 0.59, 0.5);
    }
  } else {
    for (let cat of cats) drawCat(cat);
    for (const f of flocks) drawSparrows(f);
    drawPowerAura();
    drawCatHelpers();
    drawBirdHelpers();
    pug(
      W > 550 && (state === "win" || state === "lose") ? W * 0.25 : x,
      ground(),
      clock,
      heroScale(),
    );
    drawCatGifts();
    drawRunFeedback();
    drawEventFeedback();
    for (let it of items) {
      drawHazardCue(it);
      if (it.warning > 0) continue;
      drawRareFoodAura(it);
      ctx.save();
      if (it.type === 7) {
        ctx.translate(it.x, it.y);
        const pulse = 1 + Math.sin(clock * 2.8) * 0.025;
        ctx.scale(pulse, pulse);
        ctx.translate(-it.x, -it.y);
      }
      drawFood(
        it.type,
        it.x,
        it.y,
        (it.angle ?? 0) +
          (it.age ?? 0) * (it.spin ?? 0) +
          Math.sin((it.age ?? 0) * 2 + (it.phase ?? 0)) * 0.22,
        it.variant,
      );
      ctx.restore();
      drawSpecial(it);
    }
  }
  for (let e of effects) {
    ctx.globalAlpha = 1 - e.t / BALANCE.feedback.life;
    if (e.good) {
      const radius = (e.strong ? 14 : 9) + e.t * 35;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, radius, radius * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = e.kind === "rare" ? "#ffd27a" : "#e4be80";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    let textSize = e.text.length > 18 ? 16 : e.strong ? 26 : 20;
    ctx.font = "bold " + textSize + "px Georgia";
    const textWidth =
      ctx.measureText(e.text)?.width || e.text.length * textSize * 0.55;
    textSize *= Math.min(1, (W - 20) / textWidth);
    const half = Math.min((W - 20) / 2, textWidth / 2);
    txt(
      e.text,
      clamp(e.x, half + 10, W - half - 10),
      e.y - e.t * 45,
      textSize,
      e.good ? "#286b55" : e.kind === "cold" ? "#3f6676" : "#ad3e2e",
    );
    if (e.kind === "rare") {
      ctx.save();
      ctx.globalAlpha = (1 - e.t / BALANCE.feedback.life) * 0.35;
      ellipse(e.x, e.y, 20 + e.t * 35, 15 + e.t * 25, null, "#efc770", 2);
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) {
      let a = i * 1.256,
        px = e.x + Math.cos(a) * (12 + e.t * 36),
        py = e.y + Math.sin(a) * (8 + e.t * 20) - e.t * 30;
      ellipse(
        px,
        py,
        e.good ? 2 : 4,
        e.good ? 2 : 3,
        e.kind === "rare"
          ? "#ffe3a0"
          : e.good
            ? "#d9a55d"
            : e.kind === "cold"
              ? "#81a5b5"
              : "#93665a",
        null,
      );
    }
    ctx.globalAlpha = 1;
  }
  if (state === "win") {
    for (let i = 0; i < 36; i++) {
      let cx = (i * 71 + Math.sin(clock + i) * 16) % W,
        cy = (i * 53 + clock * 35) % H;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(clock + i);
      rect(
        -3,
        -5,
        6,
        10,
        ["#d96943", "#e9bb47", "#559b87", "#f5e3ae"][i % 4],
        2,
      );
      ctx.restore();
    }
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(
        x + Math.sin(i * 2 + clock) * 75,
        ground() - 150 - ((clock * 25 + i * 33) % 100),
      );
      ctx.scale(0.7, 0.7);
      path("M0 5 C-28 -10 -16 -25 0 -13 C16 -25 28 -10 0 5 Z", "#d76758", null);
      ctx.restore();
    }
  }
}
let lastPaintState = "",
  lastPaintWidth = 0,
  lastPaintHeight = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, BALANCE.frame.maxDelta);
  last = now;
  tick(dt);
  if (
    !document.hidden &&
    (state !== "pause" ||
      lastPaintState !== state ||
      lastPaintWidth !== W ||
      lastPaintHeight !== H)
  ) {
    render();
    lastPaintState = state;
    lastPaintWidth = W;
    lastPaintHeight = H;
  }
  audioFrame();
  requestAnimationFrame(frame);
}
resize();
soundUI();
ui();
hud();
requestAnimationFrame(frame);
