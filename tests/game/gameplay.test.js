// Run with Node.js, without npm. Optional: --compare <git-ref> checks parity.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "../..");
function loadGame(ref, seed = 42, options = {}) {
  const read = (file) => ref
    ? execFileSync("git", ["show", ref + ":" + file], { cwd: root, encoding: "utf8" })
    : fs.readFileSync(path.join(root, file), "utf8");
  const scripts = [...read("index.html").matchAll(/<script defer src="\.\/(.*?)"/g)].map((m) => m[1].split(/[?#]/)[0]);
  const nodes = new Map(), storage = new Map(), resizeListeners = [], warnings = [];
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "measureText") return () => ({ width: 40 });
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop() {} });
      return () => {};
    },
  });
  const element = () => ({
    style: {setProperty(){}}, dataset: {}, textContent: "", innerHTML: "",
    clientWidth: 390, clientHeight: 844,
    parentNode: { insertBefore() {} }, remove() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 731.25 }),
    getContext: () => context, setAttribute() {}, addEventListener() {},
    releasePointerCapture() {}, setPointerCapture() {},
  });
  const math = Object.create(Math);
  math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const sandbox = {
    innerWidth:390,innerHeight:844,getComputedStyle:()=>({paddingLeft:0,paddingRight:0,paddingTop:0,paddingBottom:0}), Math: math, console: { ...console, warn: (...args) => warnings.push(args) }, URLSearchParams, location: { search: options.search ?? "" },
    document: {
      hidden: false, removeEventListener() {}, body: element(), querySelectorAll: () => [], addEventListener() {}, createElement: element,
      getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    },
    window: { removeEventListener() {}, addEventListener(type, listener) { if (type === "resize") resizeListeners.push(listener); } }, navigator: {}, devicePixelRatio: 2,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame() {}, cancelAnimationFrame() {}, performance, Path2D: class {},
  };
  vm.createContext(sandbox);
  for (const file of scripts) {
    if (file.includes("vendor/") && !options.rendererDouble) continue;
    if (file === scripts.at(-1) && !options.rendererDouble)
      vm.runInContext("createThreeView = () => ({render() {}, resize() {}, dispose() {}})", sandbox);
    vm.runInContext(read(file), sandbox, { filename: file });
    if (file.includes("vendor/") && options.rendererDouble) {
      sandbox.window.THREE.WebGLRenderer = class {
        setPixelRatio() {} setSize() {} clear() {} clearDepth() {} dispose() {} forceContextLoss() {}
        render(scene, camera) { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
      };
    }
    // Mobile viewport events may arrive between deferred scripts, before artwork loads.
    if (!ref) for (const listener of resizeListeners) listener();
  }
  const run = (code) => vm.runInContext(code, sandbox);
  const snapshot = () => run(`JSON.stringify({state, points, sausages, happy, elapsed, x, difficulty, runProgress, streak, bestStreak, nearMisses, durationBones, powerTimers, items, cats, catGifts, streetEvents, rhythmKind, rhythmNext, rainEmitted, trailEmitted})`);
  return { run, snapshot, seed: () => seed, nodes, warnings };
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
function simulate(game, seconds = 120) {
  game.run("prefs.sound=false; start()");
  const checkpoints = [];
  for (let block = 0; block < seconds; block++) {
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
if (require.main === module) {
  mechanics(loadGame());
  const index = process.argv.indexOf("--compare");
  if (index >= 0 && !process.argv[index + 1]) throw new Error("--compare requires a Git ref");
  const secondsIndex = process.argv.indexOf("--seconds");
  const seconds = secondsIndex < 0 ? 120 : Number(process.argv[secondsIndex + 1]);
  assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 3600, "--seconds must be 1..3600");
  for (const seed of [42, 123, 2026]) {
    const game = loadGame(null, seed), current = simulate(game, seconds);
    if (index >= 0) {
      const oldGame = loadGame(process.argv[index + 1], seed), previous = simulate(oldGame, seconds);
      assert.deepEqual(current, previous, "gameplay differs from reference");
      assert.equal(game.seed(), oldGame.seed(), "presentation cannot shift future gameplay RNG");
    }
  }
  console.log("PASS: scoring, shield, bones, pause, jam, lose/restart, all powers; 3 seeded " + seconds + "-second runs; render purity" +
    (index >= 0 ? "; " + "identical to " + process.argv[index + 1] : ""));
}
module.exports = { loadGame };
