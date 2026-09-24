// Real scene/model setup with a renderer double: not a browser/GPU test.
const assert = require("node:assert/strict");
const { loadGame } = require("./gameplay.test");
const game = loadGame(null, 42, { rendererDouble: true }), { run } = game;
assert.equal(game.nodes.get("game").dataset.view, "3d");
run("prefs.sound=false; start(); spawnIn=999");
for (const power of run("Object.keys(powerInfo)"))
  run(`start(); applyPower(${JSON.stringify(power)}); tick(.016); render()`);
run("items=Array.from({length:9},(_,type)=>({type,x:100+type*10,y:350,age:0,angle:0,variant:0,warning:0,used:false})); render()");
run("pause(); frame(100); let paints=0; const draw=activeView.render; activeView.render=()=>{paints++;draw();}");
const before = game.snapshot();
run("resize(); frame(120)");
assert.equal(run("paints"), 1, "paused resize repaints even with unchanged logical dimensions");
assert.equal(game.snapshot(), before);
run("frame(140)");
assert.equal(run("paints"), 1, "paused frames do not repaint continuously");
run("fallbackToCanvas(); render()");
assert.equal(game.nodes.get("game").dataset.view, "2d");
run("let canvasPaints=0; const canvasDraw=renderCanvasScene; renderCanvasScene=()=>{canvasPaints++;canvasDraw();}; frame(160); canvasPaints=0; resize(); frame(180)");
assert.equal(run("canvasPaints"), 1, "Canvas pause/resize redraws the cleared bitmap");
assert.equal(game.snapshot(), before);
assert.deepEqual(game.warnings, []);
console.log("PASS: real geometry, 17 powers, nine foods; paused 3D/Canvas resize repaints once; state preservation, disposal and fallback (renderer double).");

for (const mode of ["blockout", "reference", "overlay"]) {
  const review = loadGame(null, 42, { search: "?view=2d&ratio=" + mode });
  review.run("let labels=[]; ctx.fillText=text=>labels.push(text); render()");
  assert.ok(review.run('labels.includes("600 × 1125 · " + ratioMode)'), "review label uses the contract dimensions");
  assert.deepEqual(review.warnings, []);
}
console.log("PASS: all three permanent ratio review modes use the current contract dimensions.");
