// Scenery alone uses perspective; gameplay retains its exact orthographic pixels.
function createCityPerspective(width, height) {
  const focal = width * 1.02, eye = height * .38;
  const vanishingX = width * .51, horizon = height * .63;
  function project(x, y, depth, out = {}) {
    const scale = focal / (focal + depth);
    out.x=vanishingX+x*scale;out.y=horizon+(eye-y)*scale;
    out.z=-200-(1-scale)*300;out.scale=scale;return out;
  }
  function groundX(x, screenY) { return vanishingX + x * (screenY - horizon) / eye; }
  return { project, groundX, focal, eye, vanishingX, horizon, roadHalf: width * .47 };
}
function createThreeWorld(model, width, height) {
  const T = window.THREE;
  const root = model.group(), birds = [], steam = [], clouds = [], papers = [];
  const textures = [], disposableMaterials = [];
  const base = height * 0.73, walk = height - 148;
  const perspective = createCityPerspective(width, height);
  const { horizon, vanishingX } = perspective;
  const { roadHalf } = perspective;
  function ball(color, x, y, z, sx, sy, sz) {
    return model.part(root, "ball", color, x - width / 2, height / 2 - y, z, sx, sy, sz);
  }
  function streetX(side, y, inset = 0) {
    return perspective.groundX(side * (roadHalf - width * inset), y);
  }
  function sign(text, x, y, w, h, bg, fg, z = -135) {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const pen = canvas.getContext("2d");
    pen.fillStyle = bg; pen.fillRect(0, 0, 512, 128);
    pen.strokeStyle = fg; pen.lineWidth = 5; pen.strokeRect(7, 7, 498, 114);
    pen.fillStyle = fg; pen.font = "bold 48px Georgia";
    pen.textAlign = "center"; pen.textBaseline = "middle";
    pen.fillText(text, 256, 67, 478);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    const mat = new T.MeshBasicMaterial({ map: texture });
    disposableMaterials.push(mat);
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    mesh.position.set(x - width / 2, height / 2 - y, z);
    root.add(mesh);
  }
  // Project the actual corners of every facade detail, not just its center.
  // Shared vertex-color batches retain real face normals and reduce draw calls.
  const cityBatches = new Map();
  function cityVertex(point) {
    const p = perspective.project(...point);
    return [p.x - width / 2, height / 2 - p.y, p.z];
  }
  function cityFace(points, normal, color, finish = "plain", haze = 0, vertexNormals = null) {
    if (!cityBatches.has(finish)) cityBatches.set(finish, { positions: [], normals: [], colors: [], uvs: [] });
    const batch = cityBatches.get(finish);
    const tint = new T.Color(color).lerp(new T.Color("#9cbfd5"), haze);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const n=vertexNormals?vertexNormals[i]:normal;
      const light=.76+.32*Math.max(0,n[0]*-.36+n[1]*.65+n[2]*.67);
      batch.positions.push(...cityVertex(points[i])); batch.normals.push(...n);
      const contact = .89 + .11 * Math.min(1, Math.max(0, points[i][1] / 165));
      batch.colors.push(tint.r*contact*light,tint.g*contact*light,tint.b*contact*light);
      if(finish==="shadow")batch.uvs.push(...[[0,0],[1,0],[1,1],[0,1]][i]);
      else batch.uvs.push((normal[0] ? points[i][2] : points[i][0]) / 24, (normal[1] ? points[i][2] : points[i][1]) / 16);
    }
  }
  function cityBox(color, x, y, depth, sx, sy, sz, finish = "plain", haze = 0) {
    const l = x - sx / 2, r = x + sx / 2, b = y - sy / 2, t = y + sy / 2, n = depth - sz / 2, f = depth + sz / 2;
    cityFace([[l,b,n],[r,b,n],[r,t,n],[l,t,n]], [0,0,1], color, finish, haze);
    cityFace([[r,b,f],[l,b,f],[l,t,f],[r,t,f]], [0,0,-1], color, finish, haze);
    cityFace([[r,b,n],[r,b,f],[r,t,f],[r,t,n]], [1,0,0], color, finish, haze);
    cityFace([[l,b,f],[l,b,n],[l,t,n],[l,t,f]], [-1,0,0], color, finish, haze);
    cityFace([[l,t,n],[r,t,n],[r,t,f],[l,t,f]], [0,1,0], color, finish, haze);
    cityFace([[l,b,f],[r,b,f],[r,b,n],[l,b,n]], [0,-1,0], color, finish, haze);
  }
  function cityRod(color, a, b, radius) {
    // Merge static rails/cables with the city instead of hundreds of draw calls.
    const start = new T.Vector3(a[0],a[1],-a[2]), end = new T.Vector3(b[0],b[1],-b[2]);
    const axis = end.clone().sub(start).normalize();
    const u = new T.Vector3(Math.abs(axis.y) > .9 ? 1 : 0, Math.abs(axis.y) > .9 ? 0 : 1, 0).cross(axis).normalize();
    const v = axis.clone().cross(u);
    const point = (center, angle) => {
      const p = center.clone().addScaledVector(u,Math.cos(angle)*radius).addScaledVector(v,Math.sin(angle)*radius);
      return [p.x,p.y,-p.z];
    };
    for(let i=0;i<6;i++) {
      const a0=i*Math.PI/3,a1=(i+1)*Math.PI/3,mid=(a0+a1)/2;
      const normal=u.clone().multiplyScalar(Math.cos(mid)).addScaledVector(v,Math.sin(mid));
      cityFace([point(start,a0),point(start,a1),point(end,a1),point(end,a0)],normal.toArray(),color);
    }
  }
  function cityBall(color, x, y, depth, sx, sy, sz) {
    const point=(u,v)=>[x+Math.cos(u)*Math.sin(v)*sx,y+Math.cos(v)*sy,depth-Math.sin(u)*Math.sin(v)*sz];
    for(let row=0;row<10;row++)for(let col=0;col<16;col++) {
      const u=col*Math.PI/8,v=row*Math.PI/10,du=Math.PI/8,dv=Math.PI/10;
      const normals=[[u,v],[u+du,v],[u+du,v+dv],[u,v+dv]].map(([a,b])=>new T.Vector3(Math.cos(a)*Math.sin(b)/sx,Math.cos(b)/sy,Math.sin(a)*Math.sin(b)/sz).normalize().toArray());
      cityFace([point(u,v),point(u+du,v),point(u+du,v+dv),point(u,v+dv)],normals[0],color,"plain",0,normals);
    }
  }
  function citySign(text, side, faceX, y, near, far, bg) {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 100;
    const pen = canvas.getContext("2d"); pen.fillStyle = bg; pen.fillRect(0, 0, 512, 100);
    pen.fillStyle = "#efe7ce"; pen.font = "bold 45px Georgia"; pen.textAlign = "center"; pen.textBaseline = "middle";
    pen.fillText(text, 256, 52, 486); pen.strokeStyle = "#eadcc888"; pen.lineWidth = 3; pen.strokeRect(6,6,500,88);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
    const mat = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide, toneMapped: false }); disposableMaterials.push(mat);
    const points = side < 0 ? [[faceX,y-12,near],[faceX,y-12,far],[faceX,y+12,far],[faceX,y+12,near]]
      : [[faceX,y-12,far],[faceX,y-12,near],[faceX,y+12,near],[faceX,y+12,far]];
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(points.flatMap(cityVertex), 3));
    geometry.setAttribute("normal", new T.Float32BufferAttribute(points.flatMap(() => [-side,0,0]), 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute([0,0,1,0,1,1,0,1], 2));
    geometry.setIndex([0,1,2,0,2,3]); root.add(new T.Mesh(geometry, mat));
  }
  // Sky, distant buildings and bridge remain quiet behind the food silhouettes.
  const skyCanvas = document.createElement("canvas"); skyCanvas.width = 8; skyCanvas.height = 256;
  const skyPen = skyCanvas.getContext("2d"), skyGradient = skyPen.createLinearGradient(0, 0, 0, 256);
  skyGradient.addColorStop(0, "#3aadd8"); skyGradient.addColorStop(.42, "#8dd1e4"); skyGradient.addColorStop(.72, "#e3ddd0"); skyGradient.addColorStop(1, "#b5c7ba");
  skyPen.fillStyle = skyGradient; skyPen.fillRect(0, 0, 8, 256);
  const skyTexture = new T.CanvasTexture(skyCanvas); skyTexture.colorSpace = T.SRGBColorSpace; textures.push(skyTexture);
  const skyMaterial = new T.MeshBasicMaterial({ map: skyTexture, toneMapped: false }); disposableMaterials.push(skyMaterial);
  const sky = new T.Mesh(new T.PlaneGeometry(width * 2, height), skyMaterial); sky.position.z = -1320; root.add(sky);
  // A layered skyline with distinct Art Deco crowns, slab towers and masonry blocks.
  // Heights remain substantial; cool colors and overlap carry the distance.
  const skylineRows = [
    {depth:12.8,count:18,step:.082,start:-.18,color:["#9bbfd1","#a7c7d5","#93b7ce"],height:1.65,haze:.30},
    {depth:9.9,count:14,step:.099,start:-.14,color:["#83aaca","#a5bdcc","#83b2c8"],height:1.95,haze:.18},
  ];
  for(const row of skylineRows) for(let i=0;i<row.count;i++) {
    const depth=width*(row.depth+(i%3)*.41), scale=perspective.project(0,0,depth).scale;
    const x=(width*(row.start+i*row.step)-vanishingX)/scale;
    const w=width*(.63+(i%4)*.18), h=height*(row.height+((i*7)%9)*.115);
    cityBox(row.color[i%3],x,h/2,depth,w,h,width*.57,"plain",row.haze);
    cityBox("#bed4dc",x,h+20,depth,w*.76,40,width*.45,"plain",row.haze);
    if(i%3===0)cityBox("#8facc5",x-w*.18,h+80,depth,w*.24,105,width*.28,"plain",row.haze);
    for(let c=-2;c<=2;c++)for(let r=0;r<18;r++)
      cityBox((r+c+i)%11===0?"#d4cfb2":"#6f96b6",x+c*w*.16,90+r*(h-120)/18,depth-width*.29,w*.05,22,2,"plain",.38);
  }
  for(const [screenX,d,tall,span,kind] of [[.29,8.9,2.92,.84,0],[.47,8.5,3.28,1.0,1],[.67,10.0,3.70,1.20,2],[.84,8.8,2.62,1.12,0]]) {
    const depth=width*d,scale=perspective.project(0,0,depth).scale;
    const x=(width*screenX-vanishingX)/scale,w=width*span,h=height*tall;
    const color=kind===2?"#8fb6c7":kind===1?"#87adc8":"#a3bbca";
    const tiers=kind===0?[[1,.76],[.77,.91],[.52,1]]:[[1,.66],[.79,.82],[.58,.93],[.37,1],[.18,1.075]];
    let floor=0;
    for(const [span,end] of tiers) {
      cityBox(color,x,h*(floor+end)/2,depth,w*span,h*(end-floor),w*.63*span,"plain",.12);
      cityBox("#bad0d8",x,h*end+5,depth,w*span+12,11,w*.63*span+10,"plain",.20);floor=end;
    }
    if(kind)cityRod("#a2bed2",[x,h*1.075,depth],[x,h*(kind===1?1.25:1.14),depth],kind===1?9:6);
    for(let c=-3;c<=3;c++) {
      cityBox("#c3d3d8",x+c*w*.12,h*.34,depth-w*.321,w*.022,h*.59,2,"plain",.20);
      for(let r=0;r<26;r++)cityBox((r+c)%13===0?"#ddd0a9":"#729ab9",x+c*w*.12,h*(.045+r*.022),depth-w*.325,w*.063,h*.009,2,"plain",.26);
    }
  }
  const hazeCanvas=document.createElement("canvas");hazeCanvas.width=8;hazeCanvas.height=128;
  const hazePen=hazeCanvas.getContext("2d"),hazeGradient=hazePen.createLinearGradient(0,0,0,128);
  hazeGradient.addColorStop(0,"#c4d6dc00");hazeGradient.addColorStop(.4,"#c4d6dc18");
  hazeGradient.addColorStop(.78,"#b8ccd2eb");hazeGradient.addColorStop(1,"#a1b5bb00");
  hazePen.fillStyle=hazeGradient;hazePen.fillRect(0,0,8,128);
  const hazeTexture=new T.CanvasTexture(hazeCanvas);hazeTexture.colorSpace=T.SRGBColorSpace;textures.push(hazeTexture);
  const hazeMaterial=new T.MeshBasicMaterial({map:hazeTexture,transparent:true,depthWrite:false,toneMapped:false});disposableMaterials.push(hazeMaterial);
  const hazeMesh=new T.Mesh(new T.PlaneGeometry(width,height*.20),hazeMaterial);
  hazeMesh.position.set(0,height/2-height*.59,-464);root.add(hazeMesh);

  // Two receding portals and their suspension spans make the bridge spatial.
  const bridgeDepth=width*3.72,bridgeDeck=height*.145,bridgeTop=height*1.62,towerHalf=width*.79;
  const bridgeSteel="#60899e",bridgeEdge="#a7bec9";
  for(const [depth,far] of [[width*5.8,true],[bridgeDepth,false]]) {
    const steel=far?"#94b2c2":bridgeSteel,top=bridgeTop;
    for(const side of [-1,1]) {
      const x=side*towerHalf;
      cityBox(steel,x,(top+bridgeDeck)/2,depth,width*.09,top-bridgeDeck,70);
      for(const offset of [-1,1])cityBox(far?"#b1c8d2":bridgeEdge,x+offset*width*.036,(top+bridgeDeck)/2,depth-38,width*.015,top-bridgeDeck,7);
      cityBox("#7296a6",x,bridgeDeck*.47,depth,width*.15,bridgeDeck*.94,105);
      cityBox("#a9bdc4",x,top-16,depth,width*.17,28,97);
      cityBox(steel,x,top+18,depth,width*.115,41,80);
      cityBall("#9bb6bd",x,top+49,depth,23,23,23);
      for(let i=0;i<7;i++)cityBox("#a7bec8",x,bridgeDeck+80+i*(top-bridgeDeck-130)/7,depth-39,width*.11,9,7);
    }
    cityBox(steel,0,top-31,depth,towerHalf*2,26,69);
    cityBox(steel,0,top-158,depth,towerHalf*2,15,57);
    for(let i=0;i<18;i++) {
      const a=i/18*Math.PI,b=(i+1)/18*Math.PI;
      cityRod(steel,[Math.cos(a)*towerHalf*.87,top-158+Math.sin(a)*100,depth-38],[Math.cos(b)*towerHalf*.87,top-158+Math.sin(b)*100,depth-38],8);
    }
    for(let i=-4;i<=4;i++)cityRod("#a6bdc7",[i*towerHalf/5,top-35,depth-38],[i*towerHalf/5,top-156,depth-38],2.2);
  }
  for(const side of [-1,1]) {
    // The nearer anchor and the far portal lie on the same bridge axis.
    let previous=null;
    for(let i=0;i<=30;i++) {
      const t=i/30,depth=width*(1.74+t*1.98),y=bridgeDeck+95+(bridgeTop-bridgeDeck-95)*t*t;
      const p=[side*towerHalf,y,depth];
      if(previous)cityRod("#5b8198",previous,p,5.5);
      if(i%2===0)cityRod("#aac0cc",p,[side*towerHalf,bridgeDeck+20,depth],1.4);
      previous=p;
    }
    previous=null;
    for(let i=0;i<=22;i++) {
      const t=i/22,depth=width*(3.72+2.08*t),y=bridgeTop-Math.sin(t*Math.PI)*height*.41;
      const p=[side*towerHalf,y,depth];if(previous)cityRod("#829faf",previous,p,4.5);
      if(i%2===0)cityRod("#abc1cb",p,[side*towerHalf,bridgeDeck+20,depth],1.4);previous=p;
    }
  }
  cityBox("#6b92a5",0,bridgeDeck,bridgeDepth,width*4.5,64,100);
  cityBox("#b1c4c9",0,bridgeDeck+39,bridgeDepth-57,width*4.5,7,10);
  cityBox("#537e94",0,bridgeDeck-37,bridgeDepth-58,width*4.5,8,10);
  for(let i=-10;i<10;i++) {
    const x=i*width*.225;
    cityRod("#b0c4cc",[x,bridgeDeck-27,bridgeDepth-58],[x+width*.1125,bridgeDeck+26,bridgeDepth-58],3);
    cityRod("#b0c4cc",[x+width*.1125,bridgeDeck+26,bridgeDepth-58],[x+width*.225,bridgeDeck-27,bridgeDepth-58],3);
  }

  // Compact corner buildings, gaps at intersections and staggered blocks.
  const blocks=[
    {side:-1,near:1.39,far:2.11,face:.78,tall:1.27,color:"#c26b50",floors:5,shop:"JOE’S PIZZA",trim:"#d8b894"},
    {side:1,near:1.14,far:1.93,face:.80,tall:1.23,color:"#d1bca0",floors:6,shop:"FRESH GROCERY",trim:"#e0ceb1"},
    {side:-1,near:2.58,far:3.40,face:.84,tall:.79,color:"#bf947d",floors:4,shop:"COFFEE",trim:"#cfc4ae"},
    {side:1,near:2.32,far:3.24,face:.89,tall:.70,color:"#ba7b64",floors:3,shop:"BAKERY",trim:"#d8bd9a"},
    {side:-1,near:3.74,far:4.62,face:1.02,tall:1.04,color:"#96a9aa",floors:5,trim:"#c7c5b7"},
    {side:1,near:3.67,far:4.74,face:.94,tall:.93,color:"#97acb9",floors:4,trim:"#c7ccd0"},
    {side:-1,near:5.18,far:6.6,face:.92,tall:1.15,color:"#96acc0",floors:5,trim:"#c4cbd0"},
    {side:1,near:5.42,far:6.8,face:1.02,tall:1.27,color:"#a8b6c2",floors:6,trim:"#c8cfd1"},
  ];
  function frontSign(text,x,y,depth,w,bg) {
    const p=perspective.project(x,y,depth);sign(text,p.x,p.y,w*p.scale,37*p.scale,bg,"#f6e9ca",p.z+.3);
  }
  for(const [index,building] of blocks.entries()) {
    const {side,floors,shop,trim}=building;
    const near=building.near*width,far=building.far*width,faceX=side*width*building.face;
    const h=height*building.tall,depth=(near+far)/2,span=far-near,w=width*(index===1?.62:.64);
    const haze=Math.min(.44,Math.max(0,building.near-1.3)*.10);
    cityBox(building.color,faceX+side*w/2,h/2,depth,w,h,span,"brick",haze);
    for(const [y,thickness,inset] of [[h+2,15,12],[h-22,13,8],[205,12,7],[8,15,6]])
      cityBox(y>h-30?"#56716c":trim,faceX+side*(w/2-inset),y,depth,w+inset*2,thickness,span+inset*2,"plain",haze);
    cityBox("#334e54",faceX+side*w/2,h+17,depth,w+27,12,span+26,"plain",haze);
    // Corner quoins and lintels give the return face an architectural rhythm.
    for(let r=0;r<Math.floor(h/60);r++)cityBox(trim,faceX-side*2,28+r*60,near+7,14,26,21,"plain",haze+.05);
    const floorStep=(h-243)/floors;
    for(let row=0;row<floors;row++)for(let col=0;col<3;col++) {
      const y=247+row*floorStep+floorStep*.35,z=near+span*(.18+col*.30),ww=span*.18,wh=floorStep*.55;
      if(index<4)cityFace([[faceX-side*.5,y-wh/2-12,z-ww/2-12],[faceX-side*.5,y-wh/2-12,z+ww/2+12],[faceX-side*.5,y+wh/2+12,z+ww/2+12],[faceX-side*.5,y+wh/2+12,z-ww/2-12]],[-side,0,0],"#263d50","shadow");
      cityBox("#806f5e",faceX-side*2,y-3,z+2,3,wh+11,ww+10,"plain",haze);
      cityBox(trim,faceX-side*5,y,z,4,wh+6,ww+7,"plain",haze);
      cityBox("#244d62",faceX-side*8,y,z,3,wh,ww,"plain",haze);
      cityBox((row+col+index)%7===0?"#d2b883":"#547e94",faceX-side*10,y+wh*.08,z-ww*.18,2,wh*.75,ww*.43,"plain",haze);
      cityBox("#acb9b3",faceX-side*11,y,z,2,2.7,ww,"plain",haze);
      cityBox("#acb9b3",faceX-side*11,y,z,2,wh,2.5,"plain",haze);
      cityBox(trim,faceX-side*8,y-wh/2-5,z,13,8,ww+13,"plain",haze);
      if(col===1&&index<4) {
        const fy=y-wh/2-13,ox=faceX-side*35;
        cityBox("#3e5558",faceX-side*19,fy,z,39,3,ww+33,"plain",haze);
        cityRod("#425b61",[ox,fy+27,z-ww/2-15],[ox,fy+27,z+ww/2+15],2);
        for(let bar=-2;bar<=2;bar++)cityRod("#50666b",[ox,fy,z+bar*ww/3],[ox,fy+27,z+bar*ww/3],1.25);
        if(row)for(const offset of [0,10]) {
          cityRod("#40575e",[ox-side*offset,fy,z-ww*.48],[ox-side*offset,fy-floorStep,z+ww*.48],2);
          if(offset===0)for(let s=0;s<9;s++)cityRod("#758484",[ox,fy-floorStep*s/9,z-ww*.48+ww*.96*s/9],[ox-side*10,fy-floorStep*s/9,z-ww*.48+ww*.96*s/9],1.2);
        }
      }
    }
    for(let row=0;row<floors;row++)for(let col=0;col<3;col++) {
      const x=faceX+side*w*(.18+col*.30),y=247+row*floorStep+floorStep*.35,ww=w*.185,wh=floorStep*.55;
      if(index<4)cityFace([[x-ww/2-12,y-wh/2-12,near-.5],[x+ww/2+12,y-wh/2-12,near-.5],[x+ww/2+12,y+wh/2+12,near-.5],[x-ww/2-12,y+wh/2+12,near-.5]],[0,0,1],"#263d50","shadow");
      cityBox("#806f5e",x+2,y-3,near-2,ww+10,wh+10,4,"plain",haze);
      cityBox(trim,x,y,near-5,ww+7,wh+7,5,"plain",haze);
      cityBox("#2c5368",x,y,near-9,ww,wh,4,"plain",haze);
      cityBox((col+row*3+index)%9===0?"#ceb37e":"#628ca0",x-ww*.19,y+wh*.08,near-12,ww*.42,wh*.73,2,"plain",haze);
      cityBox("#a5b4b0",x,y,near-14,ww,2.5,2,"plain",haze);
      cityBox("#a5b4b0",x,y,near-14,2.5,wh,2,"plain",haze);
      cityBox(trim,x,y-wh/2-6,near-12,ww+16,8,13,"plain",haze);
      if(index<2&&col===1&&row%3===1) {
        cityBox("#7a6750",x,y-wh/2-2,near-23,ww+6,13,21);
        for(let p=0;p<5;p++)cityBall(["#748956","#89a258","#afae61"][p%3],x+(p-2)*10,y-wh/2+7+(p%2)*6,near-25,11,12,9);
      }
      if(index===0&&col===1) {
        const fy=y-wh/2-15,zz=near-44;
        cityBox("#40575b",x,fy,near-23,ww+38,4,47);
        cityRod("#3d565f",[x-ww*.7,fy+29,zz],[x+ww*.7,fy+29,zz],2);
        for(let bar=-3;bar<=3;bar++)cityRod("#506971",[x+bar*ww/4,fy,zz],[x+bar*ww/4,fy+29,zz],1.2);
        if(row)for(const off of [-6,6])cityRod("#3d565f",[x-ww*.6,fy,zz+off],[x+ww*.6,fy-floorStep,zz+off],2);
      }
    }
    const shopColor=side<0?"#a74a3d":"#33735e";
    for(let col=0;col<3;col++) {
      const z=near+span*(.17+col*.31),x=faceX+side*w*(.17+col*.32);
      cityBox("#355c59",faceX-side*5,86,z,10,162,span*.29,"plain",haze);
      cityBox("#234b60",faceX-side*12,88,z,4,127,span*.25,"plain",haze);
      cityBox("#a8bcac",faceX-side*15,86,z,2,3,span*.25,"plain",haze);
      cityBox("#a8bcac",faceX-side*15,86,z,2,127,3,"plain",haze);
      cityBox("#466f61",x,84,near-5,w*.30,164,13,"plain",haze);
      cityBox("#234b60",x,88,near-13,w*.263,132,3,"plain",haze);
      cityBox("#b8bfa7",x,85,near-16,3,132,3,"plain",haze);
      cityBox("#b8bfa7",x,72,near-16,w*.26,3,3,"plain",haze);
      // Warm shop interiors sit behind mullions, with sparse product silhouettes.
      cityBox("#b28e56",x,35,near-18,w*.22,15,4,"plain",haze);
      for(let j=0;j<4;j++)cityBox(j%2?"#8eac6c":"#d2ad68",x+(j-1.5)*w*.045,48+(j%2)*9,near-19,w*.024,15+(j%2)*12,3,"plain",haze);
    }
    if(shop) {
      citySign(shop,side,faceX-side*17,188,near+span*.025,far-span*.025,shopColor);
      frontSign(shop,faceX+side*w*.48,189,near-20,w*.94,shopColor);
    }
    for(let s=0;s<12;s++) {
      const color=s%2?"#eddbb2":side<0?"#c8674f":"#4a876b";
      cityBox(color,faceX-side*27,160,near+(s+.5)*span/12,52,17,span/12,"plain",haze);
      cityBox(color,faceX+side*(s+.5)*w/12,160,near-33,w/12,17,58,"plain",haze);
    }
    if(index<2)for(let n=0;n<5;n++)cityBall("#ffda8f",faceX+side*w*(.08+n*.21),143,near-47,4.4,6,3);
    if(index===0||index===3) {
      const x=faceX+side*w*.25,z=near+span*.10,p=perspective.project(x,h+46,z);
      const tank=model.group(root,p.x-width/2,height/2-p.y,p.z);tank.scale.setScalar(p.scale*1.7);
      model.part(tank,"tube","#946d52",0,14,0,24,40,24);model.part(tank,"cone","#4c6d79",0,41,0,29,16,29);
      for(const leg of [-1,1])model.rod(tank,[leg*18,-7,0],[leg*24,-39,0],2.5,"#3c535c");
    }
  }
  // A few readable sidewalk stories, placed within the actual sidewalk clearances.
  for(let row=0;row<2;row++) {
    const x=width*.69,z=width*(1.31+row*.16);
    cityBox("#9b734f",x,23,z,56,38,55);
    cityBox("#624e3a",x,43,z,48,4,47);
    for(let slat=0;slat<3;slat++)cityBox("#c19969",x,12+slat*12,z-29,57,7,3);
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)cityBall(row?"#bd533d":a%2?"#d99b44":"#9ba75c",x+a*14,46+(b%2)*3,z+b*13,8.4,9,8.4);
  }
  for(const side of [-1,1]) {
    const x=side*width*.65,depth=width*(side<0?1.44:1.57);
    cityBox("#87694d",x,55,depth,69,100,8);
    cityBox("#304d50",x,55,depth-5,57,87,3);
    for(const leg of [-1,1])cityRod("#836746",[x+leg*30,7,depth-3],[x+leg*30,102,depth+12],3);
    frontSign(side<0?"HOT PIZZA":"FRESH",x,69,depth-8,52,"#304d50");
    frontSign(side<0?"DAILY":"TODAY",x,39,depth-8,52,"#304d50");
  }
  // Screen-space perspective is restricted to scenery; food and catch coordinates stay exact.
  function streetSurface() {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * 2); canvas.height = Math.ceil((height - horizon) * 2);
    const pen = canvas.getContext("2d");
    pen.scale(2, 2); pen.translate(0, -horizon);
    const gradient = pen.createLinearGradient(0, horizon, 0, height);
    gradient.addColorStop(0, "#a0b3bc"); gradient.addColorStop(.30, "#738996"); gradient.addColorStop(.65, "#526674"); gradient.addColorStop(1, "#394c5b");
    pen.fillStyle = gradient; pen.fillRect(0, horizon, width, height - horizon);
    let seed = 7391;
    function noise() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    // Grain grows toward the camera, while the center stays quiet around the hero.
    for (let i = 0; i < 24000; i++) {
      const y = horizon + noise() * (height - horizon), d = (y - horizon) / (height - horizon);
      pen.fillStyle = i % 3 ? "#ded6b41a" : "#1329382e";
      pen.fillRect(noise() * width, y, .35 + d * noise() * 1.3, .25 + d * .65);
    }
    const line = (points, color, thickness) => {
      pen.strokeStyle = color; pen.lineWidth = thickness; pen.lineJoin = "round";
      pen.beginPath(); points.forEach(([x, y], i) => i ? pen.lineTo(x, y) : pen.moveTo(x, y)); pen.stroke();
    };
    for (const side of [-1, 1]) {
      const near = streetX(side, height), far = streetX(side, horizon);
      pen.fillStyle = "#b6b5a7";
      pen.beginPath(); pen.moveTo(side < 0 ? 0 : width, horizon); pen.lineTo(far, horizon);
      pen.lineTo(near, height); pen.lineTo(side < 0 ? 0 : width, height); pen.closePath(); pen.fill();
      line([[far, horizon], [near, height]], "#d9ccb2", 4);
      line([[far - side * 3, horizon], [near - side * 3, height]], "#273b4055", 3);
      for (let depth = 0; depth < width*7; depth+=width*.18) {
        const p=perspective.project(side*(roadHalf+7),0,depth);
        line([[side < 0 ? 0 : width,p.y],[p.x,p.y]],"#727d7c55",.8);
      }
      line([[perspective.groundX(side*(roadHalf+width*.15),height),height],[vanishingX,horizon]],"#81878245",.85);
      // Cross streets interrupt the paving between the compact corner blocks.
      const crossNear=perspective.project(0,0,width*(side<0?2.11:1.93)).y;
      const crossFar=perspective.project(0,0,width*(side<0?2.58:2.32)).y;
      pen.fillStyle="#8a9b9e";pen.beginPath();pen.moveTo(side<0?0:width,crossNear);
      pen.lineTo(streetX(side,crossNear),crossNear);pen.lineTo(streetX(side,crossFar),crossFar);pen.lineTo(side<0?0:width,crossFar);pen.closePath();pen.fill();
    }
    const shade = pen.createLinearGradient(0, base, width * .64, height);
    shade.addColorStop(0, "#243c4d32"); shade.addColorStop(1, "#243c4d00");
    pen.fillStyle = shade; pen.beginPath(); pen.moveTo(0, base); pen.lineTo(width * .18, base);
    pen.lineTo(width * .53, height); pen.lineTo(0, height); pen.closePath(); pen.fill();
    const roadMark = (x,depth,w,length,color) => {
      pen.fillStyle=color;pen.beginPath();
      [[x-w/2,depth],[x+w/2,depth],[x+w/2,depth+length],[x-w/2,depth+length]].forEach(([xx,zz],i)=>{
        const p=perspective.project(xx,0,zz);i?pen.lineTo(p.x,p.y):pen.moveTo(p.x,p.y);
      });pen.closePath();pen.fill();
    };
    // Lane markings and the crossing use exactly the facade/curb projection.
    for(let i=0;i<9;i++) roadMark(0,width*(1.65+i*.82),5,width*.24,"#d8c69970");
    for (let i = -4; i <= 4; i++) {
      roadMark(i*width*.10,width*2.05,width*.049,width*.31,"#e0d7bdc2");
    }
    // Low-contrast repairs retain the grain and leave the hero's center readable.
    for(const [cx,cy,sx,sy] of [[width*.27,height-94,38,21],[width*.71,walk+36,32,16],[width*.41,walk-69,24,12]]) {
      const points=[[-.5,-.4],[.37,-.5],[.51,-.23],[.45,.48],[-.39,.41],[-.53,.08]].map(([x,y])=>[cx+x*sx,cy+y*sy]);
      pen.fillStyle="#283e4538";pen.beginPath();points.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();pen.fill();
      line([...points,points[0]],"#263c4542",1.2);line(points.slice(3),"#b4bba527",.8);
    }
    // Soft contact shadows under street furniture, projected onto the pavement.
    for(const side of [-1,1]) for(let i=0;i<4;i++) {
      const p=perspective.project(side*(roadHalf+width*.045),0,width*(1.45+i*1.08+(side>0?-.13:.12)));
      pen.save();pen.translate(p.x+3*p.scale,p.y+1);pen.scale(19*p.scale,4*p.scale);
      const shadow=pen.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,"#263c446b");shadow.addColorStop(1,"#263c4400");
      pen.fillStyle=shadow;pen.fillRect(-1,-1,2,2);pen.restore();
    }
    // A few branched cracks, concentrated near gutters and the lower player area.
    for (const [startX, startY, length] of [[width * .23, height - 44, 66], [width * .76, height - 67, 60], [width * .42, height - 12, 39], [width * .81, walk + 22, 48], [width * .20, walk - 13, 32]]) {
      const points = [[startX, startY]];
      let px = startX, py = startY;
      for (let n = 0; n < 6; n++) { px += (noise() - .48) * 19; py -= length / 6; points.push([px, py]); }
      line(points.map(([x, y]) => [x + .7, y + .7]), "#bac0ab40", 1.5);
      line(points, "#25333abc", .85);
      line([points[2], [points[2][0] + 12, points[2][1] - 3], [points[2][0] + 18, points[2][1] - 13]], "#27383b88", .55);
    }
    // Shallow puddles and restrained warm leaves frame the playable center.
    const water=pen.createLinearGradient(0,height-46,0,height-24);water.addColorStop(0,"#79a6bb");water.addColorStop(.45,"#2f526b");water.addColorStop(1,"#4d7182");
    pen.fillStyle=water;pen.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = i / 32 * Math.PI * 2, r = 1 + Math.sin(a * 5) * .13 + Math.cos(a * 9) * .07;
      const x = width * .19 + Math.cos(a) * 29 * r, y = height - 35 + Math.sin(a) * 7 * r;
      i ? pen.lineTo(x, y) : pen.moveTo(x, y);
    }
    pen.closePath();pen.fill();pen.save();pen.clip();
    for(let i=0;i<6;i++){pen.fillStyle=i%2?"#bd9b6860":"#253d5349";pen.fillRect(width*.13+i*7,height-44,3,18);}
    pen.restore();
    line([[width * .13, height - 36], [width * .22, height - 39]], "#a9c7c88c", 1.1);
    line([[width * .15, height - 32], [width * .25, height - 35]], "#d4d8bb66", .8);
    for (let i = 0; i < 25; i++) {
      const side = i % 2 ? 1 : -1, y = walk - 20 + noise() * (height - walk + 20);
      const px = Math.max(8, Math.min(width - 8, streetX(side, y) - side * (5 + noise() * 30)));
      pen.save(); pen.translate(px, y); pen.rotate(noise() * 6); pen.scale(.75, .65);
      pen.fillStyle = ["#bd8d51", "#aa6940", "#c99b62"][i % 3];
      pen.beginPath(); pen.moveTo(-4, 0); pen.lineTo(-2, -2); pen.lineTo(-3, -4); pen.lineTo(1, -3); pen.lineTo(4, -5); pen.lineTo(4, 0); pen.lineTo(6, 2); pen.lineTo(1, 3); pen.closePath(); pen.fill();
      pen.restore();
    }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.push(texture);
    const material = new T.MeshBasicMaterial({ map: texture, toneMapped: false }); disposableMaterials.push(material);
    const surface = new T.Mesh(new T.PlaneGeometry(width, height - horizon), material);
    surface.position.set(0, height / 2 - (height + horizon) / 2, -1250); root.add(surface);
  }
  streetSurface();
  // Low segmented curb stones share the world projection and catch a warm edge.
  for(const side of [-1,1])for(let depth=0;depth<width*6.7;depth+=width*.15) {
    if(side<0?depth>width*2.08&&depth<width*2.59:depth>width*1.9&&depth<width*2.33)continue;
    cityBox(depth%(width*.45)<width*.15?"#c9c4b0":"#b2b7ab",side*(roadHalf+6),4.5,depth,12,9,width*.142);
  }
  // An elliptical iron cover anchors the steam to the street surface.
  const drainX = width * .79, drainY = height - 62;
  const drain = model.group(root, drainX - width / 2, height / 2 - drainY, -66);
  model.part(drain, "ball", "#26353c", 0, -2, 0, 34, 11, 1);
  model.part(drain, "ring", "#697c83", 0, 0, 1, 27, 9.2, 2.5);
  model.part(drain, "ball", "#293b48", 0, 0, 1, 27, 8.8, 1);
  for (let i = -3; i <= 3; i++) model.part(drain, "box", "#667a85", i * 6, 0, 3, 1.1, 13 - Math.abs(i), 1);
  for (const row of [-1, 1]) model.part(drain, "box", "#74888c", 0, row * 3.5, 3, 44, .9, 1);
  for(const side of [-1,1])model.part(drain,"ball","#9b9d8d",side*23,0,4,1.15,.7,.4);
  // Street furniture is anchored to the same world-space curb and depth scale.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const depth = width * (1.45 + i * 1.08 + (side > 0 ? -.13 : .12));
    const x = side * (roadHalf + width * .045), h = height * .43;
    cityBox("#405760", x, h / 2, depth, 3.6, h, 3.6);
    cityBox("#405760", x, 5, depth, 11, 10, 11);
    cityRod("#405760", [x,h-3,depth], [x-side*26,h+13,depth], 3);
    cityRod("#405760", [x-side*26,h+13,depth], [x-side*40,h+4,depth], 2.5);
    cityBall("#e3cda0",x-side*40,h-6,depth,6,10,6);
    cityBox("#4e6469",x-side*40,h+3,depth,17,5,14);
    cityBox("#4e6469",x-side*40,h-16,depth,12,3,11);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const depth = width * (1.85 + i * 1.25 + (side < 0 ? .09 : .3));
    const x = side * (roadHalf + width * .10), h = height * .26;
    cityBox("#76634b",x,h*.4,depth,5,h*.8,5);
    for (let n=0;n<10;n++) cityBall(["#7fa566","#86ab68","#739969","#98af6d"][n%4],x+Math.sin(n*2.4)*33,h+Math.cos(n*2.4)*37,depth+Math.sin(n*1.7)*23,30+(n%3)*3,37+(n%2)*8,29);
    cityBox("#6e7264",x,6,depth,38,12,38);
  }
  for (const side of [-1, 1]) {
    const depth = width * (side < 0 ? 2.48 : 2.14), x = side * (roadHalf + width * .012), h = height * .34;
    cityBox("#596b69",x,h/2,depth,3,h,3);
    cityRod("#596b69",[x,h,depth],[x-side*38,h,depth],2.4);
    cityBox("#ab9254",x-side*38,h-23,depth,16,45,12);
    for (let i=0;i<3;i++) cityBall(["#a96046","#c2a657","#7c9c7b"][i],x-side*38,h-10-i*13,depth-7,4.7,4.7,1.3);
  }
  const streetSign = perspective.project(roadHalf + width * .025, height * .32, width * 1.32);
  sign("CANAL ST",streetSign.x,streetSign.y,130*streetSign.scale,29*streetSign.scale,"#356d57","#f2edd8",streetSign.z+5);
  const hydrant = model.group(root, 30 - width / 2, height / 2 - height + 104, -56);hydrant.scale.setScalar(1.65);
  model.part(hydrant, "tube", "#b74435", 0, 14, 0, 8, 31, 8);
  model.part(hydrant, "ball", "#df6950", 0, 31, 0, 10, 6, 10);
  model.rod(hydrant, [-14, 17, 0], [14, 17, 0], 5, "#903b32");
  model.part(hydrant,"tube","#713b35",0,-1,0,12,5,12);
  model.part(hydrant,"tube","#e16b45",0,28,0,10,3,10);
  model.part(hydrant,"ball","#f18557",0,35,0,4,3,4);
  for(const side of [-1,1]) {
    const cap=model.part(hydrant,"tube","#d26545",side*15,17,0,6.5,4,6.5);cap.rotation.z=Math.PI/2;
    model.part(hydrant,"ball","#f4aa71",side*18,17,2,2,2,2);
  }
  for(let i=0;i<5;i++) model.part(hydrant,"ring","#5b5550",5+i*1.5,18-Math.sin(i/4*Math.PI)*8,9,1.4,1.8,.7);
  const labelCanvas=document.createElement("canvas");labelCanvas.width=80;labelCanvas.height=112;
  const labelPen=labelCanvas.getContext("2d");labelPen.fillStyle="#e7d7ba";labelPen.fillRect(0,0,80,112);
  labelPen.fillStyle="#5c5d55";labelPen.textAlign="center";labelPen.font="bold 22px Georgia";labelPen.fillText("GOOD",40,30);labelPen.fillText("DOGS",40,57);
  labelPen.beginPath();labelPen.ellipse(40,89,10,8,0,0,Math.PI*2);labelPen.fill();
  for(const x of [25,40,55]){labelPen.beginPath();labelPen.arc(x,73,4,0,Math.PI*2);labelPen.fill();}
  const labelTexture=new T.CanvasTexture(labelCanvas);labelTexture.colorSpace=T.SRGBColorSpace;textures.push(labelTexture);
  const labelMaterial=new T.MeshStandardMaterial({map:labelTexture,roughness:.95});disposableMaterials.push(labelMaterial);
  const label=new T.Mesh(new T.PlaneGeometry(11,17),labelMaterial);label.position.set(-1,12,8.4);label.rotation.z=.06;hydrant.add(label);
  // One folded newspaper, with a very short occasional flutter beside the gutter.
  const newsCanvas = document.createElement("canvas"); newsCanvas.width = 256; newsCanvas.height = 160;
  const newsPen = newsCanvas.getContext("2d");
  newsPen.fillStyle = "#e0d9bf"; newsPen.fillRect(0, 0, 256, 160);
  newsPen.fillStyle = "#414b4c"; newsPen.font = "bold 26px Georgia"; newsPen.fillText("MANHATTAN", 16, 33);
  newsPen.fillRect(17, 44, 222, 2); newsPen.fillStyle = "#83928c"; newsPen.fillRect(18, 57, 84, 67);
  newsPen.fillStyle = "#667371";
  for (let row = 0; row < 10; row++) newsPen.fillRect(row < 6 ? 113 : 18, 60 + row * 8, row < 6 ? 124 : 221, 2);
  const newsTexture = new T.CanvasTexture(newsCanvas); newsTexture.colorSpace = T.SRGBColorSpace; textures.push(newsTexture);
  const newsMaterial = new T.MeshStandardMaterial({ map: newsTexture, roughness: 1, side: T.DoubleSide }); disposableMaterials.push(newsMaterial);
  const paper = model.group(root, width * .87 - width / 2, height / 2 - height + 27, -44);
  const newsGeometry = new T.PlaneGeometry(48, 30, 8, 1);
  const positions = newsGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.abs(positions.getX(i)) * .14 + Math.sin(positions.getX(i) / 8) * 1.2);
  newsGeometry.computeVertexNormals(); paper.add(new T.Mesh(newsGeometry, newsMaterial)); papers.push(paper);
  for (const [finish, batch] of cityBatches) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute("normal",new T.Float32BufferAttribute(batch.normals,3));
    geometry.setAttribute("color",new T.Float32BufferAttribute(batch.colors,3));
    geometry.setAttribute("uv",new T.Float32BufferAttribute(batch.uvs,2));
    const mat = new T.MeshBasicMaterial({vertexColors:true,toneMapped:false});
    if(finish==="shadow") {
      const canvas=document.createElement("canvas");canvas.width=canvas.height=64;
      const pen=canvas.getContext("2d");pen.shadowColor="#ffffff";pen.shadowBlur=7;pen.fillStyle="#ffffff";pen.fillRect(10,10,44,44);
      const texture=new T.CanvasTexture(canvas);textures.push(texture);mat.map=texture;
      mat.transparent=true;mat.depthWrite=false;mat.opacity=.28;mat.side=T.DoubleSide;
    } else if(finish==="brick") {
      const canvas=document.createElement("canvas");canvas.width=128;canvas.height=64;
      const pen=canvas.getContext("2d");pen.fillStyle="#f0eadf";pen.fillRect(0,0,128,64);
      pen.strokeStyle="#8b83743b";pen.lineWidth=1.2;
      for(let row=0;row<4;row++)for(let col=-1;col<3;col++) {
        const x=col*64+(row%2)*32,y=row*16;
        pen.fillStyle=(row+col)%3?"#ffffff14":"#554f3d12";pen.fillRect(x+1,y+1,62,14);
        pen.strokeRect(x,y,64,16);
      }
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      texture.wrapS=texture.wrapT=T.RepeatWrapping;textures.push(texture);mat.map=texture;
    }
    disposableMaterials.push(mat);const mesh=new T.Mesh(geometry,mat);mesh.name="city-"+finish;root.add(mesh);
  }
  const actors = createStreetActors(model, root, width, height, base, perspective);
  for(let i=0;i<4;i++) {
    const canvas=document.createElement("canvas");canvas.width=256;canvas.height=128;
    const pen=canvas.getContext("2d");
    pen.shadowColor="#fff7e880";pen.shadowBlur=6;
    pen.fillStyle="#e7efe7";pen.beginPath();pen.roundRect(30,66,202,28,14);pen.fill();
    for(let n=0;n<8;n++) {
      const x=42+n*24,y=72-Math.sin(n/7*Math.PI)*23,r=24+Math.sin(n*1.7+i)*6;
      const gradient=pen.createLinearGradient(0,y-r,0,y+r);
      gradient.addColorStop(0,"#fff9ed");gradient.addColorStop(.65,"#f8f5e9");gradient.addColorStop(1,"#dce8e6");
      pen.fillStyle=gradient;pen.beginPath();pen.ellipse(x,y,r,r*.80,0,0,Math.PI*2);pen.fill();
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
    const mat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,opacity:.84});disposableMaterials.push(mat);
    const cloud=new T.Mesh(new T.PlaneGeometry(135-i*8,67-i*4),mat);
    cloud.position.set(0,height/2-height*(.15+i*.052),-1100);root.add(cloud);clouds.push(cloud);
  }
  for (let i = 0; i < 3; i++) {
    const bird = model.birdModel(); bird.scale.setScalar(0.30); root.add(bird); birds.push(bird);
  }
  const vaporCanvas = document.createElement("canvas"); vaporCanvas.width = vaporCanvas.height = 64;
  const vaporPen = vaporCanvas.getContext("2d"), vaporGradient = vaporPen.createRadialGradient(32, 32, 0, 32, 32, 32);
  vaporGradient.addColorStop(0, "#ffffff99"); vaporGradient.addColorStop(.5, "#ffffff55"); vaporGradient.addColorStop(1, "#ffffff00");
  vaporPen.fillStyle = vaporGradient; vaporPen.fillRect(0, 0, 64, 64);
  const vaporTexture = new T.CanvasTexture(vaporCanvas); textures.push(vaporTexture);
  for (let i = 0; i < 7; i++) {
    const puff = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: "#e8e8d8", map: vaporTexture, transparent: true, opacity: 0.10, depthWrite: false }));
    disposableMaterials.push(puff.material); root.add(puff); steam.push(puff);
  }
  function animate(time) {
    actors.animate(time);
    clouds.forEach((cloud, i) => cloud.position.x = ((i * 137 + time * (1.7 + i * 0.3)) % (width + 150)) - 75 - width / 2);
    birds.forEach((bird, i) => {
      bird.position.set(((time * 14 + i * 123) % (width + 80)) - 40 - width / 2, height / 2 - height * (0.24 + i * 0.04), -320);
      bird.userData.wings.forEach((wing, j) => wing.rotation.z = Math.sin(time * 8 + i) * (j ? 1 : -1) * 0.65);
    });
    steam.forEach((puff, i) => {
      const life = (time * 0.15 + i / 7) % 1;
      puff.position.set(drainX - width / 2 + Math.sin(life * 5 + i * .3) * (3 + life * 13), height / 2 - drainY + 4 + life * 83, -54 + i * .01);
      puff.scale.set(18 + life * 34, 18 + life * 39, 1);
      puff.material.opacity = Math.sin(life * Math.PI) * .36;
      puff.rotation.z = Math.sin(life * 4 + i) * .3;
    });
    papers.forEach((paper) => {
      const cycle = time % 19, flutter = cycle > 14 ? Math.sin((cycle - 14) / 5 * Math.PI) ** 2 : 0;
      paper.position.y = height / 2 - height + 27 + flutter * 22;
      paper.position.x = width * .87 - width / 2 - flutter * 8;
      paper.rotation.set(-.62 + flutter * .3, Math.sin(time * 3) * flutter * .18, -.22 + Math.sin(time * 4) * flutter * .14);
    });
  }
  function dispose() {
    root.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry && !Object.values(model.geometries).includes(object.geometry) && !actors.owned.includes(object.geometry)) object.geometry.dispose();
    });
    actors.dispose();
    textures.forEach((texture) => texture.dispose());
    disposableMaterials.forEach((mat) => mat.dispose());
  }
  return { root, animate, dispose };
}
