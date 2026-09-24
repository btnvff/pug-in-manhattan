# PUG WORLD RATIO 1.0.0 — preview reconstruction

This preview was reconstructed from GitHub `b8439bc3968103ad36ace282801515bd23036e18` and the supplied numeric specification. The earlier ZIP and polished image were unavailable. It is a new implementation, not the previously reported ZIP.

## Contract

`js/world-ratio.js` owns the immutable 600 × 1125 composition, camera, registry, street cross-section, viewport fit, and fixed 390 × 844 simulation adapter. The HUD overlays the complete rectangle. Safe-area padding is outside it. DPR changes raster density only.

The world camera is level with P=1, camera height 1.5, vertical focal length .9, pug depth 5.625, and shifted principal point (.5,.64). Three world Z is negative camera depth. `WorldRatio.project` implements the same equations for Canvas and diagnostics. World descriptors in `js/ratio-scene.js` declare coordinate space, dimensions, elevation and relative depth. Mesh geometry is projected once by the camera. Instancing batches facade details without changing coordinates.

Buildings have asymmetric masses and facade-attached details. The avenue ends at a transverse intersection and broad apron. The bridge deck is elevated at Y=8.25. Road lanes and sidewalks own vehicle and pedestrian positions. Static Canvas scenery projects the shared descriptors; its low-detail proxies are intentionally simpler than the WebGL models.

The existing pug rig, animation, foods, helper cats, powers, audio and game logic are retained. The pug uses a fixed-depth orthographic presentation plane; existing simulation positions are mapped through `RatioPresentation`. Asset height is normalized once from actual neutral vertices, excluding shadows and effects. Whole-character scale is uniform. The existing ear placement was moved inward by two source units and ear scale reduced from .88 to .84 to meet the neutral aspect; resulting neutral width/height is .66838. Height is .160 H and ground is .880 H. Animation bounds are never used for rescaling.

## Asset imports and version changes

Import a model in a stable neutral pose, identify content geometry (exclude padding, shadows, helpers and effects), measure its neutral content height once and map uniformly to the registry height. Give each WORLD asset explicit dimensions, X/Y/depth and surface. Use actual elevated Y for raised assets. Do not apply 1/d scale to a perspective mesh. GAMEPLAY_PLANE assets keep d=1 and do not shrink at the horizon. HUD and ATTACHED_EFFECT elements follow their own presentation anchors.

Preserve `tests/fixtures/ratio-1.0.0.json`. Locked calibration changes require an intentional ratio version change and a new fixture, while retaining earlier fixtures. Tests pin the 1.0.0 fixture digest to catch accidental same-version rewrites.

## Review modes

- `?ratio=blockout`: geometry bounds, horizon, vanishing point, street and depth diagnostics.
- `?ratio=reference`: fixed neutral art pose at U=.44.
- `?ratio=overlay`: diagnostic lines during gameplay.
- `?view=2d`: Canvas fallback.

## Executed verification

- Full Three camera equations against independent point projection, including elevated bridge points and skyline.
- 600×1125, 390×844, 320×568, 844×390 and 1024×768 viewport fits; resizing leaves simulation state unchanged.
- Uniform neutral pug normalization and horizontal scale invariance.
- Three seeded 120-second simulation comparisons identical to original `b8439bc`, including RNG.
- Existing character animation/resource tests and street event tests.
- Scene/model initialization, all 17 powers, nine foods, resize, pause, disposal and Canvas recovery with a renderer test double.
- A CPU projection capture of actual scene geometry was used to inspect composition. It is not a browser screenshot.

## Limits of this preview

Browser/GPU screenshot tests could not run: this environment has no installed browser and its browser download returned invalid data. Physical device performance, Safari and real touch/audio behavior still need testing through the published preview. Canvas fallback does not animate the street's background cars/pedestrians. It keeps the original Canvas character artwork and is not a pixel-identical rendition of the normalized 3D model. The polished reference image remains unavailable, so no visual-reference match is claimed.
