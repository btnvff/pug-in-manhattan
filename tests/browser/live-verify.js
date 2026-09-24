// Explicit production verification. This is not silently part of local unit tests.
// TEST_BASE_URL=https://host/project/ node tests/browser/live-verify.js
const assert=require("node:assert/strict"), fs=require("node:fs"), path=require("node:path");
const {openBrowser,captureViews}=require("../helpers/browser");
const root=path.resolve(__dirname,"../.."),base=process.env.TEST_BASE_URL;
if(!base || !/^https?:\/\//.test(base) || !base.endsWith("/") || process.env.OFFLINE_BROWSER)
  throw new Error("Set TEST_BASE_URL to the deployed project URL ending in /; no offline mode");
(async()=>{
  const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.webmanifest"),"utf8"));
  const urls=[...new Set(["index.html","js/vendor/three-LICENSE.txt",...[...index.matchAll(/(?:src|href)="\.\/(.*?)"/g)].map(m=>m[1]),...manifest.icons.map(i=>i.src.replace(/^\.\//,""))])];
  for(const relative of urls){
    const url=new URL(relative,base);url.searchParams.set("verify",process.env.EXPECTED_SHA||"current");
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,relative);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(path.join(root,relative.split(/[?#]/)[0])),relative+": production bytes match this checkout");
  }
  const session=await openBrowser({deviceScaleFactor:3},{url:base,freezeFrames:false});
  try{
    await captureViews(session.context);
    const page=await session.context.newPage(),errors=[],network=[],loaded=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    page.on("response",r=>{loaded.push(r.url());if(r.status()>=400)network.push([r.status(),r.url()]);});
    page.on("requestfailed",r=>network.push([r.failure()?.errorText,r.url()]));
    await page.goto(base,{waitUntil:"networkidle"});
    await page.waitForFunction(()=>testViews.renderer&&document.querySelector("#game").dataset.view==="3d",null,{polling:50});
    await page.getByRole("button",{name:"Старт",exact:true}).click();
    await page.waitForFunction(()=>elapsed>.2,null,{polling:50});
    assert.ok(await page.evaluate(()=>state==="play"&&testViews.worldScene.children.length>0));
    const r=await page.locator("#scene").boundingBox();
    await page.mouse.move(r.x+r.width*.5,r.y+r.height*.9);await page.mouse.down();await page.mouse.move(r.x+r.width*.75,r.y+r.height*.9);
    await page.waitForFunction(()=>x>250,null,{polling:50});await page.mouse.up();
    await page.getByRole("button",{name:"Пауза",exact:true}).click();
    const paused=await page.evaluate(()=>elapsed);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>elapsed),paused);
    await page.getByRole("button",{name:"Продолжить",exact:true}).click();
    await page.waitForFunction(old=>elapsed>old,paused,{polling:50});
    await page.getByRole("button",{name:"Пауза",exact:true}).click();
    await page.getByRole("button",{name:"Заново",exact:true}).click();
    await page.setViewportSize({width:430,height:932});
    await page.waitForFunction(()=>cv.width===645,null,{polling:50});
    const status=await page.evaluate(()=>({revision:$("build-version").textContent,view:$("game").dataset.view,state,
      audio:audioSystem.context?.state,buffer:[cv.width,cv.height],gpu:{...testViews.renderer.info.memory},pendingFrame:frameRequest!==null}));
    assert.equal(status.audio,"running","audio unlocked by production user gesture");
    await page.getByRole("button",{name:"Пауза",exact:true}).click();
    await page.getByRole("button",{name:"Главное меню",exact:true}).click();
    assert.equal(await page.evaluate(()=>state),"menu");
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    assert.ok(loaded.every(url=>!url.includes("localhost")&&!url.includes("127.0.0.1")),"no local production dependencies");
    if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,"production-menu.png")});}
    console.log("Production:",JSON.stringify({base,sha:process.env.EXPECTED_SHA,verifiedAssets:urls.length,requests:loaded.length,consoleErrors:errors,networkErrors:network,...status}));
    console.log("PASS: production assets are byte-exact; native RAF, Manhattan/pug, start, input, audio, pause/resume, restart, resize and menu work over real HTTP.");
  }finally{await session.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
