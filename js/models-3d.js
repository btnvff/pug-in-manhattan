// Procedural, original 3D artwork. All dimensions below are visual, in scene pixels.
// Shared geometries/materials keep allocations independent of the number of drops.
function createModelFactory() {
  const T = window.THREE;
  const materials = new Map();
  const geometries = {
    ball: new T.SphereGeometry(1, 16, 12),
    box: new T.BoxGeometry(1, 1, 1),
    tube: new T.CylinderGeometry(1, 1, 1, 12),
    cone: new T.ConeGeometry(1, 1, 12),
    ring: new T.TorusGeometry(1, 0.25, 8, 24),
    capsule: new T.CapsuleGeometry(1, 2, 6, 12),
  };
  // Shared curved casing: the end knots, scores and skin use one local axis.
  const sausageCurve = new T.CatmullRomCurve3([new T.Vector3(0, -23, 0), new T.Vector3(-2.5, -12, 0), new T.Vector3(-3.2, 0, 0), new T.Vector3(-2, 12, 0), new T.Vector3(0, 23, 0)]);
  geometries.sausage = new T.TubeGeometry(sausageCurve, 32, 8.3, 16, false);
  const casing = geometries.sausage.attributes.position;
  for (let row = 0; row <= 32; row++) {
    const u = row / 32, center = sausageCurve.getPointAt(u);
    const end = Math.min(u, 1 - u) / .19;
    const radius = .18 + .82 * Math.sin(Math.min(1, end) * Math.PI / 2);
    for (let col = 0; col <= 16; col++) {
      const index = row * 17 + col;
      casing.setXYZ(index, center.x + (casing.getX(index) - center.x) * radius,
        center.y + (casing.getY(index) - center.y) * radius, casing.getZ(index) * radius);
    }
  }
  geometries.sausage.computeVertexNormals();
  const tailCurve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(-9, 5, 0), new T.Vector3(-11, 17, 1), new T.Vector3(-7, 24, 2), new T.Vector3(-2, 22, 2)]);
  geometries.catTail = new T.TubeGeometry(tailCurve, 24, 2.4, 8, false);
  function material(color, transparent = false) {
    const key = color + (transparent ? ":glass" : "");
    if (!materials.has(key))
      materials.set(key, new T.MeshStandardMaterial({
        color, roughness: 0.78, metalness: 0,
        transparent, opacity: transparent ? 0.18 : 1,
        depthWrite: !transparent,
      }));
    return materials.get(key);
  }
  function part(parent, shape, color, x, y, z, sx, sy, sz) {
    const mesh = new T.Mesh(geometries[shape], material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  function group(parent, x = 0, y = 0, z = 0) {
    const g = new T.Group();
    g.position.set(x, y, z);
    if (parent) parent.add(g);
    return g;
  }
  function rod(parent, a, b, radius, color) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const mesh = part(parent, "tube", color, 0, 0, 0, radius, start.distanceTo(end), radius);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
    return mesh;
  }
  function pugModel() {
    return createPugModel();
  }
  function foodModel(type, variant = 0) {
    const root = group();
    const warm = ["#d97443", "#c3613a", "#df8750", "#ca7042", "#ba623e", "#d88750", "#bd5939", "#d07945"];
    if (type === 0) {
      const casingRoot = group(root); casingRoot.rotation.z = .55;
      part(casingRoot, "sausage", warm[variant % 8], 0, 0, 0, 1, 1, 1);
      material(warm[variant % 8]).roughness = .48;
      for (const side of [-1, 1]) {
        part(casingRoot, "ball", "#b65b38", 0, side * 23.5, 0, 2.2, 2, 2.2);
        const end = part(casingRoot, "cone", warm[variant % 8], 0, side * 27, 0, 3.3, 5, 2.4);
        end.rotation.z = side > 0 ? Math.PI : 0;
      }
      for (let i = -1; i <= 1; i++) {
        const mark = part(casingRoot, "capsule", "#944528", -2.5, i * 10, 8.2, .8, 2.1, .32);
        mark.rotation.z = -1.05;
        const edge = part(casingRoot, "capsule", "#edac69", -3.3, i * 10 + 1, 8.25, .4, 1.7, .25);
        edge.rotation.z = -1.05;
      }
      part(casingRoot, "ball", "#edb16e", -6.2, 4, 5.9, 1, 9, .35);
    } else if (type === 1) {
      part(root, "ball", "#c89148", 0, 0, 0, 22, 22, 6);
      part(root, "ball", "#e3b26a", 0, 1, 2, 20.5, 20.5, 4.5);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, r = 6 + (i % 3) * 6;
        const chip = part(root, "ball", "#634030", Math.cos(a) * r, Math.sin(a) * r, 6, 2.5, 2.3, 1.2);
        chip.rotation.z = a;
      }
    } else if (type === 2) {
      rod(root, [0, -25, 0], [0, 4, 0], 5, "#f5e9cb");
      for (const side of [-1, 1]) part(root, "ball", "#fff1d6", side * 4, -24, 0, 7, 6, 6);
      part(root, "ball", "#c5823b", 0, 9, 1, 19, 23, 15);
      part(root, "ball", "#e8ab57", -5, 15, 11, 9, 12, 4);
      root.rotation.z = -0.35;
    } else if (type === 3) {
      part(root, "ring", "#ce954e", 0, 0, 0, 18, 18, 21);
      part(root, "ring", "#ef70a1", 0, 1, 4, 18, 18, 12);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        const sprinkle = part(root, "capsule", ["#fff2b2", "#65bac0", "#df4867"][i % 3], Math.cos(a) * 18, Math.sin(a) * 18, 8, 1, 2, 1);
        sprinkle.rotation.z = a * 2;
      }
    } else if (type === 4 || type === 6) {
      part(root, "cone", type === 4 ? "#6c9470" : "#9aa77b", 0, -10, 0, 7, 34, 7);
      for (let i = 0; i < 8; i++) {
        const a = i * 2.4;
        const leaf = part(root, "ball", type === 4 ? ["#327866", "#508d72", "#62957b"][i % 3] : ["#dce0c6", "#c9ceb9", "#e7e6cf"][i % 3], Math.cos(a) * 13, 9 + Math.sin(a) * 10, (i % 2) * 7, 12, 11, 12);
        leaf.rotation.y = a;
      }
    } else if (type === 5) {
      const carrot = part(root, "cone", "#e38a38", 0, -1, 0, 12, 43, 11);
      carrot.rotation.z = Math.PI;
      for (let i = -1; i <= 1; i++) {
        const leaf = part(root, "ball", "#54846d", i * 7, 23, 0, 4, 12, 3);
        leaf.rotation.z = -i * 0.5;
      }
      for (let i = 0; i < 3; i++) rod(root, [-4 + i, 12 - i * 10, 8 - i * 2.2], [4 - i, 11 - i * 10, 8 - i * 2.2], .55, "#ba652e");
    } else if (type === 7) {
      const bone = part(root, "capsule", "#fff0ca", 0, 0, 0, 6, 13, 6);
      bone.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) for (const up of [-1, 1])
        part(root, "ball", "#fff0ca", side * 20, up * 6, 0, 9, 8, 7);
    } else if (type === 8) {
      part(root, "box", "#795354", 0, 0, 0, 46, 25, 19);
      for (const side of [-1, 1]) {
        const hole = part(root, "tube", "#392f35", side * 12, 12.6, 0, 5, 0.5, 5);
        hole.scale.z = 6;
      }
      rod(root, [-7, 11, 10], [-2, -2, 10], 1, "#493d40");
      rod(root, [-2, -2, 10], [-8, -12, 10], 1, "#493d40");
    }
    return root;
  }
  function catModel(coat = 0) {
    const root = group(), color = ["#c8935e", "#81949b", "#d4c8ac"][coat % 3];
    const light = ["#ecd0a0", "#c1cbd0", "#f0e4c8"][coat % 3];
    const stripe = ["#9c6746", "#596e79", "#b2a487"][coat % 3];
    const spine = group(root, 0, 17, 0);
    part(spine, "ball", color, -1, 0, 0, 24, 12, 11);
    part(spine, "ball", color, 14, 4, 0, 10, 14, 10);
    part(spine, "ball", light, 18, 2, 7, 5, 10, 4);
    const legs = [], ankles = [];
    for (let i = 0; i < 4; i++) {
      const limb = group(root, i < 2 ? -15 : 15, 15, i % 2 ? 6 : -6);
      part(limb, "ball", color, 0, -3, 0, i < 2 ? 5 : 3.7, 8, 4);
      const ankle = group(limb, 0, -8, 0);
      part(ankle, "ball", color, 0, -2, 0, 2.6, 5, 3);
      part(ankle, "ball", light, 2, -5, 1, 4.6, 2, 3.4);
      legs.push(limb); ankles.push(ankle);
    }
    const head = group(root, 18, 29, 2);
    part(head, "ball", color, 0, 0, 0, 12, 11, 10);
    for (const side of [-1, 1]) {
      const ear = part(head, "cone", color, side * 7.5, 10, 0, 5.5, 12, 4);
      ear.rotation.z = -side * .16;
      const inner = part(head, "cone", "#c99788", side * 7.5, 10, 3, 3, 7, 1);
      inner.rotation.z = -side * .16;
      part(head, "ball", "#b6c88e", side * 4.8, 1, 9, 2.6, 3.2, 1.2);
      part(head, "ball", "#253b39", side * 4.8, 1.2, 10, .9, 2.3, .55);
      part(head, "ball", "#f4eccf", side * 4.8 - .6, 2.2, 10.5, .6, .65, .25);
      part(head, "ball", light, side * 3.5, -5, 9.1, 4.5, 3.4, 2.5);
      for (let n = 0; n < 2; n++) rod(head, [side * 6, -4 - n * 2, 10], [side * 14, -3 - n * 4, 8], .23, "#ddd3b6");
    }
    part(head, "ball", "#875a56", 0, -3.6, 12, 1.9, 1.3, .8);
    for (const side of [-1, 1]) {
      const mark = part(head, "ball", stripe, side * 3.3, 7, 8, .9, 2.4, .4); mark.rotation.z = side * .3;
    }
    for (let i = 0; i < 3; i++) {
      const mark = part(spine, "ball", stripe, -12 + i * 8, 5, 9.2, 1.5, 4.8, .8); mark.rotation.z = -.18;
    }
    const tail = group(spine, -21, 1, -2);
    part(tail, "catTail", color, 0, 0, 0, 1, 1, 1);
    part(tail, "ball", stripe, -2, 22, 2, 2.5, 2.5, 2.5);
    const mouthAnchor = group(head, 7, -5, 12);
    root.userData = { legs, ankles, spine, head, tail, mouthAnchor };
    return root;
  }
  function birdModel() {
    const root = group();
    part(root, "ball", "#9b8260", 0, 0, 0, 12, 8, 8);
    part(root, "ball", "#705740", 9, 7, 2, 7, 7, 6);
    part(root, "ball", "#e5d3ad", 11, 4, 5, 4, 4, 3);
    part(root, "ball", "#202a2b", 12, 9, 6, 1.5, 1.5, 1);
    const beak = part(root, "cone", "#d3a35a", 18, 6, 2, 3, 8, 3);
    beak.rotation.z = -Math.PI / 2;
    const wings = [];
    for (const side of [-1, 1]) {
      const wing = group(root, side * 4, 1, 0);
      const shape = part(wing, "ball", "#76654f", side * 7, 3, -1, 13, 4, 5);
      shape.rotation.z = side * 0.35;
      wings.push(wing);
    }
    root.userData.wings = wings;
    return root;
  }
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of Object.values(geometries)) geometry.dispose();
    for (const surface of materials.values()) surface.dispose();
    materials.clear();
  }
  return { part, group, rod, material, geometries, pugModel, foodModel, catModel, birdModel, dispose };
}
