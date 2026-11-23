import fs from 'node:fs';
import path from 'node:path';
const dist=path.resolve('client/dist');
if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Build client first');
const staticFiles=['/','/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png'];
const scan=(dir)=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const files=[...scan(path.join(dist,'assets')),...scan(path.join(dist,'art'))].filter(f=>/\.(css|js|svg|png|webp|woff2?)$/.test(f)).map(f=>'/'+path.relative(dist,f).split(path.sep).join('/'));
const version=process.env.GITHUB_SHA?.slice(0,12)||String(Date.now());
const sw=`// Generated during vite production build; never cache authenticated API requests.
const CACHE='asteria-static-${version}';
const STATIC=${JSON.stringify([...staticFiles,...files])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('asteria-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const u=new URL(request.url);
 if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/uploads/')||u.pathname.startsWith('/admin')||u.pathname.startsWith('/account')||u.pathname.startsWith('/checkout')||u.pathname.startsWith('/login')||u.pathname.startsWith('/register'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>await caches.match('/offline.html')||Response.error()));return;
 }
 if(STATIC.includes(u.pathname))event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
`;
fs.writeFileSync(path.join(dist,'sw.js'),sw);
console.log(`PWA generated: ${files.length} built assets precached`);
