// Background-only rigs. No gameplay RNG or independent animation loop.
function createStreetActors(model, root, width, height, base, perspective) {
  const T = window.THREE, people = [], cars = [], wheels = [], cycleLegs = [];
  const owned = [], actorMaterials = [], projected = {};
  const up = new T.Vector3(0, 1, 0), delta = new T.Vector3();
  function segment(parent, color, radius) {
    const mesh = model.part(parent, 'tube', color, 0, 0, 0, radius, 1, radius);
    return (a, b) => {
      delta.set(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
      mesh.position.set((a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2);
      mesh.scale.y = delta.length(); mesh.quaternion.setFromUnitVectors(up, delta.normalize());
    };
  }
  function leg(parent, color, z, upper, lower, radius) {
    const thigh = segment(parent, color, radius), shin = segment(parent, color, radius * .85);
    const knee = model.part(parent, 'ball', color, 0, 0, z, radius, radius, radius);
    const shoe = model.part(parent, 'ball', '#243443', 0, 0, z, 4, 1.8, 2.5);
    return (hx, hy, fx, fy) => {
      const dx=fx-hx, dy=fy-hy, d=Math.max(.01,Math.hypot(dx,dy));
      const along=(upper*upper-lower*lower+d*d)/(2*d);
      const bend=Math.sqrt(Math.max(0,upper*upper-along*along));
      const kx=hx+dx/d*along-dy/d*bend, ky=hy+dy/d*along+dx/d*bend;
      thigh([hx,hy,z],[kx,ky,z]); shin([kx,ky,z],[fx,fy,z]);
      knee.position.set(kx,ky,z); shoe.position.set(fx+1.5,fy,z);
    };
  }
  for(let i=0;i<4;i++) {
    const person=model.group(root,0,height/2-base+2,-129);
    const color=['#4c687b','#507460','#a47656','#7b7976'][i];
    model.part(person,'ball',color,0,37,0,[6,8,6.8,7][i],15,5);
    model.part(person,'ball','#c49d7e',0,59,0,5.8,7,5.5);
    model.part(person,'ball','#423c38',-1,63,-1,5.9,3.8,5.6);
    const legs=[leg(person,'#344857',-3,14,13,2.4),leg(person,'#344857',3,14,13,2.4)];
    const arms=[segment(person,color,2),segment(person,color,2)];
    people.push({person,legs,arms});
  }
  function profile(points,depth,bevel) {
    const shape=new T.Shape(); points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel});
    geo.translate(0,0,-depth/2);owned.push(geo);return geo;
  }
  const body=profile([[-51,9],[-53,18],[-48,22],[-28,23],[-20,25],[24,25],[33,22],[52,20],[54,12],[48,9]],26,1.2);
  const roof=profile([[-29,22],[-18,35],[-10,37],[12,37],[19,34],[30,22]],21,.8);
  const glass=profile([[-24,24],[-16,33],[11,34],[17,32],[25,24]],.7,.2);
  // Sedan sources are built once, then every vertex follows the street projection.
  // Rendering the real vehicle depth avoids side-on cars sliding across an avenue.
  const wheelGeometry=new T.SphereGeometry(1,10,6);owned.push(wheelGeometry);
  for(let i=0;i<3;i++) {
    const source=model.group(),color=['#efb63f','#597c94','#a57767'][i];
    for(const geometry of [body,roof])source.add(new T.Mesh(geometry,model.material(color)));
    for(const side of [-1,1]) {
      const windowMesh=new T.Mesh(glass,model.material('#294e68'));windowMesh.position.z=side*12;source.add(windowMesh);
      model.part(source,'box','#86adbb',-2,29,side*13,2,11,1);
      for(const axle of [-1,1]) {
        const tyre=new T.Mesh(wheelGeometry,model.material('#28353b'));tyre.position.set(axle*33,8,side*14);tyre.scale.set(9,9,3.3);source.add(tyre);
        const hub=new T.Mesh(wheelGeometry,model.material('#b0bbc0'));hub.position.set(axle*33,8,side*17);hub.scale.set(4.1,4.1,1);source.add(hub);
        model.part(source,'box','#d6d8c7',axle*12,22,side*14,5,1.4,1.1);
        model.part(source,'box','#68838c',axle*21,17,side*14,1,9,1);
      }
      model.part(source,'box','#f9e4a3',53,18,side*8,2,4,5);
      model.part(source,'box','#c56850',-51,18,side*8,2,4,4);
    }
    model.part(source,'box','#d7dbcf',53,11,0,3,3,22);
    model.part(source,'box','#55727c',54,16,0,2,4,10);
    model.part(source,'box','#e2dac2',-53,11,0,3,3,22);
    if(!i)model.part(source,'box','#ffdd78',0,41,0,14,5,9);
    const windshield=new T.BufferGeometry();
    windshield.setAttribute('position',new T.Float32BufferAttribute([29.8,24,-9,29.8,24,9,20,34,8,20,34,-8],3));
    windshield.setIndex([0,1,2,0,2,3]);windshield.computeVertexNormals();owned.push(windshield);
    source.add(new T.Mesh(windshield,model.material('#537e95')));
    const rearGlass=windshield.clone();owned.push(rearGlass);
    const rearPosition=rearGlass.attributes.position;
    for(let j=0;j<rearPosition.count;j++)rearPosition.setX(j,-rearPosition.getX(j)+.6);
    rearGlass.computeVertexNormals();source.add(new T.Mesh(rearGlass,model.material('#416d87')));
    source.updateMatrixWorld(true);
    const positions=[],normals=[],colors=[],direction=i===1?-1:1;
    const vector=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3();
    source.traverse(part=>{
      if(!part.geometry)return;
      const geo=part.geometry,p=geo.attributes.position,n=geo.attributes.normal,index=geo.index;
      normalMatrix.getNormalMatrix(part.matrixWorld);
      for(let j=0;j<(index?index.count:p.count);j++) {
        const k=index?index.getX(j):j;
        vector.fromBufferAttribute(p,k).applyMatrix4(part.matrixWorld);
        positions.push(vector.z*3*direction,vector.y*2+2,-vector.x*2*direction);
        normal.fromBufferAttribute(n,k).applyMatrix3(normalMatrix);
        normal.set(normal.z/3*direction,normal.y/2,-normal.x/2*direction).normalize();
        normals.push(normal.x,normal.y,-normal.z);
        const light=.72+.38*Math.max(0,-normal.x*.36+normal.y*.65-normal.z*.67);
        const tint=part.material.color;
        colors.push(tint.r*light,tint.g*light,tint.b*light);
      }
    });
    const geometry=new T.BufferGeometry();owned.push(geometry);
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions.slice(),3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const mat=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:T.DoubleSide});actorMaterials.push(mat);
    const car=new T.Mesh(geometry,mat);car.frustumCulled=false;car.name='avenue-car-'+i;root.add(car);
    cars.push({car,source:positions});
  }
  const cycle=model.group(root,0,height/2-base-52,-122);cycle.scale.setScalar(.66);
  for(const side of [-1,1]) {
    const wheel=model.group(cycle,side*17,0,0);
    model.part(wheel,'ring','#273c48',0,0,0,8,8,1.5);
    for(let j=0;j<3;j++) {const a=j*Math.PI/3;model.rod(wheel,[-Math.cos(a)*9,-Math.sin(a)*9,0],[Math.cos(a)*9,Math.sin(a)*9,0],.45,'#abbcc3');}
    wheels.push(wheel);
  }
  for(const [a,b] of [[[-17,0,0],[-7,19,0]],[[-7,19,0],[2,4,0]],[[2,4,0],[-17,0,0]],[[-7,19,0],[11,19,0]],[[11,19,0],[2,4,0]],[[11,19,0],[17,0,0]]])model.rod(cycle,a,b,1.2,'#e39357');
  model.rod(cycle,[11,19,0],[14,25,0],1,'#344c58');model.rod(cycle,[14,25,0],[19,25,0],1,'#344c58');
  model.part(cycle,'ball','#263643',-7,23,0,5,1.5,3);
  model.rod(cycle,[-5,27,0],[3,39,0],4.5,'#547b92');
  model.part(cycle,'ball','#c99e7a',6,46,0,5,6,4.5);model.part(cycle,'ball','#edc155',6,50,0,5.8,3,5);
  for(const z of [-3,3]) {
    model.rod(cycle,[3,38,z],[9,30,z],1.7,'#c99e7a');model.rod(cycle,[9,30,z],[17,25,z],1.5,'#c99e7a');
    cycleLegs.push(leg(cycle,'#354958',z,15,14,2.3));
  }
  function animate(time) {
    people.forEach(({person,legs,arms},i)=>{
      const side=i%2?1:-1, depth=width*(1.50+i*.87+Math.sin(time*.045+i)*.18);
      const p0=perspective.project(side*(perspective.roadHalf+width*.14),0,depth);
      person.position.set(p0.x-width/2,height/2-p0.y,p0.z+4);
      person.scale.setScalar(p0.scale*1.32);
      const p=time*(3.4+i*.25)+i*2;
      legs.forEach((pose,j)=>{const phase=p+j*Math.PI;pose(0,27,Math.cos(phase)*6,2+Math.max(0,Math.sin(phase))*3);});
      arms.forEach((pose,j)=>{const swing=Math.cos(p+j*Math.PI)*5;pose([0,46,j?6:-6],[swing,28,j?6:-6]);});
    });
    cars.forEach(({car,source},i)=>{
      const depth=width*(i===2?3.12:i===0?2.05+(1-(time*.010+.76)%1)*3.3:2.6+(time*.008+.3)%1*4.5);
      const lane=perspective.roadHalf*(i===0?-.37:i===1?.36:.65);
      const position=car.geometry.attributes.position;
      for(let j=0;j<position.count;j++) {
        const p=perspective.project(lane+source[j*3],source[j*3+1],depth+source[j*3+2],projected);
        position.setXYZ(j,p.x-width/2,height/2-p.y,p.z+.2);
      }
      position.needsUpdate=true;
    });
    const cycleDepth=width*(1.65+(time*.009)%3.2),cp=perspective.project(-perspective.roadHalf*.82,12,cycleDepth);
    cycle.position.set(cp.x-width/2,height/2-cp.y,cp.z+3);cycle.scale.setScalar(cp.scale*1.3);cycle.rotation.y=1.05;
    wheels.forEach(w=>w.rotation.z=-time*4);
    cycleLegs.forEach((pose,i)=>{const p=time*6+i*Math.PI;pose(-5,27,2+Math.cos(p)*4.2,4+Math.sin(p)*4.2);});
  }
  return {animate,dispose(){owned.forEach(g=>g.dispose());actorMaterials.forEach(m=>m.dispose());},owned};
}
