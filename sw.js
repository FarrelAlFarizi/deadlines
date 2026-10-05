const C='dl-v2',OK=['www.gstatic.com','fonts.gstatic.com','fonts.googleapis.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon-192.png'].map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),mine=u.origin===location.origin;
 if(e.request.method!=='GET'||!(mine||OK.includes(u.hostname)))return;
 const keep=r=>{if(r.ok||r.type==='opaque')caches.open(C).then(c=>c.put(e.request,r.clone()));return r};
 e.respondWith(mine?fetch(e.request,{cache:'no-cache'}).then(keep).catch(()=>caches.match(e.request)):caches.match(e.request).then(h=>h||fetch(e.request).then(keep)));
});
