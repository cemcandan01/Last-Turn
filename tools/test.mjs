// Last Turn testleri: oyunu başsız Chromium'da açar, hataları ve temel akışları denetler.
//   node test.mjs            hızlı test (yükleme, menü, 15 yarış, açık dünya, araçlar)
//   node test.mjs --tam      + fizik testleri (spin, drift, kalkış); birkaç dakika sürer
//   node test.mjs --goruntu  + ekran görüntüleri tools/out/ klasörüne
import {chromium} from 'playwright';
import http from 'http';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'tools','out');
const TAM=process.argv.includes('--tam'),GOR=process.argv.includes('--goruntu');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith(path.sep))f+='index.html';
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d)})});
await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));const URL_=`http://127.0.0.1:${srv.address().port}/`;
const exe=fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined;
const br=await chromium.launch({executablePath:exe,args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
let fail=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)fail++};
async function sayfa(w=844,h=390){const p=await br.newPage({viewport:{width:w,height:h}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto(URL_+'?'+Date.now());await p.waitForTimeout(1500);return p}
// oyun içi bekleme: başsız tarayıcı yavaş çizdiği için oyun saatine (tt) göre
const GT=`var w=ms=>new Promise(r=>setTimeout(r,ms)),gt=async s=>{const t=tt;while(tt-t<s)await w(15)};`;

console.log('Yükleme ve menü');
let p=await sayfa();ok(!p.errs.length,'sayfa hatasız açılıyor '+(p.errs[0]||''));
const v=await p.evaluate(()=>{const r=[];for(const m of [['race'],['race','t:gp'],['race','t:gp','e:0'],['free'],['profile'],['settings'],['home']]){showMenu(m);r.push(document.querySelector('#menu').innerHTML.length>200)}return r});
ok(v.every(Boolean),'menü ekranları (yarış, tür, pist, serbest, profil, ayarlar) açılıyor');
const imgs=await p.evaluate(async()=>{showMenu(['race']);await new Promise(r=>setTimeout(r,800));return[...document.querySelectorAll('.tile img')].map(i=>i.naturalWidth>0)});
ok(imgs.length==5&&imgs.every(Boolean),'5 yarış türü görseli yükleniyor');
const ver=await p.evaluate(()=>APP_VERSION);console.log('  sürüm',ver);

console.log('Yarışlar ve dünyalar');
const ev=await p.evaluate(()=>{demoStop();const r=[];EVENTS.forEach((e,i)=>{try{startEvent(i,CARS.findIndex(c=>c.ty==e.ty));r.push(!!REG[e.reg].g&&REG[e.reg].g.children.length>0)}catch(x){r.push(x.message)}});return r});
ok(ev.length==15&&ev.every(x=>x===true),`${ev.length} yarışın hepsi kuruluyor`+(ev.find(x=>x!==true)?' — '+ev.find(x=>x!==true):''));
const wd=await p.evaluate(()=>WORLDS.map((w,i)=>{try{startWorld(i);return true}catch(x){return x.message}}));ok(wd.every(x=>x===true),'açık dünyalar açılıyor');
const gr=await p.evaluate(()=>{try{openGarage(0);document.querySelector('#gnx').click();const n=CAR.n;closeGarage();return n}catch(x){return 'HATA '+x.message}});ok(!gr.startsWith('HATA'),'garaj açılıyor ve araç değişiyor');
ok(!p.errs.length,'akışlarda sayfa hatası yok '+(p.errs[0]||''));

if(GOR){fs.mkdirSync(OUT,{recursive:true});console.log('Ekran görüntüleri → tools/out/');
const g=await sayfa();const kare=async(ad,js)=>{await g.evaluate(js);await g.waitForTimeout(1200);await g.screenshot({path:path.join(OUT,ad+'.png')})};
await kare('menu',()=>showMenu(['home']));await kare('yaris_turu',()=>showMenu(['race']));await kare('pist_listesi',()=>showMenu(['race','t:dp']));
await kare('garaj',()=>{demoStop();openGarage(null)});await kare('yaris',()=>{closeGarage();startEvent(0,0);EV.state='run'});await kare('kokpit',()=>{camMode=3});
for(let i=0;i<15;i++){const d=await g.evaluate(async i=>{camMode=0;startEvent(i,CARS.findIndex(c=>c.ty==EVENTS[i].ty));EV.state='run';const TR=EV.TR,k=Math.floor(TR.N*.3),P=TR.P[k];reset(P[0],P[1],Math.atan2(TR.T[k][0],TR.T[k][1]));camMode=1;lp=.25;ly=.5;lastDrag=performance.now()+1e7;await new Promise(r=>setTimeout(r,500));R.render(scene,cam);return R.domElement.toDataURL('image/jpeg',.8)},i);
fs.writeFileSync(path.join(OUT,`pist_${String(i).padStart(2,'0')}.jpg`),Buffer.from(d.split(',')[1],'base64'))}await g.close()}

if(TAM){console.log('Fizik (oyun saatiyle; yavaş)');const f=await sayfa(160,90);await f.evaluate(()=>demoStop());
// gerçekçi seviye, tuşla süren otomatik pilot: spin atmamalı
for(const [e,c] of [[0,0],[9,3]]){const r=await f.evaluate(async([e,c,g])=>{eval(g);LK='real';startEvent(e,c);PK=CAR.pk;applyPreset();CT.steer='btn';CT.gas='btn';while(EV.state!='run')await w(20);
const TR=EV.TR;let spin=0,sp=false;const iv=setInterval(()=>{const q=TR.P[TR.open?Math.min(ti+7,TR.N-1):(ti+7)%TR.N];let a=Math.atan2(q[0]-S.x,q[1]-S.z)-S.h;a=Math.atan2(Math.sin(a),Math.cos(a));I.l=a>.06?1:0;I.r=a<-.06?1:0;const v=Math.hypot(S.vx,S.vz);I.g=v<(EV.ty=='rl'?16:24)?1:0;I.b=v>(EV.ty=='rl'?20:30)?1:0;const ab=Math.abs(D.beta);if(ab>1.3&&!sp){spin++;sp=true}if(ab<.4)sp=false},16);
await gt(15);clearInterval(iv);I.g=I.b=I.l=I.r=0;return[EV.n,spin,Math.round(100*ti/TR.N)]},[e,c,GT]);ok(r[1]==0&&r[2]>5,`gerçekçi seviyede ${r[0]}: spin ${r[1]}, ilerleme %${r[2]}`)}
// drift: usta sürücü driftte kalmalı, abartan spin atmalı (Boş Otopark, Beyaz Kurt)
for(const [lk,st] of [['real','usta'],['real','abartan'],['arc','usta']]){const r=await f.evaluate(async([lk,st,g])=>{eval(g);startWorld(1);LK=lk;setCar(2);PK='dr';applyPreset();reset(30,-3550,0);CT.steer='wheel';
let ph=0,act=0,n=0,sp=0;const iv=setInterval(()=>{I.g=1;if(ph==0){I.sa=0;return}if(ph==1){I.sa=1;if(DR.on)ph=2;return}if(DR.cool>1.15&&!DR._c){sp++;DR._c=1}if(DR.cool<1)DR._c=0;const be=Math.abs(D.beta);I.sa=st=='usta'?DR.dir*cl(2.2*(.55-be),-1,1):DR.dir;n++;if(D.act)act++},16);
await gt(3);ph=1;await gt(6);clearInterval(iv);I.g=0;I.sa=0;return[Math.round(100*act/Math.max(n,1)),sp]},[lk,st,GT]);
ok(st=='usta'?r[0]>70&&r[1]==0:r[1]>0,`drift ${lk}/${st}: driftte %${r[0]}, spin ${r[1]}`)}
await f.close()}
await br.close();srv.close();console.log(fail?`\n${fail} test başarısız`:'\nTüm testler geçti');process.exit(fail?1:0);
