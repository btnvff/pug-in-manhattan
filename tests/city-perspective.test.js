// Scenery projection invariants; the orthographic gameplay camera is untouched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scope = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/world-3d.js'), 'utf8'), scope);
const near = (a,b,message) => assert.ok(Math.abs(a-b)<1e-7,message);
for(const [width,height] of [[390,844],[320,568],[844,390]]) {
  const view = scope.createCityPerspective(width,height);
  for(const x of [-width*.6,0,width*.67]) for(const y of [0,height*.2,height*.9]) {
    const a = view.project(x,y,width*.3);
    let previous = a;
    for(const depth of [width*.8,width*2.4,width*7.5]) {
      const b = view.project(x,y,depth);
      // Every receding edge, at every height, points to exactly the same horizon.
      near((a.x-view.vanishingX)*(b.y-view.horizon)-(a.y-view.horizon)*(b.x-view.vanishingX),0,'shared vanishing point');
      assert.ok(b.scale<previous.scale && b.z<previous.z,'size and occlusion agree with depth');
      for(const value of Object.values(b)) assert.ok(Number.isFinite(value));
      if(y===0) near(view.groundX(x,b.y),b.x,'painted curb agrees with projected scenery');
      previous=b;
    }
  }
  // Straight physical lines remain straight after projection, including sloping rails.
  const endpoints=[[-width*.6,height*.1,width*.4],[width*.8,height*.9,width*2.5]];
  const a=view.project(...endpoints[0]),b=view.project(...endpoints[1]);
  for(const t of [.2,.5,.8]) {
    const p=view.project(...endpoints[0].map((value,i)=>value+(endpoints[1][i]-value)*t));
    near((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x),0,'projected straight line');
    near((p.z-a.z)*(b.y-a.y)-(p.y-a.y)*(b.z-a.z),0,'depth interpolation preserves planar faces');
  }
}
console.log('PASS: common vanishing point, straight projected edges, curb registration, gradual scale and depth ordering at three viewport sizes.');
