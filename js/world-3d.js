// Scenery alone uses perspective; gameplay retains its exact orthographic pixels.
function createCityPerspective(width, height) {
  const focal = width * .94, eye = height * .345;
  const vanishingX = width * .515, horizon = height * .57;
  function project(x, y, depth) {
    const scale = focal / (focal + depth);
    return { x: vanishingX + x * scale, y: horizon + (eye - y) * scale, z: -200 - (1 - scale) * 300, scale };
  }
  function groundX(x, screenY) { return vanishingX + x * (screenY - horizon) / eye; }
  return { project, groundX, focal, eye, vanishingX, horizon };
}
function createThreeWorld(model, width, height) {
  const T = window.THREE;
  const root = model.group(), birds = [], steam = [], clouds = [], papers = [];
  const textures = [], disposableMaterials = [];
  const base = height * 0.73, walk = height - 148;
  const perspective = createCityPerspective(width, height);
  const { horizon, vanishingX } = perspective;
  const roadHalf = width * .46;
  function ball(color, x, y, z, sx, sy, sz) {
    return model.part(root, "ball", color, x - width / 2, height / 2 - y, z, sx, sy, sz);
  }
  function streetX(side, y, inset = 0) {
    return perspective.groundX(side * (roadHalf - width * inset), y);
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
  // Project the actual corners of every facade detail, not just its center.
  // Shared vertex-color batches retain real face normals and reduce draw calls.
  const cityBatches = new Map();
  function cityVertex(point) {
    const p = perspective.project(...point);
    return [p.x - width / 2, height / 2 - p.y, p.z];
  }
  function cityFace(points, normal, color, finish = "plain", haze = 0) {
    if (!cityBatches.has(finish)) cityBatches.set(finish, { positions: [], normals: [], colors: [], uvs: [] });
    const batch = cityBatches.get(finish);
    const tint = new T.Color(color).lerp(new T.Color("#b0cbd5"), haze);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      batch.positions.push(...cityVertex(points[i])); batch.normals.push(...normal);
      batch.colors.push(tint.r, tint.g, tint.b);
      batch.uvs.push((normal[0] ? points[i][2] : points[i][0]) / 64, (normal[1] ? points[i][2] : points[i][1]) / 32);
    }
  }
  function cityBox(color, x, y, depth, sx, sy, sz, finish = "plain", haze = 0) {
    const l = x - sx / 2, r = x + sx / 2, b = y - sy / 2, t = y + sy / 2, n = depth - sz / 2, f = depth + sz / 2;
    cityFace([[l,b,n],[r,b,n],[r,t,n],[l,t,n]], [0,0,1], color, finish, haze);
    cityFace([[r,b,f],[l,b,f],[l,t,f],[r,t,f]], [0,0,-1], color, finish, haze);
    cityFace([[r,b,n],[r,b,f],[r,t,f],[r,t,n]], [1,0,0], color, finish, haze);
    cityFace([[l,b,f],[l,b,n],[l,t,n],[l,t,f]], [-1,0,0], color, finish, haze);
    cityFace([[l,t,n],[r,t,n],[r,t,f],[l,t,f]], [0,1,0], color, finish, haze);
    cityFace([[l,b,f],[r,b,f],[r,b,n],[l,b,n]], [0,-1,0], color, finish, haze);
  }
  function cityRod(color, a, b, radius) {
    // Merge static rails/cables with the city instead of hundreds of draw calls.
    const start = new T.Vector3(a[0],a[1],-a[2]), end = new T.Vector3(b[0],b[1],-b[2]);
    const axis = end.clone().sub(start).normalize();
    const u = new T.Vector3(Math.abs(axis.y) > .9 ? 1 : 0, Math.abs(axis.y) > .9 ? 0 : 1, 0).cross(axis).normalize();
    const v = axis.clone().cross(u);
    const point = (center, angle) => {
      const p = center.clone().addScaledVector(u,Math.cos(angle)*radius).addScaledVector(v,Math.sin(angle)*radius);
      return [p.x,p.y,-p.z];
    };
    for(let i=0;i<6;i++) {
      const a0=i*Math.PI/3,a1=(i+1)*Math.PI/3,mid=(a0+a1)/2;
      const normal=u.clone().multiplyScalar(Math.cos(mid)).addScaledVector(v,Math.sin(mid));
      cityFace([point(start,a0),point(start,a1),point(end,a1),point(end,a0)],normal.toArray(),color);
    }
  }
  function cityBall(color, x, y, depth, sx, sy, sz) {
    const p = perspective.project(x, y, depth);
    return ball(color, p.x, p.y, p.z, sx * p.scale, sy * p.scale, sz * p.scale);
  }
  function citySign(text, side, faceX, y, near, far, bg) {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 100;
    const pen = canvas.getContext("2d"); pen.fillStyle = bg; pen.fillRect(0, 0, 512, 100);
    pen.fillStyle = "#efe7ce"; pen.font = "bold 45px Georgia"; pen.textAlign = "center"; pen.textBaseline = "middle";
    pen.fillText(text, 256, 52, 486); pen.strokeStyle = "#eadcc888"; pen.lineWidth = 3; pen.strokeRect(6,6,500,88);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
    const mat = new T.MeshStandardMaterial({ map: texture, roughness: .86, side: T.DoubleSide }); disposableMaterials.push(mat);
    const points = side < 0 ? [[faceX,y-12,near],[faceX,y-12,far],[faceX,y+12,far],[faceX,y+12,near]]
      : [[faceX,y-12,far],[faceX,y-12,near],[faceX,y+12,near],[faceX,y+12,far]];
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(points.flatMap(cityVertex), 3));
    geometry.setAttribute("normal", new T.Float32BufferAttribute(points.flatMap(() => [-side,0,0]), 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute([0,0,1,0,1,1,0,1], 2));
    geometry.setIndex([0,1,2,0,2,3]); root.add(new T.Mesh(geometry, mat));
  }
  // Sky, distant buildings and bridge remain quiet behind the food silhouettes.
  const skyCanvas = document.createElement("canvas"); skyCanvas.width = 8; skyCanvas.height = 256;
  const skyPen = skyCanvas.getContext("2d"), skyGradient = skyPen.createLinearGradient(0, 0, 0, 256);
  skyGradient.addColorStop(0, "#63b4d9"); skyGradient.addColorStop(.65, "#a7d1dd"); skyGradient.addColorStop(1, "#cbd8cb");
  skyPen.fillStyle = skyGradient; skyPen.fillRect(0, 0, 8, 256);
  const skyTexture = new T.CanvasTexture(skyCanvas); skyTexture.colorSpace = T.SRGBColorSpace; textures.push(skyTexture);
  const skyMaterial = new T.MeshBasicMaterial({ map: skyTexture, toneMapped: false }); disposableMaterials.push(skyMaterial);
  const sky = new T.Mesh(new T.PlaneGeometry(width * 2, height), skyMaterial); sky.position.z = -1320; root.add(sky);
  ball("#fff1c1", width * 0.79, height * 0.17, -1190, 25, 25, 10);
  // Broad, overlapping skyline masses: distance softens contrast before size.
  const skylineBase = height * .20;
  for (let i = 0; i < 12; i++) {
    const depth = width * (7.3 + (i % 3) * .8), scale = perspective.project(0,0,depth).scale;
    const screenX = width * (-.12 + i * .112);
    const buildingHeight = height * (1.72 + ((i * 7) % 9) * .12);
    const w = width * (.65 + (i % 3) * .12);
    const x = (screenX - vanishingX) / scale;
    cityBox(["#779bae", "#8aa6b7", "#7797ad"][i % 3], x, skylineBase + buildingHeight / 2, depth, w, buildingHeight, width * .45, "plain", .45);
    cityBox("#abc1c8", x, skylineBase + buildingHeight + 35, depth, w * .65, 70, width * .32, "plain", .48);
    for (let row = 0; row < 15; row++) for (let col = -1; col <= 1; col++)
      cityBox("#7399b1", x + col * w * .25, skylineBase + 120 + row * (buildingHeight - 160) / 15, depth - width * .23 - 2, w * .09, 34, 2, "plain", .58);
  }
  for (const [screenX, depthFactor, tall, span] of [[.38,6.5,2.40,.91],[.59,7,3.02,.86],[.79,7.6,2.67,1.15]]) {
    const depth = width * depthFactor, scale = perspective.project(0,0,depth).scale;
    const x = (width * screenX - vanishingX) / scale, w = width * span, h = height * tall;
    cityBox("#769bb2", x, skylineBase + h * .43, depth, w, h * .86, w * .66, "plain", .32);
    cityBox("#92b2c3", x, skylineBase + h * .89, depth, w * .7, h * .14, w * .5, "plain", .32);
    cityBox("#a6bdc7", x, skylineBase + h * .98, depth, w * .4, h * .08, w * .32, "plain", .35);
    cityBox("#83a7bb", x, skylineBase + h * 1.055, depth, w * .13, h * .08, w * .16, "plain", .38);
    cityRod("#99b6c7", [x,skylineBase+h * 1.08,depth], [x,skylineBase+h * 1.15,depth], 5);
    for (let col = -2; col <= 2; col++) {
      cityBox("#abc2cb", x + col * w * .145, skylineBase + h * .46, depth - w * .334, w * .025, h * .74, 2, "plain", .45);
      for (let row = 0; row < 17; row++) cityBox("#6e97af", x + col * w * .145, skylineBase + h * (.12 + row * .041), depth - w * .339, w * .067, h * .014, 2, "plain", .48);
    }
  }
  // Fog hides the distant foundations; large silhouettes dissolve at street level.
  const hazeCanvas = document.createElement("canvas"); hazeCanvas.width = 8; hazeCanvas.height = 128;
  const hazePen = hazeCanvas.getContext("2d"), hazeGradient = hazePen.createLinearGradient(0,0,0,128);
  hazeGradient.addColorStop(0,"#b6cdd000"); hazeGradient.addColorStop(.48,"#b6cdd02a");
  hazeGradient.addColorStop(.78,"#aebfc4f5"); hazeGradient.addColorStop(1,"#99aead00");
  hazePen.fillStyle=hazeGradient; hazePen.fillRect(0,0,8,128);
  const hazeTexture=new T.CanvasTexture(hazeCanvas);hazeTexture.colorSpace=T.SRGBColorSpace;textures.push(hazeTexture);
  const hazeMaterial=new T.MeshBasicMaterial({map:hazeTexture,transparent:true,depthWrite:false,toneMapped:false});disposableMaterials.push(hazeMaterial);
  const hazeMesh=new T.Mesh(new T.PlaneGeometry(width,height*.23),hazeMaterial);
  hazeMesh.position.set(0,height/2-height*.525,-450);root.add(hazeMesh);
  // A large steel suspension portal separates the street from the skyline.
  const bridgeDepth = width * 2.35, bridgeDeck = height * .095, bridgeTop = height * .98;
  const towerHalf = width * .47, bridgeSteel = "#547e91", bridgeEdge = "#8eaab1";
  for (const side of [-1, 1]) {
    const tx = side * towerHalf;
    cityBox(bridgeSteel, tx, (bridgeTop + bridgeDeck) / 2, bridgeDepth, width * .10, bridgeTop - bridgeDeck, 55);
    cityBox(bridgeEdge, tx - 6, (bridgeTop + bridgeDeck) / 2, bridgeDepth - 30, 7, bridgeTop - bridgeDeck, 5);
    cityBox("#75949f", tx, bridgeTop + 8, bridgeDepth, width * .17, 26, 77);
    cityBall("#7093a2", tx, bridgeTop + 36, bridgeDepth, 21, 23, 22);
    cityBox("#658595", tx, bridgeDeck - 30, bridgeDepth, width * .145, 95, 92);
    for (let row = 0; row < 5; row++) cityBox("#98aeb6", tx, bridgeDeck + 45 + row * (bridgeTop - bridgeDeck - 75) / 5, bridgeDepth - 32, width * .102, 7, 4);
    let previous = null;
    for (let i = 0; i <= 22; i++) {
      const t = i / 22, x = tx + side * width * 2.3 * t;
      const y = bridgeDeck + 70 + (bridgeTop - bridgeDeck - 70) * (1 - t) ** 2;
      const p = [x,y,bridgeDepth - 34];
      if (previous) cityRod(bridgeSteel, previous, p, 4.3);
      cityRod("#8eaab3", p, [x,bridgeDeck + 15,bridgeDepth - 34], 1.25);
      previous = p;
    }
  }
  cityBox(bridgeSteel, 0, bridgeTop - 40, bridgeDepth, towerHalf * 2, 27, 48);
  cityBox("#7798a6", 0, bridgeTop - 113, bridgeDepth, towerHalf * 2, 19, 43);
  cityRod(bridgeSteel, [-towerHalf,bridgeTop-111,bridgeDepth-27], [-towerHalf*.52,bridgeTop-40,bridgeDepth-27], 5);
  cityRod(bridgeSteel, [towerHalf,bridgeTop-111,bridgeDepth-27], [towerHalf*.52,bridgeTop-40,bridgeDepth-27], 5);
  cityBox("#587f91", 0, bridgeDeck, bridgeDepth, width * 6.4, 29, 90);
  cityBox("#a3b6b9", 0, bridgeDeck + 22, bridgeDepth - 49, width * 6.4, 5, 6);
  for (let i = -12; i < 12; i++) {
    const x = i * width * .27;
    cityRod("#8da5af", [x,bridgeDeck-9,bridgeDepth-49], [x+width*.135,bridgeDeck+10,bridgeDepth-49], 2.1);
    cityRod("#8da5af", [x+width*.135,bridgeDeck+10,bridgeDepth-49], [x+width*.27,bridgeDeck-9,bridgeDepth-49], 2.1);
  }
  // Unequal footprints form real street-facing walls with perpendicular returns.
  // Windows, ledges, balconies and signs all inherit the same projective corners.
  const blocks = [
    {side:-1, near:.51, far:1.32, face:.60, tall:.77, color:"#ad6047", floors:5, shop:"JOE’S PIZZA"},
    {side:-1, near:1.42, far:2.34, face:.79, tall:1.10, color:"#b48c68", floors:6},
    {side:-1, near:2.48, far:3.55, face:.99, tall:.91, color:"#8c9290", floors:5},
    {side:1, near:.29, far:1.12, face:.61, tall:.79, color:"#baa489", floors:5, shop:"FRESH GROCERY"},
    {side:1, near:1.27, far:2.10, face:.85, tall:1.04, color:"#a77560", floors:6, shop:"BAKERY"},
    {side:1, near:2.28, far:3.45, face:1.03, tall:1.13, color:"#879b9e", floors:6},
  ];
  for (const [index, building] of blocks.entries()) {
    const {side, floors, shop} = building;
    const near = building.near * width, far = building.far * width, faceX = side * width * building.face;
    const h = height * building.tall, depth = (near + far) / 2, span = far - near, w = width * .5;
    const haze = Math.min(.28, building.near * .08);
    cityBox(building.color, faceX + side * w / 2, h / 2, depth, w, h, span, "brick", haze);
    for (const [y, thickness, inset] of [[h + 3, 10, 8], [h - 13, 8, 5], [115, 6, 4], [6, 9, 3]])
      cityBox(y > h - 20 ? "#a7a99a" : "#c1b59e", faceX + side * (w / 2 - inset), y, depth, w + inset * 2, thickness, span + 13, "plain", haze);
    cityBox("#536367", faceX + side * w / 2, h + 12, depth, w + 12, 7, span + 12, "plain", haze);
    const floorStep = (h - 160) / floors;
    for (let row = 0; row < floors; row++) for (let col = 0; col < 3; col++) {
      const y = 150 + row * floorStep + floorStep * .30, z = near + span * (.17 + col * .31);
      const ww = span * .17, wh = floorStep * .58;
      cityBox("#6e6c61", faceX - side * 1, y - 2, z + 2, 5, wh + 11, ww + 11, "plain", haze);
      cityBox("#b8b9a9", faceX - side * 5, y, z, 5, wh + 7, ww + 8, "plain", haze);
      cityBox("#294a59", faceX - side * 8, y + 1, z, 3, wh, ww, "plain", haze);
      cityBox("#6b93a0", faceX - side * 10, y + wh * .13, z - ww * .24, 2, wh * .58, ww * .27, "plain", haze);
      cityBox("#b5c5bd", faceX - side * 12, y + 1, z, 2, 2, ww, "plain", haze);
      cityBox("#b5c5bd", faceX - side * 12, y + 1, z, 2, wh, 2, "plain", haze);
      cityBox("#b9bba8", faceX - side * 9, y - wh / 2 - 4, z, 10, 5, ww + 12, "plain", haze);
      if (col === (side < 0 ? 1 : 2) && index < 4) {
        const floorY = y - wh / 2 - 10, outerX = faceX - side * 32;
        cityBox("#344c53", faceX - side * 19, floorY, z, 35, 3, ww + 34, "plain", haze);
        cityRod("#3b5158", [outerX,floorY+24,z-ww/2-13], [outerX,floorY+24,z+ww/2+13], 1.8);
        for (let bar = -2; bar <= 2; bar++) cityRod("#3b5158", [outerX,floorY,z+bar*ww/3], [outerX,floorY+24,z+bar*ww/3], 1.1);
        if (row) {
          cityRod("#3b5158", [outerX,floorY,z-ww*.45], [outerX,floorY-floorStep,z+ww*.45], 1.7);
          cityRod("#3b5158", [outerX-side*8,floorY,z-ww*.45], [outerX-side*8,floorY-floorStep,z+ww*.45], 1.7);
          for (let step=0;step<7;step++) cityRod("#627276", [outerX,floorY-floorStep*step/7,z-ww*.45+ww*.9*step/7], [outerX-side*8,floorY-floorStep*step/7,z-ww*.45+ww*.9*step/7], 1);
        }
      }
    }
    // Small front-return windows keep corners volumetric instead of bare slabs.
    for (let row=0;row<floors;row++) for (let col=0;col<3;col++) {
      const x=faceX+side*w*(.17+col*.3), y=160+row*floorStep+floorStep*.25;
      cityBox("#c5bda7", x,y,near-4,w*.18,floorStep*.58,6,"plain",haze);
      cityBox("#365667", x,y,near-8,w*.15,floorStep*.53,3,"plain",haze);
    }
    for (let col=0;col<3;col++) {
      const z=near+span*(.17+col*.31);
      cityBox("#315e57",faceX-side*6,52,z,9,95,span*.28,"plain",haze);
      cityBox("#24434e",faceX-side*12,50,z,4,73,span*.24,"plain",haze);
      cityBox("#789b9e",faceX-side*15,52,z,2,67,2,"plain",haze);
      cityBox("#bc9c6b",faceX-side*15,21,z,3,9,span*.22,"plain",haze);
      cityBox("#b9b797",faceX-side*16,58,z,2,2,span*.22,"plain",haze);
    }
    if (shop) citySign(shop,side,faceX-side*17,111,near+span*.03,far-span*.03,side<0?"#934b3b":"#35634e");
    for (let stripe=0;stripe<12;stripe++)
      cityBox(stripe%2 ? "#d8cfb2" : side<0?"#ad5942":"#3f7662",faceX-side*25,92,near+(stripe+.5)*span/12,42,11,span/12,"plain",haze);
    if (index < 2 || index === 3) for (let n=0;n<4;n++)
      cityBall("#e5c58b",faceX-side*34,78,near+span*(.12+n*.25),2.6,3.4,2.6);
    if (index===1 || index===3) {
      const x=faceX+side*w*.45,z=near+span*.3,p=perspective.project(x,h+40,z);
      const tank=model.group(root,p.x-width/2,height/2-p.y,p.z);tank.scale.setScalar(p.scale);
      model.part(tank,"tube","#9c7755",0,14,0,24,40,24);
      model.part(tank,"cone","#536d78",0,41,0,29,16,29);
      for(const leg of [-1,1])model.rod(tank,[leg*18,-7,0],[leg*24,-39,0],2.5,"#3c535c");
    }
  }
  // Screen-space perspective is restricted to scenery; food and catch coordinates stay exact.
  function streetSurface() {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * 2); canvas.height = Math.ceil((height - horizon) * 2);
    const pen = canvas.getContext("2d");
    pen.scale(2, 2); pen.translate(0, -horizon);
    const gradient = pen.createLinearGradient(0, horizon, 0, height);
    gradient.addColorStop(0, "#7f9295"); gradient.addColorStop(.38, "#637276"); gradient.addColorStop(1, "#424f58");
    pen.fillStyle = gradient; pen.fillRect(0, horizon, width, height - horizon);
    let seed = 7391;
    function noise() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    // Grain grows toward the camera, while the center stays quiet around the hero.
    for (let i = 0; i < 24000; i++) {
      const y = horizon + noise() * (height - horizon), d = (y - horizon) / (height - horizon);
      pen.fillStyle = i % 3 ? "#e2d6b11b" : "#16283029";
      pen.fillRect(noise() * width, y, .35 + d * noise() * 1.3, .25 + d * .65);
    }
    const line = (points, color, thickness) => {
      pen.strokeStyle = color; pen.lineWidth = thickness; pen.lineJoin = "round";
      pen.beginPath(); points.forEach(([x, y], i) => i ? pen.lineTo(x, y) : pen.moveTo(x, y)); pen.stroke();
    };
    for (const side of [-1, 1]) {
      const near = streetX(side, height), far = streetX(side, horizon);
      pen.fillStyle = "#a9aaa0";
      pen.beginPath(); pen.moveTo(side < 0 ? 0 : width, horizon); pen.lineTo(far, horizon);
      pen.lineTo(near, height); pen.lineTo(side < 0 ? 0 : width, height); pen.closePath(); pen.fill();
      line([[far, horizon], [near, height]], "#d9ccb2", 4);
      line([[far - side * 3, horizon], [near - side * 3, height]], "#273b4055", 3);
      for (let i = 0; i < 10; i++) {
        const y = horizon + (height - horizon) * (i / 10) ** 1.8;
        line([[side < 0 ? 0 : width, y], [streetX(side, y), y + 2]], "#6d787870", 1);
      }
    }
    const shade = pen.createLinearGradient(0, base, width * .64, height);
    shade.addColorStop(0, "#243c4d32"); shade.addColorStop(1, "#243c4d00");
    pen.fillStyle = shade; pen.beginPath(); pen.moveTo(0, base); pen.lineTo(width * .18, base);
    pen.lineTo(width * .53, height); pen.lineTo(0, height); pen.closePath(); pen.fill();
    const roadMark = (x,depth,w,length,color) => {
      pen.fillStyle=color;pen.beginPath();
      [[x-w/2,depth],[x+w/2,depth],[x+w/2,depth+length],[x-w/2,depth+length]].forEach(([xx,zz],i)=>{
        const p=perspective.project(xx,0,zz);i?pen.lineTo(p.x,p.y):pen.moveTo(p.x,p.y);
      });pen.closePath();pen.fill();
    };
    // Lane markings and the crossing use exactly the facade/curb projection.
    for(let i=0;i<9;i++) roadMark(0,width*(1.04+i*.66),5,width*.21,"#dac1858a");
    for (let i = -4; i <= 4; i++) {
      roadMark(i*width*.09,width*1.48,width*.046,width*.25,"#d9d4baab");
    }
    // Low-contrast repairs retain the grain and leave the hero's center readable.
    for(const [cx,cy,sx,sy] of [[width*.27,height-94,38,21],[width*.71,walk+36,32,16],[width*.41,walk-69,24,12]]) {
      const points=[[-.5,-.4],[.37,-.5],[.51,-.23],[.45,.48],[-.39,.41],[-.53,.08]].map(([x,y])=>[cx+x*sx,cy+y*sy]);
      pen.fillStyle="#283e4538";pen.beginPath();points.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();pen.fill();
      line([...points,points[0]],"#263c4542",1.2);line(points.slice(3),"#b4bba527",.8);
    }
    // Soft contact shadows under street furniture, projected onto the pavement.
    for(const side of [-1,1]) for(let i=0;i<4;i++) {
      const p=perspective.project(side*(roadHalf+width*.045),0,width*(.70+i*.61+(side>0?-.13:.12)));
      pen.save();pen.translate(p.x+3*p.scale,p.y+1);pen.scale(19*p.scale,4*p.scale);
      const shadow=pen.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,"#263c446b");shadow.addColorStop(1,"#263c4400");
      pen.fillStyle=shadow;pen.fillRect(-1,-1,2,2);pen.restore();
    }
    // A few branched cracks, concentrated near gutters and the lower player area.
    for (const [startX, startY, length] of [[width * .12, height - 38, 49], [width * .76, height - 67, 60], [width * .32, height - 12, 54], [width * .90, walk + 12, 37], [width * .16, walk - 13, 32]]) {
      const points = [[startX, startY]];
      let px = startX, py = startY;
      for (let n = 0; n < 6; n++) { px += (noise() - .48) * 19; py -= length / 6; points.push([px, py]); }
      line(points.map(([x, y]) => [x + .7, y + .7]), "#bac0ab40", 1.5);
      line(points, "#25333abc", .85);
      line([points[2], [points[2][0] + 12, points[2][1] - 3], [points[2][0] + 18, points[2][1] - 13]], "#27383b88", .55);
    }
    // Shallow puddles and restrained warm leaves frame the playable center.
    pen.fillStyle = "#35535e"; pen.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = i / 32 * Math.PI * 2, r = 1 + Math.sin(a * 5) * .13 + Math.cos(a * 9) * .07;
      const x = width * .15 + Math.cos(a) * 29 * r, y = height - 35 + Math.sin(a) * 7 * r;
      i ? pen.lineTo(x, y) : pen.moveTo(x, y);
    }
    pen.closePath(); pen.fill();
    line([[width * .09, height - 36], [width * .18, height - 39]], "#a9c7c88c", 1.5);
    line([[width * .11, height - 32], [width * .21, height - 35]], "#d4d8bb66", 1);
    for (let i = 0; i < 25; i++) {
      const side = i % 2 ? 1 : -1, y = walk - 20 + noise() * (height - walk + 20);
      const px = Math.max(8, Math.min(width - 8, streetX(side, y) - side * (5 + noise() * 30)));
      pen.save(); pen.translate(px, y); pen.rotate(noise() * 6); pen.scale(.75, .65);
      pen.fillStyle = ["#bd8d51", "#aa6940", "#c99b62"][i % 3];
      pen.beginPath(); pen.moveTo(-4, 0); pen.lineTo(-2, -2); pen.lineTo(-3, -4); pen.lineTo(1, -3); pen.lineTo(4, -5); pen.lineTo(4, 0); pen.lineTo(6, 2); pen.lineTo(1, 3); pen.closePath(); pen.fill();
      pen.restore();
    }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
    const material = new T.MeshStandardMaterial({ map: texture, roughness: .94 }); disposableMaterials.push(material);
    const surface = new T.Mesh(new T.PlaneGeometry(width, height - horizon), material);
    surface.position.set(0, height / 2 - (height + horizon) / 2, -1250); root.add(surface);
  }
  streetSurface();
  // An elliptical iron cover anchors the steam to the street surface.
  const drainX = width * .83, drainY = height - 62;
  const drain = model.group(root, drainX - width / 2, height / 2 - drainY, -66);
  model.part(drain, "ball", "#26353c", 0, -2, 0, 34, 11, 1);
  model.part(drain, "ring", "#7c827b", 0, 0, 1, 27, 7.7, 2.5);
  model.part(drain, "ball", "#38474c", 0, 0, 1, 27, 7.3, 1);
  for (let i = -3; i <= 3; i++) model.part(drain, "box", "#7b827b", i * 6, 0, 3, 1.1, 11 - Math.abs(i), 1);
  for (const row of [-1, 1]) model.part(drain, "box", "#777f79", 0, row * 3, 3, 44, .9, 1);
  // Street furniture is anchored to the same world-space curb and depth scale.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const depth = width * (.70 + i * .61 + (side > 0 ? -.13 : .12));
    const x = side * (roadHalf + width * .045), h = height * .285;
    cityBox("#405760", x, h / 2, depth, 3.6, h, 3.6);
    cityBox("#405760", x, 5, depth, 11, 10, 11);
    cityRod("#405760", [x,h-3,depth], [x-side*26,h+13,depth], 3);
    cityRod("#405760", [x-side*26,h+13,depth], [x-side*40,h+4,depth], 2.5);
    cityBall("#e3cda0",x-side*40,h-6,depth,6,10,6);
    cityBox("#4e6469",x-side*40,h+3,depth,17,5,14);
    cityBox("#4e6469",x-side*40,h-16,depth,12,3,11);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const depth = width * (.95 + i * .66 + (side < 0 ? .09 : .3));
    const x = side * (roadHalf + width * .075), h = height * .16;
    cityBox("#76634b",x,h*.4,depth,5,h*.8,5);
    for (let n=0;n<6;n++) cityBall(["#70875e","#819460","#567969"][n%3],x+Math.sin(n*2.4)*22,h+Math.cos(n*2.4)*23,depth+(n%2)*14,25,32,23);
    cityBox("#6e7264",x,6,depth,38,12,38);
  }
  for (const side of [-1, 1]) {
    const depth = width * (side < 0 ? 1.55 : 1.14), x = side * (roadHalf + width * .012), h = height * .21;
    cityBox("#596b69",x,h/2,depth,3,h,3);
    cityRod("#596b69",[x,h,depth],[x-side*38,h,depth],2.4);
    cityBox("#ab9254",x-side*38,h-23,depth,16,45,12);
    for (let i=0;i<3;i++) cityBall(["#a96046","#c2a657","#7c9c7b"][i],x-side*38,h-10-i*13,depth-7,4.7,4.7,1.3);
  }
  const streetSign = perspective.project(roadHalf + width * .025, height * .21, width * .73);
  sign("CANAL ST",streetSign.x,streetSign.y,78*streetSign.scale,20*streetSign.scale,"#356d57","#f2edd8",streetSign.z+5);
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
  // One folded newspaper, with a very short occasional flutter beside the gutter.
  const newsCanvas = document.createElement("canvas"); newsCanvas.width = 256; newsCanvas.height = 160;
  const newsPen = newsCanvas.getContext("2d");
  newsPen.fillStyle = "#e0d9bf"; newsPen.fillRect(0, 0, 256, 160);
  newsPen.fillStyle = "#414b4c"; newsPen.font = "bold 26px Georgia"; newsPen.fillText("MANHATTAN", 16, 33);
  newsPen.fillRect(17, 44, 222, 2); newsPen.fillStyle = "#83928c"; newsPen.fillRect(18, 57, 84, 67);
  newsPen.fillStyle = "#667371";
  for (let row = 0; row < 10; row++) newsPen.fillRect(row < 6 ? 113 : 18, 60 + row * 8, row < 6 ? 124 : 221, 2);
  const newsTexture = new T.CanvasTexture(newsCanvas); newsTexture.colorSpace = T.SRGBColorSpace; textures.push(newsTexture);
  const newsMaterial = new T.MeshStandardMaterial({ map: newsTexture, roughness: 1, side: T.DoubleSide }); disposableMaterials.push(newsMaterial);
  const paper = model.group(root, width * .87 - width / 2, height / 2 - height + 27, -44);
  const newsGeometry = new T.PlaneGeometry(48, 30, 8, 1);
  const positions = newsGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.abs(positions.getX(i)) * .14 + Math.sin(positions.getX(i) / 8) * 1.2);
  newsGeometry.computeVertexNormals(); paper.add(new T.Mesh(newsGeometry, newsMaterial)); papers.push(paper);
  for (const [finish, batch] of cityBatches) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute("normal",new T.Float32BufferAttribute(batch.normals,3));
    geometry.setAttribute("color",new T.Float32BufferAttribute(batch.colors,3));
    geometry.setAttribute("uv",new T.Float32BufferAttribute(batch.uvs,2));
    const mat = new T.MeshStandardMaterial({vertexColors:true,roughness:.91});
    if(finish==="brick") {
      const canvas=document.createElement("canvas");canvas.width=128;canvas.height=64;
      const pen=canvas.getContext("2d");pen.fillStyle="#f0eadf";pen.fillRect(0,0,128,64);
      pen.strokeStyle="#8b837459";pen.lineWidth=1.2;
      for(let row=0;row<4;row++)for(let col=-1;col<3;col++) {
        const x=col*64+(row%2)*32,y=row*16;
        pen.fillStyle=(row+col)%3?"#ffffff14":"#554f3d12";pen.fillRect(x+1,y+1,62,14);
        pen.strokeRect(x,y,64,16);
      }
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      texture.wrapS=texture.wrapT=T.RepeatWrapping;textures.push(texture);mat.map=texture;
    }
    disposableMaterials.push(mat);const mesh=new T.Mesh(geometry,mat);mesh.name="city-"+finish;root.add(mesh);
  }
  const actors = createStreetActors(model, root, width, height, base, perspective);
  for (let i = 0; i < 3; i++) {
    const cloud = model.group(root, 0, height / 2 - 98 - i * 34, -1100);
    for (let n = 0; n < 4; n++) model.part(cloud, "ball", "#f6faf9", (n - 1.5) * 17, n % 2 ? 6 : 0, 0, 18, n % 2 ? 15 : 11, 9);
    clouds.push(cloud);
  }
  for (let i = 0; i < 3; i++) {
    const bird = model.birdModel(); bird.scale.setScalar(0.30); root.add(bird); birds.push(bird);
  }
  const vaporCanvas = document.createElement("canvas"); vaporCanvas.width = vaporCanvas.height = 64;
  const vaporPen = vaporCanvas.getContext("2d"), vaporGradient = vaporPen.createRadialGradient(32, 32, 0, 32, 32, 32);
  vaporGradient.addColorStop(0, "#ffffff99"); vaporGradient.addColorStop(.5, "#ffffff55"); vaporGradient.addColorStop(1, "#ffffff00");
  vaporPen.fillStyle = vaporGradient; vaporPen.fillRect(0, 0, 64, 64);
  const vaporTexture = new T.CanvasTexture(vaporCanvas); textures.push(vaporTexture);
  for (let i = 0; i < 7; i++) {
    const puff = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: "#e8e8d8", map: vaporTexture, transparent: true, opacity: 0.10, depthWrite: false }));
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
      const life = (time * 0.15 + i / 7) % 1;
      puff.position.set(drainX - width / 2 + Math.sin(life * 5 + i * .3) * (3 + life * 13), height / 2 - drainY + 4 + life * 83, -54 + i * .01);
      puff.scale.set(18 + life * 34, 18 + life * 39, 1);
      puff.material.opacity = Math.sin(life * Math.PI) * .27;
      puff.rotation.z = Math.sin(life * 4 + i) * .3;
    });
    papers.forEach((paper) => {
      const cycle = time % 19, flutter = cycle > 14 ? Math.sin((cycle - 14) / 5 * Math.PI) ** 2 : 0;
      paper.position.y = height / 2 - height + 27 + flutter * 22;
      paper.position.x = width * .87 - width / 2 - flutter * 8;
      paper.rotation.set(-.62 + flutter * .3, Math.sin(time * 3) * flutter * .18, -.22 + Math.sin(time * 4) * flutter * .14);
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
