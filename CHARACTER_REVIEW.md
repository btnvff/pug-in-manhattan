# Character update: design and debugging review

## Scope and source of truth

Prepared against `main` at `d098d5e7a98b257d65fb0e3e0d65e0cffce29771`, on the local working branch `chatgpt/hero-appeal-local`. The remote `main` SHA was checked through the authorized GitHub connection. Direct Git fetch failed with `Could not resolve host: github.com`. Existing uncommitted character work was retained. No new commit, push, merge, or deployment was performed.

The separate, unmerged environment-polish branch was not folded into this update. Core gameplay, balance, input, collision coordinates, sounds, progress storage, food models and city artwork retain their baseline behavior and content. Cleanup of shared model resources is the only factory change beyond delegating hero construction.

## Character direction and model review

The baseline's stacked head ellipsoids, separate facial plates and prominent spherical eyes read as assembled parts rather than one coherent face. The light muzzle pads compete with the dark mask. Long oval ears, a torus-like tail and individually exposed jaw pieces add to the toy-like impression. Blinking compressed the iris without closing the surrounding eye opening; foot movement followed the whole-body bob instead of keeping support on the ground.

The working direction is a compact, softly rounded, warm fawn hero with a short, broad muzzle and a clear red bandana accent. It remains procedural stylized 3D, not a generated image or an external asset.

- Head and face: softly squared continuous head surface, a vertex-colored mask, one blunt muzzle, smaller and flatter inset eyes, restrained catchlights, a small nose and smile. Brows and the forehead fold remain deliberately sparse.
- Ears and silhouette: short folded flaps replace elongated spheres. The tail is a tapered curved tube with a closed rounded tip. The torso is compact, with separate haunches and four rounded paws.
- Materials and grounding: dedicated warm matte materials do not change city/drop shading. A generated 64-by-64 texture is shared by the soft floor shadow, paw contact shadows and two rare breath wisps.
- Motion: the pose sampler reuses an output buffer and reads existing smoothed motion, gaze and reaction timers. Idle breathing, eye/head attention, alternating steps, bounded squash/stretch, chew/savor and a mild negative reaction are distinct layers. No gameplay randomness is consumed.
- Support: front and hind foot placement solves the ellipsoid's lowest world-space Y point after body roll, body scaling and ankle flex. Visual lean fades near the unchanged input margin; the catch position itself is not moved.
- Pause: all pose calculations derive from the frozen game clock and frozen simulation signals. Steam, shadows and every transform remain identical across paused renders. Old catch timers cannot leave the menu or result screen chewing indefinitely.

The model currently uses 51 meshes and 43,742 triangles when counting all visibility branches. These are static budget checks, not evidence of a particular frame rate on a phone. Character appeal remains an art judgment; this review does not certify App Store readiness.

## Reproduced failures and fixes

### Unhandled animation failure stopped the loop

Before the fix, an injected `animatePugModel` exception escaped `frame()`. The game still reported `play` / `3d`, but no next RAF was scheduled. Guarded render/resize entry points now call the shared Canvas fallback. The run pauses without losing its gameplay state; the failed view is disposed, and RAF continues. The user can resume in Canvas.

### Model construction failure leaked the renderer lifecycle

Previously, renderer/model construction happened outside the final initialization `try` block. Injecting a model-construction exception created one renderer and called its disposal zero times. Setup is now covered, as is initial world creation/DOM insertion. The same reproduction records one renderer disposal and one context release.

### Cleanup and late events

A view now has an idempotent `dispose()`. It releases hero-owned assets, world-owned assets, shared geometries/materials, object pools and the renderer. The context-loss handler is detached before forcing context loss; late events from a retired canvas cannot pause a newer run. An old world reference is cleared before a resize rebuild, preventing repeated disposal when rebuilding fails.

### False GPU leak assertion

The shipped Three.js r185 creates a shared `DFG_LUT` for standard materials. The old character GPU test demanded zero textures after deleting the hero and therefore flagged that renderer-owned texture as a character leak. The corrected test warms a separate standard-material probe first, disposes the probe, and records the independent renderer baseline. All six hero construction/animation/disposal cycles must return exactly to that baseline. The vendor library and its LUT are not modified or manually disposed by the character.

The general browser parity test also now asserts the requested renderer before replay, so accidental fallback cannot masquerade as a successful 3D/2D comparison.

## Validation

The following commands passed in the local runtime:

```sh
find js tests -name '*.js' ! -path '*/vendor/*' -print0 | xargs -0 -n1 node --check
node tests/gameplay.test.js --compare d098d5e
node tests/character.test.js
```

Browser tests use externally installed Playwright and Chromium. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` to that external installation; no package manager or build step was added to the application.

```sh
OFFLINE_BROWSER=1 node tests/browser.test.js
node tests/character-browser.test.js
node tests/render-lifecycle.test.js
```

On this headless Linux host the browser commands were run through `xvfb-run -a` to supply a working virtual display. The default display produced a `BindToCurrentSequence failed` WebGL-context error, including on an empty canvas. No browser policies were changed.

Coverage includes three seeded 120-second runs identical to the base commit; touch drag; pause/blur/resume; all nine food models; 17 power/effect cases; real-WebGL versus Canvas replay parity; 320x568, 390x844 and 844x390 layouts; lose/restart; nine rendered hero states; exact pause transforms; a 3,600-frame pose sweep; 240 edge poses; six hero GPU lifecycle cycles; injected model/animation/renderer/resize failures; actual WebGL context loss; repeated disposal; stale-canvas callbacks; and continuing RAF/Canvas gameplay after failure. Lifecycle tests observe disposal events on actual hero/world/shared resources, not just a boolean flag.

## Limits and remaining review

The browser tests in this environment load local HTML/CSS/scripts into real Chromium DOM/WebGL. They do not test HTTP navigation, deployed GitHub Pages, installation, offline caching, real Safari/iPhone, thermal behavior, touch/audio behavior on physical hardware, or a guaranteed mobile frame rate. The original Canvas hero remains the fallback artwork; the 3D redesign does not silently replace it.

A physical-phone playtest and an art approval pass at native mobile size remain necessary before calling the character production-ready. Raw screenshots and test output accompany the review build outside the repository; diagnostic scripts and browser dependencies are not application files.
