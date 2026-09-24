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
console.log("PASS: version fixture, full Three camera projection, world anchors, five viewport fits, uniform hero normalization, lane clearance, resize state invariance. Neutral aspect:", size.x / size.y);
hero.userData.dispose();
