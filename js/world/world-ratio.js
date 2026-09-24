/* PUG WORLD RATIO: intentional stylized calibration, not recovered real-world units.
* Change locked values only with a new version and retained fixture. */
const PUG_WORLD_RATIO = (() => {
  const freeze = value => { Object.values(value).forEach(v => { if (v && typeof v === "object")
    freeze(v); }); return Object.freeze(value); };
  return freeze({
    ratio_version: "1.0.0", reference_width: 600, reference_height: 1125,
    pug_height_ratio: .16, pug_neutral_width_to_height: .67,
    pug_ground_v: .88, reference_pug_u: .44, horizon_v: .64, vanishing_u: .50,
    projection_calibration: { P: 1, normalized_vertical_focal_length: .90, pug_camera_depth: 5.625, camera_height: 1.50 },
    road_dimensions: { carriageway: 5, lanes: 2, lane_width: 2.5, sidewalk: 1.2, road_edges: [-2.5, 2.5], sidewalk_edges: [-3.7, 3.7], lane_centers: [-1.25, 1.25], sidewalk_centers: [-3.1, 3.1] },
    object_dimension_registry: {
      pug: { height: 1, width: .67, depth: 1, space: "GAMEPLAY_PLANE" }, hydrant: { height: .95, width: .35, depth: 1, space: "WORLD" },
      pedestrian: { height: 2.2, width: .42, depth: 4, space: "WORLD" }, taxi: { height: 1.35, width: 2, length: 4.1, depth: 4.8, space: "WORLD" },
      near_building: { height: 13, depth: 4, space: "WORLD" }, middle_building: { height: 18, depth: 7, space: "WORLD" },
      bridge_tower: { height: 25.5, depth: 12, space: "WORLD" }, skyscraper: { height: 50, depth: 20, space: "WORLD" },
      sausage: { length: .42, depth: 1, space: "GAMEPLAY_PLANE" }
    },
    reference_depth_anchors: [1, 2, 4, 8, 12, 20],
    viewport_fit_policy: { kind: "contain", allow_stretch: false },
    spaces: ["WORLD", "GAMEPLAY_PLANE", "HUD", "ATTACHED_EFFECT"],
    logical_game: { width: 390, height: 844 },
    // Authored neutral content calibration; stable after setup, never animation bounds.
    assets: { pug: { neutral_time: 0, neutral_source_height: 125.97280362647325 }, sausage: { source_long_axis: 59 } },
    ground_regions: { avenue_transition_v: .74, intersection_end_v: .82, bridge_deck_y: 8.25 }
  });
})();
const WorldRatio = (() => {
  const C = PUG_WORLD_RATIO, A = C.reference_width / C.reference_height, F = C.projection_calibration;
  function project(x, y, d) { if (!(d > 0))
    throw new RangeError("Positive camera depth required"); return { u: C.vanishing_u + C.pug_height_ratio / A * x / d, v: C.horizon_v + (C.pug_ground_v - C.horizon_v - C.pug_height_ratio * y) / d }; }
  function depthAtGround(v) { if (!(v > C.horizon_v))
    throw new RangeError("Ground inverse requires v below horizon"); return (C.pug_ground_v - C.horizon_v) / (v - C.horizon_v); }
  function fit(width, height) { const scale = Math.min(width / C.reference_width, height / C.reference_height); return { width: C.reference_width * scale, height: C.reference_height * scale, scale }; }
  function camera(T) { const camera = new T.PerspectiveCamera(2 * Math.atan(1 / (2 * F.normalized_vertical_focal_length)) * 180 / Math.PI, A, .05, 1200); camera.position.set(0, F.camera_height, 0); camera.projectionMatrix.elements[8] = 1 - 2 * C.vanishing_u; camera.projectionMatrix.elements[9] = 2 * C.horizon_v - 1; camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); camera.updateMatrixWorld(); return camera; }
  function bounds(mesh, T) { mesh.updateMatrixWorld(true); const b = new T.Box3(), v = new T.Vector3(); mesh.traverseVisible(n => { if (n.isMesh && !/shadow|contact|breath/.test(n.name)) {
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  } }); return b; }
  return Object.freeze({ project, depthAtGround, fit, camera, bounds, aspect: A });
})();
const RatioPresentation = (() => {
  const C = PUG_WORLD_RATIO, h = C.assets.pug.neutral_source_height, unit = C.pug_height_ratio * C.reference_height / h;
  // The uniform vertical adapter aligns the 390×844 simulation mouth/catch
  // region with the normalized character, without changing hitboxes.
  const py = y => C.pug_ground_v * C.reference_height + (y - (C.logical_game.height - 91)) * unit;
  const px = x => x / C.logical_game.width * C.reference_width;
  const logicalY = y => (y - C.pug_ground_v * C.reference_height) / unit + (C.logical_game.height - 91);
  const worldX = x => (px(x) / C.reference_width - .5) * WorldRatio.aspect / C.pug_height_ratio;
  const worldY = y => (C.pug_ground_v - py(y) / C.reference_height) / C.pug_height_ratio;
  const logicalX = x => (x * C.pug_height_ratio / WorldRatio.aspect + .5) * C.logical_game.width;
  const fromWorldY = y => logicalY((C.pug_ground_v - y * C.pug_height_ratio) * C.reference_height);
  return Object.freeze({ px, py, logicalY, worldX, worldY, logicalX, fromWorldY, unit, heroScale: 1 / h, foodScale: C.object_dimension_registry.sausage.length / C.assets.sausage.source_long_axis });
})();
const ratioMode = new URLSearchParams(location.search).get("ratio") || "";
