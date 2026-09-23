// Background-only rigs. No gameplay RNG or independent animation loop.
function createStreetActors(model, root, width, height, base, perspective) {
  const T = window.THREE, people = [], cars = [], wheels = [], cycleLegs = [];
  const owned = [];
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
  for(let i=0;i<3;i++) {
    const car=model.group(root,0,height/2-base-37,-127); car.scale.setScalar(.8);
    const color=['#d7ab50','#628490','#7e898e'][i];
    for(const geometry of [body,roof]) car.add(new T.Mesh(geometry,model.material(color)));
    const windowMesh=new T.Mesh(glass,model.material('#213c50'));windowMesh.position.z=12;car.add(windowMesh);
    model.part(car,'box','#a5c3ce',-2,29,13,2,11,1);
    for(const side of [-1,1]) {
      model.part(car,'ball','#26313b',side*33,8,14,9.5,9.5,3);
      model.part(car,'ball','#151f2b',side*33,8,16,8,8,3);
      model.part(car,'ball','#a4b6bf',side*33,8,19,4.5,4.5,1);
      model.part(car,'box','#dce5e4',side*49,12,14,8,2.2,2);
      model.part(car,'box',side>0?'#fff2ba':'#b84a40',side*49,19,14,6,3,2);
      model.part(car,'box','#c7d6d9',side*12,22,14,5,1.2,1);
      model.part(car,'box','#315363',side*21,17,14,1,9,1);
    }
    model.part(car,'box','#aebfc4',0,13,14,46,1.3,1);
    if(!i) model.part(car,'box','#ffe48a',0,41,0,15,5,10);
    cars.push(car);
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
      const side=i%2?1:-1, depth=width*(.82+i*.47+Math.sin(time*.045+i)*.20);
      const p0=perspective.project(side*width*.54,0,depth);
      person.position.set(p0.x-width/2,height/2-p0.y,p0.z+4);
      person.scale.setScalar(p0.scale*1.32);
      const p=time*(3.4+i*.25)+i*2;
      legs.forEach((pose,j)=>{const phase=p+j*Math.PI;pose(0,27,Math.cos(phase)*6,2+Math.max(0,Math.sin(phase))*3);});
      arms.forEach((pose,j)=>{const swing=Math.cos(p+j*Math.PI)*5;pose([0,46,j?6:-6],[swing,28,j?6:-6]);});
    });
    cars.forEach((car,i)=>{
      const progress=(time*(i%2?-.021:.025)+i*.37+100)%1;
      const p=perspective.project((progress-.5)*width*2.1,0,width*(.97+i*.82));
      car.position.set(p.x-width/2,height/2-p.y,p.z+4);
      car.scale.setScalar(p.scale*1.4);
    });
    const cycleDepth=width*(.89+(time*.012)%1.9), cp=perspective.project(-width*.40,12,cycleDepth);
    cycle.position.set(cp.x-width/2,height/2-cp.y,cp.z+5);cycle.scale.setScalar(cp.scale*1.2);
    wheels.forEach(w=>w.rotation.z=-time*4);
    cycleLegs.forEach((pose,i)=>{const p=time*6+i*Math.PI;pose(-5,27,2+Math.cos(p)*4.2,4+Math.sin(p)*4.2);});
  }
  return {animate,dispose(){owned.forEach(g=>g.dispose());},owned};
}
