// Optional static export, not a build step. The source tree runs directly over HTTP.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, ".."), dist = path.join(root, "dist");
function buildPreview(destination = dist) {
  destination = path.resolve(destination);
  if (destination === dist) fs.rmSync(dist, { recursive: true, force: true });
  else if (fs.existsSync(destination) && fs.readdirSync(destination).length)
    throw new Error("Refusing to overwrite a nonempty export directory");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const paths = [...new Set([
    "index.html", "js/vendor/three-LICENSE.txt",
    ...[...html.matchAll(/(?:src|href)="\.\/(.*?)"/g)].map((match) => match[1].split(/[?#]/)[0]),
    ...JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8")).icons.map((icon) => icon.src.replace(/^\.\//, "")),
  ])];
  for (const file of paths) {
    if (path.isAbsolute(file) || file.split("/").includes("..")) throw new Error("Export paths must stay inside the project");
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, file), target);
  }
  return paths;
}
if (require.main === module) console.log("Exported " + buildPreview().length + " static files, including the Three.js license, to dist/.");
module.exports = { buildPreview };
