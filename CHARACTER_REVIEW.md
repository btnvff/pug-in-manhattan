# Pug character — permanent review contract

Read this before changing the pug model, face, body, eyes, paws, ears, head, tongue, materials or animation. This describes the current stylized FULL-3D hero, not an old preview or a new redesign.

## Sources and visual direction

[Model and private materials](js/character/pug-3d.js), [pure pose sampling](js/character/pug-animation.js) and [simulation-time motion signals](js/character/pug-motion.js) define the current implementation. Preserve the compact, softly rounded warm-fawn pug, dark facial mask, short broad muzzle, small inset eyes with restrained catchlights, folded ears, curled tapered tail, rounded paws and red bandana. Keep the head/muzzle and body visually coherent rather than assembling exposed plates or oversized eye spheres. Materials remain stylized and mostly matte, not photorealistic.

The small cute pug remains the visual focus within a much larger Manhattan. [PUG-WORLD-RATIO.md](PUG-WORLD-RATIO.md) owns its apparent size, neutral normalization and grounding relationship. A character edit must not independently change those or the catch position/hitbox.

## Animation, grounding and ownership

Keep supported paws on the ground and preserve screen-edge-safe movement. Full blinks close the eye opening; breathing, gaze, stepping, catch/chew, small tongue reactions and rare breath effects remain bounded. Do not add permanent chewing to menus/results or turn an animation into a new gameplay rule.

The pose sampler reads existing signals, reuses its buffer, and does not advance simulation timers, consume gameplay RNG or create geometry per frame. The established gaze/motion RNG stays in the simulation path. Paused renders preserve exact pose, transforms, shadows and breath effects; normalization uses neutral geometry once, never the current animated bounds.

The hero owns and disposes its private resources, including partial-construction cleanup. Do not dispose shared world/food resources or the renderer's internal textures as hero-owned assets. Preserve current contact/breath effects and Canvas overlay support; do not bring back a separate Canvas pug or fallback game.

## Relevant verification

Run `node tests/character/character.test.js`, then the relevant browser/visual check when available. `tests/browser/character-browser.test.js` covers rendered poses, pause, edge bounds and hero GPU lifecycle; broader lifecycle tests are for ownership/initialization changes, not an automatic requirement for every artistic adjustment. Do not infer physical-device performance from geometry counts or software WebGL tests. Resource ownership and general lifecycle remain documented in [PROJECT.md](PROJECT.md#webgl-lifecycle-and-gpu-ownership).
