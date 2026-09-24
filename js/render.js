// One WebGL presentation. Graphics failure stops play; no alternative renderer.
let activeView = null, needsRender = true;
function initializeView() {
  if (activeView || graphicsUnavailable) return;
  try {
    activeView = createThreeView();
    $("game").dataset.view = "3d";
  } catch (error) {
    showGraphicsError(error);
  }
}
function showGraphicsError(error) {
  if (graphicsUnavailable) return;
  graphicsUnavailable = true;
  if (error) console.warn("3D graphics unavailable.", error);
  pause();
  clearInput();
  stopAudioVoices();
  const view = activeView;
  activeView = null;
  try { view?.dispose(); }
  catch (cleanupError) { console.warn("3D cleanup failed.", cleanupError); }
  if (ctx) clearRatioCanvas();
  $("game").dataset.view = "unavailable";
  ui();
}
function render() {
  activeView?.render();
  needsRender = false;
}
let lastPaintState = "";
function frame(now) {
  if (graphicsUnavailable) return;
  const dt = Math.min((now - last) / 1000 || 0, BALANCE.frame.maxDelta);
  last = now;
  tick(dt);
  if (
    !document.hidden &&
    (state !== "pause" ||
      lastPaintState !== state ||
      needsRender)
  ) {
    render();
    lastPaintState = state;
  }
  audioFrame();
  if (!graphicsUnavailable) requestAnimationFrame(frame);
}
initializeView();
resize();
// Register only after all deferred scripts and the 3D view are initialized.
window.addEventListener("resize", resize);
soundUI();
ui();
hud();
if (!graphicsUnavailable) requestAnimationFrame(frame);
