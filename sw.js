const C='dl-v1',OK=['www.gstatic.com','fonts.gstatic.com','fonts.googleapis.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon-192.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
if(e.request.method!=='GET'||!(u.origin===location.origin||OK.includes(u.hostname)))return;
e.respondWith(caches.match(e.request).then(h=>{const n=fetch(e.request).then(r=>{if(r.ok||r.type==='opaque')caches.open(C).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>h);return h||n}))});
