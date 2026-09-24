// One pointer/keyboard flow in logical coordinates; bootstrap owns subscriptions.
let pointerTarget = x, drag = null, offset = 0;
const keys = new Set();
function clearInput() {
  keys.clear();
  if (drag !== null) {
    try {
      cv.releasePointerCapture(drag);
    } catch {}
  }
  drag = null;
  pointerTarget = x;
}

function bindInput(listen) {
  listen(cv, "pointerdown", (e) => {
    if (state !== "play" || drag !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (audioSystem.context?.state !== "running") unlockAudio();
    let r = cv.getBoundingClientRect(),
      px = (e.clientX - r.left) / r.width * W,
      py = RatioPresentation.logicalY((e.clientY - r.top) / r.height * PUG_WORLD_RATIO.reference_height);
    if (py < ground() - 145) return;
    drag = e.pointerId;
    offset = px - x;
    pointerTarget = x;
    try { cv.setPointerCapture(drag); }
    catch { clearInput(); return; }
    e.preventDefault();
  });
  listen(cv, "pointermove", (e) => {
    if (e.pointerId !== drag || state !== "play") return;
    let r = cv.getBoundingClientRect();
    if (movementBlocked()) {
      offset = (e.clientX - r.left) / r.width * W - x;
      pointerTarget = x;
      e.preventDefault();
      return;
    }
    pointerTarget = clamp((e.clientX - r.left) / r.width * W - offset, margin(), W - margin());
    e.preventDefault();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
    listen(cv, ev, (e) => {
      if (e.pointerId === drag) {
        // Release explicitly as well as handling the browser's implicit release.
        // Clear the ID first: lostpointercapture must not re-enter this handler.
        const pointer = drag;
        drag = null;
        pointerTarget = x;
        if (ev !== "lostpointercapture") {
          try { cv.releasePointerCapture(pointer); } catch {}
        }
      }
    }),
  );
  listen(window, "keydown", (e) => {
    let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft", "ArrowRight", "a", "d"].includes(k) && state === "play") {
      if (e.target?.closest?.("button")) return;
      if (audioSystem.context?.state !== "running") unlockAudio();
      keys.add(k);
      e.preventDefault();
    }
    if (e.key === "Escape") pause();
  });
  listen(window, "keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
}
