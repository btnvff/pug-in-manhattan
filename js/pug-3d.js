// Original hero artwork. Dimensions are scene pixels, never collision dimensions.
// A dedicated rig keeps character materials and detail out of the shared city/drop factory.
function createPugModel() {
  const T = window.THREE;
  const resources = new Set();
  const keep = (resource) => { resources.add(resource); return resource; };
  const root = new T.Group();
  root.name = "pug-hero";
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  function group(parent, name, x = 0, y = 0, z = 0) {
    const node = new T.Group();
    node.name = name; node.position.set(x, y, z); parent.add(node);
    return node;
  }
  function material(color, roughness = 0.88, vertexColors = false) {
    return keep(new T.MeshStandardMaterial({ color, roughness, metalness: 0, vertexColors }));
  }
  const fur = material("#dcb084");
  const chinMaterial = material("#554039");
  const muzzleMaterial = material("#634a3c");
  const foldMaterial = material("#b4875f");
  const earMaterial = material("#ffffff", 0.96, true);
  const lipMaterial = material("#261d1f");
  const eyeMaterial = material("#51453a", 0.25);
  const irisMaterial = material("#75492b", 0.23);
  const pupilMaterial = material("#121a23", 0.17);
  const noseMaterial = material("#29262a", 0.34);
  const glintMaterial = keep(new T.MeshBasicMaterial({ color: "#fff3df", toneMapped: false }));
  const softGlintMaterial = material("#aa9187", 0.45);
  const scarfMaterial = material("#d6443e", 0.96);
  const tongueMaterial = material("#ef939b", 0.56);
  const ball = keep(new T.SphereGeometry(1, 24, 18));
  function mesh(parent, name, geometry, surface, x, y, z, sx = 1, sy = 1, sz = 1) {
    const node = new T.Mesh(geometry, surface);
    node.name = name; node.position.set(x, y, z); node.scale.set(sx, sy, sz);
    parent.add(node); return node;
  }
  function oval(parent, name, surface, x, y, z, sx, sy, sz) {
    return mesh(parent, name, ball, surface, x, y, z, sx, sy, sz);
  }
  // Softly squared forms, with continuous coat/mask coloration instead of stacked face plates.
  function coatGeometry(kind) {
    const geometry = keep(new T.SphereGeometry(1, 48, 32));
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const light = new T.Color("#f0c899"), shade = new T.Color("#c28e5e");
    const mask = new T.Color("#554137"), color = new T.Color();
    for (let i = 0; i < position.count; i++) {
      let px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
      if (kind === "head") {
        const round = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.98);
        px = round(px); py = round(py); pz = round(pz);
        // Broad cheeks, but no separate hanging jowls.
        px *= 1 + 0.035 * Math.exp(-(((py + 0.32) / 0.42) ** 2));
      } else {
        // Pear-shaped torso with a broad chest and integrated rounded hips.
        px *= 0.93 - py * 0.08 + .08 * Math.exp(-(((py + .48) / .32) ** 2));
        pz *= 0.98 - py * 0.035;
      }
      position.setXYZ(i, px, py, pz);
      color.copy(shade).lerp(light, 0.40 + 0.42 * smooth(-1, 1, py) + 0.16 * Math.max(0, pz));
      if (kind === "head") {
        const x = px * 41, y = py * 31 + 3;
        const muzzle = 1 - smooth(0.38, 1.40, (x / 29) ** 2 + ((y + 7) / 20) ** 2);
        const eyePatch = 1 - smooth(0.48, 1.25, ((Math.abs(x) - 18.5) / 13) ** 2 + ((y - 6) / 14) ** 2);
        color.lerp(mask, (1 - (1 - muzzle) * (1 - eyePatch * 0.90)) * smooth(0.20, 0.65, pz));
      } else {
        const bib = (1 - smooth(0.3, 0.9, Math.abs(px))) * smooth(0.3, 0.8, pz);
        color.lerp(light, bib * 0.3);
      }
      colors.set([color.r, color.g, color.b], i * 3);
    }
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    // Average the duplicated UV seam and poles after deforming the sphere.
    const normals = geometry.attributes.normal;
    for (let row = 0; row <= 32; row++) {
      const a = row * 49, b = a + 48;
      const normal = new T.Vector3().fromBufferAttribute(normals, a)
        .add(new T.Vector3().fromBufferAttribute(normals, b)).normalize();
      normals.setXYZ(a, normal.x, normal.y, normal.z);
      normals.setXYZ(b, normal.x, normal.y, normal.z);
    }
    for (const row of [0, 32]) for (let col = 0; col <= 48; col++)
      normals.setXYZ(row * 49 + col, 0, row === 0 ? 1 : -1, 0);
    return geometry;
  }
  function stroke(parent, name, points, radius, surface, taper = false) {
    const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    const geometry = keep(new T.TubeGeometry(curve, 36, radius, 12, false));
    if (taper) {
      const position = geometry.attributes.position;
      for (let i = 0; i <= 36; i++) {
        const center = curve.getPointAt(i / 36);
        const width = 1 - (i / 36) * 0.72;
        for (let j = 0; j <= 12; j++) {
          const index = i * 13 + j;
          position.setXYZ(index,
            center.x + (position.getX(index) - center.x) * width,
            center.y + (position.getY(index) - center.y) * width,
            center.z + (position.getZ(index) - center.z) * width);
        }
      }
      geometry.computeVertexNormals();
    }
    return mesh(parent, name, geometry, surface, 0, 0, 0);
  }
  function softShape(shape, depth, bevel) {
    return keep(new T.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelSegments: 4,
      bevelSize: bevel, bevelThickness: bevel, curveSegments: 12,
    }));
  }
  // Smooth-union skin for chest, shoulders and hips. A single indexed surface
  // avoids the intersecting ellipsoid seams of the original torso assembly.
  function bodyGeometry() {
    const volumes = [[0, 40, -1, 29, 34, 24], [0, 63, 3, 27, 18, 23], [-22, 19, -5, 13, 18, 16], [22, 19, -5, 13, 18, 16]];
    function field(x, y, z) {
      let d = 1000;
      for (const [cx, cy, cz, rx, ry, rz] of volumes) {
        const e = (Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz) - 1) * Math.min(rx, ry, rz);
        const blend = Math.max(0, 1 - Math.abs(d - e) / 5);
        d = Math.min(d, e) - blend * blend * 1.25;
      }
      return d;
    }
    const vertices = [], normals = [], colors = [], indices = [], lookup = new Map();
    const light = new T.Color("#eac398"), shade = new T.Color("#bf8c5f"), color = new T.Color();
    function vertex(point) {
      const [x, y, z] = point, key = point.map((v) => v.toFixed(4)).join(",");
      if (lookup.has(key)) return lookup.get(key);
      const index = vertices.length / 3; lookup.set(key, index);
      vertices.push(x / 33, (y - 40) / 35, (z + 1) / 26);
      const normal = new T.Vector3((field(x + .05, y, z) - field(x - .05, y, z)) * 33,
        (field(x, y + .05, z) - field(x, y - .05, z)) * 35, (field(x, y, z + .05) - field(x, y, z - .05)) * 26).normalize();
      normals.push(normal.x, normal.y, normal.z);
      color.copy(shade).lerp(light, .35 + smooth(5, 72, y) * .35 + smooth(-8, 23, z) * .2);
      color.multiplyScalar(1-smooth(57,77,y)*smooth(10,26,z)*.16);
      colors.push(color.r, color.g, color.b); return index;
    }
    const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
    const corners = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    function triangle(a, b, c) {
      const ab = new T.Vector3(...b).sub(new T.Vector3(...a)), ac = new T.Vector3(...c).sub(new T.Vector3(...a));
      const n = ab.cross(ac), center = a.map((v, i) => (v + b[i] + c[i]) / 3);
      if(n.lengthSq()<1e-24)return;
      const outward = field(center[0] + n.x * .001, center[1] + n.y * .001, center[2] + n.z * .001) > field(...center);
      const face=[vertex(a),vertex(outward?b:c),vertex(outward?c:b)];
      if(new Set(face).size===3)indices.push(...face);
    }
    for (let x = -39; x < 39; x += 3) for (let y = -3; y < 87; y += 3) for (let z = -30; z < 33; z += 3) {
      const points = corners.map(([dx, dy, dz]) => [x + dx * 3, y + dy * 3, z + dz * 3]);
      const values = points.map((p) => field(...p));
      if (values.every((d) => d >= 0) || values.every((d) => d < 0)) continue;
      const edge = (a, b) => points[a].map((v, i) => v + (points[b][i] - v) * values[a] / (values[a] - values[b]));
      for (const tet of tetrahedra) {
        const inside = tet.filter((i) => values[i] < 0), outside = tet.filter((i) => values[i] >= 0);
        if (inside.length === 1) triangle(...outside.map((i) => edge(inside[0], i)));
        if (inside.length === 3) triangle(...inside.map((i) => edge(outside[0], i)));
        if (inside.length === 2) {
          const a = edge(inside[0], outside[0]), b = edge(inside[0], outside[1]), c = edge(inside[1], outside[0]), d = edge(inside[1], outside[1]);
          triangle(a, b, c); triangle(b, d, c);
        }
      }
    }
    const geometry = keep(new T.BufferGeometry());
    geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices);
    return geometry;
  }
  const body = group(root, "body");
  const torso = mesh(body, "continuous-coat", bodyGeometry(), material("#ffffff", 0.94, true), 0, 40, -1, 33, 35, 26);
  const hindPaws = [], paws = [], ears = [], eyes = [], lids = [], brows = [], smiles = [];
  for (const side of [-1, 1]) {
    const hind = group(body, "hind-paw", side * 27, 5.3, 8);
    oval(hind, "hind-toes", fur, 0, 0, 0, 10, 5.3, 13);
    hindPaws.push(hind);
    const paw = group(body, "foreleg", side * 16.5, 27, 19);
    // A continuous shoulder-to-ankle profile, buried in the chest at the upper end.
    // The foot overlaps the rounded lower profile; no exposed cylinder or ball joint.
    const legGeometry = keep(new T.SphereGeometry(1, 28, 22));
    const legPosition = legGeometry.attributes.position;
    for (let i = 0; i < legPosition.count; i++) {
      const y = legPosition.getY(i), t = (y + 1) / 2;
      legPosition.setXYZ(i, legPosition.getX(i) * (7.1 + smooth(.38, .9, t) * 4.6),
        -4 + y * 23, legPosition.getZ(i) * (8 + smooth(.4, .95, t) * 4) - smooth(.3, 1, t) * 7);
    }
    legGeometry.computeVertexNormals();
    mesh(paw, "soft-tapered-leg", legGeometry, fur, 0, 0, 0);
    oval(paw, "rounded-paw", fur, 0, -19, 5, 10, 8, 12);
    for (const offset of [-2.7, 2.7])
      oval(paw, "toe-crease", foldMaterial, offset, -21, 16.15, 0.45, 1.5, 0.35);
    paws.push(paw);
  }
  const tail = group(body, "curled-tail", 24, 32, -9);
  stroke(tail, "tapered-curl", [[0, 0, 0], [10, 3, 0], [15, 12, 1], [10, 20, 3], [0, 19, 5], [-3, 12, 7], [3, 9, 8], [7, 13, 8]], 4.4, fur, true);
  oval(tail, "rounded-tail-tip", fur, 7, 13, 8, 1.24, 1.24, 1.24);
  // Shoulders are part of the continuous coat above; only the cloth sits on top.
  const cloth = group(body, "bandana-tip", 0, 68, 28);
  const bib = new T.Shape();
  bib.moveTo(-12, 0); bib.quadraticCurveTo(0, 3, 12, 0);
  bib.quadraticCurveTo(7, -6, 1, -13); bib.quadraticCurveTo(0, -14, -1, -13);
  bib.quadraticCurveTo(-7, -6, -12, 0);
  mesh(cloth, "soft-bandana", softShape(bib, 1, 1), scarfMaterial, 0, 0, 0);
  const badge = material("#f7e6c8");
  oval(cloth, "paw-badge", badge, 0, -6, 2.4, 2.1, 1.8, .3);
  for (const [x, y] of [[-2.4, -3.8], [0, -2.8], [2.4, -3.8]]) oval(cloth, "badge-toe", badge, x, y, 2.4, .8, 1, .25);
  oval(body, "bandana-knot", scarfMaterial, 23, 67, 14, 4.3, 3.6, 4);

  const head = group(body, "head", 0, 92, 6);
  mesh(head, "rounded-head", coatGeometry("head"), material("#ffffff", 0.93, true), 0, 3, 0, 41, 31, 27);
  // The ear is a short folded flap, not an elongated sphere or a pointed cone.
  const earShape = new T.Shape();
  earShape.moveTo(-7, 1);
  earShape.bezierCurveTo(-4, 5, 6, 5, 11, 0);
  earShape.bezierCurveTo(15, -4, 12, -14, 4, -21);
  earShape.bezierCurveTo(2, -23, -2, -17, -4, -12);
  earShape.quadraticCurveTo(-8, -5, -7, 1);
  const earGeometry = softShape(earShape, 1.5, 2.0);
  const earPosition = earGeometry.attributes.position, earNormal = earGeometry.attributes.normal;
  const earColors = new Float32Array(earPosition.count * 3);
  const earTop = new T.Color("#583b31"), earTip = new T.Color("#34272a"), earColor = new T.Color();
  for (let i = 0; i < earPosition.count; i++) {
    const t = Math.max(0, Math.min(1, (earPosition.getY(i) + 23) / 30));
    earPosition.setZ(i, earPosition.getZ(i) + Math.sin(t * Math.PI) * 2.2);
    const normal = new T.Vector3().fromBufferAttribute(earNormal, i);
    normal.y -= Math.cos(t * Math.PI) * 2.2 * Math.PI / 30 * normal.z;
    normal.normalize(); earNormal.setXYZ(i, normal.x, normal.y, normal.z);
    earColor.copy(earTip).lerp(earTop, t);
    earColors.set([earColor.r, earColor.g, earColor.b], i * 3);
  }
  earGeometry.setAttribute("color", new T.BufferAttribute(earColors, 3));
  for (const side of [-1, 1]) {
    const ear = group(head, "button-ear", side * 31, 24, 18);
    ear.scale.setScalar(0.88);
    const flap = mesh(ear, "folded-flap", earGeometry, earMaterial, 0, 0, 0);
    flap.scale.x = side;
    ears.push(ear);
  }
  for (const side of [-1, 1]) {
    const eye = group(head, "eye-opening", side * 18.5, 6, 25);
    eye.scale.set(0.84, 0.84, 1);
    eye.userData.openHeight = 0.84;
    oval(eye, "soft-eye-rim", chinMaterial, 0, 0, 0, 9.35, 10.05, 1.5);
    oval(eye, "inset-eye", eyeMaterial, 0, 0, 1.35, 9.1, 9.8, 2.25);
    const gaze = group(eye, "gaze", 0, -0.25, 3.3);
    oval(gaze, "warm-iris", irisMaterial, 0, .3, .35, 7.15, 7.9, .8);
    oval(gaze, "pupil", pupilMaterial, 0, 0.5, 1, 5.25, 6.1, 0.65);
    oval(gaze, "key-catchlight", glintMaterial, -2.0, 3.5, 1.7, 1.65, 1.85, 0.25);
    oval(gaze, "fill-catchlight", glintMaterial, 2.2, -2.4, 1.65, 0.65, 0.8, 0.15);
    eye.userData.gaze = gaze;
    eyes.push(eye);
    const lid = group(head, "closed-lid", side * 18.5, 6, 29.0);
    lid.scale.set(0.84, 0.84, 1);
    stroke(lid, "lid-arc", [[-7, 0, 0], [-3, -1.2, 0.3], [3, -1.2, 0.3], [7, 0, 0]], 0.7, lipMaterial);
    lid.visible = false; lids.push(lid);
    const brow = group(head, "soft-brow", side * 18, 17.6, 23.3);
    stroke(brow, "brow-fold", [[-6, 0, -0.4], [0, 1.8, 1.4], [6, 0.2, 0]], 0.9, fur);
    brows.push(brow);
  }
  stroke(head, "forehead-fold", [[-12, 26, 18.0], [-6, 27.4, 19.4], [0, 26.5, 20.4], [6, 27.4, 19.4], [12, 26, 18.0]], 0.5, foldMaterial);
  // A single sculpted, blunt muzzle: the two soft pads share one continuous surface.
  const muzzleGeometry = keep(new T.SphereGeometry(1, 40, 24));
  const muzzlePosition = muzzleGeometry.attributes.position;
  for (let i = 0; i < muzzlePosition.count; i++) {
    const x = muzzlePosition.getX(i), y = muzzlePosition.getY(i), z = muzzlePosition.getZ(i);
    const lobe = Math.sin(x * Math.PI) ** 2;
    muzzlePosition.setXYZ(i, x, y * (0.83 + lobe * 0.17), z * (1 + lobe * 0.08));
  }
  muzzleGeometry.computeVertexNormals();
  const muzzle = mesh(head, "continuous-muzzle", muzzleGeometry, muzzleMaterial, 0, -6, 29.2, 20.5, 9.2, 6.4);
  const mouth = oval(head, "small-mouth", lipMaterial, 0, -12.1, 32.8, 8, 2.4, 1.6);
  const jaw = group(head, "jaw", 0, -13.5, 28.5);
  oval(jaw, "soft-chin", chinMaterial, 0, -0.8, 0, 12.5, 4.0, 4.0);
  for (const side of [-1, 1]) {
    const smile = group(head, "mouth-corner", 0, -11, 35.0);
    stroke(smile, "gentle-smile", [[0, -1.2, 0], [side * 3, -1.0, -0.3], [side * 6, -0.2, -0.6], [side * 8, 1, -1.0]], 0.42, lipMaterial);
    smiles.push(smile);
  }
  stroke(head, "philtrum", [[0, -5.0, 35.4], [0, -6.3, 35.5], [0, -7.5, 35.1]], 0.55, lipMaterial);
  const noseGeometry = keep(ball.clone());
  const nosePosition = noseGeometry.attributes.position;
  for (let i = 0; i < nosePosition.count; i++)
    nosePosition.setX(i, nosePosition.getX(i) * (0.9 + nosePosition.getY(i) * 0.1));
  noseGeometry.computeVertexNormals();
  mesh(head, "soft-triangle-nose", noseGeometry, noseMaterial, 0, 0.3, 35.4, 9.6, 5.2, 3.2);
  oval(head, "nose-highlight", softGlintMaterial, -1.5, 2.5, 38.0, 2.0, 0.65, 0.3);
  for(const side of [-1,1])oval(head,"nostril",lipMaterial,side*4.1,-.3,38.3,1.15,.72,.25);
  const tongue = oval(head, "tiny-tongue", tongueMaterial, 1.6, -16, 36, 4.1, 5.2, 1.2);
  tongue.visible = false;
  const mouthAnchor = group(head, "mouth-anchor", 0, -12, 36);

  // One small generated texture serves the contact shadow and two rare breath wisps.
  // No external textures, frame allocations, shadow maps or post-processing passes.
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const distance = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
    const offset = (y * 64 + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = Math.round(255 * Math.max(0, 1 - distance * distance) ** 2);
  }
  const softTexture = keep(new T.DataTexture(pixels, 64, 64, T.RGBAFormat));
  softTexture.minFilter = softTexture.magFilter = T.LinearFilter;
  softTexture.needsUpdate = true;
  const plane = keep(new T.PlaneGeometry(1, 1));
  const shadowMaterial = keep(new T.MeshBasicMaterial({
    color: "#1b303c", map: softTexture, transparent: true, opacity: 0.44,
    depthWrite: false, toneMapped: false,
  }));
  const shadow = mesh(root, "soft-contact-shadow", plane, shadowMaterial, 7, 0, -18, 106, 21, 1);
  const contacts = [];
  for (const side of [-1, 1])
    contacts.push(mesh(root, "paw-contact", plane, keep(shadowMaterial.clone()), side * 16.5, 0.3, -17, 23, 4.8, 1));
  const breath = [];
  for (let i = 0; i < 2; i++) {
    const surface = keep(new T.MeshBasicMaterial({
      color: "#fff2df", map: softTexture, transparent: true, opacity: 0,
      depthWrite: false, toneMapped: false,
    }));
    const puff = mesh(head, "breath-wisp", plane, surface, 0, -12, 40, 1, 1, 1);
    puff.visible = false; breath.push(puff);
  }
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const resource of resources) resource.dispose();
    resources.clear();
  }
  root.userData = {
    body, torso, head, paws, hindPaws, eyes, lids, brows, ears, muzzle, smiles,
    tail, jaw, mouth, tongue, cloth, mouthAnchor, shadow, contacts, breath,
    pose: {}, dispose,
  };
  return root;
}
