// Single application entry point. This module owns RAF, subscriptions and teardown.
let graphicsUnavailable = false, last = 0;
let activeView = null, needsRender = true, lastPaintState = "";
let applicationStarted = false, pageSuspended = false, frameRequest = null;
const applicationListeners = [];

function listen(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  applicationListeners.push(() => target.removeEventListener(type, handler, options));
}
function stopFrame() {
  if (frameRequest !== null) cancelAnimationFrame(frameRequest);
  frameRequest = null;
}
function scheduleFrame() {
  if (frameRequest === null && applicationStarted && !pageSuspended &&
      !graphicsUnavailable && !document.hidden)
    frameRequest = requestAnimationFrame(frame);
}
function initializeView() {
  if (!applicationStarted || activeView || graphicsUnavailable) return;
  try {
    activeView = createThreeView();
    $("game").dataset.view = "3d";
  } catch (error) {
    showGraphicsError(error);
  }
}
function releaseView() {
  const view = activeView;
  activeView = null;
  try { view?.dispose(); }
  catch (error) { console.warn("3D cleanup failed.", error); }
}
function showGraphicsError(error) {
  if (graphicsUnavailable) return;
  graphicsUnavailable = true;
  stopFrame();
  if (error) console.warn("3D graphics unavailable.", error);
  pause();
  clearInput();
  disposeAudio();
  releaseView();
  if (ctx) clearRatioCanvas();
  $("game").dataset.view = "unavailable";
  ui();
}
function render() {
  activeView?.render();
  needsRender = false;
}
function frame(now) {
  // Also makes an explicitly requested frame safe while a callback is pending.
  stopFrame();
  if (!applicationStarted || graphicsUnavailable || pageSuspended || document.hidden) return;
  const dt = Math.min((now - last) / 1000 || 0, BALANCE.frame.maxDelta);
  last = now;
  tick(dt);
  if (state !== "pause" || lastPaintState !== state || needsRender) {
    render();
    lastPaintState = state;
  }
  audioFrame();
  scheduleFrame();
}
function resize() {
  // A viewport change only changes raster resolution and CSS fit, never the run.
  const pad=getComputedStyle(document.body);
  const availableW=innerWidth-parseFloat(pad.paddingLeft)-parseFloat(pad.paddingRight);
  const availableH=innerHeight-parseFloat(pad.paddingTop)-parseFloat(pad.paddingBottom);
  const fit=WorldRatio.fit(availableW,availableH),game=$('game');
  game.style.setProperty('--ratio-fit',fit.width/W);
  game.style.left=(parseFloat(pad.paddingLeft)+availableW/2)+'px';
  game.style.top=(parseFloat(pad.paddingTop)+availableH/2)+'px';
  const dpr=Math.min(devicePixelRatio||1,BALANCE.frame.maxDpr);
  cv.width=Math.round(fit.width*dpr);cv.height=Math.round(fit.height*dpr);
  ratioRaster=cv.width/PUG_WORLD_RATIO.reference_width;
  needsRender = true;
  if(ctx)beginRatioFeedback();
  if(activeView)activeView.resize();
}


function suspendApplication() {
  stopFrame();
  pause();
  clearInput();
  stopAudioVoices();
}
function resumeFrames() {
  // Never turn time spent hidden or in the back/forward cache into simulation debt.
  last = performance.now();
  needsRender = true;
  scheduleFrame();
}
function disposeApplication() {
  if (!applicationStarted) return;
  applicationStarted = false;
  suspendApplication();
  for (const remove of applicationListeners.splice(0)) remove();
  releaseView();
  disposeAudio();
  pathCache.clear();
  if (ctx) clearRatioCanvas();
  cv.width = cv.height = 0;
  overlay.innerHTML = "";
}
function bootstrap() {
  if (applicationStarted || graphicsUnavailable) return;
  applicationStarted = true;
  pageSuspended = false;
  bindUI(listen);
  bindInput(listen);
  listen(document, "visibilitychange", () => {
    if (document.hidden) suspendApplication();
    else resumeFrames();
  });
  listen(window, "blur", () => { pause(); clearInput(); });
  listen(window, "pagehide", (event) => {
    pageSuspended = true;
    if (event.persisted) suspendApplication();
    else disposeApplication();
  });
  listen(window, "pageshow", () => {
    if (!pageSuspended) return; // Initial navigation keeps the established first frame.
    pageSuspended = false;
    resumeFrames();
  });
  initializeView();
  resize();
  listen(window, "resize", resize);
  soundUI();
  ui();
  hud();
  scheduleFrame();
}
bootstrap();
