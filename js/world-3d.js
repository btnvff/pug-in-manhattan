// A shallow Manhattan diorama behind the unchanged screen-space playing field.
function createThreeWorld(model, width, height) {
  const T = window.THREE;
  const root = model.group(), birds = [], steam = [], clouds = [];
  const textures = [], disposableMaterials = [];
  const base = height * 0.7, walk = height - 148;
  const batches = new Map();
  let facade = null;
  function box(color, x, y, z, sx, sy, sz) {
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push([x - width / 2, height / 2 - y, z, sx, sy, sz, facade]);
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
    if (facade) { mesh.position.sub(facade.position); facade.add(mesh); }
    else root.add(mesh);
  }
  // Sky, distant buildings and bridge remain quiet behind the food silhouettes.
  box("#72bde2", width / 2, height / 2, -700, width * 2, height * 2, 10);
  ball("#fff1c1", width * 0.79, height * 0.17, -600, 25, 25, 10);
  for (let i = 0; i < 11; i++) {
    const bx = (i + 0.3) * width / 10, bh = 100 + (i * 47) % 125;
    const bw = width / 11;
    const setback = model.group(root, bx-width/2, height/2-base+bh/2+45, -490);
    setback.rotation.set(.07, -.2, 0);
    model.part(setback, "box", "#819fb5", 0, 0, 0, bw, bh, 55);
    model.part(setback, "box", "#afc8d6", -bw*.15, bh/2+10, -4, bw*.65, 20, 36);
    box(["#809fb6", "#a4b6c5", "#90adb9"][i % 3], bx, base - bh / 2 - 45, -470, bw, bh, 40);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 2; col++)
      box("#627f98", bx - bw * 0.22 + col * bw * 0.44, base - bh + 25 + row * 16, -449, 4, 8, 1);
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
    facade = model.group(root, bx-width/2, height/2-base, -210);
    facade.rotation.set(.045, side ? -.27 : .27, 0);
    const color = side ? "#4b829f" : "#a74f3c";
    box(color, bx, top + bh / 2, -210, bw, bh, 110);
    box("#f1f3ec", bx, top - 3, -195, bw + 12, 9, 128);
    box("#354752", bx, top - 10, -200, bw + 7, 7, 119);
    for (let yy = top + 8; yy < base - 85; yy += 14)
      box("#85564b", bx, yy, -154, bw, 0.8, 1);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      const wx = bx - bw * 0.25 + col * bw * 0.50;
      const wy = top + 30 + row * Math.max(42, (bh - 106) / 3);
      const ww = bw * 0.28, wh = Math.max(28, (bh - 125) / 3);
      box("#edf2eb", wx, wy, -149, ww + 6, wh + 7, 8);
      box("#1b3444", wx, wy, -143, ww, wh, 2);
      box("#558ba7", wx - ww * 0.18, wy - wh * 0.17, -141, ww * 0.3, wh * 0.48, 1);
      box("#d1dfe0", wx, wy, -139, 2, wh, 3);
      box("#d1dfe0", wx, wy, -139, ww, 2, 3);
      box("#f0f2e8", wx, wy + wh / 2 + 3, -137, ww + 10, 5, 16);
      if (col === side) {
        box("#263941", wx, wy + wh / 2 + 9, -128, ww + 16, 3, 28);
        for (let k = -2; k <= 2; k++) box("#304752", wx + k * ww / 4, wy + wh / 2, -112, 1.3, 19, 1.3);
        box("#304752", wx, wy + wh / 2 - 9, -112, ww + 16, 2, 2);
      }
    }
    box("#2b635d", bx, base - 39, -146, bw - 12, 72, 12);
    for (let col = -1; col <= 1; col++) {
      box("#1a3847", bx + col * bw * 0.27, base - 31, -138, bw * 0.23, 47, 2);
      box("#84b3bd", bx + col * bw * 0.27, base - 31, -136, 2, 47, 2);
    }
    sign(side ? "DELI & GROCERY" : "JOE’S PIZZA", bx, base - 80, bw - 5, 21, side ? "#21634d" : "#883f31", "#fff8e6");
    for (let i = 0; i < 7; i++)
      box(i % 2 ? "#f2f1e5" : side ? "#3d8871" : "#b9503c", bx - bw / 2 + (i + 0.5) * bw / 7, base - 61, -125, bw / 7, 9, 27);
    facade = null;
  }
  const tank = model.group(root, width * 0.82 - width / 2, height / 2 - height * 0.34 + 27, -225);
  model.part(tank, "tube", "#a67a4e", 0, 10, 0, 20, 33, 20);
  model.part(tank, "cone", "#38586a", 0, 34, 0, 25, 16, 25);
  for (const side of [-1, 1]) model.rod(tank, [side * 16, -6, 0], [side * 21, -26, 0], 2, "#344650");
  box("#354e61", width / 2, base + (walk - base) / 2, -180, width, walk - base, 20);
  for (let i = 0; i < 5; i++) box("#eec765", i * 110 + 25, base + 34, -167, 36, 2, 1);
  box("#819aa6", width / 2, walk + (height - walk) / 2, -100, width, height - walk, 30);
  box("#e6f0ef", width / 2, walk + 3, -80, width, 8, 12);
  function asphalt(y, h, z, color) {
    const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
    const pen=canvas.getContext("2d");pen.fillStyle=color;pen.fillRect(0,0,256,256);
    let seed=7391;
    function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    for(let i=0;i<8500;i++) {pen.fillStyle=i%2?"#ffffff09":"#08132310";pen.fillRect(noise()*256,noise()*256,1+noise(),1);}
    pen.strokeStyle="#16273130";pen.lineWidth=.6;
    pen.beginPath();pen.moveTo(14,80);pen.lineTo(38,98);pen.lineTo(34,117);pen.lineTo(49,133);pen.stroke();
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    const mat=new T.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.18,roughness:1});disposableMaterials.push(mat);
    const surface=new T.Mesh(new T.PlaneGeometry(width,h),mat);surface.position.set(0,height/2-y,z);root.add(surface);
  }
  asphalt(base+(walk-base)/2,walk-base,-168,"#344858");
  asphalt(walk+8+(height-walk-8)/2,height-walk-8,-79,"#607783");
  for(let i=0;i<5;i++) box("#edcc7d",i*110+25,base+34,-165,36,2,1);
  const drain=model.group(root,width*.9-width/2,height/2-walk-23,-73);
  model.part(drain,"box","#344956",0,0,0,29,10,2);
  for(let i=-3;i<=3;i++) model.part(drain,"box","#8b9ea7",i*3.6,0,2,1.1,8,1);
  box("#314b55", width * 0.70, base - 35, -110, 3, 111, 3);
  sign("CANAL ST", width * 0.70, base - 85, 62, 15, "#247259", "#fafbf5", -102);
  const hydrant = model.group(root, 22 - width / 2, height / 2 - walk - 14, -56);
  model.part(hydrant, "tube", "#b74435", 0, 14, 0, 8, 31, 8);
  model.part(hydrant, "ball", "#df6950", 0, 31, 0, 10, 6, 10);
  model.rod(hydrant, [-14, 17, 0], [14, 17, 0], 5, "#903b32");
  model.part(hydrant,"tube","#713b35",0,-1,0,12,5,12);
  model.part(hydrant,"tube","#e16b45",0,28,0,10,3,10);
  model.part(hydrant,"ball","#f18557",0,35,0,4,3,4);
  for(const side of [-1,1]) {
    const cap=model.part(hydrant,"tube","#d26545",side*15,17,0,6.5,4,6.5);cap.rotation.z=Math.PI/2;
    model.part(hydrant,"ball","#f4aa71",side*18,17,2,2,2,2);
  }
  for(let i=0;i<5;i++) model.part(hydrant,"ring","#5b5550",5+i*1.5,18-Math.sin(i/4*Math.PI)*8,9,1.4,1.8,.7);
  for (const [color, entries] of batches) {
    let material = model.material(color);
    if (color === "#a74f3c" || color === "#4b829f") {
      const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
      const pen=canvas.getContext("2d");pen.fillStyle=color;pen.fillRect(0,0,128,128);
      pen.strokeStyle="#efdfcc35";pen.lineWidth=1;
      for(let row=0;row<8;row++) {
        pen.beginPath();pen.moveTo(0,row*16);pen.lineTo(128,row*16);pen.stroke();
        for(let col=-1;col<5;col++) {const xx=col*32+(row%2)*16;pen.beginPath();pen.moveTo(xx,row*16);pen.lineTo(xx,row*16+16);pen.stroke();}
      }
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
      material=new T.MeshStandardMaterial({map:texture,roughness:.95});disposableMaterials.push(material);
    }
    const mesh = new T.InstancedMesh(model.geometries.box, material, entries.length);
    const transform = new T.Object3D();
    entries.forEach(([x, y, z, sx, sy, sz, parent], i) => {
      transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.updateMatrix();
      if (parent) {
        transform.position.sub(parent.position); transform.updateMatrix(); parent.updateMatrix();
        transform.matrix.premultiply(parent.matrix);
      }
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }
  const actors = createStreetActors(model, root, width, height, base);
  for (let i = 0; i < 3; i++) {
    const cloud = model.group(root, 0, height / 2 - 98 - i * 34, -570);
    for (let n = 0; n < 4; n++) model.part(cloud, "ball", "#f6faf9", (n - 1.5) * 17, n % 2 ? 6 : 0, 0, 18, n % 2 ? 15 : 11, 9);
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
    actors.animate(time);
    clouds.forEach((cloud, i) => cloud.position.x = ((i * 137 + time * (1.7 + i * 0.3)) % (width + 150)) - 75 - width / 2);
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
  function dispose() {
    root.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry && !Object.values(model.geometries).includes(object.geometry) && !actors.owned.includes(object.geometry)) object.geometry.dispose();
    });
    actors.dispose();
    textures.forEach((texture) => texture.dispose());
    disposableMaterials.forEach((mat) => mat.dispose());
  }
  return { root, animate, dispose };
}
