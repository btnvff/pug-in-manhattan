// Optional local-content loading for test hosts that prohibit browser navigation.
// Uses the real Chromium DOM/WebGL and original scripts, but does not test HTTP serving.
const fs = require("node:fs");
const path = require("node:path");
function installOfflinePages(context, root) {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...index.matchAll(/<script defer src="\.\/(.*?)"/g)].map((m) => m[1]);
  const html = index.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, "").replace(/<link[^>]*>/g, "");
  const newPage = context.newPage.bind(context);
  context.newPage = async (...args) => {
    const page = await newPage(...args);
    const goto = page.goto.bind(page);
    page.goto = async (url) => {
      const search = new URL(url).search;
      await goto("about:blank" + search);
      await page.setContent(html);
      await page.addStyleTag({ content: fs.readFileSync(path.join(root, "style.css"), "utf8") });
      for (const file of scripts)
        await page.addScriptTag({ content: fs.readFileSync(path.join(root, file), "utf8") });
      return null;
    };
    return page;
  };
}
module.exports = { installOfflinePages };
