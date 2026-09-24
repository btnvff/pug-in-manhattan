const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const paths=['index.html','style.css','manifest.webmanifest','apple-touch-icon.png','icon-192.png','icon-512.png',...[...html.matchAll(/<script defer src="\.\/(.*?)"/g)].map(m=>m[1])];
for(const file of paths){const dest=path.join(dist,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
console.log('Built '+paths.length+' static game files.');
