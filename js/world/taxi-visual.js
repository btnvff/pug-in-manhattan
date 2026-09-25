// One HTTP request per page; CPU bytes survive view teardown, GPU resources do not.
const TaxiVisual = (() => {
  let bytes;
  function attach(actors) {
    const T = window.THREE, resources = new Set(), mounts = [];
    let disposed = false;
    function dispose() {
      if (disposed) return;
      disposed = true;
      for (const { actor, mount, fallback } of mounts) {
        mount.removeFromParent();
        fallback.forEach(child => { child.visible = true; });
        delete actor.taxiWheels;
      }
      disposeThreeResources([...resources]);
      resources.clear();
      mounts.length = 0;
    }
    const cars = actors.filter(actor => actor.kind === "car");
    if (!cars.length || !T.GLTFLoader || typeof fetch !== "function") return { dispose };
    // Parse once per world lifetime, clone per car. No simulation state or RNG.
    if (!bytes) bytes = Promise.resolve().then(() => fetch("./assets/models/vehicles/nyc-taxi.glb")).then(response => {
      if (!response.ok) throw new Error("Taxi HTTP " + response.status);
      return response.arrayBuffer();
    });
    bytes.then(data => {
      if (disposed) return null;
      return new T.GLTFLoader().parseAsync(data, "");
    }).then(gltf => {
      if (!gltf) return;
      gltf.scene.traverse(node => {
        if (node.geometry) resources.add(node.geometry);
        for (const material of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) {
          resources.add(material);
          for (const value of Object.values(material)) if (value && value.isTexture) resources.add(value);
        }
      });
      if (disposed) {
        disposeThreeResources([...resources]); resources.clear(); return;
      }
      if (!gltf.scene.getObjectByName("CAR_ROOT")) throw new Error("Taxi hierarchy missing CAR_ROOT");
      for (const actor of cars) {
        const visual = gltf.scene.clone(true), mount = new T.Group();
        mount.name = "nyc-taxi-visual";
        // Export deliberately retains Blender +Y forward / +Z up.
        // Convert to game +Z forward / +Y up, inside the existing motion group.
        mount.rotation.y = Math.PI;
        mount.scale.setScalar(.75);
        visual.rotation.x = -Math.PI / 2;
        mount.add(visual);
        const wheels = ["FL", "FR", "RL", "RR"].map(s => visual.getObjectByName("WHEEL_" + s));
        if (wheels.some(w => !w)) throw new Error("Taxi wheel hierarchy incomplete");
        const fallback = actor.mesh.children.filter(child => child.name !== "world-contact");
        mounts.push({ actor, mount, fallback });
        actor.mesh.add(mount);
        actor.taxiWheels = wheels;
        wheels.forEach(w => { w.rotation.x = -(actor.pose.distance || 0) / (.352 * .75); });
        fallback.forEach(child => { child.visible = false; });
      }
    }).catch(error => {
      dispose();
      console.warn("Taxi visual unavailable; using procedural cars.", error);
    });
    return { dispose };
  }
  return { attach };
})();
