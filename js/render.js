// Renderer selection never changes gameplay, input coordinates or saved progress.
let activeView = null, needsRender = true;
function initializeView() {
  if (activeView) return;
  document.getElementById("game").dataset.view = "2d";
  if (new URLSearchParams(location.search).get("view") === "2d") return;
  try {
    activeView = createThreeView();
    document.getElementById("game").dataset.view = "3d";
  } catch (error) {
    console.warn("3D unavailable; using Canvas 2D.", error);
    document.getElementById("game").dataset.view = "2d";
  }
}
function fallbackToCanvas(error) {
  if (error) console.warn("3D failed; using Canvas 2D.", error);
  pause();
  const view = activeView;
  activeView = null;
  try { view?.dispose(); }
  catch (cleanupError) { console.warn("3D cleanup failed; Canvas remains available.", cleanupError); }
  document.getElementById("game").dataset.view = "2d";
  renderCanvasScene();
  needsRender = true;
}
function render() {
  if (activeView) activeView.render();
  else renderCanvasScene();
  needsRender = false;
}
let lastPaintState = "";
function frame(now) {
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
  requestAnimationFrame(frame);
}
initializeView();
resize();
// Register only after all deferred scripts and both renderers are initialized.
window.addEventListener("resize", resize);
soundUI();
ui();
hud();
requestAnimationFrame(frame);
