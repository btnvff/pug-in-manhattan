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
    const root = group();
    const body = group(root);
    part(body, "ball", "#bd9466", 0, 39, 0, 34, 33, 25);
    part(body, "ball", "#e9c895", 0, 38, 19, 27, 30, 15);
    const tail = group(body, 30, 38, -4);
    const curl = part(tail, "ring", "#cda775", 7, 5, 0, 12, 12, 12);
    curl.rotation.y = -0.3;
    part(tail, "ball", "#e6c593", 12, 4, 4, 5, 5, 5);
    const paws = [];
    for (const side of [-1, 1]) {
      part(body, "ball", "#a8835c", side * 25, 17, -4, 13, 19, 13);
      const leg = group(body, side * 18, 25, 20);
      part(leg, "capsule", "#dfb77c", 0, -7, 0, 8, 10, 8);
      part(leg, "ball", "#edc990", 0, -20, 6, 12, 7, 13);
      for (let i = -1; i <= 1; i++)
        part(leg, "ball", "#987851", i * 4, -22, 16, 1, 1.7, 1.2);
      paws.push(leg);
    }
    part(body, "ball", "#d74640", 0, 64, 6, 30, 9, 24);
    const scarf = part(body, "cone", "#d74640", 28, 53, 8, 10, 25, 4);
    scarf.rotation.z = 2.65;
    const head = group(body, 0, 92, 9);
    part(head, "ball", "#e9c897", 0, 4, 0, 43, 37, 28);
    part(head, "ball", "#f0d3a4", 0, 16, 13, 35, 22, 20);
    for (const side of [-1, 1]) {
      const ear = part(head, "ball", "#403b36", side * 35, 20, 5, 11, 20, 9);
      ear.rotation.z = side * 0.48;
      part(head, "ball", "#51483f", side * 37, 13, 11, 9, 12, 6);
      part(head, "ball", "#c9a579", side * 28, -10, 12, 16, 20, 16);
    }
    part(head, "ball", "#514740", 0, -8, 24, 32, 25, 12);
    const eyes = [];
    for (const side of [-1, 1]) {
      part(head, "ball", "#2c2b28", side * 21, 5, 26, 11, 12, 8);
      const eye = group(head, side * 21, 5, 31);
      part(eye, "ball", "#694b30", 0, 0, 0, 7.5, 8, 4);
      part(eye, "ball", "#111b1b", 0, 0, 3, 5, 6, 2);
      part(eye, "ball", "#fff4d7", -2, 3, 4.9, 1.9, 2, 1);
      eyes.push(eye);
      const brow = part(head, "capsule", "#c5a172", side * 16, 17, 24, 2, 5, 2);
      brow.rotation.z = side * 0.9;
    }
    const jaw = group(head, 0, -22, 22);
    part(jaw, "ball", "#302d2a", 0, -1, 6, 19, 7, 7);
    part(jaw, "ball", "#9b7e60", 0, -5, 3, 19, 6, 7);
    for (const side of [-1, 1]) {
      part(head, "ball", "#8b735b", side * 10, -15, 33, 15, 10, 8);
      for (let i = 0; i < 3; i++)
        part(head, "ball", "#3f3931", side * (8 + (i % 2) * 6), -15 - i * 3, 40, 0.9, 0.9, 0.6);
    }
    part(head, "ball", "#242b28", 0, -7, 40, 11, 7, 5);
    part(head, "ball", "#82887a", -2, -4, 44, 4, 1.5, 0.7);
    root.userData = { body, head, paws, eyes, tail, jaw };
    return root;
  }
  function foodModel(type, variant = 0) {
    const root = group();
    const warm = ["#c76a42", "#a34a3e", "#e99843", "#c36e49", "#99563c", "#d69960", "#a94142", "#c17a43"];
    if (type === 0) {
      const sausage = part(root, "capsule", warm[variant % 8], 0, 0, 0, 9, 13, 9);
      sausage.rotation.z = 1.05;
      for (const side of [-1, 1]) {
        const end = part(root, "cone", warm[variant % 8], side * 25, -side * 14, 0, 5, 7, 5);
        end.rotation.z = 1.05;
      }
      for (let i = -1; i <= 1; i++) {
        const mark = part(root, "capsule", "#783d29", i * 10, -i * 6, 8, 1, 4, 0.7);
        mark.rotation.z = -0.6;
      }
    } else if (type === 1) {
      const cookie = part(root, "tube", "#dba75a", 0, 0, 0, 22, 9, 22);
      cookie.rotation.x = Math.PI / 2;
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, r = 6 + (i % 3) * 6;
        const chip = part(root, "box", "#56382c", Math.cos(a) * r, Math.sin(a) * r, 5, 5, 5, 3);
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
      const carrot = part(root, "cone", "#c38969", 0, -1, 0, 12, 43, 11);
      carrot.rotation.z = Math.PI;
      for (let i = -1; i <= 1; i++) {
        const leaf = part(root, "ball", "#54846d", i * 7, 23, 0, 4, 12, 3);
        leaf.rotation.z = -i * 0.5;
      }
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
    const root = group(), color = ["#d3995c", "#8b969a", "#ded7bd"][coat % 3];
    part(root, "ball", color, 0, 17, 0, 25, 13, 12);
    for (let i = 0; i < 4; i++) part(root, "capsule", color, -15 + i * 10, 7, i % 2 ? 6 : -6, 3, 4, 3);
    part(root, "ball", color, 18, 29, 2, 13, 12, 11);
    for (const side of [-1, 1]) {
      part(root, "cone", color, 18 + side * 8, 41, 2, 6, 14, 5);
      part(root, "ball", "#bcd08c", 18 + side * 5, 30, 12, 3, 4, 2);
      part(root, "ball", "#203530", 18 + side * 5, 30, 13.5, 1, 2.5, 1);
    }
    part(root, "ball", "#865350", 19, 23, 14, 2, 1.5, 1);
    const tail = part(root, "ring", color, -28, 25, -2, 11, 14, 11);
    tail.rotation.y = 0.3;
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
  return { part, group, rod, material, geometries, pugModel, foodModel, catModel, birdModel };
}
