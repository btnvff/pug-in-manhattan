const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "../.."), s = { window: {}, console, URLSearchParams, location: { search: "" } };
vm.createContext(s);
for (const name of ["vendor/three-r185", "world/world-ratio", "character/pug-3d", "character/pug-animation", "world/models-3d", "world/ratio-scene"])
  vm.runInContext(fs.readFileSync(path.join(root, "js", name + ".js"), "utf8"), s);
const get = x => vm.runInContext(x, s), T = s.window.THREE, C = get("PUG_WORLD_RATIO"), R = get("WorldRatio");
const near = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
assert.equal(require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(__dirname, "../fixtures/ratio-1.0.0.json"))).digest("hex"), "dffdef4b1fee99408efa5b7ce16dcab5605c9ef3144bb3afcaf8416142925cc9", "Retained 1.0.0 fixture cannot be silently rewritten");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/ratio-1.0.0.json"), "utf8"));
assert.deepEqual(JSON.parse(JSON.stringify(C)), fixture, "Ratio contract requires a new version and retained fixture");
for (const [d, v] of [[1, .88], [2, .76], [4, .70], [8, .67]]) {
  near(R.project(0, 0, d).v, v);
  near(R.depthAtGround(v), d);
}
assert.throws(() => R.depthAtGround(.64));
const camera = R.camera(T);
for (const x of [-7, 0, 4])
  for (const y of [0, 1, 8.25, 25.5])
    for (const d of [1, 4, 12, 20]) {
      const q = new T.Vector3(x, y, -d * 5.625).project(camera), p = R.project(x, y, d);
      near((q.x + 1) / 2, p.u);
      near((1 - q.y) / 2, p.v);
    }
near(R.project(0, 13, 4).v, .18);
near(R.project(0, 8.25, 12).v, .55);
near(R.project(0, 50, 20).v, .252);
for (const [w, h] of [[600, 1125], [390, 844], [320, 568], [844, 390], [1024, 768]]) {
  const f = R.fit(w, h);
  near(f.width / f.height, 600 / 1125);
  assert.ok(f.width <= w + 1e-8 && f.height <= h + 1e-8);
}
const hero = s.createPugModel();
s.animatePugModel(hero, { time: 0, state: "play" });
const b = R.bounds(hero, T), size = b.getSize(new T.Vector3());
near(size.y, C.assets.pug.neutral_source_height);
assert.ok(Math.abs(size.x / size.y - .67) < .004, "neutral aspect");
const k = 1 / size.y;
hero.scale.setScalar(k);
for (const x of [-1, 0, 1]) {
  hero.position.x = x;
  const worldBounds = R.bounds(hero, T);
  near((worldBounds.max.y - worldBounds.min.y) * .16, .16);
}
const objects = get("RATIO_LAYOUT.objects");
for (const o of objects) {
  assert.equal(o.space, "WORLD");
  assert.ok(o.d > 0);
  assert.ok(o.width > 0 && o.height > 0 && o.length > 0);
}
// Ground-only coverage: buildings must not conceal holes in block/corner floors.
const Z = C.projection_calibration.pug_camera_depth;
const avenue = objects.find(o => o.id === "avenue"), apron = objects.find(o => o.id === "apron");
const farGround = avenue.d * Z + avenue.length / 2;
const transition = R.depthAtGround(C.ground_regions.avenue_transition_v) * Z;
const crossing = R.depthAtGround(C.ground_regions.intersection_end_v) * Z;
const floors = objects.filter(o => o.kind === "box" && o.y + o.height / 2 >= 0 &&
  o.y + o.height / 2 <= .08 && o.width >= .5 && o.length >= .5);
const floorAt = (x, z) => floors.some(o =>
  Math.abs(x - o.x) <= o.width / 2 + 1e-8 &&
  Math.abs(z - o.d * Z) <= o.length / 2 + 1e-8);
for (const z of [apron.d * Z, crossing - .01, crossing + .01,
  transition - .01, transition + .01, transition + 2,
  C.object_dimension_registry.near_building.depth * Z, 330.1, farGround - .01]) {
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, x = (u - C.vanishing_u) * R.aspect * (z / Z) / C.pug_height_ratio;
    assert.ok(floorAt(x, z), `Missing ground at visible u=${u}, world x=${x}, z=${z}`);
  }
}
// Suspension cables must physically touch each tower head, not just share a label.
const towers = objects.filter(o => o.role === "bridge-tower");
const cables = objects.filter(o => o.kind === "rod" && o.role === "bridge-cable");
assert.equal(towers.length, 4);
assert.ok(cables.length > 0);
for (const tower of towers) {
  const head = tower.y + tower.height / 2;
  assert.ok(cables.some(cable => [cable.a, cable.b].some(p =>
    Math.abs(p[0] - tower.x) <= tower.width / 2 &&
    Math.abs(p[1] - head) <= .1 &&
    Math.abs(p[2] - tower.d * Z) <= tower.length / 2)),
  `Cable misses tower head at x=${tower.x}, depth=${tower.d}`);
}
const decks = objects.filter(o => o.role === "bridge-deck");
const deckY = C.ground_regions.bridge_deck_y;
const towerDepths = towers.map(o => o.d * Z);
const deckContains = (x, z) => decks.some(o =>
  Math.abs(x - o.x) <= o.width / 2 && Math.abs(z - o.d * Z) <= o.length / 2);
for (const z of [Math.min(...towerDepths), Math.max(...towerDepths),
  (Math.min(...towerDepths) + Math.max(...towerDepths)) / 2]) {
  for (const x of [0, ...new Set(towers.map(o => o.x))])
    assert.ok(deckContains(x, z), "Continuous deck between tower planes");
}
for (const deck of decks) {
  near(deck.y, deckY);
  assert.ok(deck.y - deck.height / 2 > 0, "Elevated deck retains clearance");
}
const hangers = objects.filter(o => o.role === "bridge-hanger");
assert.ok(hangers.length > 0);
for (const hanger of hangers) {
  assert.ok(deckContains(hanger.a[0], hanger.a[2]), "Hanger foot stays over the deck");
  near(hanger.a[1], deckY + decks[0].height / 2);
  assert.ok(cables.some(cable => [cable.a, cable.b].some(p =>
    Math.hypot(...p.map((v, i) => v - hanger.b[i])) < 1e-7)), "Hanger meets a cable vertex");
}
// Grounded vehicle: wheels reach Y=0 and width clears a 2.5P lane.
assert.ok(C.object_dimension_registry.taxi.width < C.road_dimensions.lane_width);
assert.ok(C.object_dimension_registry.pedestrian.width < C.road_dimensions.sidewalk);
// All receding edges share a vanishing point; affine 3D lines remain straight.
for (const x of [-7, 0, 4])
  for (const y of [0, 1.5, 13]) {
    const a = R.project(x, y, 1);
    for (const d of [2, 4, 8, 20]) {
      const b = R.project(x, y, d);
      near((a.u - C.vanishing_u) * (b.v - C.horizon_v) - (a.v - C.horizon_v) * (b.u - C.vanishing_u), 0);
      assert.ok(Math.hypot(b.u - C.vanishing_u, b.v - C.horizon_v) <= Math.hypot(a.u - C.vanishing_u, a.v - C.horizon_v));
      if (y === 0)
        near(R.depthAtGround(b.v), d);
    }
  }
const endpoints = [[-5, 1, 2], [7, 13, 20]], a = R.project(...endpoints[0]), b2 = R.project(...endpoints[1]);
for (const t of [.2, .5, .8]) {
  const p = R.project(...endpoints[0].map((v, i) => v + (endpoints[1][i] - v) * t));
  near((p.u - a.u) * (b2.v - a.v) - (p.v - a.v) * (b2.u - a.u), 0);
}
const adapter = get("RatioPresentation");
for (const x of [0, 49, 195, 341, 390])
  near(adapter.logicalX(adapter.worldX(x)), x);
for (const y of [-100, 0, 350, 668, 753, 844, 924])
  near(adapter.fromWorldY(adapter.worldY(y)), y);
const { loadGame } = require("../game/gameplay.test");
const game = loadGame();
game.run("start(); tick(.03);");
const before = game.snapshot();
game.run("resize();resize();");
assert.equal(game.snapshot(), before, "resize is raster-only");
console.log("PASS: version fixture, full Three camera projection, world anchors, continuous ground/bridge deck and connected cables, five viewport fits, uniform hero normalization, lane clearance, resize state invariance. Neutral aspect:", size.x / size.y);
hero.userData.dispose();
