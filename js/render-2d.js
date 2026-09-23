// Original Canvas renderer. Gameplay state is read-only here.
function renderCanvasScene() {
  ctx.clearRect(0, 0, W, H);
  city(worldTime);
  // Neutral translucent mist reduces background chroma without filtering foreground.
  ctx.save();
  ctx.fillStyle = "rgba(202,224,238,.12)";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (state === "menu") {
    let landscape = W > 550;
    pug(
      W / 2,
      ground(),
      clock,
      heroScale(),
    );
    if (!landscape) {
      drawFood(0, W * 0.17, H * 0.48, -0.4);
      drawFood(3, W * 0.82, H * 0.44, 0.2);
      drawFood(0, W * 0.8, H * 0.59, 0.5);
    }
  } else {
    for (const drop of streetEvents.drops)
      drawFood(drop.type, drop.x, drop.y,
        (drop.angle ?? 0) + (drop.age ?? 0) * (drop.spin ?? 0) + Math.sin((drop.age ?? 0) * 2 + (drop.phase ?? 0)) * 0.22,
        drop.variant);
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
  drawFloatingFeedback();
  drawVictoryFeedback();
}
