let ratioRaster = 1, ratioCanvasWorld = null;
function clearRatioCanvas(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);}
function beginRatioFeedback(){const a=RatioPresentation;ctx.setTransform(ratioRaster*600/390,0,0,ratioRaster*a.unit,0,ratioRaster*(a.py(0)));}
function beginRatioPixels(){ctx.setTransform(ratioRaster,0,0,ratioRaster,0,0);}
function drawRatioWorldCanvas(){
  if(!ratioCanvasWorld){
    ratioCanvasWorld=document.createElement('canvas');ratioCanvasWorld.width=600;ratioCanvasWorld.height=1125;
    const pen=ratioCanvasWorld.getContext('2d'),faces=[];
    const sky=pen.createLinearGradient(0,0,0,760);sky.addColorStop(0,'#80bbd8');sky.addColorStop(1,'#d1dad4');pen.fillStyle=sky;pen.fillRect(0,0,600,1125);
    for(const o of RATIO_LAYOUT.objects){
      if(o.kind==='sign'||ratioMode==='blockout'&&!o.role&&!o.surface)continue;
      if(o.kind==='rod'){
        const a=WorldRatio.project(o.a[0],o.a[1],o.a[2]/5.625),b=WorldRatio.project(o.b[0],o.b[1],o.b[2]/5.625);
        faces.push({depth:o.d,points:[a,b],color:o.color,line:Math.max(.35,.16*1125*o.width/o.d)});continue;
      }
      const l=o.x-o.width/2,r=o.x+o.width/2,b=o.y-o.height/2,t=o.y+o.height/2,n=Math.max(.06,o.d-o.length/11.25),f=o.d+o.length/11.25;
      const vertices=[[l,b,n],[r,b,n],[r,t,n],[l,t,n],[l,b,f],[r,b,f],[r,t,f],[l,t,f]];
      for(const [indices,shade] of [[[0,1,2,3],1],[[1,5,6,2],.78],[[4,0,3,7],.91],[[3,2,6,7],1.12]]){
        const points=indices.map(i=>WorldRatio.project(...vertices[i]));if(points.every(p=>p.u<-.5)||points.every(p=>p.u>1.5))continue;
        const rgb=o.color.match(/[a-f\d]{2}/gi).map(v=>Math.min(255,Math.round(parseInt(v,16)*shade)));
        faces.push({depth:indices.reduce((s,i)=>s+vertices[i][2],0)/4,points,color:'rgb('+rgb.join(',')+')'});
      }
    }
    faces.sort((a,b)=>b.depth-a.depth);
    for(const face of faces){pen.beginPath();face.points.forEach((p,i)=>i?pen.lineTo(p.u*600,p.v*1125):pen.moveTo(p.u*600,p.v*1125));if(face.line){pen.strokeStyle=face.color;pen.lineWidth=face.line;pen.stroke();}else{pen.closePath();pen.fillStyle=face.color;pen.fill();}}
  }
  beginRatioPixels();ctx.drawImage(ratioCanvasWorld,0,0);beginRatioFeedback();
}
function drawRatioDiagnostics(){
  if(!['blockout','overlay','reference'].includes(ratioMode))return;
  beginRatioPixels();ctx.save();ctx.font='15px Arial';ctx.lineWidth=1.3;
  const line=(y,color,label)=>{ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(0,y*1125);ctx.lineTo(600,y*1125);ctx.stroke();ctx.fillStyle=color;ctx.fillText(label,10,y*1125-6);};
  if(ratioMode!=='reference'){
    line(.64,'#e2674a','HORIZON 0.64');line(.88,'#eecc55','PUG GROUND 0.88');
    ctx.strokeStyle='#eecc55';const pw=.16*.67*1125;ctx.strokeRect(.44*600-pw/2,.72*1125,pw,.16*1125);
    ctx.fillStyle='#eecc55';ctx.fillText('P = 0.16 H',.44*600+pw/2+8,.8*1125);
    ctx.strokeStyle='#e2674a';ctx.beginPath();ctx.arc(300,.64*1125,6,0,Math.PI*2);ctx.stroke();
    for(const d of [2,4,8,12,20]){const p=WorldRatio.project(0,0,d);ctx.fillStyle='#f7f6da';ctx.fillText('d='+d,305,p.v*1125-2);}
    for(const x of [-3.7,-2.5,2.5,3.7]){const a=WorldRatio.project(x,0,2.4),b=WorldRatio.project(x,0,35);ctx.strokeStyle='#ead4a7';ctx.beginPath();ctx.moveTo(a.u*600,a.v*1125);ctx.lineTo(b.u*600,b.v*1125);ctx.stroke();}
    ctx.strokeStyle='#f7f6da';ctx.strokeRect(1,1,598,1123);
  }
  ctx.fillStyle='#203d49dd';ctx.fillRect(12,12,326,53);ctx.fillStyle='#fff3d9';ctx.fillText('PUG WORLD RATIO '+PUG_WORLD_RATIO.ratio_version,23,35);ctx.fillText('600 × 1125 · '+ratioMode,23,55);
  ctx.restore();beginRatioFeedback();
}
if(ratioMode==='reference'||ratioMode==='blockout')$('game').dataset.ratioDiagnostic='true';
// Declare spaces for DOM overlays and fixed-depth fallback assets.
for(const node of (document.querySelectorAll?.('#game > :not(canvas)') || []))node.dataset.coordinateSpace='HUD';
// Legacy calls are intentionally inert: canonical world cache never depends on W/H.
function invalidateScenery() {}
