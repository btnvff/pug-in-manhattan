// Screen-space feedback shared by both renderers, plus original Canvas effects.
function drawSpecial(it) {
  if (!it.power) return;
  const p = powerInfo[it.power];
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.globalAlpha = usefulPowers.includes(it.power) ? 0.07 : 0.13;
  ellipse(0, 0, 32, 29, p.color, null);
  ctx.globalAlpha = 1;
  ellipse(19, -20, 12, 12, "#fffdf4", p.color, 2);
  if (it.power === "magnet")
    path("M13 -24 V-17 Q19 -9 25 -17 V-24", null, p.color, 3);
  else if (it.power === "shield")
    path(
      "M19 -28 L26 -25 V-19 Q25 -14 19 -12 Q13 -14 12 -19 V-25 Z",
      null,
      p.color,
      1.8,
    );
  else if (it.power === "helpers") {
    path(
      "M11 -16 L12 -26 L17 -23 L22 -26 L27 -16 Q19 -9 11 -16 Z",
      null,
      p.color,
      1.4,
    );
    ellipse(16, -18, 1, 1, p.color, null);
    ellipse(22, -18, 1, 1, p.color, null);
    line(18, -14, 20, -14, p.color, 1);
  } else if (it.power === "birds") {
    path("M10 -20 Q14 -29 19 -20 Q24 -29 28 -20", null, p.color, 2);
    txt("3", 19, -13, 9, p.color);
  } else if (it.power === "jam") {
    path("M14 -26 L24 -14 M24 -26 L14 -14", null, p.color, 2);
  } else if (it.power === "freeze") {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(19, -20);
      ctx.rotate((i * Math.PI) / 3);
      line(-7, 0, 7, 0, p.color, 1.6);
      ctx.restore();
    }
  } else txt(p.mark, 19, -15, p.mark.length > 1 ? 10 : 15, p.color);
  ctx.restore();
}
function drawPowerAura() {
  ctx.save();
  if (powerTimers.stun > 0) {
    for (let n = 0; n < 3; n++) {
      const a = clock * 3 + (n * Math.PI * 2) / 3;
      txt(
        "✦",
        x + Math.cos(a) * 36,
        ground() - 145 * heroScale() + Math.sin(a) * 7,
        16,
        "#ffd05b",
      );
    }
  }
  if (powerTimers.magnet > 0) {
    ctx.globalAlpha = 0.48;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        catchY() + 30,
        60 + i * 15,
        58 + i * 12,
        0,
        Math.PI,
        Math.PI * 2,
      );
      ctx.strokeStyle = "#af4bb4";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  if (powerTimers.shield > 0) {
    ctx.globalAlpha = 0.24;
    ellipse(
      x,
      ground() - 65,
      59 * heroScale(),
      79 * heroScale(),
      "#a2eeff",
      "#149fc0",
      3,
    );
  }
  if (powerTimers.freeze > 0) {
    ctx.globalAlpha = 0.5;
    path(
      `M${x - 35} ${ground() + 3} L${x - 39} ${ground() - 25} L${x - 20} ${ground() - 34} L${x + 35} ${ground() - 23} L${x + 39} ${ground() + 3} Z`,
      "#b9edff",
      "#487db5",
      2,
    );
  }
  ctx.restore();
}
function drawBirdHelpers() {
  if (powerTimers.birds <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, birdAge / 0.22, powerTimers.birds / 0.3);
  for (let n = 0; n < 3; n++) {
    const p = birdPosition(n),
      flap = Math.sin(clock * 22 + n * 2);
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(clock * 3 + n) * 3);
    ctx.scale(n === 2 ? -1 : 1, 1);
    ellipse(0, 0, 13, 8, "#a68155", "#5d4939", 1);
    path(
      `M-5 -3 Q-21 ${-12 - flap * 12} -22 ${-19 - flap * 9} Q-4 -13 5 -2 Z`,
      "#76604b",
      "#d0ad74",
      1,
    );
    path("M-10 1 L-24 -5 L-20 4 Z", "#685544", null);
    ellipse(9, -6, 7, 6, "#73523b", null);
    ellipse(11, -4, 4, 3, "#f2ddb0", null);
    ellipse(12, -8, 1.6, 1.6, "#172e37", null);
    ellipse(12.4, -8.5, 0.5, 0.5, "#fff", null);
    path("M15 -5 L22 -3 L15 -1 Z", "#dfa549", null);
    line(-3, 6, -1, 10, "#82633c", 1);
    line(3, 6, 5, 10, "#82633c", 1);
    ctx.restore();
  }
  ctx.restore();
}
function drawCatHelpers() {
  if (powerTimers.helpers <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, catAge / 0.22, powerTimers.helpers / 0.3);
  for (const side of [-1, 1]) {
    const pose = helperPresentation(side);
    const c = {
      presentation: pose,
      x: helperX(side) - side * 27,
      t: 1.85,
      side,
      coat: side < 0 ? 0 : 1,
      helper: true,
    };
    drawCat(c);
  }
  ctx.restore();
}
function drawCatGifts() {
  for (const g of catGifts) {
    const u = clamp(g.t / BALANCE.helpers.flight, 0, 1),
      mouthY = ground() - 64 * heroScale();
    const origin = helperGiftOrigin(g);
    const gx = origin.sx + (x + headTurn * 5 - origin.sx) * u,
      gy = origin.sy + (mouthY - origin.sy) * u - Math.sin(u * Math.PI) * 45;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(0.65, 0.65);
    drawFood(0, 0, 0, (1 - u) * 2, g.variant);
    ctx.restore();
  }
}

function drawRunFeedback() {
  ctx.save();
  if (shieldPulse > 0 || recoveryPulse > 0) {
    ctx.globalAlpha = Math.min(0.7, shieldPulse || recoveryPulse);
    ellipse(
      x,
      ground() - 65,
      58 * heroScale(),
      80 * heroScale(),
      null,
      shieldPulse > 0 ? "#4fe4ff" : "#77e6b2",
      shieldPulse > 0 ? 5 : 2,
    );
  }
  if (healthPulse > 0) {
    ctx.globalAlpha = healthPulse * 0.15;
    ctx.strokeStyle = "#ed6754";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }
  if (impactPulse > 0) {
    ctx.globalAlpha = impactPulse / 0.35;
    for (let n = 0; n < 4; n++) {
      const a = (n * Math.PI) / 2;
      line(
        x + Math.cos(a) * 24,
        catchY() + Math.sin(a) * 16,
        x + Math.cos(a) * 39,
        catchY() + Math.sin(a) * 30,
        "#f6a15c",
        3,
      );
    }
  }
  ctx.restore();
}
function drawHazardCue(it) {
  if (!isHazard(it.type)) return;
  ctx.save();
  if (it.warning > 0) {
    const yy = Math.max(170, H * 0.25);
    ctx.globalAlpha = 0.85;
    path(
      `M${it.x} ${yy - 17} L${it.x + 17} ${yy + 13} L${it.x - 17} ${yy + 13} Z`,
      "#ffe6ae",
      "#b63a30",
      2,
    );
    txt("!", it.x, yy + 8, 21, "#9c302a");
  } else {
    ctx.globalAlpha = it.type === 8 ? 0.7 : 0.22;
    ellipse(
      it.x,
      it.y,
      it.type === 8 ? 31 : 26,
      it.type === 8 ? 24 : 27,
      null,
      it.type === 8 ? "#523b40" : "#426774",
      it.type === 8 ? 2 : 1.5,
    );
    if (it.type === 8) {
      rect(it.x - 10, it.y - 34, 20, 17, "#ae3428", 4);
      txt("!", it.x, it.y - 21, 14, "#fff8dc");
    }
  }
  ctx.restore();
}

// Only rare useful drops have a glow; ordinary food stays quiet and tactile.
function drawRareFoodAura(it) {
  if (it.type !== 7 && !usefulPowers.includes(it.power)) return;
  const pulse = 0.5 + 0.5 * Math.sin(clock * 2.8 + (it.phase ?? 0)),
    r = (it.type === 7 ? 38 : 34) + pulse * 3;
  ctx.save();
  ctx.translate(it.x, it.y);
  const glow = ctx.createRadialGradient(0, 0, 7, 0, 0, r);
  glow.addColorStop(0, "#ffdf9c55");
  glow.addColorStop(0.6, "#eab95a2c");
  glow.addColorStop(1, "#eab95a00");
  ellipse(0, 0, r, r, glow, null);
  const beat = (clock + (it.phase ?? 0)) % 2.2;
  if (beat < 0.5) {
    ctx.globalAlpha = Math.sin((beat / 0.5) * Math.PI) * 0.75;
    for (let i = 0; i < 2; i++) {
      const a = i * 3 + clock * 0.3,
        xx = Math.cos(a) * 29,
        yy = Math.sin(a) * 24;
      line(xx - 3, yy, xx + 3, yy, "#fff0ba", 1.3);
      line(xx, yy - 3, xx, yy + 3, "#fff0ba", 1.3);
    }
  }
  ctx.restore();
}

function drawEventFeedback() {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.setLineDash([3, 6]);
  for (const id of chainStates.keys()) {
    const chain = items
      .filter((it) => it.chainId === id && !it.used)
      .sort((a, b) => a.chainIndex - b.chainIndex);
    for (let i = 1; i < chain.length; i++)
      line(
        chain[i - 1].x,
        chain[i - 1].y,
        chain[i].x,
        chain[i].y,
        "#e2b669",
        1.5,
      );
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  if (jackpotPulse > 0 || powerTimers.rain > 0) {
    const alpha = jackpotPulse > 0 ? 0.65 : 0.3;
    ctx.globalAlpha = alpha;
    for (let side of [-1, 1])
      for (let n = 0; n < 5; n++) {
        const xx = (side < 0 ? 8 : W - 8) + Math.sin(clock * 3 + n) * 5,
          yy = H * 0.25 + ((clock * 55 + n * 83) % (H * 0.5));
        ctx.save();
        ctx.translate(xx, yy);
        ctx.rotate(clock + n);
        rect(-2, -3, 4, 6, ["#f4c968", "#d89f64", "#78bfba"][n % 3], 1);
        ctx.restore();
      }
  }
  if (powerTimers.slow > 0) {
    ctx.globalAlpha = 0.3;
    for (let n = 0; n < 3; n++) {
      const yy = H * 0.3 + n * H * 0.15 + Math.sin(clock) * 6;
      line(3, yy, 13, yy, "#8ac5df", 2);
      line(W - 13, yy, W - 3, yy, "#8ac5df", 2);
    }
  }
  if (powerTimers.wind > 0) {
    ctx.globalAlpha = windAge < BALANCE.event.warning ? 0.8 : 0.25;
    for (let n = 0; n < 3; n++) {
      const xx = W * (0.2 + n * 0.3),
        yy = H * 0.3;
      line(
        xx - 12 * windDirection,
        yy,
        xx + 12 * windDirection,
        yy,
        "#688c99",
        2,
      );
      path(
        `M${xx + 5 * windDirection} ${yy - 5} L${xx + 12 * windDirection} ${yy} L${xx + 5 * windDirection} ${yy + 5}`,
        null,
        "#688c99",
        2,
      );
    }
  }
  ctx.restore();
}

function drawFloatingFeedback() {
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
}

function drawVictoryFeedback() {
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
