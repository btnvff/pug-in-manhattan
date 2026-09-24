// Static wiring, owned assets, export and real HTTP responses under a Pages prefix.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { serveProject } = require("./helpers/browser");
const { buildPreview } = require("../scripts/build-preview");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function walk(folder) {
  return fs.readdirSync(path.join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    const file = path.posix.join(folder, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
(async () => {
  const html = read("index.html");
  const version = html.match(/id="build-version"[^>]*>v(\d+\.\d+\.\d+)<\/div>/)?.[1];
  assert.ok(version, "visible revision uses major.minor.patch");
  const scriptURLs = [...html.matchAll(/<script defer src="\.\/(.*?)"/g)].map((m) => m[1]);
  const cssURL = html.match(/<link rel="stylesheet" href="\.\/(.*?)"/)?.[1];
  const manifestURL = html.match(/<link rel="manifest" href="\.\/(.*?)"/)?.[1];
  for (const url of [...scriptURLs, cssURL, manifestURL]) {
    assert.ok(url, "stylesheet and script URLs exist");
    assert.equal(url.split("?")[1], "v=" + version, "CSS/JS/manifest cache keys match the visible revision");
  }
  const scripts = scriptURLs.map((url) => url.split(/[?#]/)[0]);
  assert.equal(new Set(scripts).size, scripts.length, "no duplicate script execution");
  assert.deepEqual([...scripts].sort(), walk("js").filter((f) => f.endsWith(".js")).sort(), "every JS module has an intentional script connection");
  assert.equal(scripts[0], "js/game/balance.js");
  assert.equal(scripts[1], "js/world/world-ratio.js");
  assert.equal(scripts.at(-1), "js/app/bootstrap.js");
  for (const file of [...walk("js"), ...walk("tests"), ...walk("scripts")].filter((f) => f.endsWith(".js")))
    new vm.Script(read(file), { filename: file });
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, "unique DOM IDs");
  const appScripts = scripts.filter((f) => !f.includes("vendor/"));
  const source = appScripts.map(read).join("\n");
  assert.match(read("js/app/bootstrap.js"), /createThreeView\(\)/, "bootstrap initializes WebGL");
  assert.doesNotMatch(read("js/app/bootstrap.js"), /URLSearchParams/, "bootstrap has no view selector");
  assert.match(read("js/render/feedback-overlay.js"), /clearRatioCanvas/, "transparent feedback remains connected");
  const knownIds = new Set([...ids,
    ...[...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
    ...[...source.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ]);
  for (const file of appScripts) {
    for (const match of read(file).matchAll(/(?:\$|getElementById)\(["']([^"']+)["']\)/g))
      assert.ok(knownIds.has(match[1]), file + ": live DOM hook " + match[1]);
  }
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.start_url, "./"); assert.equal(manifest.scope, "./");
  const assetURLs = [...new Set(["index.html", "js/vendor/three-LICENSE.txt",
    ...[...html.matchAll(/(?:src|href)="\.\/(.*?)"/g)].map((m) => m[1]),
    ...manifest.icons.map((icon) => icon.src.replace(/^\.\//, "")),
  ])];
  const assets = [...new Set(assetURLs.map((url) => url.split(/[?#]/)[0]))];
  for (const asset of assets) assert.ok(fs.statSync(path.join(root, asset)).isFile(), asset);
  for (const [file, size] of [["assets/icons/apple-touch-icon.png",180],["assets/icons/icon-192.png",192],["assets/icons/icon-512.png",512]]) {
    const data = fs.readFileSync(path.join(root,file));
    assert.equal(data.subarray(1,4).toString(),"PNG");
    assert.equal(data.readUInt32BE(16),size); assert.equal(data.readUInt32BE(20),size);
  }
  const vendor = fs.readFileSync(path.join(root,"js/vendor/three-r185.js"));
  const blob = crypto.createHash("sha1").update("blob " + vendor.length + "\0").update(vendor).digest("hex");
  assert.equal(blob,"f2d416ceba3c448bb1dc9f5adaed6b8aeeac7608","review vendor upgrades explicitly; never substitute a CDN");
  assert.match(read("js/vendor/three-LICENSE.txt"),/MIT License/);
  for (const doc of ["README.md", "PROJECT.md"]) {
    for (const match of read(doc).matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1];
      if (/^(https?:|#)/.test(link)) continue;
      assert.ok(fs.existsSync(path.join(root, link.split("#")[0])), doc + ": " + link);
    }
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pug-export-"));
  let server;
  try {
    const out = path.join(directory,"site");
    const exported = buildPreview(out);
    assert.deepEqual(exported.sort(), assets.sort());
    for (const file of assets) assert.deepEqual(fs.readFileSync(path.join(out,file)),fs.readFileSync(path.join(root,file)));
    assert.throws(() => buildPreview(out), /nonempty/, "do not overwrite arbitrary directories");
    server = await serveProject("/pug-in-manhattan/");
    const url = "http://127.0.0.1:" + server.address().port + "/pug-in-manhattan/";
    for (const assetURL of ["", ...assetURLs]) {
      const file = assetURL.split(/[?#]/)[0];
      const response = await fetch(url + assetURL);
      assert.equal(response.status,200,file);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(path.join(root,file || "index.html")));
      if (file.endsWith(".js")) assert.match(response.headers.get("content-type"),/javascript/);
    }
    assert.equal((await fetch(url + "missing-file.js")).status,404);
    assert.equal((await fetch(url + "../index.html")).status,404,"Pages prefix is isolated");
  } finally {
    if (server) await new Promise((done) => server.close(done));
    fs.rmSync(directory,{recursive:true,force:true});
  }
  console.log("PASS: revision/cache-key consistency, script graph/syntax/DOM hooks, icons/manifest/vendor/license, local doc links, byte-exact export and HTTP assets under a Pages prefix.");
})().catch((error) => { console.error(error); process.exitCode=1; });
