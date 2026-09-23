// Renderer selection never changes gameplay, input coordinates or saved progress.
let activeView = null;
function initializeView() {
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
  view?.dispose();
  document.getElementById("game").dataset.view = "2d";
  renderCanvasScene();
}
function render() {
  if (activeView) activeView.render();
  else renderCanvasScene();
}
let lastPaintState = "",
  lastPaintWidth = 0,
  lastPaintHeight = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, BALANCE.frame.maxDelta);
  last = now;
  tick(dt);
  if (
    !document.hidden &&
    (state !== "pause" ||
      lastPaintState !== state ||
      lastPaintWidth !== W ||
      lastPaintHeight !== H)
  ) {
    render();
    lastPaintState = state;
    lastPaintWidth = W;
    lastPaintHeight = H;
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
