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
    return createPugModel();
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
    root.userData.legs = [];
    for (let i = 0; i < 4; i++) {
      const limb = group(root, i < 2 ? -15 : 15, 13, i % 2 ? 6 : -6);
      part(limb, "capsule", color, 0, -6, 0, 3, 3, 3);
      part(limb, "ball", color, 1, -11, 1, 4, 2, 3);
      root.userData.legs.push(limb);
    }
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
