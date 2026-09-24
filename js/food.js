function drawFood(type, x, y, a = 0, variant = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(RatioPresentation.unit / (600 / 390), 1);
  ctx.rotate(a);
  ctx.shadowColor = "#3f382c28";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 3;
  const style = variant % 8;
  if (type === 0)
    ctx.scale(
      style === 4 ? 0.84 : style === 5 ? 1.05 : 1,
      style === 4 ? 1.15 : style === 5 ? 0.75 : 1,
    );
  if (type >= 4 && type <= 6)
    ctx.scale(
      [1, 0.86, 1.04, 0.94][style % 4],
      [1, 1.08, 0.86, 0.98][style % 4],
    );
  switch (type) {
    case 8: {
      path("M-24 -9 L14 -9 L24 -17 L-14 -17 Z", "#805b54", "#342d32", 1.5);
      path("M14 -9 L24 -17 L24 7 L14 15 Z", "#3d343c", "#272730", 1.5);
      rect(-24, -9, 38, 24, "#624248", 1, "#292a34");
      path("M-19 -4 L-8 -4 M-1 9 L8 9 M-12 4 L-6 1", null, "#a17c70", 1.4);
      path("M-8 -8 L-5 -1 L-10 5 L-6 13 M4 -5 L8 -1", null, "#292a34", 1.6);
      break;
    }
    case 7: {
      path(
        "M-15 -6 C-28 -20 -35 -2 -22 1 C-31 13 -16 21 -12 8 L12 8 C18 22 33 12 23 1 C35 -3 26 -20 15 -6 Z",
        "#fff5d7",
        "#ac7f3b",
        2,
      );
      path("M-11 -3 L11 -3", null, "#fffef6", 2);
      ellipse(0, 1, 5, 5, null, "#b38b45", 1);
      path("M0 -2 V1 L3 2", null, "#b38b45", 1);
      break;
    }
    case 0: {
      ctx.rotate(-0.5);
      const v = variant % 8;
      const colors = [
        ["#c14d2d", "#f89b56"],
        ["#98343a", "#e78162"],
        ["#e78838", "#ffcc70"],
        ["#ba583b", "#efa070"],
        ["#8d392d", "#d7834c"],
        ["#bc693e", "#edba78"],
        ["#a23244", "#ea936d"],
        ["#ae5028", "#edac56"],
      ][v];
      const shape =
        v === 3 || v === 7
          ? "M-23 -4 Q-5 8 19 -7 Q29 -12 29 -2 Q10 23 -20 12 Q-31 7 -23 -4 Z"
          : v === 1
            ? "M-17 -10 Q-29 -9 -27 3 Q-26 13 -15 12 L19 10 Q30 8 28 -2 Q27 -12 17 -12 Z"
            : "M-18 -8 C-31 -2 -24 13 -13 12 L14 9 C28 7 27 -10 15 -11 Z";
      path(shape, shade(-4, -3, 32, colors[1], colors[0]), "#673126", 2);
      path(
        v === 3 ? "M-19 0 Q-2 11 19 -3" : "M-17 -5 Q-4 -2 16 -7",
        null,
        colors[1],
        2,
      );
      if (v !== 3 && v !== 7)
        path(
          "M-25 -3 l-5 -4 l1 8 Z M27 -3 l5 -4 l-1 8 Z",
          colors[0],
          "#673126",
          1,
        );
      ctx.save();
      ctx.clip(new Path2D(shape));
      if (v === 1 || v === 6) {
        for (let i = 0; i < 12; i++) {
          const xx = -18 + ((i * 11) % 38),
            yy = -5 + ((i * 7) % 13);
          ellipse(xx, yy, 0.8, 0.7, "#f0b087", null);
        }
      } else
        for (let i = -12; i < 18; i += 8)
          line(
            i,
            v === 3 ? 3 : -5,
            i + 4,
            v === 3 ? 11 : 3,
            v === 2 ? "#8f4227" : "#713429",
            1.8,
          );
      ctx.restore();
      break;
    }
    case 1: {
      path(
        "M-22 -7 Q-20 -21 -7 -22 Q6 -27 17 -17 Q27 -10 22 3 Q24 16 10 21 Q-1 26 -13 19 Q-26 14 -22 -7 Z",
        shade(-5, -5, 32, "#f5cc83", "#bb7636"),
        "#824b2b",
        2,
      );
      path("M-17 -9 Q-13 -19 -3 -18 M8 -16 L14 -12", null, "#ffe1a2", 2);
      for (const [xx, yy] of [
        [-9, -7],
        [7, -9],
        [13, 5],
        [-5, 12],
        [-14, 4],
        [0, 1],
      ]) {
        path(
          `M${xx - 3} ${yy - 3} l5 -1 l2 5 l-6 2 Z`,
          "#58372a",
          "#8a5032",
          0.7,
        );
        line(xx - 1, yy - 2, xx + 1, yy - 2, "#9e6842", 1);
      }
      for (let i = 0; i < 10; i++)
        ellipse(
          Math.sin(i * 4) * 17,
          Math.cos(i * 3) * 17,
          0.7,
          0.7,
          "#b87d45",
          null,
        );
      break;
    }
    case 2:
      ctx.rotate(0.5);
      rect(-5, 0, 10, 24, "#fff2c8", 4, "#9e8661");
      ellipse(-5, 22, 6, 5, "#fff2c8", "#9e8661");
      ellipse(5, 22, 6, 5, "#fff2c8", "#9e8661");
      path(
        "M-9 7 C-34 -4 -18 -30 1 -26 C25 -23 25 1 9 8 Z",
        "#c57936",
        "#7e4d2c",
        2.5,
      );
      ellipse(-7, -12, 6, 4, "#f4bc68", null);
      path("M-15 -8 Q-12 -19 -3 -20", null, "#ffd493", 1.5);
      for (let i = 0; i < 7; i++)
        ellipse(
          Math.sin(i * 4) * 12,
          Math.cos(i * 3) * 12 - 7,
          0.8,
          0.8,
          "#955626",
          null,
        );
      break;
    case 3:
      ellipse(0, 0, 23, 22, "#d49c51", "#89552f", 2.5);
      path(
        "M-21 -5 Q-18 -22 -5 -19 Q5 -25 18 -13 Q26 0 18 9 Q11 3 5 13 Q-3 8 -12 13 Q-23 9 -21 -5 Z",
        "#ee5693",
        "#b8645e",
        1,
      );
      path("M-15 -10 Q-10 -18 -5 -16 M9 -14 L14 -10", null, "#ffb1bd", 2);
      ellipse(0, 0, 7, 7, "#e9d5a5", "#a46643", 2);
      for (let i = 0; i < 6; i++) {
        let a = (i * Math.PI) / 3;
        line(
          Math.cos(a) * 15,
          Math.sin(a) * 14,
          Math.cos(a) * 15 + 3,
          Math.sin(a) * 14 + 2,
          "#fff1ac",
          2,
        );
      }
      break;
    case 4:
    case 6:
      path(
        "M-5 -1 L-8 24 L8 24 L5 -1 Z",
        type === 4 ? "#619487" : "#849e9a",
        "#355b60",
        2,
      );
      path("M-4 13 L-19 3 L-17 -3 L0 3 L17 -6 L20 2 L4 15", null, "#5c817a", 4);
      for (let [xx, yy, r] of [
        [-15, -5, 11],
        [15, -5, 11],
        [-9, -16, 12],
        [8, -17, 12],
        [0, -7, 13],
      ])
        ellipse(
          xx + Math.sin(style + xx) * 2,
          yy + ((style % 3) - 1) * 2,
          r + ((style % 3) - 1),
          r,
          type === 4
            ? ["#337b72", "#5a9286", "#2c5c60", "#78998d"][style % 4]
            : ["#b9c9c5", "#cbd5d5", "#9db4b1", "#afc5bd"][style % 4],
          type === 4 ? "#294d55" : "#6e858b",
          2,
        );
      if (type === 6) {
        for (let i = 0; i < 9; i++)
          ellipse(
            Math.sin(i * 4) * 15,
            Math.cos(i * 3) * 10 - 9,
            3,
            3,
            "#d8e2dc",
            null,
          );
      }
      break;
    case 5:
      path(
        "M-11 -15 Q-2 -21 11 -12 L-5 27 Z",
        ["#b77d65", "#c58b75", "#966c61", "#ad8372"][style % 4],
        "#4b6269",
        2.5,
      );
      path(
        "M0 -16 Q-16 -33 -8 -33 L4 -20 Q5 -40 12 -32 L7 -18 Q23 -31 23 -22 L10 -13 Z",
        "#4b8077",
        "#365b64",
        2,
      );
      line(-6, -3, 1, 0, "#69746d", 2);
      line(-5, 8, 0, 10, "#69746d", 2);
      break;
  }
  ctx.restore();
}

// Presentation only: the same orientation for live items and missed drops.
function foodAngle(item) {
  return (item.angle ?? 0) + (item.age ?? 0) * (item.spin ?? 0) +
    Math.sin((item.age ?? 0) * 2 + (item.phase ?? 0)) * 0.22;
}
