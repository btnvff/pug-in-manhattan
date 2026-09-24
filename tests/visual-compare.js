// Compare two revisions in the same Chromium/OS/backend. No golden files are updated.
// Usage: node tests/visual-compare.js <git-ref>
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const { openBrowser } = require("./helpers/browser");
const root = path.resolve(__dirname,".."), ref = process.argv[2];
if (!ref || process.argv.length !== 3 || process.env.TEST_BASE_URL)
  throw new Error("Usage: node tests/visual-compare.js <git-ref>; compare local revisions, not TEST_BASE_URL");
const temp = fs.mkdtempSync(path.join(os.tmpdir(),"pug-visual-"));
const baseline = path.join(temp,"baseline");
(async () => {
  let before, after, comparisons = 0;
  try {
    execFileSync("git",["worktree","add","--detach",baseline,ref],{cwd:root,stdio:"pipe"});
    before = await openBrowser({deviceScaleFactor:2},{projectRoot:baseline,cpuRaster:true});
    after = await openBrowser({deviceScaleFactor:2},{projectRoot:root,cpuRaster:true});
    for (const session of [before,after]) {
      await session.context.addInitScript(() => {
        let seed=42;
        Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
      });
    }
    console.log("Visual environment:",JSON.stringify({chromium:after.browser.version(),os:os.type()+" "+os.release(),backend:"ANGLE SwiftShader; CPU CSS raster",dpr:2,transport:process.env.OFFLINE_BROWSER==="1"?"local content":"HTTP",excluded:"build-version text only"}));
    for (const [width,height] of [[390,844],[393,852],[430,932],[768,1024],[1280,900]]) {
      for (const mode of ["menu","play","pause","effects","reference"]) {
        const images=[];
        for (const [label,session] of [["base",before],["current",after]]) {
          const page=await session.context.newPage(), errors=[];
          page.on("pageerror",e=>errors.push(e.message));
          await page.setViewportSize({width,height});
          await page.goto(session.url+(mode==="reference"?"?ratio=reference":""));
          await page.addStyleTag({content:"#build-version { visibility:hidden!important; }"});
          await page.evaluate((mode)=>{
            prefs.sound=false;
            if (mode!=="menu" && mode!=="reference") {
              start(); spawnIn=999;
              items=Array.from({length:9},(_,type)=>({type,variant:type%8,x:55+type%5*65,y:230+Math.floor(type/5)*135,age:.2,angle:.1,spin:.05,phase:.3,warning:0,used:false}));
              clock=.7;worldTime=2;
              if(mode==="effects") { applyPower("shield");applyPower("helpers");collect({type:0});for(let i=0;i<45;i++)tick(1/60); }
              if(mode==="pause") pause();
            }
            resize();render();
          },mode);
          assert.equal(await page.locator("#game").getAttribute("data-view"),"3d");
          const image=await page.screenshot({animations:"disabled",timeout:30000});
          assert.deepEqual(errors,[]);
          if (process.env.SCREENSHOT_DIR) {
            fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
            fs.writeFileSync(path.join(process.env.SCREENSHOT_DIR,`visual-${label}-${width}x${height}-${mode}.png`),image);
          }
          images.push(image);
          await page.close();
        }
        assert.ok(images[0].equals(images[1]),`${width}x${height} ${mode}: screenshot differs in the identical test environment; investigate rather than update a golden`);
        comparisons++;
      }
    }
    console.log(`PASS: ${comparisons} byte-identical PNG pairs, therefore 0 differing pixels; only the revision label excluded. Models, WorldRatio, world, feedback and UI retain the baseline composition.`);
  } finally {
    if(before)await before.close();if(after)await after.close();
    try { execFileSync("git",["worktree","remove","--force",baseline],{cwd:root,stdio:"pipe"}); }
    finally { fs.rmSync(temp,{recursive:true,force:true}); }
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
