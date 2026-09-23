// Renderer selection never changes gameplay, input coordinates or saved progress.
let activeView = null;
let viewNeedsPaint = true;
function initializeView() {
  document.getElementById("game").dataset.view = "2d";
  if (new URLSearchParams(location.search).get("view") === "2d") return;
  try {
    activeView = createThreeView();
    document.getElementById("game").dataset.view = "3d";
  } catch (error) {
    fallbackToCanvas(error);
  }
}
function render() {
  if (activeView) {
    try {
      activeView.render();
      return;
    } catch (error) {
      fallbackToCanvas(error);
    }
  }
  renderCanvasScene();
}
function fallbackToCanvas(error) {
  const view = activeView;
  activeView = null;
  if (view) {
    pause();
    view.dispose();
  }
  document.getElementById("game").dataset.view = "2d";
  viewNeedsPaint = true;
  if (error) console.warn("3D unavailable; using Canvas 2D.", error);
}
function resizeView() {
  viewNeedsPaint = true;
  if (!activeView) return;
  try {
    activeView.resize();
  } catch (error) {
    fallbackToCanvas(error);
  }
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
    (viewNeedsPaint || state !== "pause" ||
      lastPaintState !== state ||
      lastPaintWidth !== W ||
      lastPaintHeight !== H)
  ) {
    render();
    viewNeedsPaint = false;
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
$("sound").onclick = toggleSound;
soundUI();
ui();
hud();
requestAnimationFrame(frame);
