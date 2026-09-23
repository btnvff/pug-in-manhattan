// Run with Node.js. Uses the shipped Three.js geometry implementation, not graphics mocks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const math = Object.create(Math);
math.random = () => { throw new Error("Character art consumed gameplay randomness"); };
const sandbox = { window: {}, Math: math, console };
vm.createContext(sandbox);
for (const file of ["js/vendor/three-r185.js", "js/pug-3d.js", "js/pug-animation.js", "js/models-3d.js"])
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
const T = sandbox.window.THREE;
const factory = sandbox.createModelFactory();
const hero = factory.pugModel();
const parts = hero.userData;
const signal = Object.freeze({
  time: 0.7, state: "play", runBlend: 0, gait: 0, lean: 0, headTurn: 0,
  lookUp: 0, gazeX: 0, gazeY: 0, hasTarget: false, tailSwing: 0,
  react: 0, reaction: 1, chewTime: 0, reactionDuration: 0.5, chewDuration: 0.78,
});
const poseAt = (overrides = {}) => sandbox.samplePugPose(Object.freeze({ ...signal, ...overrides }));
const animate = (overrides = {}) => sandbox.animatePugModel(hero, Object.freeze({ ...signal, ...overrides }));
const serialize = (value) => JSON.stringify(value);
assert.equal(serialize(poseAt()), serialize(poseAt()), "same signals reproduce the same pose");
const output = {};
assert.equal(sandbox.samplePugPose(signal, output), output, "caller-owned pose buffer is reused");
for (const time of [0, 2.925, 5.65, 7.6, 18.8]) {
  for (const reaction of [-1, 1]) {
    const pose = { time, runBlend: 0.65, gait: 4.2, react: 0.25, reaction, chewTime: 0.4 };
    assert.equal(serialize(poseAt(pose)), serialize(poseAt({ ...pose, state: "pause" })), "pause keeps the exact displayed pose");
  }
  assert.equal(serialize(poseAt({ time })), serialize(poseAt({ time, state: "pause" })), "idle/breath also freeze on pause");
}
for (const state of ["menu", "win", "lose"])
  assert.equal(poseAt({ state, chewTime: 0.4, react: 0.25 }).chew, 0, "frozen run timers cannot keep menu/result chewing forever");
const meshes = [], resources = new Set();
let triangles = 0;
hero.traverse((node) => {
  if (!node.isMesh) return;
  meshes.push(node);
  resources.add(node.geometry); resources.add(node.material);
  if (node.material.map) resources.add(node.material.map);
  triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  for (const attribute of Object.values(node.geometry.attributes))
    assert.ok(Array.from(attribute.array).every(Number.isFinite), "finite geometry attributes: " + node.name);
});
assert.ok(meshes.length <= 80, "bounded hero draw-call budget");
assert.ok(triangles < 65000, "bounded hero geometry budget");
const topology = meshes.map((mesh) => [mesh.uuid, mesh.geometry.uuid, mesh.material.uuid]);
const eye = parts.eyes[0].getObjectByName("inset-eye");
assert.ok(eye.scale.x * parts.eyes[0].scale.x < 11 && eye.scale.y * parts.eyes[0].scale.y < 12, "eyeballs are smaller than the old 11x12 radii");
assert.ok(eye.scale.z < 8, "eye depth is less than the old protruding sphere");
assert.equal(parts.paws.length + parts.hindPaws.length, 4);
assert.equal(hero.getObjectByName("rounded-head").material.vertexColors, true, "mask belongs to the head surface");
assert.ok(hero.getObjectByName("continuous-muzzle"), "one continuous muzzle");
assert.equal(hero.getObjectByName("haunch"), undefined, "hips and shoulders share one continuous body surface");
assert.ok(parts.torso.geometry.index, "continuous body uses an indexed skin");
const skin = parts.torso.geometry, skinEdges = new Map(), neighbors = new Map();
for (let i = 0; i < skin.index.count; i += 3) {
  const a = skin.index.getX(i), b = skin.index.getX(i + 1), c = skin.index.getX(i + 2);
  for (const [start, end] of [[a, b], [b, c], [c, a]]) {
    const key = start < end ? start + ":" + end : end + ":" + start;
    skinEdges.set(key, (skinEdges.get(key) ?? 0) + 1);
    if (!neighbors.has(start)) neighbors.set(start, new Set());
    if (!neighbors.has(end)) neighbors.set(end, new Set());
    neighbors.get(start).add(end); neighbors.get(end).add(start);
  }
}
assert.ok([...skinEdges.values()].every((uses) => uses === 2), "body skin is watertight, with no open or non-manifold seams");
const connected = new Set(), pending = [0];
while (pending.length) {
  const index = pending.pop();
  if (connected.has(index)) continue;
  connected.add(index);
  for (const next of neighbors.get(index)) if (!connected.has(next)) pending.push(next);
}
assert.equal(connected.size, skin.attributes.position.count, "chest, hips and shoulders form one connected surface");
assert.equal(parts.shadow.material.depthWrite, false);
assert.equal(parts.shadow.material.map.image.width, 64);
animate(); hero.updateMatrixWorld(true);
for (const foreleg of parts.paws) {
  const foot = foreleg.getObjectByName("rounded-paw");
  assert.ok(Math.abs(foot.localToWorld(new T.Vector3(0, -1, 0)).y) < 0.00001, "idle forepaws touch the floor");
}
for (const hind of parts.hindPaws)
  assert.ok(Math.abs(hind.children[0].localToWorld(new T.Vector3(0, -1, 0)).y) < 0.00001, "idle hind paws touch the floor");
assert.ok(Math.abs(parts.mouthAnchor.getWorldPosition(new T.Vector3()).y - 85) < 5, "mouth reads inside the unchanged catch band");
animate({ time: 2.925 });
assert.ok(parts.eyes.every((eye) => !eye.visible), "full eye opening closes, not just the iris");
assert.ok(parts.lids.every((lid) => lid.visible), "closed lids replace the open eye");
animate({ time: 3.2 });
assert.ok(parts.eyes.every((eye) => eye.visible) && parts.lids.every((lid) => !lid.visible), "eyes reopen");
const yum = poseAt({ react: 0.25, chewTime: 0.39 });
const bleh = poseAt({ react: 0.25, reaction: -1, chewTime: 0 });
assert.ok(yum.joy > 0.8 && yum.chew > 0 && yum.eyeOpen < poseAt().eyeOpen, "catch has savor, chew and soft squint");
assert.ok(bleh.bad > 0.9 && bleh.joy === 0 && bleh.headPitch > 0 && bleh.tongue > 0, "bad item has its own gentle recoil");
let steamFrames = 0;
for (let frame = 0; frame < 1740; frame++) if (poseAt({ time: frame / 100 }).breathOpacity > 0.002) steamFrames++;
assert.ok(steamFrames > 30 && steamFrames < 100, "steam occupies less than 6% of an idle cycle");
for (const overrides of [{ runBlend: 0.8 }, { hasTarget: true }, { chewTime: 0.4 }, { react: 0.2, reaction: -1 }])
  assert.equal(poseAt({ time: 5.65, ...overrides }).breathOpacity, 0, "no steam during movement, attention or reactions");
// Sweep head turns, gait, blinking, result poses and feedback; every transform remains bounded.
for (const state of ["menu", "play", "pause", "win", "lose"]) {
  for (let frame = 0; frame < 720; frame++) {
    const t = frame / 60;
    const pose = animate({
      state, time: t, gait: t * 18, runBlend: (1 + Math.sin(t)) / 2,
      headTurn: Math.sin(t * 2), gazeX: Math.sin(t * 2), gazeY: -0.8,
      lookUp: 0.8, lean: Math.sin(t) * 0.08, tailSwing: Math.sin(t) * 0.24,
      react: frame % 60 < 30 ? 0.5 - frame % 60 / 60 : 0,
      chewTime: frame % 60 < 47 ? 0.78 - frame % 60 / 60 : 0,
      reaction: frame % 120 < 60 ? 1 : -1,
    });
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.ok(pose.eyeOpen >= 0.035 && pose.eyeOpen <= 1);
    assert.ok(pose.stretch > 0.96 && pose.stretch < 1.04);
    assert.ok(pose.chew >= 0 && pose.chew < 2);
    assert.ok(Math.abs(pose.headYaw) < 0.39 && Math.abs(pose.headRoll) < 0.20, "expressive turns stay inside the rig envelope");
    hero.updateMatrixWorld(true);
    const headBounds = new T.Box3().setFromObject(hero.getObjectByName("rounded-head"));
    const shoulderBounds = new T.Box3().setFromObject(parts.torso);
    assert.ok(shoulderBounds.max.y - headBounds.min.y > 6, "head and shoulders remain joined through all poses");
    for (const node of meshes) assert.ok(node.matrixWorld.elements.every(Number.isFinite));
    // Exact support of each ellipsoid along the world Y axis (matrix includes its scale).
    for (let i = 0; i < 2; i++) {
      const step = i ? pose.rightStep : pose.leftStep;
      for (const [foot, expected] of [
        [parts.paws[i].getObjectByName("rounded-paw"), Math.max(0, step) ** 2 * 4.2],
        [parts.hindPaws[i].children[0], Math.max(0, -step) ** 2 * 1.6],
      ]) {
        const m = foot.matrixWorld.elements;
        const bottom = m[13] - Math.hypot(m[1], m[5], m[9]);
        assert.ok(Math.abs(bottom - expected) < 1e-8, "paw support compensates body roll, squash and ankle flex");
      }
    }
  }
}
// At the unchanged 49-pixel input margin, the art must remain on screen.
for (const side of [-1, 1]) for (let frame = 0; frame < 120; frame++) {
  animate({ time: frame / 10, headTurn: side, lean: side * 0.08, runBlend: 1, gait: frame / 7, lookUp: 0.8, edgeBlend: 0 });
  hero.updateMatrixWorld(true);
  const point = new T.Vector3();
  for (const mesh of meshes) {
    if (/shadow|contact|wisp/.test(mesh.name)) continue;
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      assert.ok(Math.abs(point.x) < 49, "edge-safe art keeps the original movement margin");
    }
  }
}
assert.deepEqual(meshes.map((mesh) => [mesh.uuid, mesh.geometry.uuid, mesh.material.uuid]), topology, "animation creates no new meshes, geometries or materials");
const disposals = new Map();
for (const resource of resources) resource.addEventListener("dispose", () => disposals.set(resource, (disposals.get(resource) ?? 0) + 1));
const sharedResources = [...Object.values(factory.geometries), factory.material("#aa8866")];
const sharedDisposals = new Map();
for (const resource of sharedResources)
  resource.addEventListener("dispose", () => sharedDisposals.set(resource, (sharedDisposals.get(resource) ?? 0) + 1));
factory.dispose(); factory.dispose();
for (const resource of sharedResources) assert.equal(sharedDisposals.get(resource), 1, "factory owns and disposes its shared resources exactly once");
assert.equal(disposals.size, 0, "disposing the shared factory cannot dispose the private hero rig");
parts.dispose(); parts.dispose();
for (const resource of resources) assert.equal(disposals.get(resource), 1, "owned GPU resources dispose exactly once");
console.log(`PASS: ${meshes.length} meshes / ${triangles} triangles; smaller inset eyes, grounded paws, catch-band alignment, complete blink, pure/paused pose, movement/catch/bad reactions, rare breath, 3600-frame sweep, 240 edge poses, stable resources and idempotent disposal.`);
