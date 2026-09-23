// A shallow Manhattan diorama behind the unchanged screen-space playing field.
function createThreeWorld(model, width, height) {
  const T = window.THREE;
  const root = model.group(), traffic = [], birds = [], steam = [], walkers = [], clouds = [];
  const textures = [], disposableMaterials = [];
  const base = height * 0.7, walk = height - 148;
  const batches = new Map();
  function box(color, x, y, z, sx, sy, sz) {
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push([x - width / 2, height / 2 - y, z, sx, sy, sz]);
  }
  function ball(color, x, y, z, sx, sy, sz) {
    return model.part(root, "ball", color, x - width / 2, height / 2 - y, z, sx, sy, sz);
  }
  function sign(text, x, y, w, h, bg, fg, z = -135) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const pen = canvas.getContext("2d");
    pen.fillStyle = bg; pen.fillRect(0, 0, 512, 128);
    pen.strokeStyle = fg; pen.lineWidth = 5; pen.strokeRect(7, 7, 498, 114);
    pen.fillStyle = fg; pen.font = "bold 48px Georgia";
    pen.textAlign = "center"; pen.textBaseline = "middle";
    pen.fillText(text, 256, 67, 478);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    const mat = new T.MeshBasicMaterial({ map: texture });
    disposableMaterials.push(mat);
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    mesh.position.set(x - width / 2, height / 2 - y, z);
    root.add(mesh);
  }
  function dispose() {
    const sharedGeometry = new Set(Object.values(model.geometries));
    root.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry && !sharedGeometry.has(object.geometry)) object.geometry.dispose();
    });
    textures.forEach((texture) => texture.dispose());
    disposableMaterials.forEach((mat) => mat.dispose());
  }
  try {
    // Sky, distant buildings and bridge remain quiet behind the food silhouettes.
    box("#bce5eb", width / 2, height / 2, -700, width * 2, height * 2, 10);
    ball("#fff0be", width * 0.79, height * 0.17, -600, 32, 32, 10);
    for (let i = 0; i < 11; i++) {
      const bx = (i + 0.3) * width / 10, bh = 100 + (i * 47) % 125;
      const bw = width / 11;
      box(["#8da6b8", "#b8aaa3", "#9ab3b8"][i % 3], bx, base - bh / 2 - 45, -470, bw, bh, 40);
      for (let row = 0; row < 7; row++) for (let col = 0; col < 2; col++)
        box("#637e92", bx - bw * 0.22 + col * bw * 0.44, base - bh + 25 + row * 16, -449, 4, 8, 1);
    }
    const towerX = width * 0.54, towerTop = height * 0.30;
    for (const side of [-1, 1]) {
      const tx = towerX + side * 28;
      box("#688c9c", tx, (towerTop + base - 50) / 2, -390, 10, base - 50 - towerTop, 20);
      box("#87a6aa", tx, towerTop, -389, 20, 10, 24);
      for (let i = 0; i < 15; i++) {
        const u = i / 14, end = side < 0 ? -20 : width + 20;
        const xx = tx + (end - tx) * u;
        const yy = towerTop + 15 + (base - 80 - towerTop) * (2 * u - u * u);
        model.rod(root, [xx - width / 2, height / 2 - yy, -380], [xx - width / 2, height / 2 - base + 55, -380], 0.7, "#9db6b9");
        if (i) {
          const prev = (i - 1) / 14;
          model.rod(root, [tx + (end - tx) * prev - width / 2, height / 2 - towerTop - 15 - (base - 80 - towerTop) * (2 * prev - prev * prev), -380], [xx - width / 2, height / 2 - yy, -380], 1.5, "#6e929f");
        }
      }
    }
    box("#688c9c", towerX, towerTop + 40, -382, 58, 10, 16);
    box("#688c9c", width / 2, base - 50, -375, width, 10, 18);
    // Brownstones: warm brick, recessed glazing, cornices and iron balconies.
    for (let side = 0; side < 2; side++) {
      const bw = width * 0.29, bx = side ? width - bw / 2 + 7 : bw / 2 - 7;
      const top = height * (side ? 0.34 : 0.38), bh = base - top;
      const color = side ? "#bc977a" : "#ad7461";
      box(color, bx, top + bh / 2, -210, bw, bh, 110);
      box("#dccab0", bx, top - 3, -195, bw + 12, 9, 128);
      box("#887e72", bx, top - 10, -200, bw + 7, 7, 119);
      for (let yy = top + 8; yy < base - 85; yy += 14)
        box("#9b7667", bx, yy, -154, bw, 0.8, 1);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
        const wx = bx - bw * 0.25 + col * bw * 0.50;
        const wy = top + 30 + row * Math.max(42, (bh - 106) / 3);
        const ww = bw * 0.28, wh = Math.max(28, (bh - 125) / 3);
        box("#dfc8a4", wx, wy, -149, ww + 6, wh + 7, 8);
        box("#334e60", wx, wy, -143, ww, wh, 2);
        box("#77999d", wx - ww * 0.18, wy - wh * 0.17, -141, ww * 0.3, wh * 0.48, 1);
        box("#bdbaa7", wx, wy, -139, 2, wh, 3);
        box("#bdbaa7", wx, wy, -139, ww, 2, 3);
        box("#e1ccb0", wx, wy + wh / 2 + 3, -137, ww + 10, 5, 16);
        if (col === side) {
          box("#4d6063", wx, wy + wh / 2 + 9, -128, ww + 16, 3, 28);
          for (let k = -2; k <= 2; k++) box("#506569", wx + k * ww / 4, wy + wh / 2, -112, 1.3, 19, 1.3);
          box("#506569", wx, wy + wh / 2 - 9, -112, ww + 16, 2, 2);
        }
      }
      box("#3b6867", bx, base - 39, -146, bw - 12, 72, 12);
      for (let col = -1; col <= 1; col++) {
        box("#244956", bx + col * bw * 0.27, base - 31, -138, bw * 0.23, 47, 2);
        box("#8aa3a1", bx + col * bw * 0.27, base - 31, -136, 2, 47, 2);
      }
      sign(side ? "DELI & GROCERY" : "JOE’S PIZZA", bx, base - 80, bw - 5, 21, side ? "#315f59" : "#874c3e", "#f4e5c9");
      for (let i = 0; i < 7; i++)
        box(i % 2 ? "#e6d8b8" : side ? "#609084" : "#bd7461", bx - bw / 2 + (i + 0.5) * bw / 7, base - 61, -125, bw / 7, 9, 27);
    }
    const tank = model.group(root, width * 0.82 - width / 2, height / 2 - height * 0.34 + 27, -225);
    model.part(tank, "tube", "#9b8768", 0, 10, 0, 20, 33, 20);
    model.part(tank, "cone", "#62777a", 0, 34, 0, 25, 16, 25);
    for (const side of [-1, 1]) model.rod(tank, [side * 16, -6, 0], [side * 21, -26, 0], 2, "#576565");
    box("#697c88", width / 2, base + (walk - base) / 2, -180, width, walk - base, 20);
    for (let i = 0; i < 5; i++) box("#dacaa1", i * 110 + 25, base + 34, -167, 36, 2, 1);
    box("#c3bfb1", width / 2, walk + (height - walk) / 2, -100, width, height - walk, 30);
    box("#e0dcd0", width / 2, walk + 3, -80, width, 8, 12);
    for (let i = 0; i < 9; i++) box("#a8aa9e", i * 67, walk + 80, -84, 1, 152, 1);
    box("#a8aa9e", width / 2, height - 44, -84, width, 1, 1);
    box("#527773", width * 0.70, base - 35, -110, 3, 111, 3);
    sign("CANAL ST", width * 0.70, base - 85, 62, 15, "#347565", "#f2ebd6", -102);
    const hydrant = model.group(root, 22 - width / 2, height / 2 - walk - 14, -56);
    model.part(hydrant, "tube", "#be6552", 0, 14, 0, 8, 31, 8);
    model.part(hydrant, "ball", "#d77c60", 0, 31, 0, 10, 6, 10);
    model.rod(hydrant, [-14, 17, 0], [14, 17, 0], 5, "#ae5b4c");
    for (const [color, entries] of batches) {
      const mesh = new T.InstancedMesh(model.geometries.box, model.material(color), entries.length);
      const transform = new T.Object3D();
      entries.forEach(([x, y, z, sx, sy, sz], i) => {
        transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
    }
    for (let i = 0; i < 2; i++) {
      const car = model.group(root, 0, height / 2 - base - 31, -133);
      const color = i ? "#8cb3ac" : "#e2ba5e";
      model.part(car, "box", color, 0, 6, 0, 76, 17, 25);
      model.part(car, "box", color, -2, 21, -1, 42, 20, 22);
      model.part(car, "box", "#536f7c", -2, 23, 11, 33, 12, 1);
      for (const side of [-1, 1]) {
        model.part(car, "ball", "#37474d", side * 23, -3, 12, 8, 8, 4);
        model.part(car, "ball", "#a4aba2", side * 23, -3, 15, 4, 4, 1);
      }
      if (!i) model.part(car, "box", "#f3d888", 0, 34, 0, 17, 5, 12);
      traffic.push(car);
    }
    for (let i = 0; i < 3; i++) {
      const person = model.group(root, 0, height / 2 - base - 4, -130);
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
    const cycle = model.group(root, 0, height / 2 - base - 45, -130);
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
      const cloud = model.group(root, 0, height / 2 - 98 - i * 34, -570);
      for (let n = 0; n < 4; n++) model.part(cloud, "ball", "#f1f0e1", (n - 1.5) * 17, n % 2 ? 6 : 0, 0, 18, n % 2 ? 15 : 11, 9);
      clouds.push(cloud);
    }
    for (let i = 0; i < 3; i++) {
      const bird = model.birdModel(); bird.scale.setScalar(0.30); root.add(bird); birds.push(bird);
    }
    for (let i = 0; i < 5; i++) {
      const puff = new T.Mesh(model.geometries.ball, new T.MeshBasicMaterial({ color: "#f3f6ef", transparent: true, opacity: 0.10, depthWrite: false }));
      disposableMaterials.push(puff.material); root.add(puff); steam.push(puff);
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
    return { root, animate, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
