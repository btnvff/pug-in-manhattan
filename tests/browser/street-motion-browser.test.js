// Regression for a street that appears frozen. Unlike pose-only tests, this
// leaves the application's native RAF running and never manually advances tick.
const assert = require("node:assert/strict");
const expectedVersion = require("node:fs").readFileSync(require("node:path").join(__dirname,"../../index.html"),"utf8").match(/id="build-version"[^>]*>(v[\d.]+)</)[1];
const { openBrowser, captureViews } = require("../helpers/browser");
(async () => {
  const session = await openBrowser({ deviceScaleFactor: 1, hasTouch: true, isMobile: true }, { freezeFrames: false });
  try {
    await captureViews(session.context);
    const page = await session.context.newPage(), errors = [];
    page.setDefaultTimeout(30000);
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(session.url);
    await page.waitForFunction(() => activeView && $("game").dataset.view === "3d");
    assert.equal(await page.locator("#build-version").textContent(), expectedVersion);
    await page.getByRole("button", {name:"Старт",exact:true}).click();
    await page.waitForFunction(() => elapsed > .5 && items.length > 0);
    const before = await page.evaluate(() => {
      window.streetActors = testViews.worldScene.children.find(n => n.name === "ratio-world").children.filter(n => n.isGroup);
      window.streetCar = streetActors.find(n => n.userData.dimensions?.length);
      window.streetWalker = streetActors.find(n => !n.userData.dimensions?.length);
      window.observedFood = items[0];
      return {time:worldTime,food:observedFood.y,car:streetCar.position.toArray(),person:streetWalker.position.toArray(),draws:testViews.draws};
    });
    await page.waitForFunction(t => worldTime > t + .8, before.time);
    const after = await page.evaluate(() => ({time:worldTime,food:observedFood.y,car:streetCar.position.toArray(),person:streetWalker.position.toArray(),draws:testViews.draws}));
    const moved = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
    assert.ok(moved(after.car,before.car)>3,"car travels with native frames");
    assert.ok(moved(after.person,before.person)>.3,"pedestrian travels with native frames");
    assert.ok(after.food-before.food>60,"food really falls");
    assert.ok(after.draws>before.draws,"the view is repainting");
    const rect = await page.locator("#scene").boundingBox();
    const cdp = await session.context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x:rect.x+rect.width*.5,y:rect.y+rect.height*.9}]});
    await cdp.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x:rect.x+rect.width*.78,y:rect.y+rect.height*.9}]});
    await page.waitForFunction(()=>x>260);
    await cdp.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
    await page.getByRole("button", {name:"Пауза",exact:true}).click();
    const paused = await page.evaluate(() => JSON.stringify({worldTime,clock,elapsed,x,items,actors:streetActors.map(n=>[n.position.toArray(),n.quaternion.toArray()])}));
    await page.waitForTimeout(300);
    await page.evaluate(() => { render(); render(); });
    assert.equal(await page.evaluate(() => JSON.stringify({worldTime,clock,elapsed,x,items,actors:streetActors.map(n=>[n.position.toArray(),n.quaternion.toArray()])})),paused,"pause/repaint is frozen exactly");
    const old = await page.evaluate(()=>elapsed);
    await page.getByRole("button",{name:"Продолжить",exact:true}).click();
    await page.waitForFunction(t=>elapsed>t+.2,old);
    // A genuine visibility handler must not accumulate hidden-time debt.
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
    const hidden = await page.evaluate(()=>[elapsed,worldTime]);
    await page.waitForTimeout(200);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
    assert.deepEqual(await page.evaluate(()=>[elapsed,worldTime]),hidden);
    assert.equal(await page.evaluate(()=>state),"pause");
    const restart = await page.evaluate(()=>{
      items=Array.from({length:9},(_,type)=>({type,variant:0,x:195,y:320,age:0,used:false,warning:0}));
      clock=.7; render();
      const gpu=()=>({...testViews.renderer.info.memory,programs:testViews.renderer.info.programs.length});
      const before=gpu();
      for(let i=0;i<4;i++){start();pause();clock=.7;render();}
      return {before,after:gpu(),actors:streetActors.length};
    });
    assert.deepEqual(restart.after,restart.before,"restarts do not allocate street resources");
    assert.equal(restart.actors,8);
    await page.evaluate(()=>testViews.renderer.getContext().getExtension("WEBGL_lose_context").loseContext());
    await page.waitForFunction(()=>graphicsUnavailable && !activeView);
    assert.equal(await page.evaluate(()=>$("game").dataset.view),"unavailable");
    assert.equal(await page.evaluate(()=>frameRequest),null);
    assert.deepEqual(errors,[]);
    console.log("Native motion:",JSON.stringify({version:expectedVersion,before,after,restart}));
    console.log("PASS: native RAF moves cars, people and food; drag works; exact pause, resume/visibility, bounded restarts and genuine context-loss shutdown.");
  } finally { await session.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
