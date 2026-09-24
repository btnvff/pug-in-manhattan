/* All visible environment parts declare WORLD dimensions and positions in P.
* Backend Z is -camera-space Z. No perspective scale is baked into meshes. */
function createRatioLayout() {
  const C = PUG_WORLD_RATIO, Z = C.projection_calibration.pug_camera_depth, objects = [];
  function shape(kind, color, x, y, d, width, height, length, extra = {}) {
    const o = { kind, color, x, y, d, width, height, length, space: "WORLD", ...extra };
    if (![x, y, d, width, height, length].every(Number.isFinite) || d <= 0)
      throw Error("Invalid world descriptor");
    objects.push(o);
    return o;
  }
  const box = (color, x, y, z, w, h, l, extra) => shape("box", color, x, y, z / Z, w, h, l, extra);
  const ball = (color, x, y, z, w, h, l, extra) => shape("ball", color, x, y, z / Z, w, h, l, extra);
  function rod(color, a, b, r, extra = {}) { const c = a.map((v, i) => (v + b[i]) / 2); return shape("rod", color, c[0], c[1], c[2] / Z, r * 2, Math.hypot(...a.map((v, i) => v - b[i])), r * 2, { a, b, ...extra }); }
  const street = {
    road: C.road_dimensions, near: .2, far: 420, crossWidth: 38, sidewalkTop: .07,
    transition: WorldRatio.depthAtGround(C.ground_regions.avenue_transition_v) * Z,
    crossing: WorldRatio.depthAtGround(C.ground_regions.intersection_end_v) * Z
  };
  const { road, transition, crossing } = street;
  // Keep one clear walking strip; furniture occupies the outer sidewalk edge.
  street.walkingX = Math.abs(road.sidewalk_centers[1]) - .22;
  street.furnitureX = Math.abs(road.sidewalk_edges[1]) - .20;
  // Cover the visible ground envelope, not a wider carriageway or a new scale.
  const groundHalfWidth = WorldRatio.aspect * (street.far / Z) / (2 * C.pug_height_ratio);
  box("#777e7e", 0, -.10, (transition + street.far) / 2, road.carriageway, .2, street.far - transition, { surface: "road", id: "avenue" });
  box("#858a87", 0, -.10, (crossing + transition) / 2, street.crossWidth, .2, transition - crossing, { surface: "road", id: "intersection" });
  box("#8c908a", 0, -.10, (street.near + crossing) / 2, street.crossWidth, .2, crossing - street.near, { surface: "road", id: "apron" });
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, edge = Math.abs(road.road_edges[i]);
    const z = (transition + street.far) / 2, length = street.far - transition;
    // One continuous slab supports the 1.2P walking strip and the adjoining block.
    // No coplanar shared edge between separately instanced sidewalk/corner floors.
    box("#c5c0ac", side * (edge + groundHalfWidth) / 2, street.sidewalkTop / 2, z,
      groundHalfWidth - edge, street.sidewalkTop, length, { surface: "block-ground", id: "block-ground-" + side });
    box("#d8d0b7", road.road_edges[i] + side * .03, .09, z, .10, .18, length);
    box("#d8d0b7", side * (edge + groundHalfWidth) / 2, .09, transition + .05,
      groundHalfWidth - edge, .18, .10);
    for (let z = transition + 1; z < 70; z += 1.35)
      box("#a7a797", road.sidewalk_centers[i], .077, z, road.sidewalk - .07, .009, .016);
  }
  for (let z = transition + .8; z < 100; z += 3.6)
    box("#e2c875", 0, .009, z, .052, .018, 1.8);
  // Real ground-plane zebra stripes across the avenue at the intersection.
  for (let x = -2.3; x < 2.5; x += .48)
    box("#e6dfc8", x, .015, transition - .62, .27, .025, 1.0);
  for (let i = 0; i < 6; i++)
    box("#ddd6c0", -4.1 - i * .5, .012, crossing + 1.8, .28, .024, 1.7);
  // Deterministic asphalt grain and seams: the art does not consume gameplay RNG.
  for (let i = 0; i < 200; i++) {
    const z = .4 + (i * 1.713 % 30), x = (Math.sin(i * 93.1) * .5 + .5) * 12 - 6;
    box(i % 2 ? "#92978f" : "#737c7a", x, .002, z, .016 + (i % 3) * .012, .006, .027);
  }
  rod("#737d7a", [-6, .012, 3.2], [3, .012, 3.65], .009);
  rod("#737d7a", [3, .012, 3.65], [7, .012, 4.8], .008);
  // Asymmetric architecture; front-facade depth is explicit, not its center.
  const buildings = [
    { id: "near-left", x: -6.65, front: 4, h: 13, w: 5.9, l: 9, c: "#ba7354", trim: "#e1ba8a", sign: "HUDSON DELI" },
    { id: "near-right", x: 6.7, front: 4.7, h: 15.5, w: 6, l: 8, c: "#d0ad7b", trim: "#ead3a1", sign: "MANHATTAN" },
    { id: "middle-left", x: -6.8, front: 7, h: 18, w: 6.2, l: 10, c: "#927d73", trim: "#d4bf9f", sign: "BAKERY" },
    { id: "middle-right", x: 6.5, front: 8, h: 17, w: 5.6, l: 11, c: "#a75c47", trim: "#dcb78e", sign: "CAFE" },
    { id: "far-left", x: -6.6, front: 10, h: 22, w: 5.8, l: 13, c: "#9e9b8f", trim: "#c6baa0" },
    { id: "far-right", x: 6.8, front: 11.4, h: 23, w: 6.2, l: 13, c: "#b58a68", trim: "#c9baa0" }
  ];
  for (const b of buildings) {
    const z = b.front * Z, inner = b.x < 0 ? b.x + b.w / 2 : b.x - b.w / 2, side = Math.sign(b.x);
    box(b.c, b.x, b.h / 2, z + b.l / 2, b.w, b.h, b.l, { id: b.id, role: "building" });
    box(b.trim, b.x, b.h - .13, z + b.l / 2, b.w + .24, .28, b.l + .24);
    box(b.trim, b.x, 2.6, z + b.l / 2, b.w + .08, .20, b.l + .08);
    box("#596065", b.x, b.h + .08, z + b.l / 2, b.w - .35, .15, b.l - .35);
    for (let y = 3.5; y < b.h - 1; y += 1.55) {
      box(b.trim, b.x, y - .60, z - .045, b.w, .095, .10);
      for (let x = b.x - b.w / 2 + .62; x < b.x + b.w / 2 - .3; x += 1.13) {
        box("#d9c09a", x, y, z - .065, .68, .94, .16);
        box((Math.floor(y + x) * 3) % 4 ? "#3c5867" : "#baae83", x, y, z - .16, .49, .75, .035);
        box(b.trim, x, y, z - .19, .035, .79, .035);
        box(b.trim, x, y - .02, z - .19, .52, .035, .035);
        box(b.trim, x, y - .49, z - .18, .79, .10, .34);
      }
      for (let q = z + .85; q < z + b.l - .3; q += 1.24) {
        box("#d5b997", inner - side * .055, y, q, .15, .94, .72);
        box("#466171", inner - side * .14, y, q, .035, .74, .52);
        box(b.trim, inner - side * .16, y - .49, q, .30, .1, .86);
      }
    }
    for (let q = z + .8; q < z + b.l - .8; q += 1.6) {
      box("#294b50", inner - side * .06, 1.25, q, .18, 1.85, 1.25);
      box("#d7b98c", inner - side * .19, .24, q, .3, .28, 1.4);
    }
    for (let x = b.x - b.w / 2 + .65; x < b.x + b.w / 2 - .3; x += 1.35)
      box("#294c51", x, 1.2, z - .04, 1.06, 1.9, .16);
    box(b.id.includes("left") ? "#426d60" : "#963f38", b.x, 2.12, z - .44, b.w - .35, .13, .86);
    for (let x = b.x - b.w / 2 + .1; x < b.x + b.w / 2; x += .48)
      box("#e5d4ac", x, 2.14, z - .47, .19, .04, .86);
    if (b.sign)
      shape("sign", "#e8dab7", b.x, 2.44, (z - .17) / Z, b.w - .45, .36, .04, { text: b.sign });
    // Fire escapes attached to street-facing facade coordinates.
    if (b.id === "near-left")
      for (let y = 4; y < 12; y += 2.8) {
        box("#3e4947", inner + .32, y, z + 3.5, .65, .055, 1.9);
        for (const q of [z + 2.6, z + 4.4])
          rod("#394745", [inner + .65, y, q], [inner + .65, y + .55, q], .025);
        rod("#394745", [inner + .65, y + .55, z + 2.6], [inner + .65, y + .55, z + 4.4], .025);
        rod("#394745", [inner + .48, y, z + 2.7], [inner + .48, y + 2.8, z + 4.3], .028);
        for (let i = 0; i < 8; i++)
          rod("#44504d", [inner + .1, y + i * .35, z + 2.7 + i * .2], [inner + .5, y + i * .35, z + 2.7 + i * .2], .022);
      }
    if (b.id === "near-right") {
      box("#77584b", b.x + .3, b.h + .8, z + 2.4, 1.15, 1.5, 1.15);
      shape("cone", "#635347", b.x + .3, b.h + 1.85, (z + 2.4) / Z, 1.5, .65, 1.5);
    }
  }
  // A skyline sized in P remains substantial at d=20 and beyond.
  for (let i = 0; i < 17; i++) {
    const d = 20 + (i % 4) * 2.3, x = (i - 8) * 4.5, h = i === 8 ? 50 : 27 + (i * 13 % 24), w = 2.4 + (i % 3) * .7, z = d * Z;
    const tint = ["#8eacb9", "#9eb8c1", "#819eae"][i % 3];
    box(tint, x, h / 2, z, w, h, 3.8, { role: "skyline" });
    box(tint, x, h + .7, z, w * .69, 1.4, 3.1);
    for (let y = 5; y < h - 1; y += 2.2)
      box("#b7cbd0", x, y, z - 1.94, w * .85, .12, .03);
    if (i === 8) {
      box(tint, x, 52, z, 1.3, 3, 1.6);
      rod("#bed0d2", [x, 53, z], [x, 60, z], .11);
    }
  }
  // One transverse deck; tower planes, crossheads and cable supports share a layout.
  const bridge = {
    tower: C.object_dimension_registry.bridge_tower, rearDepth: 14.2,
    towerX: 5.7, halfWidth: 18, deckY: C.ground_regions.bridge_deck_y, deckThickness: .48
  };
  const planes = [bridge.tower.depth * Z, bridge.rearDepth * Z];
  const deckTop = bridge.deckY + bridge.deckThickness / 2, head = bridge.tower.height;
  const bridgeCenter = (planes[0] + planes[1]) / 2, bridgeDepth = planes[1] - planes[0];
  box("#76939d", 0, bridge.deckY, bridgeCenter, bridge.halfWidth * 2,
    bridge.deckThickness, bridgeDepth + 2.4, { role: "bridge-deck" });
  for (const side of [-1, 1]) {
    // Each crosshead connects the front/rear legs of its own tower, not the skyline.
    box("#668998", side * bridge.towerX, head - 2.1, bridgeCenter,
      1.2, .55, bridgeDepth + 1.5, { role: "bridge-crosshead" });
  }
  for (const z of planes) {
    for (const side of [-1, 1]) {
      const x = side * bridge.towerX;
      box("#708f9d", x, head / 2, z, 1, head, 1.5, { role: "bridge-tower" });
      box("#a4b8b9", x, head - .2, z, 1.4, .35, 1.9);
      box("#8ca4ac", x, head + .5, z, .9, 1.2, 1.5);
    }
    const railZ = z + (z === planes[0] ? -1.12 : 1.12);
    box("#acc0c1", 0, bridge.deckY + .32, railZ, bridge.halfWidth * 2, .12, .14);
    const supports = [
      [-bridge.halfWidth + 1, deckTop], [-bridge.towerX, head],
      [bridge.towerX, head], [bridge.halfWidth - 1, deckTop]
    ];
    // Piecewise spans include the exact tower heads; the old unrelated parabola missed them.
    for (let span = 0; span < supports.length - 1; span++) {
      const a = supports[span], b = supports[span + 1], steps = Math.ceil((b[0] - a[0]) / .6);
      const sag = span === 1 ? head - (bridge.deckY + 1.3) : 2;
      let previous = null;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), point = [x, y, z];
        if (previous) rod("#537e91", previous, point, .07, { role: "bridge-cable" });
        if ((span === 0 || i > 0) && y > deckTop + .01)
          rod("#73939e", [x, deckTop, z], point, .028, { role: "bridge-hanger" });
        previous = point;
      }
    }
  }
  // Lamps, vegetation and bins are placed on sidewalks, with explicit elevation.
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const d = 3.2 + i * 2.4 + (side > 0 ? .55 : 0), z = d * Z, xx = side * street.furnitureX;
      rod("#455854", [xx, .07, z], [xx, 3.3, z], .055);
      rod("#455854", [xx, 3.3, z], [xx - side * .5, 3.44, z], .045);
      shape("ball", "#f3dca0", xx - side * .5, 3.36, d, .26, .15, .26);
      if (i % 2 === 0) {
        box("#637b60", side * street.furnitureX, .36, z + 1.5, .40, .58, .45);
        rod("#77654d", [side * street.furnitureX, .07, z + 3], [side * street.furnitureX, 2.7, z + 3], .065);
        ball("#6f9472", side * street.furnitureX, 3, z + 3, 1.25, 1.65, 1.2);
      }
    }
  for (const side of [-1, 1]) {
    const d = side < 0 ? 1 : 1.22, x = side * (side < 0 ? 1.52 : 1.79), z = d * Z;
    shape("cylinder", "#b94f38", x, .39, d, .23, .78, .23, { id: "hydrant-" + side });
    ball("#ca6444", x, .82, z, .32, .26, .32);
    box("#9e432f", x, .07, z, .33, .14, .33);
    box("#e6ae6f", x, .56, z, .43, .13, .13);
    box("#f0b97b", x, .92, z, .10, .06, .10);
  }
  return { objects, buildings, street };
}
const RATIO_LAYOUT = createRatioLayout();
function createRatioWorld(model) {
  const T = window.THREE, C = PUG_WORLD_RATIO, Z = C.projection_calibration.pug_camera_depth;
  const root = new T.Group(), owned = [], actors = [], materials = new Map(), geometries = {};
  let disposed = false;
  const own = resource => { owned.push(resource); return resource; };
  function dispose() {
    if (disposed)
      return;
    disposed = true;
    disposeThreeResources([...owned, ...materials.values()]);
    owned.length = 0;
    materials.clear();
    actors.length = 0;
    root.clear();
  }
  try {
    root.name = "ratio-world";
    root.userData.space = "WORLD";
    geometries.box = own(new T.BoxGeometry(1, 1, 1));
    geometries.ball = own(new T.SphereGeometry(.5, 12, 8));
    geometries.cylinder = own(new T.CylinderGeometry(.5, .5, 1, 12));
    geometries.cone = own(new T.ConeGeometry(.5, 1, 12));
    const buckets = new Map(), matrix = new T.Matrix4(), quat = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    function material(color) { if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: .9 })); return materials.get(color); }
    for (const o of RATIO_LAYOUT.objects) {
      if (o.kind === "sign") {
        if (ratioMode === "blockout")
          continue;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 64;
        const pen = canvas.getContext("2d");
        pen.fillStyle = "#284f4b";
        pen.fillRect(0, 0, 512, 64);
        pen.fillStyle = o.color;
        pen.font = "bold 40px Georgia";
        pen.textAlign = "center";
        pen.textBaseline = "middle";
        pen.fillText(o.text, 256, 34, 490);
        const texture = own(new T.CanvasTexture(canvas));
        texture.colorSpace = T.SRGBColorSpace;
        const mat = own(new T.MeshBasicMaterial({ map: texture }));
        const geo = own(new T.PlaneGeometry(o.width, o.height));
        const mesh = new T.Mesh(geo, mat);
        mesh.position.set(o.x, o.y, -o.d * Z);
        root.add(mesh);
        continue;
      }
      if (ratioMode === "blockout" && !o.role && !o.surface)
        continue;
      const kind = o.kind === "rod" ? "cylinder" : o.kind, key = kind + ":" + o.color;
      if (!buckets.has(key))
        buckets.set(key, { kind, color: o.color, objects: [] });
      buckets.get(key).objects.push(o);
    }
    for (const batch of buckets.values()) {
      const mesh = own(new T.InstancedMesh(geometries[batch.kind], material(batch.color), batch.objects.length));
      batch.objects.forEach((o, i) => { pos.set(o.x, o.y, -o.d * Z); quat.identity(); if (o.kind === "rod") {
        const v = new T.Vector3(o.b[0] - o.a[0], o.b[1] - o.a[1], o.a[2] - o.b[2]);
        quat.setFromUnitVectors(up, v.normalize());
      } scl.set(o.width, o.height, o.length); matrix.compose(pos, quat, scl); mesh.setMatrixAt(i, matrix); });
      root.add(mesh);
    }
    const street = RATIO_LAYOUT.street, road = street.road;
    const taxi = C.object_dimension_registry.taxi;
    const bend = taxi.width, lane = Math.abs(road.lane_centers[0]);
    const farZ = street.far - taxi.length;
    const crossZ = street.crossing + (street.transition - street.crossing) / 3;
    const crossFarZ = street.crossing + (street.transition - street.crossing) * .75;
    const turnZ = crossZ + bend, turnX = lane + bend;
    const exitX = street.crossWidth / 2 - taxi.length / 2 - .10;
    const straight = farZ - turnZ, arc = Math.PI * bend / 2;
    const routeLength = straight + arc + exitX - turnX;
    const mod = (v, n) => ((v % n) + n) % n;
    const smooth = t => t * t * (3 - 2 * t);
    function joint(parent, x = 0, y = 0, z = 0) {
      const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g;
    }
    // Three fixed routes, sampled from worldTime; no simulation/RAF or RNG here.
    // Avenue cars turn in the near cross lane. Through-traffic uses the far
    // lane, behind the hero silhouette, in three reserved gaps per avenue lap.
    const avenuePeriod = routeLength / 4.5, crossDepartures = [8, 30, 52];
    function carPose(a, time) {
      const p = a.pose, distance = time * a.speed + a.offset;
      p.distance = distance;
      if (a.route === "cross") {
        const phase = mod(time, avenuePeriod);
        const departure = crossDepartures.find(t => phase >= t && phase < t + exitX * 2 / a.speed);
        p.distance = departure === undefined ? 0 : (phase - departure) * a.speed;
        p.x = -exitX + p.distance;
        p.z = crossFarZ;
        p.heading = Math.PI / 2;
      } else {
        let s = mod(distance, routeLength);
        const outgoing = a.route === "outgoing";
        if (outgoing) s = routeLength - s;
        if (s <= straight) {
          p.x = -lane; p.z = farZ - s; p.heading = 0;
        } else if (s < straight + arc) {
          const angle = (s - straight) / bend;
          p.x = -turnX + bend * Math.cos(angle);
          p.z = turnZ - bend * Math.sin(angle);
          p.heading = -angle;
        } else {
          p.x = -turnX - (s - straight - arc);
          p.z = crossZ; p.heading = -Math.PI / 2;
        }
        if (outgoing) { p.x = -p.x; p.heading = Math.PI - p.heading; }
      }
      a.mesh.position.set(p.x, 0, -p.z);
      a.mesh.rotation.y = p.heading;
      a.wheels.forEach(w => { w.rotation.x = mod(p.distance / .25, Math.PI * 2); });
    }
    // Original sedan dimensions/material ownership are retained. Rotating hubs
    // have a spoke, so rolling is visible rather than spinning a featureless ball.
    function car(color, route, speed, offset) {
      const g = new T.Group(), wheels = [];
      g.userData = { space: "WORLD", kind: "car", dimensions: { ...taxi }, route };
      const part = (shape, c, x, y, z, w, h, l) => model.part(g, shape, c, x, y, z, w, h, l);
      part("box", color, 0, .48, 0, 1.80, .48, 4.0);
      part("ball", color, 0, .61, 1.15, .89, .18, .85);
      part("box", "#426274", 0, .95, -.10, 1.63, .45, 1.85);
      part("box", color, 0, 1.2, -.10, 1.70, .10, 1.91);
      part("box", color, 0, .91, -.10, 1.72, .48, .11);
      for (const side of [-1, 1]) {
        for (const z of [-1.25, 1.24]) {
          const wheel = joint(g, side * .82, .25, z);
          model.part(wheel, "ball", "#283333", 0, 0, 0, .18, .25, .25);
          model.part(wheel, "ball", "#abb2a7", side * .15, 0, 0, .025, .12, .12);
          model.part(wheel, "box", "#53615f", side * .178, 0, 0, .008, .20, .025);
          wheels.push(wheel);
        }
        part("box", "#f3dfa3", side * .58, .51, 2.025, .42, .16, .03);
        part("box", "#a84437", side * .62, .51, -2.025, .28, .16, .03);
      }
      part("box", "#c4c4ad", 0, .28, 2.04, 1.75, .11, .03);
      if (route === "incoming") part("box", "#f0c76d", 0, 1.29, -.1, .60, .12, .35);
      root.add(g);
      actors.push({ kind: "car", mesh: g, route, speed, offset, wheels, pose: {} });
    }
    if (ratioMode !== "blockout") {
      car("#eab73c", "incoming", 4.5, farZ - taxi.depth * Z);
      car("#698395", "outgoing", 4.5, routeLength - (farZ - 7.5 * Z));
      car("#997267", "cross", 3.2, 0);
      for (let i = 0; i < 5; i++) {
        const g = new T.Group(), side = i % 2 ? 1 : -1;
        const body = joint(g), legs = [], arms = [];
        g.userData = { space: "WORLD", kind: "person", dimensions: { ...C.object_dimension_registry.pedestrian } };
        model.part(body, "ball", ["#446c80", "#ad7957", "#5d7d61"][i % 3], 0, 1.25, 0, .19, .45, .14);
        model.part(body, "ball", "#c69c7a", 0, 1.97, 0, .18, .23, .18);
        model.part(body, "ball", "#c69c7a", 0, 1.96, .18, .035, .04, .04);
        for (const s of [-1, 1]) {
          const hip = joint(body, s * .10, 1.03, 0);
          model.rod(hip, [0, 0, 0], [0, -.48, 0], .055, "#344a53");
          const knee = joint(hip, 0, -.48, 0);
          model.rod(knee, [0, 0, 0], [0, -.47, 0], .055, "#344a53");
          const foot = joint(knee, 0, -.47, 0);
          model.part(foot, "ball", "#344a53", 0, 0, .035, .085, .08, .135);
          legs.push({ hip, knee, foot });
          const arm = joint(body, s * .15, 1.53, 0);
          model.rod(arm, [0, 0, 0], [0, -.56, 0], .05, "#a77f62");
          arms.push(arm);
        }
        root.add(g);
        // Separated short sidewalk walks: stop, look/turn, then walk back facing
        // the travel direction. No recycled pedestrians popping through a facade.
        const near = street.transition + 2 + Math.floor(i / 2) * 16 + (side > 0 ? 3 : 0);
        const length = 10 + (i % 3) * 1.5, duration = length * 1.5 / .9;
        actors.push({ kind: "person", mesh: g, body, legs, arms, near, length,
          lane: side * street.walkingX, duration, offset: i * 5.7 + 4, pose: {} });
      }
    }
    function animate(time) { for (const a of actors) {
      if (a.kind === "car") { carPose(a, time); continue; }
      const half = a.duration + 2, t = mod(time + a.offset, half * 2);
      const back = t >= half, local = back ? t - half : t;
      const u = Math.min(1, local / a.duration), progress = smooth(u);
      const travel = a.length * progress;
      const speed = local < a.duration ? a.length / a.duration * 6 * u * (1 - u) : 0;
      const turn = smooth(Math.max(0, (local - a.duration) / 2));
      const p = a.pose;
      p.x = a.lane; p.z = a.near + (back ? a.length - travel : travel);
      p.heading = back ? Math.PI * 2 + Math.PI * turn : Math.PI + Math.PI * turn;
      p.distance = (back ? a.length : 0) + travel; p.speed = speed;
      a.mesh.position.set(p.x, street.sidewalkTop, -p.z);
      a.mesh.rotation.y = p.heading;
      const phase = p.distance / .95 * Math.PI * 2;
      const swing = Math.sin(phase) * Math.min(1, speed / .6);
      a.body.position.y = -.95 * (1 - Math.cos(.30 * swing));
      a.legs.forEach((leg, i) => {
        const step = (i ? -1 : 1) * swing;
        leg.hip.rotation.x = -.30 * step;
        leg.knee.rotation.x = Math.max(0, step);
        leg.foot.rotation.x = -leg.hip.rotation.x - leg.knee.rotation.x;
        a.arms[i].rotation.x = .22 * step;
      });
    } }
    animate(0);
    return { root, animate, actors, dispose };
  }
  catch (error) {
    dispose();
    throw error;
  }
}
