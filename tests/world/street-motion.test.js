// Actual Three objects, no GPU: routes and gait must move, not just pose in place.
const assert = require("node:assert/strict");
const { loadGame } = require("../game/gameplay.test");
const game = loadGame(null, 42, { rendererDouble: true });
assert.deepEqual(game.warnings, []);
game.run("const trafficFactory = createModelFactory(); const trafficWorld = createRatioWorld(trafficFactory);");
const world = game.run("trafficWorld"), T = game.run("window.THREE");
const C = game.run("PUG_WORLD_RATIO"), street = game.run("RATIO_LAYOUT.street");
const cars = world.actors.filter(a => a.kind === "car"), people = world.actors.filter(a => a.kind === "person");
assert.equal(cars.length, 3); assert.equal(people.length, 5);
const snapshot = () => JSON.stringify(world.actors.map(a => {
  const transforms = [];
  a.mesh.traverse(n => transforms.push([n.position.toArray(), n.quaternion.toArray(), n.scale.toArray()]));
  return [a.pose, transforms];
}));
const seed = game.seed(), state = game.snapshot();
world.animate(0);
const before = world.actors.map(a => a.mesh.position.clone());
world.animate(2);
assert.ok(cars[0].mesh.position.distanceTo(before[0]) > 8, "taxi visibly travels in two seconds");
assert.ok(people[0].mesh.position.distanceTo(before[3]) > 1, "pedestrian travels, not walking in place");
assert.ok(cars[0].wheels[0].rotation.x !== 0, "wheels roll");
const same = snapshot(); world.animate(2); assert.equal(snapshot(), same, "same time is idempotent");
world.animate(99); world.animate(2); assert.equal(snapshot(), same, "sampling is history-independent");

// Conservative full car footprint, including the bumper (not just its origin).
const corners = a => {
  const p = a.pose, c = Math.cos(p.heading), s = Math.sin(p.heading);
  return [[-1,-2.05],[1,-2.05],[1,2.10],[-1,2.10]].map(([x,z]) =>
    [p.x + c*x + s*z, p.z + s*x - c*z]);
};
function overlap(a, b) {
  for (const polygon of [a, b]) for (let i = 0; i < 4; i++) {
    const p = polygon[i], q = polygon[(i+1)%4], axis = [p[1]-q[1], q[0]-p[0]];
    const project = shape => shape.map(v => v[0]*axis[0]+v[1]*axis[1]);
    const aa = project(a), bb = project(b);
    if (Math.max(...aa) < Math.min(...bb) || Math.max(...bb) < Math.min(...aa)) return false;
  }
  return true;
}
const onRoad = (x,z) => z >= street.crossing && z <= street.far &&
  (z <= street.transition ? Math.abs(x) <= street.crossWidth/2 : Math.abs(x) <= street.road.carriageway/2);
function hidden(a, shape) {
  if (shape.every(p => p[1] > 360)) return true; // beyond the existing fog end
  const u = shape.map(([x,z]) => .5 + C.pug_height_ratio / (600/1125) * x / (z/5.625));
  return Math.max(...u) < 0 || Math.min(...u) > 1;
}
let previous = [], turnSamples = 0, recycleSamples = 0;
const footBox = new T.Box3(), personBox = new T.Box3();
// More than three full car circuits and nine reserved transverse passes.
for (let step = 0; step <= 3000; step++) {
  const time = step/10; world.animate(time);
  const shapes = cars.map(corners);
  cars.forEach((a,i) => {
    // Check footprint edges as well as corners at the concave street junction.
    const shape = shapes[i];
    for (let side = 0; side < 4; side++) for (let k = 0; k <= 8; k++) {
      const p = shape[side], q = shape[(side+1)%4], u = k/8;
      assert.ok(onRoad(p[0]+u*(q[0]-p[0]), p[1]+u*(q[1]-p[1])), `car off road: ${a.route} at ${time}`);
    }
    if (previous[i]) {
      const p = previous[i], dx = a.pose.x-p.x, dz = a.pose.z-p.z, distance = Math.hypot(dx,dz);
      if (distance > 2) {
        assert.ok(hidden(a,shape) && p.hidden, "recycle only offscreen/in complete fog"); recycleSamples++;
      } else if (distance > 1e-8) {
        assert.ok(dx*Math.sin(a.pose.heading)-dz*Math.cos(a.pose.heading) > 0, "car faces travel direction");
      }
    }
    previous[i] = {x:a.pose.x,z:a.pose.z,hidden:hidden(a,shape)};
    for (let j=i+1;j<cars.length;j++) assert.ok(!overlap(shape,shapes[j]), `cars intersect at ${time}`);
    assert.equal(a.mesh.position.y, 0);
  });
  people.forEach(a => {
    a.mesh.updateMatrixWorld(true);
    personBox.setFromObject(a.mesh);
    const inner = Math.min(Math.abs(personBox.min.x),Math.abs(personBox.max.x));
    const outer = Math.max(Math.abs(personBox.min.x),Math.abs(personBox.max.x));
    assert.ok(inner >= 2.5 && outer <= 3.7, "full pedestrian stays on sidewalk");
    const feet = a.legs.map(leg => footBox.setFromObject(leg.foot).min.y);
    assert.ok(Math.min(...feet) >= street.sidewalkTop-1e-6, "feet do not penetrate pavement");
    assert.ok(Math.abs(Math.min(...feet)-street.sidewalkTop) < 1e-6, "stance foot stays grounded");
    if (!a.pose.speed) {
      assert.ok(a.legs.every(leg=>leg.hip.rotation.x===0 && leg.knee.rotation.x===0), "no gait while stopped");
      turnSamples++;
    }
    // The moved low furniture clears even a conservatively rotated person.
    assert.ok(outer < street.furnitureX-.20, "clear walking strip beside bins and posts");
  });
}
assert.ok(turnSamples > 0 && recycleSamples > 0);
assert.equal(game.seed(), seed, "street motion does not consume gameplay RNG");
assert.equal(game.snapshot(), state, "street motion does not mutate gameplay");
assert.equal(world.actors.length, 8, "animation never creates actors");
world.dispose(); world.dispose(); game.run("trafficFactory.dispose(); disposeApplication()");
console.log("PASS: moving cars/people; three road routes, 300s swept clearance and safe recycling; distance-linked wheels, grounded gait, stopped turns, pure sampling and bounded actors.");
