// A warm, layered Manhattan diorama behind the screen-space playing field.
// Scene pixels and all animation below are visual only; gameplay/RNG stay untouched.
function createThreeWorld(model, width, height) {
  const T = window.THREE;
  const root = model.group(), traffic = [], birds = [], steam = [], walkers = [], clouds = [];
  const layers = { far: model.group(root), midground: model.group(root), foreground: model.group(root) };
  for (const [name, layer] of Object.entries(layers)) layer.name = "environment-" + name;
  // Separate parents are ready for future parallax. They stay fixed during play.
  const textures = [], disposableMaterials = [], geometries = new Set();
  const materials = new Map(), batches = new Map();
  const base = height * 0.735, walk = height - 134;
  const buildingWidth = Math.min(180, width * 0.275);
  let layer = layers.far;
  function material(color) {
    if (!materials.has(color)) {
      // Art-directed facade colors do not change the lighting of game objects.
      const mat = new T.MeshBasicMaterial({ color, toneMapped: false });
      materials.set(color, mat); disposableMaterials.push(mat);
    }
    return materials.get(color);
  }
  function box(color, x, y, z, sx, sy, sz = 2, angle = 0) {
    const key = layer.name + color;
    if (!batches.has(key)) batches.set(key, { parent: layer, color, entries: [] });
    batches.get(key).entries.push([x - width / 2, height / 2 - y, z, sx, sy, sz, angle]);
  }
  function line(color, x1, y1, x2, y2, z, thickness) {
    box(color, (x1 + x2) / 2, (y1 + y2) / 2, z, Math.hypot(x2 - x1, y2 - y1), thickness, 1, -Math.atan2(y2 - y1, x2 - x1));
  }
  let planeGeometry;
  let roundedGeometry;
  function roundedPart(parent, color, x, y, z, sx, sy, sz) {
    if (!roundedGeometry) {
      const shape = new T.Shape();
      shape.moveTo(-0.34, -0.5); shape.lineTo(0.34, -0.5);
      shape.quadraticCurveTo(0.5, -0.5, 0.5, -0.34); shape.lineTo(0.5, 0.34);
      shape.quadraticCurveTo(0.5, 0.5, 0.34, 0.5); shape.lineTo(-0.34, 0.5);
      shape.quadraticCurveTo(-0.5, 0.5, -0.5, 0.34); shape.lineTo(-0.5, -0.34);
      shape.quadraticCurveTo(-0.5, -0.5, -0.34, -0.5);
      roundedGeometry = new T.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 4, steps: 1 });
      roundedGeometry.translate(0, 0, -0.5); geometries.add(roundedGeometry);
    }
    const mesh = new T.Mesh(roundedGeometry, model.material(color));
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh);
    return mesh;
  }
  function paintedPlane(x, y, z, w, h, cw, ch, paint) {
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const pen = canvas.getContext("2d");
    paint(pen, cw, ch);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    const mat = new T.MeshBasicMaterial({ map: texture, toneMapped: false });
    disposableMaterials.push(mat);
    if (!planeGeometry) { planeGeometry = new T.PlaneGeometry(1, 1); geometries.add(planeGeometry); }
    const mesh = new T.Mesh(planeGeometry, mat);
    mesh.position.set(x - width / 2, height / 2 - y, z);
    mesh.scale.set(w, h, 1); layer.add(mesh);
    return mesh;
  }
  function sign(text, subtitle, x, y, w, h, bg, fg, z = -125) {
    paintedPlane(x, y, z, w, h, 512, 160, (pen, cw, ch) => {
      pen.fillStyle = bg; pen.fillRect(0, 0, cw, ch);
      pen.strokeStyle = fg; pen.globalAlpha = 0.55; pen.lineWidth = 2;
      pen.strokeRect(12, 12, cw - 24, ch - 24); pen.globalAlpha = 1;
      pen.fillStyle = fg; pen.textAlign = "center"; pen.textBaseline = "middle";
      pen.font = "bold 54px Georgia"; pen.fillText(text, cw / 2, subtitle ? 65 : 84, cw - 52);
      if (subtitle) { pen.font = "22px sans-serif"; pen.fillText(subtitle, cw / 2, 117, cw - 60); }
    });
  }
  function dispose() {
    root.traverse((object) => { if (object.isInstancedMesh) object.dispose(); });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    disposableMaterials.forEach((mat) => mat.dispose());
  }
  try {
    paintedPlane(width / 2, height / 2, -720, width + 4, height + 4, 256, 512, (pen, cw, ch) => {
      const sky = pen.createLinearGradient(0, 0, 0, ch);
      sky.addColorStop(0, "#afd9e7"); sky.addColorStop(0.35, "#d3e7e6");
      sky.addColorStop(0.72, "#f5ead5"); sky.addColorStop(1, "#f5ead5");
      pen.fillStyle = sky; pen.fillRect(0, 0, cw, ch);
      const glow = pen.createRadialGradient(cw * 0.76, ch * 0.2, 2, cw * 0.76, ch * 0.2, cw * 0.65);
      glow.addColorStop(0, "rgba(255,249,221,0.62)"); glow.addColorStop(1, "rgba(255,249,221,0)");
      pen.fillStyle = glow; pen.fillRect(0, 0, cw, ch);
    });
    // Stepped silhouettes, close values and sparse windows create atmospheric depth.
    const skyline = [0.16, 0.21, 0.13, 0.24, 0.19, 0.28, 0.17, 0.23, 0.15, 0.25, 0.18];
    for (let i = 0; i < skyline.length; i++) {
      const bw = width / 9.5, bx = (i - 0.2) * width / 10;
      const bh = height * skyline[i], bottom = base - 18;
      const color = ["#bed2d4", "#cfdbd8", "#d8d9cb"][i % 3];
      box(color, bx, bottom - bh / 2, -530, bw, bh, 12);
      box(color, bx, bottom - bh - 8, -530, bw * 0.66, 16, 12);
      box("#dce5df", bx - bw * 0.36, bottom - bh / 2, -522, 3, bh - 8);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++)
        box("#b2c9cd", bx + (col - 0.5) * bw * 0.36, bottom - bh + 24 + row * (bh - 36) / 4, -520, 3, 8);
    }
    const spireX = width * 0.59, spireTop = height * 0.385;
    box("#bfd3d6", spireX, (spireTop + base) / 2, -510, width * 0.09, base - spireTop, 15);
    box("#cadbdc", spireX - 3, spireTop - 9, -510, width * 0.062, 18, 15);
    box("#cadbdc", spireX - 3, spireTop - 23, -510, width * 0.032, 16, 15);
    box("#bfd3d6", spireX - 3, spireTop - 42, -510, 2, 28);
    // The bridge sits low in the haze; its towers are tucked behind the edge facades.
    const bridgeTop = height * 0.55, deck = base - 35;
    const towers = [width * 0.20, width * 0.80];
    for (const tx of towers) {
      for (const dx of [-8, 8]) box("#adc6c5", tx + dx, (bridgeTop + deck) / 2, -420, 5, deck - bridgeTop, 8);
      box("#adc6c5", tx, bridgeTop, -420, 26, 6, 8);
      box("#adc6c5", tx, bridgeTop + 18, -420, 21, 4, 8);
    }
    let previous;
    for (let i = 0; i <= 18; i++) {
      const u = i / 18, xx = towers[0] + (towers[1] - towers[0]) * u;
      const yy = bridgeTop + 5 + Math.sin(u * Math.PI) * (deck - bridgeTop - 15);
      if (previous) line("#b0c9c7", previous.x, previous.y, xx, yy, -408, 1.5);
      if (i % 2 === 0) line("#c1d3cd", xx, yy, xx, deck, -409, 0.8);
      previous = { x: xx, y: yy };
    }
    box("#b7ccca", width / 2, deck, -400, width, 7, 8);
    box("#d4ddd3", width / 2, deck - 4, -394, width, 2);

    layer = layers.midground;
    // Narrow side walls and layered cornices give the orthographic street volume.
    for (let side = 0; side < 2; side++) {
      const bw = buildingWidth, bx = side ? width - bw / 2 + 7 : bw / 2 - 7;
      const top = height * (side ? 0.335 : 0.385), bh = base - top;
      const wall = side ? "#e2c8a7" : "#d79d84", shade = side ? "#c7af94" : "#bb816e";
      const slot = (bh - 108) / 3;
      box(shade, bx + (side ? -8 : 8), top + bh / 2 + 7, -236, bw + 15, bh - 14, 40);
      box(wall, bx, top + bh / 2, -202, bw, bh, 38);
      // Baked daylight and soft recess shadows add depth without shadow maps.
      paintedPlane(bx, top + bh / 2, -181, bw, bh, 128, 512, (pen, cw, ch) => {
        const light = pen.createLinearGradient(0, 0, cw, ch * 0.25);
        light.addColorStop(0, side ? "#eed9bc" : "#e7b297");
        light.addColorStop(0.55, wall); light.addColorStop(1, wall);
        pen.fillStyle = light; pen.fillRect(0, 0, cw, ch);
        const cornice = pen.createLinearGradient(0, 0, 0, ch * 0.09);
        cornice.addColorStop(0, "rgba(106,78,56,0.18)"); cornice.addColorStop(1, "rgba(106,78,56,0)");
        pen.fillStyle = cornice; pen.fillRect(0, 0, cw, ch * 0.09);
        pen.fillStyle = shade; pen.shadowColor = "rgba(103,74,53,0.22)";
        pen.shadowBlur = 5; pen.shadowOffsetX = 3; pen.shadowOffsetY = 4;
        for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
          const wx = cw * (0.5 + (col - 0.5) * 0.46), wy = (23 + slot * (row + 0.5)) / bh * ch;
          const ww = (bw * 0.265 + 7) / bw * cw, wh = (Math.min(48, slot * 0.65) + 8) / bh * ch;
          pen.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
        }
      });
      box(side ? "#ead4b8" : "#e7b198", bx - bw / 2 + 5, top + bh / 2, -179, 7, bh - 8);
      box(shade, bx, top + 8, -177, bw, 9);
      box("#ecddc3", bx, top - 1, -170, bw + 10, 8, 16);
      box("#f7ead3", bx - 1, top - 7, -170, bw + 15, 4, 20);
      box(side ? "#c2ac92" : "#ba8774", bx, top - 12, -180, bw + 6, 6, 12);
      // Brick accents are grouped at the corners, never a full-screen line grid.
      for (let row = 0; row < 5; row++) {
        const yy = top + 30 + row * (bh - 120) / 5;
        const xx = bx + (side ? 1 : -1) * bw * 0.41;
        box(shade, xx, yy, -179, 10, 1.2);
        box(shade, xx + 4, yy + 7, -179, 10, 1.2);
      }
      for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
        const wx = bx + (col - 0.5) * bw * 0.46, wy = top + 23 + slot * (row + 0.5);
        const ww = bw * 0.265, wh = Math.min(48, slot * 0.65);
        box(shade, wx + 2, wy + 4, -174, ww + 10, wh + 11, 3);
        box("#f1dec0", wx, wy, -168, ww + 7, wh + 8, 8);
        box("#789da6", wx, wy, -162, ww, wh, 2);
        box("#a8c7ca", wx - ww * 0.22, wy - wh * 0.12, -159, ww * 0.23, wh * 0.69);
        box("#c5d8d4", wx - ww * 0.22, wy - wh * 0.36, -157, ww * 0.23, wh * 0.16);
        box("#e8d6b9", wx, wy + 3, -155, ww, 2.2, 3);
        box("#fff0d5", wx - 1, wy + wh / 2 + 6, -151, ww + 13, 4, 15);
        // One quiet iron balcony per facade, on its outside edge.
        if (row === 1 && col === side) {
          box("#78928a", wx, wy + wh / 2 + 13, -140, ww + 15, 4, 22);
          for (let k = -2; k <= 2; k++) box("#78928a", wx + k * ww / 4, wy + wh / 2 + 3, -126, 1.4, 18);
          box("#6f8983", wx, wy + wh / 2 - 6, -124, ww + 15, 2.5);
        }
      }
      const shop = side ? "#668e81" : "#ad6c58";
      box(shade, bx, base - 47, -175, bw, 96, 3);
      box("#e9d7ba", bx, base - 36, -166, bw - 8, 72, 12);
      box(shop, bx, base - 35, -157, bw - 17, 66, 10);
      for (let col = -1; col <= 1; col++) {
        const wx = bx + col * bw * 0.255;
        box("#64898e", wx, base - 35, -150, bw * 0.21, 51, 2);
        box("#99bbb8", wx - 3, base - 43, -146, bw * 0.10, 29);
        box("#c4d4c5", wx - 4, base - 54, -144, bw * 0.08, 6);
        box("#dbc8a9", wx, base - 25, -143, bw * 0.21, 2);
      }
      box("#efdcc0", bx, base - 87, -144, bw + 2, 26, 10);
      sign(side ? "CORNER DELI" : "CANAL BAKERY", side ? "FRESH EVERY DAY" : "BREAD  &  COFFEE", bx, base - 87, bw - 4, 22, shop, "#f9edd5");
      // Short awnings have a sunlit top and a shaded valance.
      for (let i = 0; i < 7; i++) {
        const aw = (bw + 4) / 7, ax = bx - (bw + 4) / 2 + (i + 0.5) * aw;
        const light = i % 2 ? "#f3e7ce" : side ? "#90b09b" : "#ce9075";
        box(light, ax, base - 64, -135, aw + 0.2, 13, 18);
        box(i % 2 ? "#e1d3b9" : shop, ax, base - 55, -123, aw + 0.2, 6, 5);
      }
      box("#e9d7ba", bx, base + 1, -151, bw + 9, 6, 16);
    }
    const tank = model.group(layers.midground, width - buildingWidth * 0.58 - width / 2, height / 2 - height * 0.335 + 31, -225);
    model.part(tank, "tube", "#ac8b70", 0, 6, 0, 16, 27, 16);
    model.part(tank, "cone", "#728c88", 0, 26, 0, 20, 12, 20);
    for (const yy of [-3, 14]) model.part(tank, "tube", "#7f8270", 0, yy, 0, 16.4, 2, 16.4);
    for (const side of [-1, 1]) model.rod(tank, [side * 12, -6, 0], [side * 17, -29, 0], 1.5, "#7a8c84");

    layer = layers.foreground;
    box("#dacfb9", width / 2, base + 5, -191, width, 16, 8);
    box("#f3e5cf", width / 2, base + 1, -184, width, 5);
    paintedPlane(width / 2, (base + walk) / 2, -181, width, walk - base, 8, 128, (pen, cw, ch) => {
      const road = pen.createLinearGradient(0, 0, 0, ch);
      road.addColorStop(0, "#abbab8"); road.addColorStop(1, "#bec8c0");
      pen.fillStyle = road; pen.fillRect(0, 0, cw, ch);
    });
    for (let i = -1; i <= Math.ceil(width / 100); i++) box("#dfe1cc", i * 100 + 36, base + (walk - base) * 0.52, -170, 28, 2);
    // Perspective paving fans toward the horizon; low contrast keeps the pug clear.
    paintedPlane(width / 2, (walk + height) / 2, -100, width, height - walk, 8, 128, (pen, cw, ch) => {
      const pavement = pen.createLinearGradient(0, 0, 0, ch);
      pavement.addColorStop(0, "#e4d7bf"); pavement.addColorStop(1, "#f3e6ce");
      pen.fillStyle = pavement; pen.fillRect(0, 0, cw, ch);
    });
    box("#a8b5ac", width / 2, walk - 3, -94, width, 7);
    box("#faf0d9", width / 2, walk + 2, -78, width, 6, 8);
    box("#cebea4", width / 2, walk + 7, -77, width, 3);
    for (let i = -3; i <= 3; i++) {
      const x1 = width / 2 + i * 66, x2 = width / 2 + i * 107;
      line("#dcd0b8", x1, walk + 10, x2, height, -76, 0.9);
    }
    line("#dfd2ba", 0, height - 37, width, height - 37, -76, 1);
    // Details frame the playfield. No tall foreground prop cuts through the center.
    const poleX = width - buildingWidth + 8;
    box("#8da99a", poleX, base - 37, -110, 3, 102, 3);
    sign("CANAL ST", "", poleX + 9, base - 81, 47, 12, "#789d88", "#f7efd9", -101);
    const hydrant = model.group(layers.foreground, 19 - width / 2, height / 2 - walk - 17, -56);
    model.part(hydrant, "tube", "#c98167", 0, 13, 0, 6, 26, 6);
    model.part(hydrant, "ball", "#e3a37e", 0, 27, 0, 8, 5, 8);
    model.rod(hydrant, [-11, 16, 0], [11, 16, 0], 4, "#bf795f");
    model.part(hydrant, "tube", "#ad806c", 0, 1, 0, 9, 3, 9);
    for (const side of [0, 1]) {
      const px = side ? width - 18 : 15, py = base + 9;
      const planter = model.group(layers.midground, px - width / 2, height / 2 - py, -104);
      model.part(planter, "box", "#bdac8b", 0, 9, 0, 25, 18, 18);
      model.part(planter, "box", "#d4c6a1", 0, 18, 0, 29, 4, 21);
      for (let n = 0; n < 3; n++) model.part(planter, "ball", ["#799c78", "#93ad82", "#a5ba8b"][n], (n - 1) * 7, 29 + n % 2 * 7, n, 10, 13, 8);
    }
    for (const { parent, color, entries } of batches.values()) {
      const mesh = new T.InstancedMesh(model.geometries.box, material(color), entries.length);
      parent.add(mesh);
      const transform = new T.Object3D();
      entries.forEach(([x, y, z, sx, sy, sz, angle], i) => {
        transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.z = angle; transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < 2; i++) {
      const car = model.group(layers.foreground, 0, height / 2 - base - 31, -133);
      const color = i ? "#8cb3ac" : "#e2ba5e";
      roundedPart(car, color, 0, 6, 0, 76, 17, 25);
      roundedPart(car, color, -2, 21, -1, 42, 20, 22);
      roundedPart(car, "#6d919a", -2, 23, 11, 33, 12, 1);
      model.part(car, "box", color, -4, 23, 12, 2, 12, 1);
      model.part(car, "box", "#eedeb5", 0, 3, 13, 66, 2, 1);
      for (const side of [-1, 1]) {
        model.part(car, "ball", "#37474d", side * 23, -3, 12, 8, 8, 4);
        model.part(car, "ball", "#a4aba2", side * 23, -3, 15, 4, 4, 1);
      }
      if (!i) model.part(car, "box", "#f3d888", 0, 34, 0, 17, 5, 12);
      traffic.push(car);
    }
    for (let i = 0; i < 3; i++) {
      const person = model.group(layers.midground, 0, height / 2 - base - 4, -130);
      person.scale.setScalar(0.66);
      const color = ["#466783", "#538774", "#c38266"][i];
      model.part(person, "capsule", color, 0, 35, 0, 6, 11, 5);
      model.part(person, "ball", "#c29b7c", 0, 60, 0, 6, 8, 6);
      model.part(person, "ball", "#5a5148", -1, 64, -1, 6, 5, 6);
      const limbs = [];
      for (const side of [-1, 1]) {
        const leg = model.group(person, side * 4, 24, 0);
        model.part(leg, "capsule", "#4a5963", 0, -11, 0, 2.7, 10, 2.7);
        model.part(leg, "ball", "#35464f", 2, -23, 2, 5, 2, 3);
        const arm = model.group(person, side * 8, 45, 0);
        model.part(arm, "capsule", color, 0, -8, 0, 2, 7, 2);
        model.part(arm, "ball", "#c29b7c", 0, -17, 0, 2, 3, 2);
        limbs.push({ leg, arm, side });
      }
      person.userData.limbs = limbs; walkers.push(person);
    }
    const cycle = model.group(layers.foreground, 0, height / 2 - base - 45, -130);
    for (const side of [-1, 1]) model.part(cycle, "ring", "#485d64", side * 17, 0, 0, 11, 11, 3);
    for (const [a, b] of [
      [[-17, 0, 0], [-7, 20, 0]], [[-7, 20, 0], [3, 0, 0]],
      [[3, 0, 0], [-17, 0, 0]], [[-17, 0, 0], [10, 20, 0]],
      [[10, 20, 0], [17, 0, 0]], [[10, 20, 0], [-7, 20, 0]],
    ]) model.rod(cycle, a, b, 1.4, "#7c9883");
    model.rod(cycle, [-6, 23, 0], [0, 38, 0], 5, "#b38062");
    model.part(cycle, "ball", "#c79c78", 5, 47, 0, 5, 6, 5);
    model.part(cycle, "ball", "#d5b966", 5, 51, 0, 6, 3, 6);
    model.rod(cycle, [1, 36, 0], [15, 23, 0], 2, "#c79c78");
    const pedal = model.group(cycle);
    model.rod(pedal, [-6, 23, 1], [-9, 12, 1], 3, "#4f646b");
    model.rod(pedal, [-9, 12, 1], [2, 1, 1], 3, "#4f646b");
    for (let i = 0; i < 3; i++) {
      const cloud = model.group(layers.far, 0, height / 2 - height * (0.16 + i * 0.055), -610);
      for (let n = 0; n < 4; n++) model.part(cloud, "ball", "#fff8e7", (n - 1.5) * 17, n % 2 ? 6 : 0, 0, 18, n % 2 ? 15 : 11, 9);
      cloud.scale.set(0.85, 0.62, 0.8);
      clouds.push(cloud);
    }
    for (let i = 0; i < 3; i++) {
      const bird = model.birdModel(); bird.scale.setScalar(0.30); layers.far.add(bird); birds.push(bird);
    }
    for (let i = 0; i < 5; i++) {
      const puff = new T.Mesh(model.geometries.ball, new T.MeshBasicMaterial({ color: "#f3f6ef", transparent: true, opacity: 0.10, depthWrite: false }));
      disposableMaterials.push(puff.material); layers.foreground.add(puff); steam.push(puff);
    }
    function animate(time) {
      walkers.forEach((person, i) => {
        const route = width + 180;
        person.position.x = ((time * 13 + i * route / 3) % route) - 90 - width / 2;
        person.userData.limbs.forEach(({ leg, arm, side }) => {
          leg.rotation.z = Math.sin(time * 4 + i) * side * 0.35;
          arm.rotation.z = -leg.rotation.z;
        });
      });
      const gap = Math.max(300, width * 0.7);
      cycle.position.x = ((time * 29 + gap * 2) % (gap * 3)) - 150 - width / 2;
      pedal.rotation.z = Math.sin(time * 6) * 0.15;
      clouds.forEach((cloud, i) => cloud.position.x = ((i * 137 + time * (1.7 + i * 0.3)) % (width + 150)) - 75 - width / 2);
      traffic.forEach((car, i) => {
        const gap = Math.max(300, width * 0.7), route = gap * 3;
        car.position.x = ((time * 29 + i * gap) % route) - 150 - width / 2;
      });
      birds.forEach((bird, i) => {
        bird.position.set(((time * 14 + i * 123) % (width + 80)) - 40 - width / 2, height / 2 - height * (0.24 + i * 0.04), -320);
        bird.userData.wings.forEach((wing, j) => wing.rotation.z = Math.sin(time * 8 + i) * (j ? 1 : -1) * 0.65);
      });
      steam.forEach((puff, i) => {
        const life = (time * 0.18 + i / 5) % 1;
        puff.position.set(width * 0.18 - width / 2 + Math.sin(life * 6) * 9, height / 2 - walk + life * 90, -58);
        puff.scale.set(8 + life * 20, 10 + life * 14, 4);
        puff.material.opacity = (1 - life) * 0.10;
      });
    }
    return { root, layers, animate, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
