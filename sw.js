// Last Turn service worker: oyun dosyaları internet varken her açılışta ağdan tazelenir,
// yoksa önbellekten açılır. Three.js ve simgeler değişmediği için önce önbellekten gelir.
const CACHE='last-turn-v1';
const CORE=['./','index.html','manifest.webmanifest','vendor/three.min.js','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
const stable=/\/(vendor|icons)\//.test(u.pathname);
e.respondWith(stable
?caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return n}))
:fetch(e.request,{cache:'no-store'}).then(n=>{if(n.ok){const c=n.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return n}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))))});
