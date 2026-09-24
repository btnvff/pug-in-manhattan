const assert = require("node:assert/strict");
const { loadGame } = require("./gameplay.test");
const game = loadGame(), { run } = game;
for (let type = 0; type < 9; type++) {
  run(`prefs.sound=false; start(); spawnIn=999; points=20; x=330;
    items=[{type:${type},x:65,y:landingY()-1,speed:240,age:1,variant:2,spin:0.2,used:false}]; tick(1/60);`);
  assert.equal(run("items.length"), 0, "original catch/spawn eligibility ends at the same line");
  assert.equal(run("streetEvents.drops.length"), 1, "type " + type + " continues visibly");
  assert.equal(run("streetEvents.drops[0].y"), run("landingY()+3"), "no snap at the handoff");
  assert.equal(run("streetEvents.drops[0].speed"), 240);
  const points = run("points"), frozen = run("JSON.stringify(streetEvents)");
  run("pause(); tick(.04); render()");
  assert.equal(run("JSON.stringify(streetEvents)"), frozen, "pause freezes fallen items and event cadence");
  run("state='play'; for(let i=0;i<18;i++) tick(1/60)");
  assert.equal(run("streetEvents.drops.length"), 1, "keep full silhouette at the bottom edge");
  assert.ok(run("streetEvents.drops[0].y > H"));
  run("for(let i=0;i<40;i++) tick(1/60)");
  assert.equal(run("streetEvents.drops.length"), 0, "retire fully offscreen");
  assert.equal(run("points"), points, "no repeated miss penalty or late pickup");
  assert.equal(points, type === 0 ? 19 : 20);
}
run("start(); spawnIn=999; x=330; applyPower('chance'); items=[{type:0,x:65,y:landingY()-1,speed:240,age:0,used:false}]; tick(1/60)");
assert.equal(run("items.length"), 1);
assert.ok(run("items[0].bounceV<0 && streetEvents.drops.length===0 && cats.length===0"), "second-chance bounce still belongs to gameplay");
run("start(); spawnIn=999; x=330; applyPower('slow'); items=[{type:4,x:65,y:landingY()-.1,speed:240,age:0,used:false}]; tick(1/60)");
assert.ok(Math.abs(run("streetEvents.drops[0].speed - 240*BALANCE.event.slowFactor")) < 1e-8, "retain slowed velocity through visual handoff");
const beforeResize = run("JSON.stringify(streetEvents)");
for (const [width, height] of [[320,568], [844,390], [390,844]]) {
  run(`innerWidth=${width}; innerHeight=${height}; resize()`);
  assert.equal(run("JSON.stringify(streetEvents)"), beforeResize, "resize changes raster, not street state");
  assert.ok(run("W===390 && H===844"));
}
run("start(); x=330; points=500");
const events = [];
for (let missed = 1; missed <= 90; missed++) {
  run("cats=[]; streetEvents.cooldown=0; missSausage({type:0,x:65,y:landingY(),variant:0,used:false})");
  if (run("cats.length")) events.push(missed);
}
assert.ok(events.length >= 6 && events.length <= 8);
events.forEach((miss, i) => assert.ok(miss - (events[i - 1] || 0) >= 10 && miss - (events[i - 1] || 0) <= 15));
run("cats=[]; streetEvents.eligible=11; streetEvents.untilCat=12; streetEvents.cooldown=4; missSausage({type:0,x:65,used:false})");
assert.equal(run("cats.length"), 0, "cooldown prevents a crowd");
run("streetEvents.cooldown=0; missSausage({type:0,x:65,used:false})");
assert.equal(run("cats.length"), 1);
run("streetEvents.eligible=11; streetEvents.untilCat=12; missSausage({type:0,x:65,used:false})");
assert.equal(run("cats.length"), 1, "only one decorative cat at a time");
run("start()");
assert.ok(run("streetEvents.drops.length===0 && streetEvents.eligible===0 && streetEvents.cooldown===0"));
console.log("PASS: all 9 misses continue offscreen; one penalty; pause/resize/reset; slow and bounce preserved; rare cat every 10–15 eligible misses, with cooldown and no overlap.");
// Moving helpers must not make their emitted food jump to a stationary origin.
run("start(); powerTimers.helpers=8; catAge=0");
assert.ok(run("helperPresentation(-1).x < -50 && helperPresentation(1).x > W+50"));
run("catAge=.65");
assert.equal(run("helperPresentation(-1).x"),run("helperX(-1)"));
run("catAge=.35; catGifts=[{owner:'helpers',sx:helperX(-1)+32.4,sy:ground()-14.4,t:.1}]");
const emittedOrigin=run("helperGiftOrigin(catGifts[0]).sx");
run("catAge+=.1;catGifts[0].t+=.1;powerTimers.helpers-=.1");
assert.ok(Math.abs(run("helperGiftOrigin(catGifts[0]).sx")-emittedOrigin)<1e-8);
run("catAge=8;powerTimers.helpers=.001");
assert.ok(run("helperPresentation(-1).x < -50 && helperPresentation(1).x > W+50"));
console.log("PASS: helper entry/exit stay offscreen at endpoints; airborne gifts preserve their emission origin.");
