# PUG WORLD RATIO — permanent review contract

Read this before changing camera, perspective, scene scale, roads, buildings, vehicles, pedestrians, bridge, skyline, viewport or composition. This contract belongs to the current FULL-3D game, not a separate preview or alternate renderer.

## Sources of truth

The frozen [js/world/world-ratio.js](js/world/world-ratio.js) defines ratio version **1.0.0**, dimensions, depth anchors, coordinate spaces and viewport fitting. The locked [tests/fixtures/ratio-1.0.0.json](tests/fixtures/ratio-1.0.0.json) and [tests/world/world-ratio.test.js](tests/world/world-ratio.test.js) protect it. The projection equations and calibration are documented once in [PROJECT.md](PROJECT.md#pug-world-ratio-invariants); do not maintain a competing numeric specification here. The game release version is separate from `ratio_version`.

## Permanent rules

Use the shared projection, dimension registry and depth anchors in [js/world/ratio-scene.js](js/world/ratio-scene.js). Do not independently resize the pug or major world elements to improve one screenshot. Cars stay on road lanes; pedestrians stay on sidewalks; elevated objects use their actual Y placement. Perspective meshes are projected once, without another `1/d` scale.

WORLD, GAMEPLAY_PLANE, HUD and ATTACHED_EFFECT retain their defined roles. The world is perspective-projected; gameplay-plane food and hero presentation must not change hitboxes or gameplay coordinates. Normalize the whole hero uniformly from stable neutral content bounds once, excluding shadows and effects; never normalize from live animation bounds. Character changes also follow [CHARACTER_REVIEW.md](CHARACTER_REVIEW.md).

Fit the complete portrait composition with `contain`, without stretching. Safe-area padding is outside it; resize/DPR changes fitting and raster density, not camera calibration, logical state or object scale. Review perspective/scale before composition/depth, modeling, materials/lighting and details.

A deliberate locked-calibration change requires a new `ratio_version`, a new retained fixture, updated documentation and relevant verification. Never rewrite the existing fixture merely to pass a changed composition. Review modes remain `?ratio=blockout`, `?ratio=reference` and `?ratio=overlay`; they inspect the same contract.

## Relevant verification

Run `node tests/world/world-ratio.test.js` and the relevant runtime/viewport or visual check. Use exact pixel comparisons only in a matching browser/OS/backend environment. Keep existing Canvas feedback, diagnostics and procedural texture sources; do not restore the retired standalone 2D game or fallback.
