// Run with Node.js, without npm. Optional: --compare <git-ref> checks parity.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
function loadGame(ref, seed = 42) {
  const read = (file) => ref
    ? execFileSync("git", ["show", ref + ":" + file], { cwd: root, encoding: "utf8" })
    : fs.readFileSync(path.join(root, file), "utf8");
  const scripts = [...read("index.html").matchAll(/<script defer src="\.\/(.*?)"/g)].map((m) => m[1]);
  const nodes = new Map(), storage = new Map(), resizeListeners = [];
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "measureText") return () => ({ width: 40 });
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop() {} });
      return () => {};
    },
  });
  const element = () => ({
    style: {}, dataset: {}, textContent: "", innerHTML: "",
    clientWidth: 390, clientHeight: 844,
    getContext: () => context, setAttribute() {}, addEventListener() {},
    releasePointerCapture() {}, setPointerCapture() {},
  });
  const math = Object.create(Math);
  math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const sandbox = {
    Math: math, console, URLSearchParams, location: { search: "?view=2d" },
    document: {
      hidden: false, addEventListener() {}, createElement: element,
      getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    },
    window: { addEventListener(type, listener) { if (type === "resize") resizeListeners.push(listener); } }, navigator: {}, devicePixelRatio: 2,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame() {}, Path2D: class {},
  };
  vm.createContext(sandbox);
  for (const file of scripts) {
    if (file.includes("vendor/")) continue;
    vm.runInContext(read(file), sandbox, { filename: file });
    // Mobile viewport events may arrive between deferred scripts, before artwork loads.
    if (!ref) for (const listener of resizeListeners) listener();
  }
  const run = (code) => vm.runInContext(code, sandbox);
  const snapshot = () => run(`JSON.stringify({state, points, sausages, happy, elapsed, x, difficulty, runProgress, streak, bestStreak, nearMisses, durationBones, powerTimers, items, cats, flocks, catGifts, rhythmKind, rhythmNext, rainEmitted, trailEmitted})`);
  return { run, snapshot, seed: () => seed };
}
function mechanics(game) {
  const { run } = game;
  run("prefs.sound = false; start(); collect({type: 0})");
  assert.equal(run("points"), 1);
  assert.equal(run("sausages"), 1);
  run("applyPower('double'); collect({type: 1})");
  assert.equal(run("points"), 5);
  const happy = run("happy");
  run("applyPower('shield'); collect({type: 8})");
  assert.equal(run("happy"), happy);
  assert.equal(run("powerTimers.shield"), 0);
  run("collect({type: 7})");
  assert.equal(run("durationBones"), 1);
  assert.ok(run("powerTimers.double") > 5);
  run("pause()");
  const frozen = game.snapshot();
  run("tick(0.04); render()");
  assert.equal(game.snapshot(), frozen, "pause freezes every gameplay timer");
  run("start(); applyPower('helpers'); applyPower('rain'); applyPower('jam')");
  assert.equal(run("powerTimers.helpers + powerTimers.rain + rainBudget"), 0);
  run("start(); happy = 1; collect({type: 8})");
  assert.equal(run("state"), "lose");
  run("start()");
  assert.equal(run("points + sausages + durationBones + items.length + catGifts.length"), 0);
  for (const kind of JSON.parse(run("JSON.stringify(Object.keys(powerInfo))"))) {
    run(`start(); applyPower(${JSON.stringify(kind)}); for(let i=0;i<360;i++) tick(1/60); render()`);
    assert.ok(run("Number.isFinite(x) && Number.isFinite(points)"), kind);
  }
  run("menu(); render()");
  assert.equal(run("state"), "menu");
}
function simulate(game) {
  game.run("prefs.sound=false; start()");
  const checkpoints = [];
  for (let block = 0; block < 120; block++) {
    game.run(`
      for (let i = 0; i < 60; i++) {
        if (state !== 'play') start();
        const target = items.filter(it => it.type < 4 && !it.used).sort((a,b) => b.y-a.y)[0];
        keys.clear();
        if (target && Math.abs(target.x-x)>6) keys.add(target.x>x?'ArrowRight':'ArrowLeft');
        tick(1/60);
      }
    `);
    const before = game.snapshot(), seed = game.seed();
    game.run("render(); render()");
    assert.equal(game.snapshot(), before, "render must not modify gameplay");
    assert.equal(game.seed(), seed, "render must not consume simulation randomness");
    checkpoints.push(before);
  }
  return checkpoints;
}
function coreCheckpoints(checkpoints) {
  return checkpoints.map((value) => {
    const state = JSON.parse(value);
    // Missed-food scavengers are presentation; helpers/gifts remain in the comparison.
    delete state.cats; delete state.flocks;
    return state;
  });
}
if (require.main === module) {
  mechanics(loadGame());
  const exact = process.argv.indexOf("--compare"), core = process.argv.indexOf("--compare-gameplay");
  const index = Math.max(exact, core);
  for (const seed of [42, 123, 2026]) {
    const game = loadGame(null, seed), current = simulate(game);
    if (index >= 0) {
      const oldGame = loadGame(process.argv[index + 1], seed), previous = simulate(oldGame);
      assert.deepEqual(core >= 0 ? coreCheckpoints(current) : current,
        core >= 0 ? coreCheckpoints(previous) : previous, "gameplay differs from reference");
      assert.equal(game.seed(), oldGame.seed(), "presentation cannot shift future gameplay RNG");
    }
  }
  console.log("PASS: scoring, shield, bones, pause, jam, lose/restart, all powers; 3 seeded 120-second runs; render purity" +
    (index >= 0 ? "; " + (core >= 0 ? "gameplay/RNG match " : "identical to ") + process.argv[index + 1] : ""));
}
module.exports = { loadGame };
