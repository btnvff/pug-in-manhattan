// One entry point; no package manager, test framework or build configuration.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const browserSuites = new Set(["browser", "character-browser", "audio-browser", "render-lifecycle"]);
const mode = process.argv[2] || "--node";
if (!["--node", "--browser", "--all"].includes(mode) || process.argv.length > 3) {
  console.error("Usage: node tests/run.js [--node|--browser|--all]");
  process.exit(2);
}
const files = fs.readdirSync(__dirname).filter((file) => file.endsWith(".test.js")).sort();
let count = 0, failed = 0;
for (const file of files) {
  const browser = browserSuites.has(file.replace(/\.test\.js$/, ""));
  if ((mode === "--node" && browser) || (mode === "--browser" && !browser)) continue;
  count++;
  console.log("\n=== " + file + " ===");
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) {
    failed++;
    console.error("FAIL:", file, result.error?.message || result.signal || result.status);
  }
}
console.log(`\n${count - failed}/${count} suites passed; ${failed} failed. No implicit skips.`);
process.exitCode = failed ? 1 : 0;
