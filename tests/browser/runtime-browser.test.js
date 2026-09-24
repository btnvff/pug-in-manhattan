// Application ownership, measured raster budget and real GPU/RAF lifecycle.
const assert = require("node:assert/strict");
const { openBrowser, captureViews } = require("../helpers/browser");

(async () => {
  const session = await openBrowser({ deviceScaleFactor: 3, hasTouch: true });
  try {
    const { context, url } = session;
    await captureViews(context);
    // A cancellable queue allows deterministic checks of every lifecycle transition.
    await context.addInitScript(() => {
      const pending = new Map(); let next = 0;
      window.testRAF = pending;
      window.requestAnimationFrame = (callback) => { pending.set(++next, callback); return next; };
      window.cancelAnimationFrame = (id) => pending.delete(id);
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url);
    const subscriptions = await page.evaluate(() => {
      prefs.sound = false; render();
      const n = applicationListeners.length;
      for (let i = 0; i < 20; i++) bootstrap();
      return { n, after: applicationListeners.length, frames: testRAF.size };
    });
    assert.equal(subscriptions.n, subscriptions.after, "bootstrap is idempotent");
    assert.equal(subscriptions.frames, 1, "one pending frame, not one per bootstrap");
    const mobile = [];
    for (const [width, height] of [[390,844],[393,852],[430,932],[768,1024],[1280,900],[844,390]]) {
      await page.setViewportSize({ width, height });
      const metric = await page.evaluate(() => {
        resize(); start(); render();
        const rect = cv.getBoundingClientRect(), size = testViews.renderer.getDrawingBufferSize(new THREE.Vector2());
        const visible = (id) => { const r = $(id).getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1; };
        return { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
          css: [rect.width, rect.height], buffer: [size.x,size.y], overlay: [cv.width,cv.height], cap: BALANCE.frame.maxDpr,
          logical: [W,H], hud: visible("hud") && visible("pause") && visible("sound"),
          overflow: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert.deepEqual(metric.buffer, metric.overlay);
      assert.deepEqual(metric.logical, [390,844]);
      for (let i = 0; i < 2; i++) assert.ok(Math.abs(metric.buffer[i] - metric.css[i]*metric.cap) <= 1, "HiDPI raster uses the existing measured cap");
      assert.ok(metric.hud && !metric.overflow, "controls stay visible without overflow");
      mobile.push(metric);
      const r = await page.locator("#scene").boundingBox();
      await page.mouse.move(r.x+r.width*.5,r.y+r.height*.9);
      await page.mouse.down({ button: "right" });
      assert.equal(await page.evaluate(() => drag), null, "non-primary mouse button does not drag");
      await page.mouse.up({ button: "right" });
      await page.mouse.down();
      assert.notEqual(await page.evaluate(() => drag), null);
      const primary = await page.evaluate(() => drag);
      await page.evaluate(() => cv.dispatchEvent(new PointerEvent("pointerdown", { pointerId:999, pointerType:"touch", clientX:0, clientY:0 })));
      assert.equal(await page.evaluate(() => drag), primary, "second contact cannot steal capture");
      await page.mouse.move(r.x+r.width*.75,r.y+r.height*.9);
      assert.ok(await page.evaluate(() => Math.abs(pointerTarget-W*.75)<1), "pointer maps to logical coordinates after each resize");
      await page.evaluate(() => cv.dispatchEvent(new PointerEvent("pointercancel", {pointerId:drag})));
      assert.equal(await page.evaluate(() => drag), null);
      await page.mouse.up();
    }
    console.log("Raster measurements:", JSON.stringify(mobile));
    await page.setViewportSize({ width:390,height:844 });
    // Warm every food variant, helper and lazy hero visibility branch, then retire the
    // entire application twenty times. Shared resources are never per-mesh disposed.
    const cycles = [];
    for (let cycle = 0; cycle < 20; cycle++) {
      const metric = await page.evaluate(() => {
        resize(); start(); applyPower("helpers"); applyPower("birds");
        items = Array.from({length:72},(_,n)=>({type:n%9,variant:Math.floor(n/9),x:100+n%9*22,y:350,age:0,warning:0,used:false}));
        for (const time of [2.925,5.65,.7]) { clock=time; chewTime=.1; render(); }
        const renderer = testViews.renderer;
        const warm = {...renderer.info.memory,programs:renderer.info.programs.length};
        for (let n=0;n<3;n++) { menu(); render(); start(); render(); }
        const after = {...renderer.info.memory,programs:renderer.info.programs.length};
        const retiredCanvas = renderer.domElement;
        disposeApplication(); disposeApplication(); initializeView();
        const retired = { ...renderer.info.memory, programs: renderer.info.programs.length,
          frames:testRAF.size, subscriptions:applicationListeners.length, canvases:document.querySelectorAll("#scene-3d").length,
          overlayPixels:cv.width*cv.height, paths:pathCache.size };
        bootstrap();
        retiredCanvas.dispatchEvent(new Event("webglcontextlost",{cancelable:true}));
        return {warm,after,retired,live:{frames:testRAF.size,subscriptions:applicationListeners.length,unavailable:graphicsUnavailable}};
      });
      assert.deepEqual(metric.after, metric.warm, "restart/menu has no GPU growth after warming");
      assert.equal(metric.retired.geometries,0);
      // Three owns a lazily created DFG LUT; its context is lost on renderer disposal.
      assert.ok(metric.retired.textures <= 1, "no retained app texture on retired renderer");
      assert.equal(metric.retired.programs,0);
      assert.equal(metric.retired.frames,0); assert.equal(metric.retired.subscriptions,0); assert.equal(metric.retired.canvases,0);
      assert.equal(metric.retired.overlayPixels,0); assert.equal(metric.retired.paths,0);
      assert.deepEqual(metric.live,{frames:1,subscriptions:subscriptions.n,unavailable:false}, "retired callbacks cannot poison the next application");
      if (cycles.length) assert.deepEqual(metric.warm,cycles[0].warm,"identical GPU budget on each reinitialization");
      cycles.push(metric);
    }
    console.log("GPU lifecycle:",JSON.stringify({cycles:cycles.length,first:cycles[0],last:cycles.at(-1)}));
    // Audio remains one context across ordinary runs, but final teardown closes it.
    await page.evaluate(() => { prefs.sound=true; menu(); });
    await page.getByRole("button",{name:"Старт",exact:true}).click();
    await page.waitForFunction(()=>audioSystem.context?.state === "running",null,{polling:50});
    const audio = await page.evaluate(() => {
      const original = audioSystem.context;
      for(let i=0;i<20;i++) { menu(); start(); audioFrame(); }
      window.retiredAudioContext = original;
      return {same:original===audioSystem.context,nodes:audioSystem.nodes.size,voices:audioSystem.voices.size};
    });
    assert.ok(audio.same && audio.nodes===6 && audio.voices<=48);
    await page.waitForFunction(()=>audioSystem.retiring.size===0,null,{polling:50});
    await page.evaluate(()=>{disposeApplication();disposeApplication();});
    await page.waitForFunction(()=>retiredAudioContext.state==="closed",null,{polling:50});
    assert.deepEqual(await page.evaluate(()=>[audioSystem.nodes.size,audioSystem.voices.size,audioSystem.retiring.size,audioSystem.context]),[0,0,0,null]);
    // Partially initialized audio is owned even when a browser allocation throws.
    const partialAudio = await page.evaluate(() => {
      const Real = window.AudioContext; let closed=0,disconnected=0,allocations=0;
      window.AudioContext = class {
        createGain(){ if(++allocations===3) throw new Error("injected audio allocation"); return {disconnect(){disconnected++;}}; }
        close(){closed++;return Promise.resolve();}
      };
      unlockAudio();
      window.AudioContext=Real;
      bootstrap(); prefs.sound=false; start(); render();
      return {closed,disconnected,context:audioSystem.context,nodes:audioSystem.nodes.size};
    });
    assert.deepEqual(partialAudio,{closed:1,disconnected:2,context:null,nodes:0});
    // Genuine driver context loss, not just a DOM event.
    assert.ok(await page.evaluate(()=>{
      const extension=testViews.renderer.getContext().getExtension("WEBGL_lose_context");
      if (!extension) return false;
      extension.loseContext(); return true;
    }),"WEBGL_lose_context is available in this regression environment");
    await page.waitForFunction(()=>graphicsUnavailable,null,{polling:50});
    assert.deepEqual(await page.evaluate(()=>({frames:testRAF.size,state,canvas:document.querySelectorAll("#scene-3d").length})),{frames:0,state:"pause",canvas:0});
    assert.ok(await page.getByRole("button",{name:"Перезагрузить",exact:true}).isVisible());
    assert.deepEqual(errors,[],"no unhandled errors during normal lifecycle or controlled context loss");
    console.log("PASS: idempotent bootstrap; six viewports at DPR 3; pointer capture/multitouch/cancel; 20 GPU/application reinitializations; 60 restart/menu cycles; audio ownership/partial failure; genuine context loss cancels RAF.");
  } finally { await session.close(); }

  // Exercise native RAF callbacks as well as the deterministic cancellation queue.
  const live = await openBrowser({}, {freezeFrames:false});
  try {
    await live.context.addInitScript(() => {
      const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
      window.nativeRAF={pending,max:0,calls:0};
      window.requestAnimationFrame=(callback)=>{
        const id=request((time)=>{pending.delete(id);nativeRAF.calls++;callback(time);});
        pending.add(id);nativeRAF.max=Math.max(nativeRAF.max,pending.size);return id;
      };
      window.cancelAnimationFrame=(id)=>{pending.delete(id);cancel(id);};
    });
    const page=await live.context.newPage();
    await page.goto(live.url);
    await page.evaluate(()=>{prefs.sound=false;for(let i=0;i<20;i++)bootstrap();start();});
    await page.waitForFunction(()=>elapsed>.1,null,{polling:50});
    const before=await page.evaluate(()=>{
      Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));
      return {elapsed,clock,worldTime,frames:nativeRAF.pending.size,state};
    });
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>({elapsed,clock,worldTime,frames:nativeRAF.pending.size,state})),before,"hidden tab has no simulation, world animation or pending RAF");
    assert.equal(before.frames,0);assert.equal(before.state,"pause");
    await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"));});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>elapsed),before.elapsed,"visibility does not auto-resume the run");
    await page.getByRole("button",{name:"Продолжить",exact:true}).click();
    await page.waitForFunction((old)=>elapsed>old+.05,before.elapsed,{polling:50});
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true})));
    assert.equal(await page.evaluate(()=>nativeRAF.pending.size),0,"BFCache entry suspends RAF");
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
    const result=await page.evaluate(()=>({max:nativeRAF.max,calls:nativeRAF.calls,pending:nativeRAF.pending.size,state}));
    assert.equal(result.max,1);assert.equal(result.pending,1);assert.equal(result.state,"pause");
    await page.evaluate(()=>{disposeApplication();});
    assert.equal(await page.evaluate(()=>nativeRAF.pending.size),0);
    console.log("Native RAF:",JSON.stringify(result));
    console.log("PASS: one native RAF chain; hidden simulation/audio stopped; visible return stays paused; persisted page events suspend safely; teardown cancels the pending callback.");
  } finally { await live.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
