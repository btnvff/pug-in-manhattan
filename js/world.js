function city(t) {
  const actualWidth = W,
    actualHeight = H;
  sceneScale = Math.min(1, H / 700);
  ctx.save();
  ctx.scale(sceneScale, sceneScale);
  W = actualWidth / sceneScale;
  H = actualHeight / sceneScale;
  try {
    paintCity(t);
  } finally {
    W = actualWidth;
    H = actualHeight;
    ctx.restore();
  }
}
function paintCity(t) {
  const base = H * 0.7,
    walk = H - 148;
  sceneryLayer("sky", () => {
    let sky = ctx.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, "#169ce1");
    sky.addColorStop(0.6, "#77d5ee");
    sky.addColorStop(1, "#c5ebef");
    rect(0, 0, W, H, sky);
    ellipse(W * 0.8, 110, 33, 33, "#ffedbd", null);
  });
  for (let j = 0; j < 4; j++) {
    let cx = ((j * 137 + t * (1.7 + j * 0.3)) % (W + 150)) - 75,
      cy = 98 + (j % 3) * 39;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.75);
    let cloud = ctx.createLinearGradient(0, -25, 0, 13);
    cloud.addColorStop(0, "#ffffff");
    cloud.addColorStop(1, "#cbe8f5");
    path(
      "M-38 6 C-55 -7 -37 -19 -25 -14 C-25 -32 0 -38 10 -20 C24 -30 44 -15 40 -3 C60 -3 60 13 41 13 L-29 13 Q-38 13 -38 6 Z",
      cloud,
      null,
    );
    ctx.restore();
  }
  sceneryLayer("skyline", () => {
    // Varied distant facades retain atmospheric perspective and roof detail.
    const distantPaint = [
      "#779aa7",
      "#b38b80",
      "#9eacaa",
      "#8c8fb0",
      "#b7a285",
      "#6f9c9c",
    ];
    for (let i = 0; i < 15; i++) {
      const bx = (i * W) / 14,
        bw = W / 15 + 3,
        hh = 35 + ((i * 37) % 80),
        roof = base - 160 - hh;
      rect(bx, roof, bw, hh + 170, distantPaint[i % 6]);
      rect(bx + bw * 0.78, roof, bw * 0.22, hh + 170, "#3b567e26");
      rect(bx - 1, roof, bw + 2, 3, "#dde1d17a");
      rect(bx + 3, roof - 5, 4, 5, "#758998");
      for (let row = 0, yy = roof + 10; yy < base - 95; yy += 12, row++)
        for (let col = 0, xx = bx + 4; xx < bx + bw - 4; xx += 7, col++) {
          rect(
            xx,
            yy,
            3.5,
            6,
            (row + col + i) % 7 === 0 ? "#f5cb8277" : "#304f7466",
          );
          line(xx, yy + 6, xx + 4, yy + 6, "#e1e4d651", 0.6);
        }
      if (i % 3 === 0) {
        rect(bx + 5, roof - 12, 9, 9, "#63758a");
        line(bx + 6, roof - 3, bx + 5, roof, "#48617c", 1);
        line(bx + 12, roof - 3, bx + 13, roof, "#48617c", 1);
      }
      if (i % 4 === 1)
        line(bx + bw - 5, roof - 13, bx + bw - 5, roof, "#61758c", 1);
    }
    const horizon = base - 85;
    let ex = W * 0.67,
      ey = H * 0.29;
    path(
      `M${ex - 17} ${horizon} V${ey + 45} H${ex - 11} V${ey + 25} H${ex - 6} V${ey + 10} H${ex + 6} V${ey + 25} H${ex + 11} V${ey + 45} H${ex + 17} V${horizon} Z`,
      "#658cbd",
      null,
    );
    line(ex, ey + 10, ex, ey - 22, "#658cbd", 2);
    // Manhattan Bridge, framed by the two street fronts.
    const by = base - 104,
      tx = W * 0.5,
      top = H * 0.285,
      leg = W * 0.072;
    for (const side of [-1, 1]) {
      const lx = tx + side * leg;
      rect(lx - 5, top + 16, 10, by - top + 9, "#336995");
      line(lx - 3, top + 17, lx - 3, by + 22, "#91abb0", 1.2);
      for (let yy = top + 55; yy < by; yy += 19) {
        line(lx - 5, yy, lx + 5, yy + 15, "#9cb3b3", 1);
        line(lx + 5, yy, lx - 5, yy + 15, "#6a929a", 1);
      }
      rect(lx - 10, top + 4, 20, 12, "#225b87", 1);
      rect(lx - 12, top + 2, 24, 4, "#9db6b5", 1);
      path(
        `M${lx - 9} ${top + 2} Q${lx} ${top - 13} ${lx + 9} ${top + 2} Z`,
        "#678b91",
        null,
      );
      line(lx, top - 7, lx, top - 14, "#527880", 1);
    }
    rect(tx - leg - 5, top + 33, leg * 2 + 10, 9, "#527a83");
    rect(tx - leg - 5, top + 82, leg * 2 + 10, 7, "#527a83");
    path(
      `M${tx - leg + 5} ${top + 82} Q${tx} ${top + 34} ${tx + leg - 5} ${top + 82}`,
      null,
      "#6e98a0",
      4,
    );
    for (let i = 0; i < 6; i++)
      line(
        tx - leg + 5 + (i * leg) / 3,
        top + 33,
        tx - leg + 5 + (i * leg) / 3,
        top + 41,
        "#a3b9b6",
        1,
      );
    for (const side of [-1, 1]) {
      const anchor = tx + side * leg,
        edge = side < 0 ? -35 : W + 35;
      ctx.beginPath();
      ctx.moveTo(edge, by - 8);
      ctx.quadraticCurveTo((anchor + edge) / 2, by - 36, anchor, top + 13);
      ctx.strokeStyle = "#78999e";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      for (let i = 1; i < 17; i++) {
        let u = i / 17,
          xx = edge + (anchor - edge) * u,
          yy =
            (1 - u) * (1 - u) * (by - 8) +
            2 * (1 - u) * u * (by - 36) +
            u * u * (top + 13);
        line(xx, yy, xx, by, "#8fa9aa", 0.8);
      }
    }
    rect(0, by, W, 8, "#557982");
    rect(0, by + 12, W, 4, "#6d9298");
    for (let xx = 0; xx < W; xx += 13) {
      line(xx, by + 1, xx + 13, by + 12, "#8da7a6", 0.8);
      line(xx, by + 12, xx + 13, by + 1, "#78989b", 0.8);
    }
  });
  let planeX = ((t * 13) % (W + 100)) - 50;
  ctx.save();
  ctx.translate(planeX, H * 0.18);
  ctx.scale(0.7, 0.7);
  path(
    "M-24 0 L-4 -3 L-11 -15 L-6 -15 L7 -3 L24 -1 L26 2 L7 4 L-7 17 L-12 17 L-4 4 L-20 4 L-27 10 L-30 9 L-25 2 Z",
    "#ecede4",
    "#8aa4aa",
    0.7,
  );
  ctx.restore();
  sceneryLayer("facades", () => {
    // Brownstones frame the view rather than covering the skyline.
    const buildings = [
      { x: -9, w: W * 0.31, top: H * 0.36, c: "#ba432d", sign: "JOE’S PIZZA" },
      {
        x: W * 0.7,
        w: W * 0.32,
        top: H * 0.32,
        c: "#eca03c",
        sign: "DELI & GROCERY",
      },
    ];
    for (let b = 0; b < 2; b++) {
      let { x: bx, w: bw, top, c } = buildings[b];
      let wall = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      wall.addColorStop(0, c);
      wall.addColorStop(1, b ? "#806b56" : "#704c40");
      rect(bx, top, bw, base - top, wall);
      for (let yy = top + 9; yy < base; yy += 11) {
        line(bx, yy, bx + bw, yy, "#e2b78e35", 0.7);
        for (
          let xx = bx + (Math.floor(yy / 11) % 2) * 13;
          xx < bx + bw;
          xx += 26
        )
          line(xx, yy, xx, yy + 11, "#433f3633", 0.6);
      }
      rect(bx - 3, top - 9, bw + 6, 10, "#5a574b");
      rect(bx - 6, top - 14, bw + 12, 5, "#c3ab86");
      rect(bx + 3, top + 2, 5, base - top, "#d7ac7c55");
      brickTexture(bx, top, bw, base, b);
      let rows = 3,
        step = (base - top - 104) / rows;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < 2; col++) {
          let wx = bx + 14 + col * bw * 0.46,
            wy = top + 15 + row * step,
            ww = bw * 0.29,
            hh = Math.max(32, step - 13);
          windowLife(wx, wy, ww, hh, b * 6 + row * 2 + col, 0);
          windowSlots.push({
            x: wx,
            y: wy,
            w: ww,
            h: hh,
            id: b * 6 + row * 2 + col,
          });
        }
      // Iron platforms, rails, diagonal stair flights and ladder rungs.
      let fx = b ? bx + 6 : bx + bw * 0.43,
        fw = bw * 0.51;
      for (let j = 0; j < 3; j++) {
        let fy = top + step * (j + 1) + 10;
        rect(fx, fy, fw, 4, "#393f39");
        line(fx, fy - 16, fx + fw, fy - 16, "#3b443e", 2);
        for (let n = 0; n < 6; n++)
          line(fx + (n * fw) / 5, fy - 16, fx + (n * fw) / 5, fy, "#3b443e", 1);
        if (j < 2) {
          let to = fy + step - 7;
          line(fx + 3, fy + 4, fx + fw - 7, to, "#343e39", 2);
          line(fx + 13, fy + 4, fx + fw + 3, to, "#343e39", 2);
          for (let n = 0; n < 8; n++) {
            let u = n / 8;
            line(
              fx + 3 + (fw - 10) * u,
              fy + 4 + (step - 11) * u,
              fx + 13 + (fw - 10) * u,
              fy + 4 + (step - 11) * u,
              "#414a3e",
              1.4,
            );
          }
        }
      }
      rect(bx + 6, base - 91, bw - 12, 91, "#243c36");
      rect(bx + 12, base - 65, bw - 24, 60, "#526b5c");
      for (let i = 0; i < 3; i++) {
        rect(
          bx + 18 + i * 22,
          base - 34,
          14,
          22,
          ["#b89155", "#a96141", "#759159"][i],
          1,
        );
        line(bx + 14 + i * 24, base - 65, bx + 14 + i * 24, base, "#1b312c", 3);
      }
      rect(
        bx + 4,
        base - 105,
        bw - 8,
        27,
        b ? "#31594b" : "#802f25",
        1,
        "#d4b78a",
      );
      txt(buildings[b].sign, bx + bw / 2, base - 88, b ? 9 : 12, "#fff0ce");
      for (let n = 0; n < 8; n++)
        rect(
          bx + 3 + (n * (bw - 6)) / 8,
          base - 78,
          (bw - 6) / 8,
          13,
          n % 2 ? "#d7c3a0" : b ? "#426c55" : "#a74632",
        );
      txt("OPEN", bx + bw * 0.28, base - 44, 8, "#ffc68a");
    }
    let cx = W * 0.305,
      cw = W * 0.39;
    rect(cx, base - 72, cw, 73, "#695e4c");
    rect(cx, base - 82, cw, 17, "#d7c29a");
    txt("CANAL STREET COFFEE", cx + cw / 2, base - 70, 8, "#363f35");
    rect(cx + 10, base - 59, cw - 20, 50, "#293f38");
    for (let i = 0; i < 3; i++) {
      line(
        cx + 16 + (i * cw) / 3,
        base - 58,
        cx + 16 + (i * cw) / 3,
        base - 5,
        "#a88d62",
        3,
      );
      ellipse(cx + 22 + (i * cw) / 3, base - 46, 5, 3, "#e7c385", null);
    }
    // Water tank, line-dried clothes and the street signs.
    let tx = W * 0.82,
      tankY = H * 0.32 - 57;
    line(tx - 16, tankY + 36, tx - 21, tankY + 58, "#4d5145", 3);
    line(tx + 16, tankY + 36, tx + 21, tankY + 58, "#4d5145", 3);
    rect(tx - 21, tankY, 42, 36, "#887151", 3, "#4e574d");
    for (let i = 0; i < 7; i++)
      line(tx - 18 + i * 6, tankY, tx - 18 + i * 6, tankY + 35, "#bd9970", 0.7);
    path(
      `M${tx - 26} ${tankY} L${tx} ${tankY - 13} L${tx + 26} ${tankY} Z`,
      "#5a6556",
      "#4d5648",
      1,
    );
    line(tx - 21, tankY + 7, tx + 21, tankY + 7, "#404f48", 2);
    line(tx - 21, tankY + 28, tx + 21, tankY + 28, "#404f48", 2);
  });
  for (let window of windowSlots)
    windowLife(window.x, window.y, window.w, window.h, window.id, t);
  sceneryLayer("ironwork", () => {
    buildingDetails(-9, H * 0.36, W * 0.31, base, 0);
    buildingDetails(W * 0.7, H * 0.32, W * 0.32, base, 1);
    fireEscapeOverlay();
  });
  let ly = H * 0.48;
  ctx.beginPath();
  ctx.moveTo(W * 0.26, ly);
  ctx.quadraticCurveTo(W * 0.5, ly + 40, W * 0.75, ly - 7);
  ctx.strokeStyle = "#514d3e";
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    let u = (i + 1) / 7,
      xx = W * (0.26 + 0.49 * u),
      yy = ly + 66 * u * (1 - u) - 7 * u;
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate(Math.sin(t * 1.8 + i) * 0.085);
    if (i % 3 === 1)
      path(
        "M-9 0 L9 0 L10 30 L2 30 L0 12 L-2 30 L-10 30 Z",
        "#3879aa",
        "#485653",
        0.8,
      );
    else
      path(
        "M-8 0 L-16 5 L-12 13 L-7 10 L-7 26 L9 26 L9 10 L14 13 L18 5 L10 0 Z",
        i % 2 ? "#dc7042" : "#f4e8d2",
        "#aa9a7f",
        0.7,
      );
    line(-6, -2, -6, 3, "#8b6c4b", 2);
    line(7, -2, 7, 3, "#8b6c4b", 2);
    ctx.restore();
  }
  sceneryLayer("road", () => {
    rect(0, base, W, H - base, "#525e70");
    rect(0, base, W, 12, "#8d9bac");
    for (let i = 0; i < 5; i++) rect(i * 100 + 15, base + 53, 40, 2, "#c8bd92");
    // Aggregate, worn lane paint, patched tarmac and inset utility covers.
    for (let i = 0; i < 700; i++) {
      const xx = (i * 73.137) % W,
        yy = base + 13 + ((i * 29.719) % Math.max(1, walk - base - 14));
      rect(
        xx,
        yy,
        i % 5 === 0 ? 1.6 : 0.7,
        0.65,
        i % 2 ? "#d1d9e41b" : "#16293b26",
      );
    }
    path(
      `M${W * 0.21} ${base + 20} l23 2 l-8 8 l17 4 l-4 11`,
      null,
      "#22334766",
      1,
    );
    ellipse(W * 0.72, base + 42, 22, 6, "#354453", "#87949b", 0.8);
    for (let i = -15; i < 16; i += 5)
      line(
        W * 0.72 + i,
        base + 38,
        W * 0.72 + i - 4,
        base + 45,
        "#687c88",
        0.7,
      );
    for (let i = 0; i < 6; i++)
      rect(20 + (i * W) / 6, base + 54, 4, 1, "#525e70");
    shopDetails(base);
  });
  streetLife(t, base);
  sceneryLayer("pavement", () => {
    rect(0, walk, W, H - walk, "#a7a5a1");
    rect(0, walk, W, 7, "#d6dbe0");
    line(0, walk + 8, W, walk + 8, "#676f64", 2);
    for (let i = 0; i < 9; i++)
      line(i * 68, walk + 9, i * 68 - 38, H, "#747e88", 1);
    line(0, H - 43, W, H - 43, "#818995", 1);
    for (let i = 0; i < 24; i++) {
      let xx = (i * 73) % W,
        yy = walk + 19 + ((i * 37) % 115);
      line(xx, yy, xx + 3, yy + 1, "#887f6b44", 0.8);
    }
    rect(W - 42, walk - 30, 28, 35, "#53665a", 3, "#35473e");
    rect(W - 45, walk - 35, 35, 6, "#798372", 2);
    for (let i = 0; i < 4; i++)
      line(W - 37 + i * 6, walk - 27, W - 37 + i * 6, walk + 2, "#344f42", 1);
    ellipse(W - 51, walk + 3, 13, 12, "#414d43", "#303c34", 1);
    path(`M${W - 55} ${walk - 7} l4 -7 l7 6`, "#465447", null);
    rect(13, walk - 18, 15, 35, "#d43738", 5, "#633f2f");
    ellipse(21, walk - 18, 10, 5, "#f36b48", "#633f2f", 1);
    rect(6, walk - 9, 28, 8, "#b65637", 3);
    ellipse(8, walk - 5, 4, 5, "#cf7b4a", "#733d2c", 1);
    line(19, walk - 12, 19, walk + 8, "#e69658", 1);
    line(W * 0.66, base - 105, W * 0.66, base + 10, "#44564a", 3);
    rect(W * 0.66 - 25, base - 105, 63, 15, "#08715d", 1, "#d4d7bb");
    txt("CANAL ST", W * 0.66 + 7, base - 94, 9, "#f2edd4");
    rect(W * 0.66 - 21, base - 88, 56, 13, "#e1dac2");
    txt("ONE WAY  →", W * 0.66 + 7, base - 78, 7, "#37473c");
    for (let i = 0; i < 360; i++) {
      const xx = (i * 41.719) % W,
        yy = walk + 10 + ((i * 19.371) % (H - walk - 12));
      line(
        xx,
        yy,
        xx + ((i % 3) + 1) * 0.6,
        yy + 0.2,
        i % 2 ? "#f4f0df32" : "#58637325",
        0.55,
      );
    }
    path(
      `M${W * 0.34} ${walk + 36} l9 6 l-3 8 l7 3 l-4 13`,
      null,
      "#626c7566",
      0.9,
    );
    rect(W * 0.82, walk + 11, 31, 9, "#465661", 1);
    for (let i = 0; i < 7; i++)
      line(
        W * 0.82 + 3 + i * 4,
        walk + 12,
        W * 0.82 + 3 + i * 4,
        walk + 18,
        "#9ba6a8",
        1,
      );
    pavementDetails(walk);
  });
  atmosphere(t, walk);
  driftingPaper(t, walk);
  // Steam comes from the street vent, drifting behind the pug.
  ellipse(W * 0.18, walk + 19, 24, 6, "#696e61", null);
  for (let i = 0; i < 5; i++)
    line(
      W * 0.18 - 16 + i * 8,
      walk + 15,
      W * 0.18 - 20 + i * 8,
      walk + 22,
      "#444d42",
      1.5,
    );
  for (let i = 0; i < 7; i++) {
    const life = (t * 0.22 + i / 7) % 1,
      sx = W * 0.18 + Math.sin(life * 5 + i * 0.4) * 14,
      sy = walk + 14 - life * 126,
      radius = 13 + life * 29;
    ctx.globalAlpha = (1 - life) * 0.15;
    ctx.drawImage(
      steamSprite(),
      sx - radius,
      sy - radius * 0.78,
      radius * 2,
      radius * 1.56,
    );
  }
  ctx.globalAlpha = 1;
}
function windowLife(x, y, w, h, id, t) {
  rect(x - 3, y - 3, w + 6, h + 6, "#796952", 1);
  rect(x, y, w, h, id % 4 === 0 ? "#c7a375" : "#172c48");
  rect(x + 2, y + 2, w - 4, h * 0.32, "#377395");
  const center = x + w / 2,
    mode = id % 6;
  if (mode === 0) {
    path(
      `M${x + 2} ${y + 3} L${x + w * 0.38} ${y + 3} L${x + w * 0.22 + Math.sin(t + id) * 2} ${y + h - 3} L${x + 2} ${y + h - 3} Z`,
      "#c9a987",
      null,
    );
    rect(x + w * 0.72, y + 3, w * 0.23, h - 5, "#b08870");
    ellipse(center + 3, y + h * 0.61, 4, 5, "#ad795b", null);
    rect(center - 1, y + h * 0.67, 9, h * 0.28, "#735c56", 3);
  }
  if (mode === 1) {
    rect(x + 4, y + h - 10, w - 8, 8, "#806149");
    for (let i = 0; i < 3; i++) {
      let px = x + 7 + (i * (w - 12)) / 2;
      line(px, y + h - 9, px - 2, y + h - 21, "#759468", 1.5);
      ellipse(
        px - 3 + Math.sin(t * 1.1 + i) * 0.8,
        y + h - 19,
        4,
        2,
        "#3d9659",
        null,
      );
      ellipse(px + 2, y + h - 16, 4, 2, "#81be53", null);
    }
  }
  if (mode === 2) {
    let bx = center + Math.sin(t * 0.5 + id) * w * 0.16;
    ellipse(bx, y + h * 0.43, 3.5, 5, "#d4ab86", null);
    rect(bx - 4, y + h * 0.51, 9, h * 0.35, "#d7c9ad", 2);
    line(
      bx + 3,
      y + h * 0.58,
      bx + 9,
      y + h * 0.49 + Math.sin(t * 2) * 3,
      "#d4ab86",
      2,
    );
    line(bx + 9, y + h * 0.49, bx + 8, y + h * 0.38, "#d4ab86", 1.5);
  }
  if (mode === 3) {
    rect(x + 3, y + h * 0.48, w - 6, h * 0.35, "#242b2e", 2);
    rect(
      x + 5,
      y + h * 0.51,
      w - 10,
      h * 0.24,
      Math.sin(t * 1.4 + id) > 0 ? "#7d96a0" : "#779c8b",
      1,
    );
    ellipse(center, y + h - 5, 5, 4, "#6e6150", null);
  }
  if (mode === 4) {
    rect(x + 4, y + 3, w * 0.22, h - 7, "#8e705a");
    line(x + w * 0.67, y + h - 5, x + w * 0.67, y + h * 0.37, "#b79862", 1);
    path(
      `M${x + w * 0.5} ${y + h * 0.48} L${x + w * 0.59} ${y + h * 0.28} L${x + w * 0.75} ${y + h * 0.28} L${x + w * 0.84} ${y + h * 0.48} Z`,
      "#d3b783",
      null,
    );
  }
  if (mode === 5) {
    ellipse(center + Math.sin(t * 0.6) * 3, y + h - 8, 6, 4, "#aaa18b", null);
    path(
      `M${center - 5} ${y + h - 8} l0 -8 l4 4 l5 -4 l1 8 Z`,
      "#aaa18b",
      null,
    );
    path(
      `M${center + 5} ${y + h - 8} Q${center + 14 + Math.sin(t * 2) * 2} ${y + h - 8} ${center + 10} ${y + h - 16}`,
      null,
      "#aaa18b",
      2,
    );
  }
  line(center, y, center, y + h, "#b6a98b", 1.6);
  line(x, y + h * 0.42, x + w, y + h * 0.42, "#b6a98b", 1.6);
  rect(x - 4, y + h, w + 8, 4, "#c2ad87");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, w - 2, h - 2);
  ctx.clip();
  path(
    `M${x + w * 0.6} ${y} l4 0 l${-w * 0.55} ${h} l-4 0 Z`,
    "#d5e4ce1f",
    null,
  );
  ctx.restore();
  line(x, y + 1, x + w, y + 1, "#eee3bd66", 0.7);
}
