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
  // Grain belongs to the shared road material; larger repairs carry relief.
  // Asymmetric architecture; front-facade depth is explicit, not its center.
  const buildings = [
    { id: "near-left", x: -6.65, front: 4, h: 13, w: 5.9, l: 9, c: "#c77d65", trim: "#b7a389", sign: "JOE'S PIZZA" },
    { id: "near-right", x: 6.7, front: 4.7, h: 15.5, w: 6, l: 8, c: "#d2bd9b", trim: "#c5b69d", sign: "MANHATTAN DELI" },
    { id: "middle-left", x: -6.8, front: 7, h: 18, w: 6.2, l: 10, c: "#927d73", trim: "#d4bf9f", sign: "BAKERY" },
    { id: "middle-right", x: 6.5, front: 8, h: 17, w: 5.6, l: 11, c: "#a75c47", trim: "#dcb78e", sign: "CAFE" },
    { id: "far-left", x: -6.6, front: 10, h: 22, w: 5.8, l: 13, c: "#9e9b8f", trim: "#c6baa0" },
    { id: "far-right", x: 6.8, front: 11.4, h: 23, w: 6.2, l: 13, c: "#b58a68", trim: "#c9baa0" }
  ];
  function windowKit(x,y,z,side,variant,trim) {
    const pane=(color,dx,dy,depth,w,h,l,extra={})=>side?
      box(color,x-side*depth,y+dy,z+dx,l,h,w,extra):box(color,x+dx,y+dy,z-depth,w,h,l,extra);
    const width=.49+(variant%3)*.014;
    if(z>45) {
      pane(trim,0,0,.075,.68,.94,.14);
      pane(variant===1?"#ba9e67":"#b4c5be",0,0,.163,width,.76,.022,{finish:variant===1?"":"window"});
      pane(trim,0,-.50,.17,.76,.08,.23);
      return;
    }
    pane("#283a3c",0,0,.065,.70,.98,.13);
    pane(variant===1?"#d1aa69":"#c2d1cc",0,0,.145,width,.76,.025,{finish:variant===1?"":"window"});
    for(const dx of [-.30,.30])pane(trim,dx,0,.18,.06,.96,.10);
    pane(trim,0,.46,.18,.67,.07,.10);
    pane(trim,0,-.46,.18,.67,.07,.10);
    pane(trim,0,-.03,.19,.53,.025,.045);
    pane(trim,0,0,.19,.025,.79,.045);
    pane(trim,0,-.52,.18,.79,.10,.34);
    if(variant===2)for(let j=0;j<4;j++)pane("#b0ab92",0,.30-j*.068,.174,width,.027,.018);
    if(variant===3){pane("#c8b698",-.18,0,.17,.10,.71,.018);pane("#ded1ae",.17,.05,.17,.12,.63,.018);}
    if(variant===4){
      pane("#8c9590",.02,-.37,.29,.45,.23,.33);
      for(let j=0;j<4;j++)pane("#3e5154",.015,-.43+j*.042,.465,.34,.016,.014);
      pane("#c4c1ae",.02,-.245,.29,.49,.025,.37);
    }
  }
  for (const b of buildings) {
    const z = b.front * Z, inner = b.x < 0 ? b.x + b.w / 2 : b.x - b.w / 2, side = Math.sign(b.x);
    box(b.c, b.x, b.h / 2, z + b.l / 2, b.w, b.h, b.l, { id: b.id, role: "building", finish: b.id === "near-right" || b.id === "far-left" ? "stone" : "brick" });
    box(b.trim, b.x, b.h - .13, z + b.l / 2, b.w + .24, .28, b.l + .24);
    box(b.trim, b.x, 2.6, z + b.l / 2, b.w + .08, .20, b.l + .08);
    box("#596065", b.x, b.h + .08, z + b.l / 2, b.w - .35, .15, b.l - .35);
    for (let y = 3.5; y < b.h - 1; y += 1.55) {
      box(b.trim, b.x, y - .60, z - .045, b.w, .095, .10);
      for (let x = b.x - b.w / 2 + .62; x < b.x + b.w / 2 - .3; x += 1.13) {
        windowKit(x,y,z,0,Math.abs(Math.floor(x*7+y*5))%13,b.trim);
      }
      for (let q = z + .85; q < z + b.l - .3; q += 1.24) {
        windowKit(inner,y,q,side,Math.floor(q*3+y*5)%13,b.trim);
      }
    }
    for (let q = z + .8; q < z + b.l - .8; q += 1.6) {
      box("#294b50", inner - side * .06, 1.25, q, .18, 1.85, 1.25);
      box("#d7b98c", inner - side * .19, .24, q, .3, .28, 1.4);
    }
    for (let x = b.x - b.w / 2 + .65; x < b.x + b.w / 2 - .3; x += 1.35) {
      box("#718f89", x, 1.2, z - .08, 1.06, 1.9, .16,{finish:"window"});
      for(const dx of [-.57,.57])box("#35564e",x+dx,1.2,z-.21,.10,2.05,.25);
      box("#b9a07b",x,.16,z-.27,1.24,.21,.45);
      box("#c4b48e",x,1.8,z-.19,1.02,.055,.08);
      box("#d7b887",x-.38,1.05,z-.18,.04,.26,.045);
      box("#bc9864",x,1.97,z-.23,.65,.07,.08);
    }
    box("#1f3834",b.x,2.05,z-.30,b.w-.2,.08,.58);
    box(b.id.includes("left") ? "#315c47" : "#486b4c", b.x, 2.12, z - .44, b.w - .35, .13, .86,{angleX:-.14});
    box("#315347",b.x,1.96,z-.88,b.w-.35,.21,.07);
    for (let x = b.x - b.w / 2 + .1; x < b.x + b.w / 2; x += .48)
      box("#e5d4ac", x, 2.14, z - .47, .19, .04, .86);
    if (b.sign)
      shape("sign", "#e8dab7", b.x, 2.44, (z - .17) / Z, b.w - .45, .36, .04, { text: b.sign });
    // Base / middle / crown, with shallow parapets and a downpipe at a corner.
    box("#8c7766",b.x,.32,z-.08,b.w,.62,.17,{finish:"stone"});
    box(b.trim,b.x,b.h+.18,z-.03,b.w+.10,.48,.22);
    box(b.trim,inner-side*.07,b.h+.18,z+b.l/2,.22,.48,b.l);
    box("#917d67",b.x,b.h-.38,z-.12,b.w+.18,.10,.32);
    rod("#535d53",[inner-side*.12,.1,z+.28],[inner-side*.12,b.h-.3,z+.28],.039);
    for(let y=2.8;y<b.h;y+=2.6)box("#9b9076",inner-side*.15,y,z+.28,.055,.075,.14);
    // Fire escapes attached to street-facing facade coordinates.
    if (b.id === "near-left" || b.id === "middle-right")
      for (let y = 4; y < 12; y += 2.8) {
        box("#3e4947", inner - side*.32, y, z + 3.5, .65, .055, 1.9);
        for (const q of [z + 2.6, z + 4.4])
          rod("#394745", [inner - side*.65, y, q], [inner - side*.65, y + .55, q], .025);
        rod("#394745", [inner - side*.65, y + .55, z + 2.6], [inner - side*.65, y + .55, z + 4.4], .025);
        rod("#394745", [inner - side*.48, y, z + 2.7], [inner - side*.48, y + 2.8, z + 4.3], .028);
        for (let i = 0; i < 8; i++)
          rod("#44504d", [inner - side*.1, y + i * .35, z + 2.7 + i * .2], [inner - side*.5, y + i * .35, z + 2.7 + i * .2], .022);
      }
    if (b.id === "near-right") {
      box("#77584b", b.x + .3, b.h + .8, z + 2.4, 1.15, 1.5, 1.15);
      shape("cone", "#635347", b.x + .3, b.h + 1.85, (z + 2.4) / Z, 1.5, .65, 1.5);
    }
  }
  // Low corner shops form the missing layer behind the crossing. Their inner
  // edges stay outside the registry's sidewalk and the existing walking strip.
  for(const side of [-1,1]) {
    const x=side*4.95,z=street.transition+3.4;
    box(side<0?"#bd7056":"#9c8d71",x,1.7,z+2,2.35,3.4,4,{role:"corner-shop",finish:"brick"});
    box("#e0c9a0",x,3.45,z+2,2.55,.20,4.2);
    box("#233f40",x,1.40,z-.05,2.05,2.1,.12,{finish:"window"});
    for(const dx of [-1.08,-.38,.38,1.08])box("#47604e",x+dx,1.40,z-.16,.08,2.2,.24);
    box("#2f634c",x,2.68,z-.43,2.5,.14,.93,{angleX:-.13});
    box("#294b3b",x,2.49,z-.87,2.5,.24,.055);
    shape("sign","#f1dfb4",x,2.98,(z-.18)/Z,2.18,.37,.03,{text:side<0?"PIZZA & CO.":"CANAL MARKET"});
    box("#a18565",x,.18,z-.24,2.25,.23,.47);
    for(let i=0;i<3;i++) {
      const xx=x+(i-1)*.63;
      box("#8c6747",xx,.37,z-.48,.48,.35,.44);
      for(let j=0;j<3;j++)ball(i%2?"#b8943e":"#587f45",xx+(j-1)*.115,.58,z-.48,.15,.14,.16);
    }
  }
  // A few restrained, legible signs and freestanding boards; no new actor paths.
  for(const side of [-1,1]) {
    const x=side*street.furnitureX,z=street.transition+1.6+(side>0?1:0);
    rod("#455954",[x,.07,z],[x,3.6,z],.035);
    shape("sign","#e4e0be",x,3.42,(z-.06)/Z,.94,.27,.03,{text:side>0?"CANAL ST.":"HUDSON ST."});
    shape("sign","#303d3d",x,3.02,(z-.07)/Z,.79,.23,.03,{text:"ONE WAY >",background:"#ded7bc"});
    box("#846141",x,.59,z+2,.51,.96,.12,{angleX:.12});
    shape("sign","#dbd1a9",x,.66,(z+1.9)/Z,.44,.63,.03,{text:side>0?"COFFEE":"PIZZA",background:"#293f38"});
    for(const dx of [-.22,.22])rod("#76563d",[x+dx,.07,z+1.8],[x+dx,1.06,z+2.08],.028);
  }
  // A skyline sized in P remains substantial at d=20 and beyond.
  for (let i = 0; i < 17; i++) {
    const d = 20 + (i % 4) * 2.3, x = (i - 8) * 4.5, h = i === 8 ? 50 : 27 + (i * 13 % 24), w = 2.4 + (i % 3) * .7, z = d * Z;
    const tint = ["#7199ae", "#83a8b8", "#7093a9"][i % 3];
    box(tint, x, h * .25, z, w, h*.5, 3.8, { role: "skyline",finish:"distant" });
    box(tint, x, h * .65, z, w*.84, h*.3, 3.5, { role: "skyline",finish:"distant" });
    box(tint, x, h * .90, z, w*.66, h*.2, 3.2, { role: "skyline",finish:"distant" });
    box(tint, x, h + .7, z, w * .69, 1.4, 3.1);
    for (let y = 5; y < h - 1; y += 2.2) {
      const width=y<h*.5?1:y<h*.8?.84:.66,front=z-(y<h*.5?1.91:y<h*.8?1.76:1.61);
      for(let j=-1;j<=1;j++)box("#a2c0ca",x+j*w*width*.23,y,front,.11,.55,.025,{finish:"distant"});
    }
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
  // Open bracing inside the existing bridge envelope; uprights meet its deck.
  for(const z of planes) {
    const top=head-.7,leg=3.15;
    for(const side of [-1,1]) {
      box("#537c8b",side*leg,(top+deckTop)/2,z,.29,top-deckTop,.34,{role:"bridge-lattice"});
      for(let y=deckTop+.2;y<top-2;y+=2.4) {
        rod("#93adb4",[side*leg,y,z-.20],[side*(leg+.65),y+1.15,z-.20],.055);
        rod("#93adb4",[side*(leg+.65),y+1.15,z-.20],[side*leg,y+2.3,z-.20],.055);
      }
      rod("#688e9d",[side*leg,top,z],[side*bridge.towerX,head-1.4,z],.12);
    }
    box("#527e90",0,top,z,leg*2+.7,.32,.48,{role:"bridge-lattice"});
    box("#90afb8",0,top+.27,z,leg*2+1,.11,.56);
    for(const side of [-1,1])rod("#7196a3",[side*leg,top-2.5,z],[side*1.2,top-.24,z],.14);
    for(let x=-bridge.halfWidth+1;x<bridge.halfWidth-1;x+=1.5) {
      rod("#9cb4b5",[x,deckTop+.07,z-.91],[x+.7,deckTop+.8,z-.91],.04);
      rod("#9cb4b5",[x+.7,deckTop+.8,z-.91],[x+1.4,deckTop+.07,z-.91],.04);
    }
  }
  // Lamps, vegetation and bins are placed on sidewalks, with explicit elevation.
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const d = 3.2 + i * 2.4 + (side > 0 ? .55 : 0), z = d * Z, xx = side * street.furnitureX;
      rod("#354e47", [xx, .07, z], [xx, 3.3, z], .048);
      shape("cylinder","#344d43",xx,.24,d,.18,.35,.18);
      rod("#455854", [xx, 3.3, z], [xx - side * .43, 3.52, z], .039);
      rod("#455854", [xx-side*.43, 3.52, z], [xx - side * .70, 3.36, z], .035);
      shape("ball", "#f3dca0", xx - side * .70, 3.18, d, .17, .27, .17);
      shape("cone","#344c45",xx-side*.70,3.38,d,.28,.17,.28);
      shape("cylinder","#344c45",xx-side*.70,3.02,d,.16,.055,.16);
      if (i % 2 === 0) {
        box("#637b60", side * street.furnitureX, .36, z + 1.5, .40, .58, .45);
        rod("#77654d", [side * street.furnitureX, .07, z + 3], [side * street.furnitureX, 2.7, z + 3], .065);
        for(let k=0;k<7;k++) {
          const a=k*2.399,dx=Math.cos(a)*.35,dy=k%3*.26,dz=Math.sin(a)*.30;
          rod("#77654d",[xx,2.15,z+3],[xx+dx,2.8+dy,z+3+dz],.035);
          ball(["#647e49","#789054","#536e47"][k%3],xx+dx,2.72+dy,z+3+dz,.68,.74,.65);
        }
      }
    }
  // Foreground edges are asymmetric, outside the central catch corridor and
  // before the car routes. Each curb segment has real thickness and a worn cap.
  for(const side of [-1,1])for(let i=0;i<9;i++) {
    const z=2.1+i*.60,edge=side*(.25+.23*z);
    box("#a9a89a",edge+side*.45,.035,z,.82,.07,.66,{finish:"sidewalk",angleY:-side*.226});
    box(i%4===1?"#9e9e92":"#c4b69b",edge,.078+(i%3)*.003,z,.17,.15,.62,{finish:"stone",angleY:-side*.226});
    box("#545c58",edge-side*.14,.002,z,.12,.009,.62,{angleY:-side*.226});
    if(i%3===0)box("#716f60",edge-side*.072,.144,z+.16,.028,.017,.09,{angleY:side*.3});
  }
  const hydrantX=-1.52,hydrantD=1,hydrantZ=hydrantD*Z;
  shape("cylinder","#862e27",hydrantX,.125,hydrantD,.36,.09,.36,{id:"hydrant-left-base"});
  shape("cylinder","#b6332d",hydrantX,.455,hydrantD,.235,.61,.235,{id:"hydrant-left"});
  shape("cylinder","#d44936",hydrantX,.77,hydrantD,.35,.07,.35);
  ball("#c74131",hydrantX,.858,hydrantZ,.32,.19,.32);
  shape("cylinder","#833b2c",hydrantX,.970,hydrantD,.075,.075,.075);
  for(const y of [.21,.72])shape("ring","#752f28",hydrantX,y,hydrantD,.30,.30,.55,{angleX:Math.PI/2});
  for(const side of [-1,1]) {
    shape("cylinder","#bc4031",hydrantX+side*.163,.57,hydrantD,.14,.15,.14,{angleZ:Math.PI/2});
    shape("cylinder","#85312b",hydrantX+side*.24,.57,hydrantD,.16,.035,.16,{angleZ:Math.PI/2});
    ball("#cb7550",hydrantX+side*.262,.57,hydrantZ,.025,.047,.047);
  }
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    ball("#7d5240",hydrantX+Math.cos(a)*.143,.805,hydrantZ+Math.sin(a)*.143,.03,.027,.03);
  }
  shape("sign","#303e39",hydrantX,.41,(hydrantZ-.126)/Z,.14,.20,.02,{text:"NYC",background:"#c9b992"});
  // Raised rim and inset patterned cover replace the matching right hydrant.
  const mx=.99,mz=4.88;
  shape("cylinder","#313e40",mx,.025,mz/Z,.89,.055,.89,{id:"foreground-manhole"});
  shape("cylinder","#4c5a59",mx,.056,mz/Z,.75,.022,.75);
  shape("ring","#7e8272",mx,.071,mz/Z,.87,.87,.44,{angleX:Math.PI/2});
  for(const radius of [.28,.53,.72])shape("ring","#26373a",mx,.073,mz/Z,radius,radius,.13,{angleX:Math.PI/2});
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    rod("#26373a",[mx+Math.cos(a)*.09,.073,mz+Math.sin(a)*.09],[mx+Math.cos(a)*.34,.073,mz+Math.sin(a)*.34],.008);
  }
  // A few broad repairs carry the relief; small cracks branch from their edges.
  for(const [x,z,w,l,tint] of [[-.85,5.9,.65,1.24,"#a7aaa6"],[.62,6.75,1.0,.76,"#7b8383"],[-.3,3.7,1.2,.49,"#899190"],[1.44,8.7,.85,1.3,"#96938b"]]) {
    shape("patch",tint,x,-.001,z/Z,w,.01,l,{finish:"asphalt"});
  }
  for(const [x,z,dir] of [[-1.07,5.8,-1],[.88,6.5,1],[-.51,3.6,1],[1.32,8.6,-1]]) {
    let px=x,pz=z;
    for(let i=0;i<7;i++) {
      const nx=px+dir*(.08+.08*Math.sin(i*5)),nz=pz+.18;
      rod("#273a3e",[px,.002,pz],[nx,.002,nz],.0065);
      if(i%3===1)rod("#344348",[px,.002,pz],[px-dir*.18,.002,pz+.22],.0045);
      px=nx;pz=nz;
    }
  }
  shape("patch","#adbec1",-.91,-.002,4.65/Z,.57,.01,1.13,{finish:"puddle"});
  shape("patch","#697b7c",-1.16,-.003,5.68/Z,.32,.01,.54,{finish:"puddle"});
  shape("newspaper","#d6c7a5",1.12,.045,3.9/Z,.67,.10,.57,{angleY:-.32});
  const leafColors=["#a95729","#bb7734","#c79b4f","#777347"];
  for(let i=0;i<35;i++) {
    const side=i%3===0?1:-1,z=2.6+(i*1.713%4.5),x=side*(.19+.23*z)-(side*(.06+(i%4)*.026));
    shape("leaf",leafColors[i%4],x,.011,z/Z,.06+(i%3)*.018,.03,.12,{angleY:i*1.81});
  }
  return { objects, buildings, street };
}
const RATIO_LAYOUT = createRatioLayout();
function createRatioWorld(model) {
  const T = window.THREE, C = PUG_WORLD_RATIO, Z = C.projection_calibration.pug_camera_depth;
  const root = new T.Group(), owned = [], actors = [], materials = new Map(), textures = new Map(), geometries = {};
  let disposed = false;
  let taxiVisual;
  const steam = [];
  const own = resource => { owned.push(resource); return resource; };
  function dispose() {
    if (disposed)
      return;
    disposed = true;
    if (taxiVisual) taxiVisual.dispose();
    disposeThreeResources([...owned, ...materials.values()]);
    owned.length = 0;
    materials.clear();
    actors.length = 0;
    textures.clear();
    steam.length = 0;
    root.clear();
  }
  try {
    root.name = "ratio-world";
    root.userData.space = "WORLD";
    geometries.box = own(new T.BoxGeometry(1, 1, 1));
    geometries.ball = own(new T.SphereGeometry(.5, 12, 8));
    geometries.cylinder = own(new T.CylinderGeometry(.5, .5, 1, 12));
    geometries.cone = own(new T.ConeGeometry(.5, 1, 12));
    geometries.ring = own(new T.TorusGeometry(.45,.025,6,32));
    const repair=new T.Shape();repair.moveTo(-.49,-.33);repair.lineTo(-.31,-.49);repair.lineTo(.40,-.46);repair.lineTo(.50,-.22);repair.lineTo(.43,.40);repair.lineTo(.23,.49);repair.lineTo(-.45,.42);repair.closePath();
    geometries.patch = own(new T.ShapeGeometry(repair));
    geometries.patch.rotateX(-Math.PI/2);
    const patchVertices=geometries.patch.attributes.position;
    for(let i=1;i<patchVertices.count;i++){const k=.91+.09*Math.sin(i*8.1);patchVertices.setX(i,patchVertices.getX(i)*k);patchVertices.setZ(i,patchVertices.getZ(i)*k);}
    geometries.leaf=own(new T.OctahedronGeometry(.5,0));
    const buckets = new Map(), matrix = new T.Matrix4(), quat = new T.Quaternion(), pos = new T.Vector3(), scl = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    // Small shared texture families. All variation is authored from a private
    // integer sequence at construction time; gameplay RNG and per-frame work stay intact.
    function texture(family) {
      if (textures.has(family)) return textures.get(family);
      const canvas = document.createElement("canvas"), size = family === "asphalt" ? 512 : 256;
      canvas.width = canvas.height = size;
      const pen = canvas.getContext("2d");
      let seed = 9137;
      const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      pen.fillStyle = family === "asphalt" ? "#788086" : family === "metal" ? "#dad7c9" : "#c6c1b3";
      pen.fillRect(0, 0, size, size);
      if (family === "brick") {
        pen.fillStyle = "#847363"; pen.fillRect(0, 0, size, size);
        for (let row = 0; row < 16; row++) for (let col = -1; col < 5; col++) {
          const x = col * 64 + (row % 2) * 32, y = row * 16;
          const v = 158 + Math.floor(noise() * 55);
          pen.fillStyle = `rgb(${v},${v-10},${v-20})`;
          pen.fillRect(x + 1, y + 1, 61, 13);
          pen.fillStyle = "rgba(45,31,22,.22)"; pen.fillRect(x + 2, y + 12, 60, 2);
          pen.fillStyle = "rgba(255,239,203,.22)"; pen.fillRect(x + 2, y + 1, 59, 1);
        }
      } else if (family === "sidewalk" || family === "stone") {
        const slab = family === "sidewalk" ? 128 : 64;
        for (let y = 0; y < size; y += slab) for (let x = 0; x < size; x += slab) {
          const v = 178 + Math.floor(noise() * 33);
          pen.fillStyle = `rgb(${v},${v-3},${v-10})`; pen.fillRect(x+2,y+2,slab-4,slab-4);
          pen.fillStyle = "rgba(61,56,46,.16)"; pen.fillRect(x+2,y+slab-6,slab-4,4);
          pen.fillStyle = "rgba(255,245,220,.26)"; pen.fillRect(x+3,y+3,slab-6,2);
        }
      } else if (family === "window" || family === "puddle") {
        const sky = pen.createLinearGradient(0,0,160,256);
        sky.addColorStop(0,"#779ba1"); sky.addColorStop(.45,"#47666b"); sky.addColorStop(1,"#29434a");
        pen.fillStyle=sky; pen.fillRect(0,0,256,256);
        pen.fillStyle="rgba(158,191,186,.16)";
        pen.beginPath();pen.moveTo(10,0);pen.lineTo(85,0);pen.lineTo(246,256);pen.lineTo(199,256);pen.closePath();pen.fill();
      }
      if(family === "puddle") {
        for(let i=0;i<16;i++){pen.fillStyle=i%3?"rgba(208,185,130,.17)":"rgba(190,216,215,.23)";pen.fillRect(i*17,15+(i%4)*20,5,150-(i%3)*25);}
        pen.strokeStyle="rgba(201,224,218,.40)";pen.lineWidth=1.3;
        for(let i=0;i<4;i++){pen.beginPath();pen.ellipse(125,150,35+i*15,9+i*4,0,0,Math.PI*2);pen.stroke();}
      }
      if (family !== "window" && family !== "puddle") for (let i=0;i<(family === "asphalt"?22000:2400);i++) {
        const v=noise(), x=noise()*size, y=noise()*size;
        pen.fillStyle=v>.52?"rgba(245,233,207,.21)":"rgba(23,31,35,.19)";
        pen.fillRect(x,y,noise()*1.7+.4,noise()*1.2+.5);
      }
      if (family === "asphalt") {
        for(let i=0;i<12;i++) {
          const x=noise()*size,y=noise()*size,r=20+noise()*55;
          const stain=pen.createRadialGradient(x,y,1,x,y,r);
          stain.addColorStop(0,i%3?"rgba(32,42,43,.12)":"rgba(210,180,128,.11)");stain.addColorStop(1,"rgba(55,59,57,0)");
          pen.fillStyle=stain;pen.fillRect(x-r,y-r,r*2,r*2);
        }
        for(let i=0;i<9;i++) {
          pen.strokeStyle="rgba(29,38,41,.3)";pen.lineWidth=1.3;
          let x=noise()*size,y=noise()*size;pen.beginPath();pen.moveTo(x,y);
          for(let j=0;j<6;j++){x+=noise()*30-15;y+=noise()*20;pen.lineTo(x,y);}pen.stroke();
        }
      }
      const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
      map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
      textures.set(family,map);return map;
    }
    function material(color, finish = "") {
      const key=color+":"+finish;
      if (!materials.has(key)) {
        if(finish === "distant") {const mat=new T.MeshBasicMaterial({color});materials.set(key,mat);return mat;}
        const mat = new T.MeshStandardMaterial({ color, roughness: finish === "window" ? .32 : finish === "puddle" ? .16 : .91,
          metalness: finish === "window" || finish === "puddle" ? .18 : 0 });
        // Register before texture construction, which can fail partway through.
        materials.set(key,mat);
        if (finish && ratioMode !== "blockout") {
          mat.map=texture(finish);
          if(finish !== "window" && finish !== "puddle") {mat.bumpMap=mat.map;mat.bumpScale=finish === "asphalt"?.016:finish === "metal"?.008:.024;}
        }
        if(color === "#f3dca0") {mat.emissive=new T.Color("#e9a342");mat.emissiveIntensity=.45;}
      }
      return materials.get(key);
    }
    function finishFor(o) {
      if (o.finish) return o.finish;
      if (o.surface === "block-ground") return "sidewalk";
      if(["#b6332d","#d44936","#c74131","#bc4031","#313e40","#4c5a59","#455854","#3e4947"].includes(o.color))return "metal";
      if (["#3c5867","#466171","#294b50","#294c51"].includes(o.color)) return "window";
      return "";
    }
    // UV density is measured in world units, not stretched across each facade.
    function surfaceBox(o, finish) {
      const key=finish+":"+[o.width,o.height,o.length].join(":");
      if(!geometries[key]) {
        const geo=own(new T.BoxGeometry(1,1,1)), uv=geo.attributes.uv;
        const tile=finish === "brick"?2.4:finish === "stone"?4:2.7;
        for(let i=0;i<uv.count;i++) {
          const face=Math.floor(i/4), w=face<2?o.length:o.width, h=face===2||face===3?o.length:o.height;
          uv.setXY(i,uv.getX(i)*w/tile,uv.getY(i)*h/tile);
        }
        geometries[key]=geo;
      }
      return key;
    }
    function roadSurface(o) {
      const geo=own(new T.PlaneGeometry(o.width,o.length,40,80)), p=geo.attributes.position, uv=geo.attributes.uv;
      const center=o.d*Z, start=center-o.length/2;
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i)+o.x, z=center-p.getY(i);
        const edge=Math.min(1,Math.max(0,Math.min(z-start,start+o.length-z)));
        // Broad crown, shallow repairs and depressions; never an obstacle to actors.
        const relief=(-.014+.008*Math.cos(x*.65)+.005*Math.sin(x*1.7+z*.8)*Math.cos(z*.53))*edge;
        p.setXYZ(i,x,relief,-z);uv.setXY(i,x/4,z/4);
      }
      for(let i=0;i<geo.index.count;i+=3) {const b=geo.index.getX(i+1);geo.index.setX(i+1,geo.index.getX(i+2));geo.index.setX(i+2,b);}
      geo.computeVertexNormals();
      const mesh=new T.Mesh(geo,material("#9b9996","asphalt"));mesh.name="worn-road-"+o.id;root.add(mesh);
    }
    for (const o of RATIO_LAYOUT.objects) {
      if(o.kind === "newspaper") {
        if(ratioMode === "blockout")continue;
        const canvas=document.createElement("canvas");canvas.width=512;canvas.height=384;
        const pen=canvas.getContext("2d");pen.fillStyle="#c8b894";pen.fillRect(0,0,512,384);
        pen.fillStyle="#3d4945";pen.font="bold 43px Georgia";pen.textAlign="center";pen.fillText("The Manhattan",256,57);
        pen.fillRect(20,73,472,3);pen.font="bold 28px Georgia";pen.fillText("GOOD DOGS, BIG CITY",256,116);
        for(let col=0;col<3;col++)for(let row=0;row<20;row++)pen.fillRect(24+col*160,146+row*10,139-(row%3)*9,2);
        const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;
        const mat=own(new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide}));
        const geo=own(new T.PlaneGeometry(o.width,o.length,2,1));
        const p=geo.attributes.position;
        for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i),Math.abs(p.getX(i))<.001?.075:0,-p.getY(i));
        geo.computeVertexNormals();const mesh=new T.Mesh(geo,mat);mesh.position.set(o.x,o.y,-o.d*Z);mesh.rotation.y=o.angleY;root.add(mesh);continue;
      }
      if (o.kind === "sign") {
        if (ratioMode === "blockout")
          continue;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 64;
        const pen = canvas.getContext("2d");
        pen.fillStyle = o.background || "#284f4b";
        pen.fillRect(0, 0, 512, 64);
        pen.fillStyle = o.color;
        pen.font = "bold 38px Georgia";
        pen.strokeStyle=o.color;pen.lineWidth=2;pen.strokeRect(7,6,498,52);
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
      if(o.surface === "road" && ratioMode !== "blockout") {roadSurface(o);continue;}
      const finish=finishFor(o);
      const kind = o.kind === "rod" ? "cylinder" : o.kind;
      const geometry=["brick","stone","sidewalk"].includes(finish) && kind==="box"?surfaceBox(o,finish):kind;
      // Per-instance tint keeps material variations in the same draw batch.
      const emissive=o.color === "#f3dca0",key = geometry+":"+finish+(emissive?":lamp":"");
      if (!buckets.has(key))
        buckets.set(key, { kind:geometry, color: emissive?o.color:"#ffffff", finish, emissive, objects: [] });
      buckets.get(key).objects.push(o);
    }
    for (const batch of buckets.values()) {
      const mesh = own(new T.InstancedMesh(geometries[batch.kind], material(batch.color,batch.finish), batch.objects.length));
      batch.objects.forEach((o, i) => { pos.set(o.x, o.y, -o.d * Z); quat.setFromEuler(new T.Euler(o.angleX||0,o.angleY||0,o.angleZ||0)); if (o.kind === "rod") {
        const v = new T.Vector3(o.b[0] - o.a[0], o.b[1] - o.a[1], o.a[2] - o.b[2]);
        quat.setFromUnitVectors(up, v.normalize());
      } scl.set(o.width, o.height, o.length); matrix.compose(pos, quat, scl); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i,new T.Color(batch.emissive?"#ffffff":o.color)); });
      root.add(mesh);
    }
    const street = RATIO_LAYOUT.street, road = street.road;
    function softTexture(white) {
      const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
      const pen=canvas.getContext("2d"),g=pen.createRadialGradient(64,64,4,64,64,64);
      g.addColorStop(0,white?"rgba(223,226,214,.42)":"rgba(19,31,30,.55)");
      g.addColorStop(.46,white?"rgba(219,225,215,.21)":"rgba(19,31,30,.31)");
      g.addColorStop(1,white?"rgba(219,225,215,0)":"rgba(19,31,30,0)");
      pen.fillStyle=g;pen.fillRect(0,0,128,128);return own(new T.CanvasTexture(canvas));
    }
    const contactMap=softTexture(false),contactGeo=own(new T.PlaneGeometry(1,1));
    const contactMat=own(new T.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    function contact(parent,x,y,z,w,l) {
      const mesh=new T.Mesh(contactGeo,contactMat);mesh.name="world-contact";
      mesh.position.set(x,y,z);mesh.rotation.x=-Math.PI/2;mesh.scale.set(w,l,1);parent.add(mesh);
    }
    if(ratioMode !== "blockout") {
      contact(root,-1.49,.006,-5.625,.58,.70);
      contact(root,.99,.003,-4.88,1.02,.96);
      const mist=softTexture(true);
      for(let i=0;i<5;i++) {
        const mat=own(new T.MeshBasicMaterial({map:mist,transparent:true,depthWrite:false,opacity:.32}));
        const mesh=new T.Mesh(contactGeo,mat);mesh.name="manhole-steam";root.add(mesh);steam.push(mesh);
      }
      const cloudCanvas=document.createElement("canvas");cloudCanvas.width=256;cloudCanvas.height=128;
      const pen=cloudCanvas.getContext("2d");
      for(let i=0;i<8;i++) {
        const x=25+i*29,y=65-Math.sin(i*.6)*24,r=22+(i%3)*4;
        const gradient=pen.createRadialGradient(x,y,r*.25,x,y,r);
        gradient.addColorStop(0,"rgba(241,244,233,.82)");gradient.addColorStop(.65,"rgba(231,239,233,.55)");gradient.addColorStop(1,"rgba(225,238,233,0)");
        pen.fillStyle=gradient;pen.fillRect(x-r,y-r,r*2,r*2);
      }
      const cloudMap=own(new T.CanvasTexture(cloudCanvas));cloudMap.colorSpace=T.SRGBColorSpace;
      const cloudMat=own(new T.MeshBasicMaterial({map:cloudMap,transparent:true,depthWrite:false,fog:false,opacity:.65}));
      for(const [x,y,z,w,h] of [[-45,135,-300,100,40],[61,157,-330,116,48],[-90,78,-300,80,27],[115,94,-350,92,31]]) {
        const cloud=new T.Mesh(contactGeo,cloudMat);cloud.name="distant-cloud";cloud.position.set(x,y,z);cloud.scale.set(w,h,1);root.add(cloud);
      }
    }
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
    // Shared world-owned sedan profiles: long hood, separate trunk and wheel
    // cutouts. The authored footprint and route/wheel clocks are unchanged.
    function sedanProfile(points,width,bevel) {
      const outline=new T.Shape();points(outline);
      const geo=own(new T.ExtrudeGeometry(outline,{depth:width,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1,curveSegments:8}));
      geo.translate(0,0,-width/2);geo.rotateY(-Math.PI/2);return geo;
    }
    const carBody=sedanProfile(s=>{
      s.moveTo(-1.98,.27);s.lineTo(-1.98,.64);s.lineTo(-1.87,.73);
      s.lineTo(-.98,.76);s.lineTo(.62,.76);s.lineTo(1.82,.67);s.lineTo(1.99,.56);s.lineTo(1.99,.27);
      s.lineTo(1.58,.27);s.bezierCurveTo(1.59,.70,.97,.70,.97,.27);
      s.lineTo(-.92,.27);s.bezierCurveTo(-.93,.70,-1.56,.70,-1.56,.27);s.closePath();
    },1.76,.035);
    const carCabin=sedanProfile(s=>{s.moveTo(-1.09,.76);s.lineTo(-.74,1.17);s.lineTo(.20,1.17);s.lineTo(.70,.76);s.closePath();},1.49,.025);
    const carRoof=own(new T.BoxGeometry(1.49,.055,.96));
    const tire=own(new T.CylinderGeometry(.25,.25,.16,16));tire.rotateZ(Math.PI/2);
    const hub=own(new T.CylinderGeometry(.14,.14,.017,12));hub.rotateZ(Math.PI/2);
    function carMaterial(color,kind="paint") {
      const key="car-"+kind+color;
      if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:kind==="glass"?.24:kind==="tire"?.97:.43,metalness:kind==="glass"?.25:kind==="tire"?0:.28}));
      return materials.get(key);
    }
    function car(color, route, speed, offset) {
      const g = new T.Group(), wheels = [], trimBatches=new Map();
      g.userData = { space: "WORLD", kind: "car", dimensions: { ...taxi }, route };
      contact(g,0,.002,0,1.92,4.07);
      const add=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;};
      const part=(shape,c,x,y,z,w,h,l)=>{
        const key=shape+":"+c;
        if(!trimBatches.has(key))trimBatches.set(key,{shape,color:c,parts:[]});
        trimBatches.get(key).parts.push([x,y,z,w,h,l]);
      };
      add(g,carBody,carMaterial(color));add(g,carCabin,carMaterial("#344e58","glass"));
      add(g,carRoof,carMaterial(color),0,1.204,-.27);
      // Hood and trunk seams, dark chassis and inset grille.
      part("box","#253638",0,.255,0,1.64,.08,3.76);
      part("box",color,0,.73,1.17,1.69,.055,1.09);
      part("box",color,0,.766,-1.51,1.71,.045,.60);
      part("box","#253438",0,.485,2.031,.77,.19,.028);
      for(let j=0;j<5;j++)part("box","#9faba9",(j-2)*.135,.487,2.05,.029,.14,.015);
      for (const side of [-1, 1]) {
        for (const z of [-1.25, 1.24]) {
          const wheel = joint(g, side * .85, .25, z);
          add(wheel,tire,carMaterial("#20292c","tire"));add(wheel,hub,carMaterial("#a7afa6"),side*.09);
          const spoke=add(wheel,geometries.box,carMaterial("#4a5a5d"),side*.104);spoke.scale.set(.012,.23,.031);
          const axle=add(wheel,geometries.ball,carMaterial("#b6b6a2"),side*.111);axle.scale.set(.019,.065,.065);
          wheels.push(wheel);
        }
        part("box","#f5dbaa",side*.63,.51,2.015,.38,.16,.035);
        part("box","#dfa747",side*.86,.51,2.005,.055,.14,.045);
        part("box","#a74432",side*.65,.53,-2.012,.32,.16,.035);
        part("box",color,side*.78,.955,-.30,.07,.42,.085);
        part("box",color,side*.76,.78,-.18,.07,.055,1.64);
        part("box","#7a8377",side*.898,.44,-.02,.025,.037,1.65);
        part("box","#596055",side*.896,.60,-.40,.015,.24,.017);
        for(const z of [-.70,.28])part("box","#c1ba94",side*.90,.69,z,.025,.045,.14);
        part("box",color,side*.92,.87,.54,.14,.11,.20);
        part("box","#56727a",side*.924,.877,.44,.12,.07,.025);
      }
      for(const z of [-2.025,2.035]) {
        part("box","#828d88",0,.31,z,1.76,.11,.04);
        part("box","#e0c685",0,.345,z+(z>0?.023:-.017),.32,.125,.013);
      }
      if (route === "incoming") {
        part("box","#263e39",0,1.25,-.24,.58,.06,.30);
        part("box","#efd28c",0,1.31,-.24,.51,.06,.25);
        for(let i=0;i<7;i++)part("box",i%2?"#dfb451":"#364642",.909,.67,-.93+i*.20,.015,.08,.10);
      }
      for(const batch of trimBatches.values()) {
        const mesh=own(new T.InstancedMesh(geometries[batch.shape],carMaterial(batch.color),batch.parts.length));
        for(let i=0;i<batch.parts.length;i++) {
          const [x,y,z,w,h,l]=batch.parts[i];
          matrix.compose(pos.set(x,y,z),quat.identity(),scl.set(w,h,l));mesh.setMatrixAt(i,matrix);
        }
        g.add(mesh);
      }
      root.add(g);
      actors.push({ kind: "car", mesh: g, route, speed, offset, wheels, pose: {} });
    }
    if (ratioMode !== "blockout") {
      car("#e9ac28", "incoming", 4.5, farZ - taxi.depth * Z);
      car("#536b78", "outgoing", 4.5, routeLength - (farZ - 7.5 * Z));
      car("#485a53", "cross", 3.2, 0);
      for (let i = 0; i < 5; i++) {
        const g = new T.Group(), side = i % 2 ? 1 : -1;
        const body = joint(g), legs = [], arms = [];
        g.userData = { space: "WORLD", kind: "person", dimensions: { ...C.object_dimension_registry.pedestrian } };
        contact(g,0,.003,0,.41,.50);
        model.part(body, "ball", ["#446c80", "#ad7957", "#5d7d61"][i % 3], 0, 1.25, 0, .19, .45, .14);
        model.part(body, "ball", "#c69c7a", 0, 1.97, 0, .18, .23, .18);
        model.part(body,"ball",["#4b3b30","#332e2b","#785747"][i%3],0,2.12,-.018,.18,.11,.174);
        model.part(body,"box","#a59679",0,1.30,.141,.027,.60,.026);
        if(i%2===0)model.part(body,"ball","#675746",0,1.25,-.15,.16,.28,.09);
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
    function animate(time) {
      for(let i=0;i<steam.length;i++) {
        const phase=mod(time*.18+i*.2,1),size=.20+phase*.47;
        steam[i].position.set(1.02+Math.sin(phase*5+i)*.045+phase*.17,.10+phase*.75,-4.92);
        steam[i].scale.set(size,size*1.45,1);steam[i].material.opacity=Math.sin(phase*Math.PI)*.32;
      }
      for (const a of actors) {
      if (a.kind === "car") {
        carPose(a, time);
        if (a.taxiWheels) a.taxiWheels.forEach(w => { w.rotation.x = -a.pose.distance / (.352 * .75); });
        continue;
      }
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
    taxiVisual = TaxiVisual.attach(actors);
    return { root, animate, actors, dispose };
  }
  catch (error) {
    dispose();
    throw error;
  }
}
