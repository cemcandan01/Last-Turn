// PWA: service worker kaydı ve yeni sürüm kontrolü
// ---------- uygulama (PWA): çevrimdışı önbellek ve güncelleme kontrolü
if('serviceWorker' in navigator&&location.protocol!='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
let updT=0;async function checkUpdate(){if(location.protocol=='file:'||Date.now()-updT<30000)return;updT=Date.now();
try{const t=await(await fetch('index.html',{cache:'no-store'})).text(),m=t.match(/APP_VERSION='([^']+)'/);if(m&&m[1]!=APP_VERSION){const b=$('#upd');b.textContent='Yeni sürüm hazır ('+m[1]+') · Güncelle';b.classList.remove('hidden')}}catch(e){}}
$('#upd').onclick=()=>location.reload();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate()});setTimeout(checkUpdate,3000);
