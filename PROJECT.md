# Pug in Manhattan — technical reference

## Product and change boundaries

The product is a WebGL 2 / Three.js arcade with procedural 3D Manhattan, a 3D pug, world actors, food and a transparent screen-space Canvas overlay. The checked-in Three.js r185 and adjacent MIT license are runtime dependencies. No package installation, transpiler, module bundler, CDN, external image or audio service is required to play.

Preserve gameplay rules, RNG draw order, scoring, hitboxes, spawn rates, balance, character design and camera composition during engineering work. Simulation is not presentation. New gameplay or art direction is a separate change. Do not split coherent files by line count; use responsibility boundaries, not wrappers or empty directories.

`README.md` is the player/developer overview. This file is the current technical contract, not a changelog. The canonical game version is the `#build-version` text in [index.html](index.html); its CSS/JS/manifest `?v=` keys are matching cache identifiers, checked by `tests/repository.test.js`, not independent version sources. Increment PATCH only for a completed, verified user-visible iteration or behavior fix. Audits, documentation-only changes and failed or unfinished attempts do not increment it. WorldRatio has its own independent version and immutable fixture.

## Current version and known-good state

Current game version: **v0.0.3**. Latest confirmed playable baseline and runtime rollback point: **[41350649cf572b4bdb083a255928c9b197109b9d](https://github.com/btnvff/pug-in-manhattan/commit/41350649cf572b4bdb083a255928c9b197109b9d)**, merged in PR #10. Documentation-only commits do not replace this runtime baseline. Always read the current remote `main` before work; never reset newer work to this recorded commit.

Verification evidence from **2026-09-24**: [Pages deployment](https://github.com/btnvff/pug-in-manhattan/actions/runs/36005769488) succeeded; [post-merge production verification](https://github.com/btnvff/pug-in-manhattan/actions/runs/36005839981) checked byte-exact resources and five live browser suites. These are dated successful runs, not a promise of a fresh live check on every audit or a physical-device certification. The visible badge currently reads `v0.0.3` only; it does **not** show a commit hash. Do not describe it as `v0.0.3 · 41350649` or fetch remote HEAD and present that as the running code.

The product is intentionally FULL-3D. Do not restore the retired standalone 2D world, pug, food renderer, view selector or old-game fallback. Earlier instructions to preserve that fallback refer to the retired architecture. Preserve the Canvas overlays, diagnostics and procedural textures used by the current 3D product. Permanent review entry points are [PUG-WORLD-RATIO.md](PUG-WORLD-RATIO.md) and [CHARACTER_REVIEW.md](CHARACTER_REVIEW.md); they point to the current implementations and constraints rather than historical preview reports.

### Unpublished street-environment checkpoint — 2026-09-24

`chatgpt/street-environment-rebuild` starts from main `3e5cc643fbfc2982b6309a6c9c268f1f04975c73`. **PARTIAL**: the badge/cache keys remain v0.0.3; this is not a new release or production baseline. Retain the runtime rollback point above. No merge or deployment is authorized for this checkpoint.

`js/world/ratio-scene.js` now uses registry-driven street edges with continuous block/sidewalk ground and curb returns. The bridge has one connected deck inside its previous overall envelope, tower crossheads and cable spans derived from the same supports. Camera, ratio 1.0.0/fixture, hero, gameplay and actor motion are unchanged. Ground coverage, tower/cable contact, deck continuity and hanger connections have targeted assertions in `tests/world/world-ratio.test.js`.

Checked locally: repository, WorldRatio and ratio-runtime tests; gameplay comparison with the starting main (three seeds, 30 seconds each); actual Chromium 144/WebGL 2 SwiftShader reference, blockout and phone-size menu/play captures. Matching reference captures retain identical camera/hero metadata and zero changed pixels in the hero/contact and HUD regions. Targeted browser checks passed for sampled actor bounds, same-time/pause invariance, three fixed-pose restarts and genuine context-loss shutdown. The broader browser suite timed out during its restart stress loop and is **not** recorded as passed. Browser loading used the existing local-content mode because HTTP navigation was blocked; the separate Node HTTP asset check passed. No Safari/physical-phone, mobile-performance or fresh production verification is claimed.

Remaining: the target art reference was not present among the supplied baseline screenshots. Building composition, bridge visibility through the buildings, foreground asymmetry/material polish and actor-route improvements await that reference/next checkpoint. Do not mark the full environment update ready for visual approval or bump PATCH until those required visual criteria are met.

## Normal development loop

User request → inspect current relevant files/contracts → one focused change → targeted verification → check behavior when possible → increment PATCH for a completed user-visible iteration/fix → commit/push when appropriate → report actual version, checks, branch, commit and publication status. Keep the latest known-good playable commit as the rollback point for risky work. Commit/push authorization does not imply permission to merge or rewrite history.

Choose tests by the changed responsibility: pug changes use character and relevant visual/runtime checks; gameplay uses gameplay/RNG and a smoke test; world/camera uses WorldRatio and relevant visual/runtime checks; UI uses relevant browser behavior and viewport checks. Documentation-only changes need links/path consistency and a diff review. The full historical structural regression, long parity runs and 25 image pairs are **not** the default gate for every small edit; use them when scope or a specific regression justifies them. Inspect a failed step before making another change; an environment-blocked test is not a pass and does not by itself justify changing the game.

Launch from the repository root with `python3 -m http.server 8000`; see [README.md](README.md#running-locally). Keep no npm, bundler, app ES modules or runtime CDN; retain local Three.js, the explicit defer order, Russian UI, existing controls/balance/RNG and portrait-first composition.

GitHub-managed **pages build and deployment** is the essential publication workflow. Its confirmed baseline run checked out `main` and built the repository root. There are no checked-in workflows on the baseline `main`; temporary `structure-verification.yml` and the older `pug-world-ratio.yml` survive only on historical branches and are not part of the normal development loop. Do not merge, recreate or rerun them for routine work, or create a new publication workflow to compensate for local network/browser restrictions. Preserve the existing Pages deployment; verify administrative settings directly when a deployment change actually requires it.

## Module map and initialization

All runtime JS files have one explicit `defer` script connection in `index.html`. Definitions use shared lexical globals in a single browser realm; they are not ES modules. Functions may refer to later definitions, but must not call those dependencies during file evaluation. Do not introduce implicit assignments to `window` or circular initialization. Only the bootstrap performs application subscription and startup.

The actual load order is:

```text
balance → world-ratio → ui → game → pug-motion → input
→ run-state → powers → events → street-events → audio
→ canvas-primitives → feedback-overlay → Three.js
→ pug-3d → pug-animation → models-3d → ratio-scene
→ ratio-diagnostics → renderer-3d → bootstrap
```

| Module | Responsibility and important dependencies |
| --- | --- |
| `js/app/ui.js` | DOM handles `$`, `cv`, `ctx`, `overlay`; persisted `prefs`; HUD/menu/error markup and UI bindings. Reads run state and calls game/audio commands only after startup. |
| `js/app/input.js` | One Pointer Events/keyboard flow; `keys`, `drag`, `pointerTarget`; clear/capture/release. Converts screen coordinates through WorldRatio. |
| `js/app/bootstrap.js` | Idempotent initialization; one active view; application-owned subscriptions and RAF; resize/raster; visibility/blur/page lifecycle; controlled graphics error and final disposal. |
| `js/game/game.js` | State transitions, simulation clock, difficulty, spawns, collisions, collection and effects. Calls the existing game subsystems and motion update; does not construct GPU resources. |
| `js/game/balance.js` | Numeric gameplay/raster configuration, food definitions and hazard/bone helpers. |
| `js/game/run-state.js` | Run progress, streak/near-miss tracking, rhythm and related HUD state. |
| `js/game/powers.js` | Timed powers, helper signals, gifts and power HUD. |
| `js/game/events.js` | Event timing, emitted items and event effects. |
| `js/game/street-events.js` | Missed-drop motion, penalties, sparse cat pickup scheduling. |
| `js/character/pug-motion.js` | Simulation-time locomotion/gaze state, damping and motion reset. Invoked by `tick`, not by Three.js render. |
| `js/character/pug-animation.js` | Pure pose sampling and application to the hero rig. No gameplay RNG or rule mutation. |
| `js/character/pug-3d.js` | Procedural hero construction, rig and private GPU-resource ownership. |
| `js/world/world-ratio.js` | Frozen `PUG_WORLD_RATIO`, `WorldRatio` projection/fit and `RatioPresentation` coordinate adapters; optional `ratio` review mode. |
| `js/world/ratio-scene.js` | Procedural world, materials/textures, measured placement and world actors; reads `worldTime`, uses the model factory. |
| `js/world/models-3d.js` | Shared geometry/material factory for food/cats/birds; exception-safe resource disposal helper. |
| `js/render/renderer-3d.js` | Creates the two scene/camera passes, normalizes the hero, reads game state, pools visuals, invokes feedback and handles view disposal. `foodAngle` is presentation-only. |
| `js/render/feedback-overlay.js` | Transparent screen-space aura, hazard/food cues, floating/victory/event/run feedback. |
| `js/render/canvas-primitives.js` | Shared Canvas drawing primitives used by the feedback overlay. |
| `js/render/ratio-diagnostics.js` | Ratio inspection labels and guides in screen space. |
| `js/systems/audio.js` | Gesture-created WebAudio graph, score/Foley, preferences, voice ownership, scene transitions and teardown. |
| `js/vendor/` | Pinned local Three.js implementation and license; upgrades require explicit review. |

Keep `style.css` as one coherent stylesheet. Static icon files live under `assets/icons/`; all other visual/audio content is procedural. Do not create empty texture/image/audio pipelines. `scripts/build-preview.js` discovers paths from HTML/manifest, copies only runtime resources and the license, and refuses to replace a nonempty destination.

## Simulation and presentation

`tick(dt)` owns simulation, collision/scoring/timers and the existing motion/gaze signal updates. `frame(now)` passes the existing capped delta, `min(delta, BALANCE.frame.maxDelta)` with a 0.04-second ceiling. Long browser stalls do not produce unlimited catch-up steps. This is a capped variable-step simulation, not a fixed-step engine: deterministic parity means identical seed, input sequence and delta sequence. Do not claim bit-identical trajectories for arbitrary different time-step partitions.

The render passes, pure pose sampler, world animation and overlay must not mutate gameplay state, consume its RNG or create rule outcomes. The simulation-time gaze update in `pug-motion.js` does consume the established random sequence; keep it in `tick` and preserve its draw order. An apparently unused established random draw in collection is also intentional for parity. The audio noise buffer has its own private seeded generator and must not shift gameplay randomness.

`start`, `menu`, `pause` and `finish` remain rule/state transitions, not renderer construction. Restart/menu reuse the same view and shared resources. World geometry and character pose sampling never determine hitboxes or spawn rules. Diagnostics must remain read-only. Array/object keys in the renderer are presentation Maps/WeakMaps, not extra fields added to simulation objects.

## PUG WORLD RATIO invariants

`js/world/world-ratio.js` and `tests/fixtures/ratio-1.0.0.json` define **1.0.0**. The fixture digest is tested; never rewrite it to make a changed composition pass. A locked-value change requires a new ratio version and a retained fixture.

Composition: **600 × 1125**, aspect **8/15**. Logical gameplay remains **390 × 844**. Pug height is **0.16** of the composition, neutral width/height target **0.67**, ground **v = 0.88**, reference pug **u = 0.44**. Horizon is **v = 0.64**, vanishing point **u = 0.50**. Camera calibration is stylized, not a reconstruction of physical dimensions.

For dimensionless camera depth `d > 0`, world coordinates `(x,y)` project as:

```text
u = vanishing_u + pug_height_ratio / aspect * x / d
v = horizon_v + (pug_ground_v - horizon_v - pug_height_ratio * y) / d
```

The perspective camera is calibrated to this equation. World objects use the dimension registry and depth anchors. Road/lane/sidewalk widths and bridge/skyline placements remain registry-driven. Spaces are `WORLD`, `GAMEPLAY_PLANE`, `HUD`, and `ATTACHED_EFFECT`.

The world pass uses a perspective camera. Hero/food/helper presentation uses a fixed orthographic gameplay-plane camera without moving simulation coordinates. Hero normalization uses authored neutral bounds once, not live animation bounds. `RatioPresentation` provides forward/inverse adapters including pointer Y and food scale. Never normalize a new hero from a blink, breath, lean or temporary effect.

CSS fits the entire canonical composition with `contain`, centered within safe-area padding, never stretched. `resize()` only changes CSS fit and drawing-buffer dimensions, not world camera projection, logical game size or gameplay state. The transparent canvas and WebGL canvas have exactly the same rounded buffer size. `BALANCE.frame.maxDpr = 1.5` is an existing raster cap; renderer pixel ratio remains one to avoid multiplying DPR twice. Measure before changing it.

Review URLs use `?ratio=blockout`, `?ratio=reference` or `?ratio=overlay`. They show the same permanent contract; they do not redefine the camera or game rules.

## WebGL lifecycle and GPU ownership

`bootstrap()` is idempotent. It registers subscriptions through `listen()`, creates one `activeView`, performs resize/UI setup and schedules at most one RAF. `scheduleFrame()` refuses duplicate, hidden, suspended or graphics-error work; `stopFrame()` cancels the pending handle. `frame()` is also safe when explicitly invoked while a callback is pending.

View construction is exception-safe, including partial factory, hero and world construction. A failed initializer, frame, resize, or genuine `webglcontextlost` enters `showGraphicsError()` once. The handler prevents default context-loss behavior, freezes gameplay, clears input, closes the audio graph, cancels RAF, releases the active view and shows the reload screen. No automatic recovery/retry loop is attempted. Reload is a new session, not a promise to restore the interrupted run.

| Owner | Resources and retirement |
| --- | --- |
| Model factory | Shared geometries and cached materials used by many food/cat/bird instances and world actors. Dispose once when the whole view retires, never when one mesh leaves a pool. |
| Hero `userData.dispose` | Private hero geometries, materials and generated shadow/breath texture; idempotent and safe on partial construction. |
| Ratio world | Private geometries, materials, generated Canvas textures and instanced-mesh resources. Shared factory assets remain factory-owned. |
| View | Active/pool Maps, scenes, canvas context-loss subscription, renderer. Remove its context-loss listener **before** `forceContextLoss`, so a retired canvas cannot affect a later view. Clear scenes/maps and remove the DOM canvas. |
| Three.js renderer | Shader programs and framework internals. Call `dispose()` and release its context. A lazily uploaded internal DFG lookup texture can remain in retired `renderer.info` bookkeeping; it is not an application texture or a reusable live context. |

No render targets are currently created by application modules. Introduced textures/targets must be assigned an explicit owner. `disposeThreeResources` continues across owner cleanup exceptions. Do not recursively dispose every traversed material: many meshes share factory resources.

`renderer.info` is used by browser tests, not exposed as a production debug UI. Warm all food variants, helper types and hero visibility branches before comparing memory. After warming, animation and restart/menu must not increase geometries, textures or programs. A separate test verifies allocation/disposal events, including partial construction, rather than inferring ownership only from memory counters.

## Input, tab lifecycle and audio

Pointer events handle touch, mouse and pen with one captured pointer. Only primary mouse-button drags are accepted. Additional contacts cannot steal the drag. Capture failure safely abandons the gesture; up/cancel/lostcapture clear it. Key state is cleared on pause, blur and teardown. `touch-action: none` belongs to the game surface; UI buttons use manipulation. Coordinate mapping reads the current bounding rect after every resize.

`visibilitychange` to hidden stops RAF, pauses a playing run, clears input and fades/stops voices. Returning visibility resets the frame time and restarts presentation without resuming the paused run or replaying hidden time. Blur pauses and clears input. Persisted `pagehide` suspends a back/forward-cache entry; `pageshow` resumes only presentation. Non-persisted `pagehide` performs final teardown.

`disposeApplication()` is idempotent: stops scheduling, removes every bootstrap-owned subscription, retires the view, closes the audio graph, clears the overlay path cache/raster, and removes active overlay button nodes. A retired application cannot allocate a view until bootstrap owns its lifecycle again. New bootstrap after a normal explicit teardown starts one set of subscriptions/view; a graphics-error session still requires reload.

Audio unlock occurs only after a user gesture, respects mute, and can resume a suspended context. Ordinary restart/menu reuse one AudioContext. There are six owned permanent nodes: five gain buses and a compressor. Source/filter/panner/gain nodes belong to a tracked voice. `onended` disconnects its graph exactly once. Faded voices awaiting their short scheduled stop are tracked separately as retiring, so final teardown can disconnect them even before `onended` fires. The continuous city bed has two voices and active voice creation is capped at 48.

A partially initialized audio graph is closed/disconnected before a later gesture can retry. Unsupported audio must never stop gameplay. `disposeAudio()` disconnects voices, retiring voices and buses, clears buffers/references, and closes the context without an unhandled rejected promise. Mute/pause do not close the reusable context. PCM tests verify envelopes, headroom and relative levels, not physical speaker loudness.

## Repository and deployment contracts

HTML/manifest/icon/JS/CSS paths are relative to the project, not domain-root URLs. Manifest `start_url` and `scope` are `./`. The HTTP harness serves a `/pug-in-manhattan/` prefix to catch wrong assumptions. The repository test checks script inventory/order, syntax, DOM IDs/hooks, vendor hash/license, icons, manifest, links and byte-exact preview exports.

Generated screenshots, bundles, archives, logs, browser profiles, caches and external test-tool installs stay outside tracked files. Only deliberate fixtures belong under `tests/fixtures/`. Keep `.gitignore` aligned with local outputs; do not suppress intentional fixtures or sources broadly.

Publish a reviewed feature branch without force, inspect the PR diff/checks, merge into `main`, wait for the Pages deployment of that commit, then verify **production bytes and browser behavior**. An HTTP 200 or a green build alone does not establish that the new version is live. `tests/browser/live-verify.js` compares every linked resource and manifest icon to the local checkout before checking interactions, console and network.

## Test matrix and commands

Node.js 22+ is the only requirement for non-browser tests. Browser tests use external Playwright/Chromium and software WebGL when appropriate. The recursive runner discovers `*.test.js`; `tests/browser/` determines browser suites. Do not hide environment failures as skipped/pass results.

| Suite or command | Coverage |
| --- | --- |
| `node tests/run.js` | Six non-browser suites below. |
| `tests/game/gameplay.test.js` | Scoring, shields/bones, pause, jam, lose/restart, powers; three seeded simulations; render purity. `--compare <git-ref> --seconds 600` compares every second and final RNG against the ref's own HTML/script graph. |
| `tests/game/street-events.test.js` | All misses, penalties, drop physics, rare cats, helper origin/entry/exit, pause/reset. |
| `tests/character/character.test.js` | Geometry, proportions, grounded paws/catch band, pure poses, blink/breath/reactions, edge poses and disposal. |
| `tests/world/world-ratio.test.js` | Immutable fixture, full Three camera projection, object anchors, fitting and unchanged logical state on resize. |
| `tests/render/ratio-runtime.test.js` | Real scene/model setup with a renderer double, powers/foods, paused repaint and graphics error; not a GPU/browser test. |
| `tests/repository.test.js` | Revision/cache keys, paths/inventory/syntax/DOM, manifest/icons/vendor/license, export, actual HTTP bytes under project prefix. |
| `tests/browser/browser.test.js` | Genuine DOM/WebGL, touch/keyboard, pickups/collisions/HUD/powers, pause/resume/restart/resize, render parity, WebGL failure and loss. |
| `tests/browser/character-browser.test.js` | Nine poses, exact paused transforms, edge bounds, six hero GPU cycles and independent framework baseline. |
| `tests/browser/audio-browser.test.js` | Unlock/resume/mute/hidden state, voice deduplication, continuous bed/street events, PCM mix/headroom. |
| `tests/browser/render-lifecycle.test.js` | Full/partial model and renderer faults, allocation/disposal counts, genuine context loss, cleanup exceptions and idempotent disposal. |
| `tests/browser/runtime-browser.test.js` | Six DPR-3 viewports, pointer cancellation/multicontact/resize, 20 full GPU/application reinitializations, 60 restart/menu cycles, listener/RAF ownership, partial audio failure, context loss and native RAF/visibility and synthetic persisted page events. |
| `node tests/visual-compare.js <git-ref>` | 25 exact PNG pairs across five viewports and menu/play/pause/effects/reference scenes. Only revision text excluded; same executable/OS/backend per comparison; CPU CSS raster and SwiftShader WebGL are fixed by the harness. Never rewrites goldens. |
| `TEST_BASE_URL=... node tests/browser/live-verify.js` | Explicit live asset-byte check plus native startup, world/pug/input/audio/pause/restart/resize/menu and console/network. |

Run `node tests/run.js --browser` for five browser suites, or `--all` for all eleven. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` when tools are not resolvable by default; use `xvfb-run -a` on headless Linux where needed. `SCREENSHOT_DIR` records optional images outside source control. `OFFLINE_BROWSER=1` is explicit local-content loading in real DOM/WebGL, not browser HTTP verification. It cannot be combined with `TEST_BASE_URL`. Network tests must also run over real HTTP before publication.

Do not call Chromium viewport emulation a physical iPhone, Safari or mobile GPU test. No service worker or guaranteed offline launch exists. Differences between OS/GPU/browser configurations require investigation, not a blanket zero-pixel assumption.
