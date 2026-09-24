// Executes real scene/model setup and every gameplay presentation path with a
// renderer test double. This is a runtime smoke test, not browser/GPU validation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),nodes=new Map(),errors=[];
const pen=new Proxy({}, {get(o,k){if(k in o)return o[k];if(k==='measureText')return()=>({width:40});if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
function element(){return {dataset:{},style:{setProperty(){}},parentNode:{insertBefore(){}},getContext:()=>pen,addEventListener(){},removeEventListener(){},setAttribute(){},remove(){},setPointerCapture(){},releasePointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:390,height:731.25})};}
const s={window:{addEventListener(){}},document:{hidden:false,body:element(),createElement:element,querySelectorAll:()=>[],getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},addEventListener(){}},URLSearchParams,location:{search:''},innerWidth:390,innerHeight:844,devicePixelRatio:2,getComputedStyle:()=>({paddingTop:0,paddingLeft:0,paddingRight:0,paddingBottom:0}),console:{log:console.log,warn:(...x)=>errors.push(x)},navigator:{},localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(){},Path2D:class{}};
vm.createContext(s);
const files=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="\.\/(.*?)"/g)].map(m=>m[1]);
for(const file of files){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),s,{filename:file});if(file.includes('vendor/'))s.window.THREE.WebGLRenderer=class{setPixelRatio(){}setSize(){}clear(){}clearDepth(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){}forceContextLoss(){}};}
const run=x=>vm.runInContext(x,s);
assert.equal(nodes.get('game').dataset.view,'3d');run('prefs.sound=false;start();spawnIn=999;');
for(const power of run('Object.keys(powerInfo)')){run(`start();applyPower(${JSON.stringify(power)});tick(.016);render();`);}
run('items=Array.from({length:9},(_,type)=>({type,x:100+type*10,y:350,age:0,angle:0,variant:0,warning:0,used:false}));render();');
run('resize();render();pause();render();');assert.equal(errors.length,0,JSON.stringify(errors));
run('fallbackToCanvas();render();');assert.equal(nodes.get('game').dataset.view,'2d');
assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS: real Three geometry setup, 17 powers, nine foods, pause/resize, disposal and Canvas fallback with a renderer test double.');
