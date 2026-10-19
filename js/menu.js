// Menü: ayarlar, profil, sinematik arka plan çekimleri (SHOTS), ana menü ekranları
// ---------- menü ve ayarlar (katlanır bölümler)
const STEER={btn:{n:'Tuşlar',d:'Sağ ve sol tuşları'},wheel:{n:'Direksiyon',d:'Ekrandaki direksiyonu çevir'},tilt:{n:'Telefonu çevir',d:'Telefonu direksiyon gibi yatır'}};
const GASM={btn:{n:'Gaz tuşu',d:'Basınca tam gaz'},analog:{n:'Analog pedal',d:'Ortası boş: yukarı kaydır gaz, aşağı kaydır fren. Kalkışta tam gaz patinaj yapar'},auto:{n:'Otomatik gaz',d:'Araç kendi hızlanır, sen frenle'}};
const CAMS=['Takip','Uzak takip','Kaput','Kokpit'],CAMO={0:{n:'Takip',d:'Arkadan'},1:{n:'Uzak takip',d:'Geniş görüş'},2:{n:'Kaput',d:'Kaputun üstünden'},3:{n:'Kokpit',d:'Şoför gözünden'}};
const OPEN=new Set();
const sec=(k,t,body)=>`<details data-sec="${k}"${OPEN.has(k)?' open':''}><summary>${t}</summary>${body}</details>`;
const chipsOf=(obj,cur,attr)=>'<div class="chips" style="flex-wrap:wrap">'+Object.entries(obj).map(([k,m])=>`<div class="chip ${cur==k?'sel':''}" data-${attr}="${k}" style="flex:1 1 40%">${m.n}<small>${m.d}</small></div>`).join('')+'</div>';
const OLK={auto:{n:'Otomatik',d:'Telefonla döner'},port:{n:'Dikey',d:'Hep dikey kalır'},land:{n:'Yatay',d:'Hep yatay kalır'}};
const carHTML=()=>sec('car','Araç: '+CAR.n,chipsOf(Object.fromEntries(CARS.map((c,i)=>[i,{n:c.n,d:c.d}])),CARS.indexOf(CAR),'cr')+`<div class="row" id="acr"><div>Yarışta türe uygun araç<small>Yarışa o türün aracıyla girilir. Kapalıysa seçili araçla girersin.</small></div><i class="${set.ac?'on':''}">${set.ac?'Açık':'Kapalı'}</i></div>`);
const ctlHTML=()=>sec('ctl','Kontroller','<div class="lbl">Direksiyon</div>'+chipsOf(STEER,CT.steer,'cs')+'<div class="lbl">Gaz</div>'+chipsOf(GASM,CT.gas,'cg')+(CT.steer=='tilt'?`<div class="row" style="display:block"><div>Çevirme açısı <span id="v_tlt">${set.tlt}°</span><small>Tam direksiyon için telefonu ne kadar yatırman gerekir. Büyük değer daha az hassas.</small></div><input type="range" id="tlt" min="20" max="60" step="1" value="${set.tlt}"></div>`:'')+
'<p>Telefonu çevirme: sürüşte sol alttaki tuşa basıp sensör izni ver, sonra telefonu nasıl tutacaksan öyle tutup “Ortala”ya bas. Telefonu direksiyon gibi sağa yatırınca sağa döner.</p>');
function bindAll(root,re){const tl=root.querySelector('#tlt');if(tl)tl.oninput=()=>{set.tlt=+tl.value;root.querySelector('#v_tlt').textContent=set.tlt+'°'};root.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{d.open?OPEN.add(d.dataset.sec):OPEN.delete(d.dataset.sec)}));
root.querySelectorAll('.chip[data-pk]').forEach(e=>e.onclick=()=>{PK=e.dataset.pk;applyPreset();re()});root.querySelectorAll('.chip[data-lk]').forEach(e=>e.onclick=()=>{LK=e.dataset.lk;applyPreset();re()});
root.querySelectorAll('.chip[data-cs]').forEach(e=>e.onclick=()=>{CT.steer=e.dataset.cs;if(CT.steer=='tilt')askTilt();buildCtl();re()});
root.querySelectorAll('.chip[data-cr]').forEach(e=>e.onclick=()=>{setCar(+e.dataset.cr);PK=CAR.pk;applyPreset();re()});const ac=root.querySelector('#acr');if(ac)ac.onclick=()=>{set.ac^=1;re()};
root.querySelectorAll('.chip[data-ol]').forEach(e=>e.onclick=()=>{OLOCK=e.dataset.ol;try{localStorage.setItem('lt_olock',OLOCK)}catch(_){}rs();re()});root.querySelectorAll('.chip[data-cg]').forEach(e=>e.onclick=()=>{CT.gas=e.dataset.cg;buildCtl();re()});root.querySelectorAll('.chip[data-cm]').forEach(e=>e.onclick=()=>{camMode=+e.dataset.cm;re()})}
const rec=e=>{const b=best(e.k);return b?' Rekor: '+(e.ty=='dp'?b:e.ty=='dg'?fmt3(b):fmt(b))+'.':''};
// ---------- profil: yerel olarak saklanır
const PROF=(()=>{let p={name:'Sürücü',races:0,wins:0,km:0,use:{}};try{Object.assign(p,JSON.parse(localStorage.getItem('lt_prof')||'{}'))}catch(e){}return p})();
const saveProf=()=>{try{localStorage.setItem('lt_prof',JSON.stringify(PROF))}catch(e){}};
// ---------- menü arkasında canlı yarış: otomatik pilot bir aracı bir pistte sürer
let DEMO=null;
// ---------- menü arka planı: kısa sinematik çekimler. Araç pist boyunca senaryoyla sürülür, kamera çekime göre konumlanır
const SHOTS=[
{ty:'gp',ev:0,car:0,c:{tod:'noon',wx:'sun'},cam:'track',f:.62,v:62,dur:5},
{ty:'gp',ev:1,car:0,c:{tod:'evening',wx:'sun'},cam:'front',f:.12,v:48,dur:5},
{ty:'gp',ev:2,car:0,c:{tod:'evening',wx:'sun'},cam:'side',f:.3,v:36,dur:5},
{ty:'rl',ev:9,car:3,c:{tod:'night',wx:'rain'},cam:'cock',f:.33,v:22,dur:6},
{ty:'rl',ev:10,car:3,c:{tod:'noon',wx:'snow'},cam:'heli',f:.42,v:21,dur:5,dr:.3},
{ty:'rx',ev:3,car:1,c:{tod:'noon',wx:'sun'},cam:'chase',f:.04,v:28,dur:5,dr:.25},
{ty:'rx',ev:4,car:1,c:{tod:'noon',wx:'sun'},cam:'track',f:.6,v:30,dur:5,dr:.35},
{ty:'dp',ev:6,car:2,c:{tod:'evening',wx:'sun'},cam:'orbit',f:.3,v:22,dur:6,dr:.7},
{ty:'dp',ev:8,car:2,c:{tod:'evening',wx:'sun'},cam:'track',f:.45,v:24,dur:5,dr:.65},
{ty:'dg',ev:13,car:4,c:{tod:'evening',wx:'sun'},cam:'launch',f:0,v:0,dur:5.5}];
let CINE=null,BAG=[],LASTSHOT=-1;
// pist üzerinde s metredeki nokta ve yön (iki nokta arasında doğrusal)
function trackAt(TR,s){const L=TR.len;s=TR.open?cl(s,0,TR.S[TR.N-1]):((s%L)+L)%L;let lo=0,hi=TR.N-1;while(lo<hi){const m=(lo+hi+1)>>1;if(TR.S[m]<=s)lo=m;else hi=m-1}
const i=lo,j=TR.open?Math.min(i+1,TR.N-1):(i+1)%TR.N,sl=((j>i?TR.S[j]:TR.len)-TR.S[i])||1,u=cl((s-TR.S[i])/sl,0,1),P=TR.P[i],Q=TR.P[j],A=TR.T[i],B=TR.T[j];
return{x:P[0]+(Q[0]-P[0])*u,z:P[1]+(Q[1]-P[1])*u,a:Math.atan2(A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u)}}
const curvAt=(TR,s)=>ad(trackAt(TR,s+8).a-trackAt(TR,s-8).a)/16;
// bir sonraki çekim: torba boşalana kadar her çekim bir kez, art arda aynı çekim yok
function nextShot(){if(!BAG.length){BAG=SHOTS.map((_,i)=>i).sort(()=>Math.random()-.5);if(BAG[0]===LASTSHOT)BAG.push(BAG.shift())}return LASTSHOT=BAG.shift()}
function cineStart(){const sh=SHOTS[nextShot()],e=EVENTS[sh.ev],r=REG[e.reg],TR=r.TR;setCar(sh.car);Object.assign(COND,sh.c);setActive(r);
const s0=sh.f*TR.len;CINE={...sh,TR,s:s0,s0,t:0,vv:sh.v,side:Math.random()<.5?1:-1,th:Math.random()*6.28,pv:null};camMode=sh.cam=='cock'?3:0;cineCar(0);
const cut=$('#cut');cut.style.transition='none';cut.style.opacity=1;requestAnimationFrame(()=>{cut.style.transition='opacity .45s';cut.style.opacity=0})}
// aracı senaryoya göre yerleştir: hız, drift açısı, duman
function cineCar(dt){const C=CINE,TR=C.TR;if(C.cam=='launch'){C.vv=C.t<1.3?0:Math.min(95,C.vv+15*dt)}C.s+=C.vv*dt;
const p=trackAt(TR,C.s),k=curvAt(TR,C.s),dr=C.dr?C.dr*cl(Math.abs(k)*45,.35,1)*Math.sign(k||1):0,h=p.a+dr,x=p.x+(C.cam=='launch'?0:Math.sin(C.t*.7)*.6),z=p.z;
const vx=Math.sin(p.a)*C.vv,vz=Math.cos(p.a)*C.vv,pw=S.w;S.w=dt?ad(h-S.h)/dt:0;S.axs=dt?(C.vv-Math.hypot(S.vx,S.vz))/dt:0;S.x=x;S.z=z;S.y=H(x,z);S.h=h;S.vx=vx;S.vz=vz;S.air=false;S.gas=1;delta=cl(-dr*.8+k*3,-.5,.5);
const burn=C.cam=='launch'&&C.t<2.2,smoke=Math.abs(dr)>.2||burn||(C.vv>8&&surf(x,z)!=1&&Math.random()<.5);
if(smoke&&dt){const si=surf(x,z),col=si>=4?0xf2f6f8:si==3?0x4a3524:si==1?0xe6e6e6:si==2?0x9a8f6a:0xbfa07a,fx=Math.sin(h),fz=Math.cos(h);for(const s2 of[-.9,.9])if(Math.random()<.7)puff(x-fx*1.6+Math.cos(h)*s2,S.y,z-fz*1.6-Math.sin(h)*s2,burn?Math.random()*2-1:vx*.4,burn?Math.random()*2-1:vz*.4,col)}}
function cineTick(dt){CINE.t+=dt;cineCar(dt);if(CINE.t>CINE.dur)cineStart()}
// kamera: çekim türüne göre; yakından hızlı geçişte sarsıntı
function cineCam(){const C=CINE,TR=C.TR,v=C.vv,fx=Math.sin(S.h),fz=Math.cos(S.h),car_=V3(S.x,S.y+.8,S.z);let P,L=car_.clone(),fov=58,shk=0;
if(C.cam=='track'||C.cam=='launch'){if(!C.pv){const ln=C.cam=='launch',sc=ln?C.s0+10:C.s0+C.v*2.6,q=trackAt(TR,sc),o=ln?5:(TR.hw+KW+(TR.kb?3.2:5.5))*C.side;C.pv=V3(q.x+Math.cos(q.a)*o,0,q.z-Math.sin(q.a)*o);
// kamera yol yüksekliğinin altında kalmasın (yükseltili pistlerde set arkasında kalmasın)
C.pv.y=Math.max(H(C.pv.x,C.pv.z),H(q.x,q.z))+(ln?.5:1.1)}
P=C.pv.clone();const d=P.distanceTo(car_);fov=C.cam=='launch'?50:cl(18+d*.55,24,60);shk=Math.max(0,1-d/18)*v/50*.35+(C.cam=='launch'&&C.t<2.2?.04:0)}
else if(C.cam=='front'){const q=trackAt(TR,C.s+11-C.t*1.2);P=V3(q.x,H(q.x,q.z)+.7,q.z);fov=50;shk=.015}
else if(C.cam=='side'){const q=trackAt(TR,C.s+2),o=8*C.side;P=V3(q.x+Math.cos(q.a)*o,0,q.z-Math.sin(q.a)*o);P.y=H(P.x,P.z)+1.3;fov=46;shk=.01}
else if(C.cam=='chase'){P=V3(S.x-fx*5.2,S.y+1.05,S.z-fz*5.2);L=V3(S.x+fx*8,S.y+.7,S.z+fz*8);fov=72;shk=.06}
else if(C.cam=='heli'){P=V3(S.x+Math.cos(S.h)*18*C.side-fx*8,S.y+13,S.z-Math.sin(S.h)*18*C.side-fz*8);fov=44}
else if(C.cam=='orbit'){const a=C.th+C.t*.45;P=V3(S.x+Math.sin(a)*7.5,S.y+1.5,S.z+Math.cos(a)*7.5);fov=55}
else return;// kokpit: normal araç içi kamera
P.x+=(Math.random()-.5)*shk;P.y+=(Math.random()-.5)*shk;cam.position.copy(P);cam.up.set(0,1,0);cam.lookAt(L);cam.fov=fov;cam.updateProjectionMatrix()}
function demoStart(){if(DEMO)return;DEMO={sv:{car:CARS.indexOf(CAR),PK,LK,TU:{...TU},AS:{...AS},tire,custom,cond:{...COND},cam:camMode}};cineStart()}
function demoStop(){if(!DEMO)return;const v=DEMO.sv;DEMO=null;CINE=null;if(CARS[v.car]!==CAR)setCar(v.car);PK=v.PK;LK=v.LK;TU=v.TU;AS=v.AS;tire=v.tire;custom=v.custom;camMode=v.cam;Object.assign(COND,v.cond);I.g=I.b=0;I.sa=0;$('#cut').style.opacity=0}
// ---------- küçük resimler: araçlar garajda çekilir, pist şekilleri çizilir
const THUMB={};
function carThumbs(){if(THUMB.car)return;THUMB.car=[];const keep=CARS.indexOf(CAR),vis=[MAP.g.visible,ground.visible],cp=cam.position.clone(),cf=cam.fov;
garG.visible=true;MAP.g.visible=false;for(const q of REG)if(q.g)q.g.visible=false;ground.visible=false;R.setSize(360,220,false);cam.aspect=360/220;cam.fov=38;cam.updateProjectionMatrix();
CARS.forEach((c,i)=>{setCar(i);car.position.set(GX,.12,GZ);car.rotation.set(0,.9,0);body.rotation.set(0,0,0);cam.position.set(GX+5.6,1.9,GZ+5.2);cam.lookAt(GX,.55,GZ);car.updateMatrixWorld(true);R.render(scene,cam);THUMB.car[i]=R.domElement.toDataURL('image/jpeg',.82)});
setCar(keep);garG.visible=false;MAP.g.visible=vis[0];ground.visible=vis[1];cam.position.copy(cp);cam.fov=cf;rs()}
function trackThumb(r){if(r._th)return r._th;const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d'),TR=r.TR,b=bbox(TR,0),s=136/Math.max(b[1]-b[0],b[3]-b[2]),ox=80-(b[0]+b[1])/2*s,oz=80-(b[2]+b[3])/2*s;
x.lineJoin=x.lineCap='round';for(const [w,col] of[[10,'#0a0f12'],[5,r.col]]){x.strokeStyle=col;x.lineWidth=w;x.beginPath();TR.P.forEach((p,i)=>{const X=p[0]*s+ox,Z=p[1]*s+oz;i?x.lineTo(X,Z):x.moveTo(X,Z)});if(!TR.open)x.closePath();x.stroke()}
const p0=TR.P[0];x.fillStyle='#ff7a3c';x.beginPath();x.arc(p0[0]*s+ox,p0[1]*s+oz,6,0,7);x.fill();return r._th=c.toDataURL()}
// ---------- ana menü
const TYPES=[['gp','Asfalt','Pist yarışları, fren tabelaları, kerbler'],['rx','Toprak','Rallikros: çamur, rampa, karışık zemin'],['rl','Ralli','A’dan B’ye orman, kar ve çöl etapları'],['dp','Drift','90 saniyede en yüksek drift puanı'],['dg','Drag','Düz çizgide milisaniyeler']];
const NAV=[['race','🏁','Yarış','Pist türünü seç, yarışını seç'],['free','🗺️','Serbest sürüş','Açık dünyada kuralsız sür'],['garage','🔧','Garaj','Araçları incele ve seç'],['profile','👤','Profil','İstatistikler ve rekorlar'],['settings','⚙️','Ayarlar','Kontroller, kamera, sürüş yardımı']];
let MV=['home'];
const evLen=e=>(REG[e.reg].TR.len*(e.laps||1)/1000).toFixed(2)+' km'+(e.laps?' · '+e.laps+' tur':'');
const evAvg=e=>e.ty=='dp'?e.time+' sn':e.ty=='dg'?fmt3(e.limit):fmt(e.limit);
const prOf=e=>{const b=best(e.k);return b?(e.ty=='dp'?b+' puan':e.ty=='dg'?fmt3(+b):fmt(+b)):'—'};
const condChips=()=>'<div class="lbl">Günün saati</div>'+chipsOf(Object.fromEntries(Object.entries(TODS).map(([k,n])=>[k,{n,d:''}])),COND.tod,'tod')+'<div class="lbl">Hava</div>'+chipsOf(Object.fromEntries(Object.entries(WXS).map(([k,n])=>[k,{n,d:k=='sun'?'':'Zemin daha kaygan'}])),COND.wx,'wx');
function showMenu(v){mode='menu';leaveEvent();['#hud','#mm','#ctl','#set','#res','#gar'].forEach(s=>$(s).classList.add('hidden'));$('#big').textContent='';if(v)MV=v;
const cur=MV[MV.length-1],top=MV[0];if(cur=='settings')demoStop();else demoStart();const m=$('#menu');m.classList.remove('hidden');
m.innerHTML=`<div class="mmL"><div class="logo">LAST<b>TURN</b></div>${NAV.map(([k,ic,n,d])=>`<div class="nv ${top==k?'on':''}" data-nav="${k}"><i>${ic}</i><div><b>${n}</b><small>${d}</small></div></div>`).join('')}
<div class="ver">${PROF.name} · Sürüm ${APP_VERSION}</div></div>${cur=='home'?'':`<div class="mmR">${view(cur)}</div>`}`;
m.querySelectorAll('.nv').forEach(e=>e.onclick=()=>{const k=e.dataset.nav;if(k=='garage'){demoStop();openGarage(null);return}showMenu([k])});
const bk=m.querySelector('#mbk');if(bk)bk.onclick=()=>{MV.pop();showMenu(MV.length?MV:['home'])};
m.querySelectorAll('[data-ty]').forEach(e=>e.onclick=()=>showMenu([...MV,'t:'+e.dataset.ty]));
m.querySelectorAll('[data-ev]').forEach(e=>e.onclick=()=>{Object.assign(COND,condOf(REG[EVENTS[+e.dataset.ev].reg].th));showMenu([...MV,'e:'+e.dataset.ev])});
m.querySelectorAll('.chip[data-tod]').forEach(e=>e.onclick=()=>{COND.tod=e.dataset.tod;showMenu()});m.querySelectorAll('.chip[data-wx]').forEach(e=>e.onclick=()=>{COND.wx=e.dataset.wx;showMenu()});
const go=m.querySelector('#mgo');if(go)go.onclick=()=>{const ev=+go.dataset.go,c={...COND};demoStop();Object.assign(COND,c);openGarage(ev)};
m.querySelectorAll('[data-w]').forEach(e=>e.onclick=()=>{const c={...COND};demoStop();Object.assign(COND,c);startWorld(+e.dataset.w)});
const nm=m.querySelector('#pname');if(nm)nm.onchange=()=>{PROF.name=nm.value.trim().slice(0,20)||'Sürücü';saveProf();showMenu()};
if(cur=='settings')bindSettings(m.querySelector('.mmR'),()=>showMenu())}
function view(cur){const back=MV.length>1?'<button class="mbk" id="mbk">‹ Geri</button>':'';
if(cur=='race'){return`<h2>Yarış türü</h2><div class="tiles">${TYPES.map(([t,n,d])=>{const cnt=EVENTS.filter(e=>e.ty==t).length;
return`<div class="tile" data-ty="${t}"><img src="img/tur_${t}.jpg" alt="${n}"><b>${n}</b><small>${d}</small><em>${cnt} yarış</em></div>`}).join('')}</div>`}
if(cur.startsWith('t:')){const t=cur.slice(2),y=TYP[t];return`${back}<h2>${TYPES.find(q=>q[0]==t)[1]} yarışları</h2><p>${y.d}</p><div class="rlist">${EVENTS.map((e,i)=>e.ty!=t?'':`<div class="rc" data-ev="${i}"><img src="${trackThumb(REG[e.reg])}"><div class="rci"><b>${e.n}</b><small>${e.d}</small>
<div class="rcs"><span>Uzunluk<b>${evLen(e)}</b></span><span>${e.ty=='dp'?'Süre':'Ort. bitiş'}<b>${evAvg(e)}</b></span><span>PR<b>${prOf(e)}</b></span><span>WR<b>—</b></span></div></div></div>`).join('')}</div><p class="note">WR: çevrimiçi özellikler gelince dünya rekorları burada görünecek.</p>`}
if(cur.startsWith('e:')){const i=+cur.slice(2),e=EVENTS[i],r=REG[e.reg];return`${back}<div class="evh"><img src="${trackThumb(r)}"><div><h2>${e.n}</h2><p>${e.d}</p>
<div class="rcs"><span>Uzunluk<b>${evLen(e)}</b></span><span>${e.ty=='dp'?'Süre':'Ort. bitiş'}<b>${evAvg(e)}</b></span><span>PR<b>${prOf(e)}</b></span><span>WR<b>—</b></span></div></div></div>
${condChips()}<button class="btn" id="mgo" data-go="${i}">Araç seç ›</button>`}
if(cur=='free')return`<h2>Serbest sürüş</h2>${WORLDS.map((w,i)=>`<div class="card go" data-w="${i}"><b>${w.n}</b><span>${w.d}</span></div>`).join('')}${condChips()}<p class="note">Araç: ${CAR.ic} ${CAR.n} (Garajdan değiştirebilirsin)</p>`;
if(cur=='profile'){const fav=Object.entries(PROF.use).sort((a,b)=>b[1]-a[1])[0];return`<h2>Profil</h2><div class="lbl">Sürücü adı</div><input id="pname" class="inp" value="${PROF.name.replace(/"/g,'')}" maxlength="20">
<div class="pst"><span>Yarış<b>${PROF.races}</b></span><span>Hedef geçildi<b>${PROF.wins}</b></span><span>Toplam yol<b>${PROF.km.toFixed(1)} km</b></span><span>En çok kullanılan<b>${fav?CARS[+fav[0]].n:'—'}</b></span></div>
<div class="lbl">Kişisel rekorlar</div>${EVENTS.map(e=>`<div class="rk"><span>${e.n}</span><span>${prOf(e)}</span></div>`).join('')}`}
if(cur=='settings')return`<h2>Ayarlar</h2>`+settingsHTML();return''}
// ayarlar: menüde ve duraklatma ekranında aynı içerik
const settingsHTML=()=>sec('pre','Önayar: '+(custom?'Özel':PRESETS[PK].n),chipsOf(PRESETS,PK,'pk'))+sec('lvl','Sürüş yardımı: '+LEVELS[LK].n,chipsOf(LEVELS,LK,'lk'))+
sec('cam','Kamera: '+CAMS[camMode],chipsOf(CAMO,camMode,'cm'))+ctlHTML()+sec('tir','Lastik: '+TIRES[tire].n,'<div class="chips" style="flex-wrap:wrap">'+TIRES.map((t,i)=>`<div class="chip ${tire==i?'sel':''}" data-t="${i}" style="flex:1 1 40%">${t.n}<small>${t.d}</small></div>`).join('')+'</div>')+
sec('mek','Mekanikler',TOG.map(t=>`<div class="row" data-k="${t[0]}"><div>${t[1]}<small>${t[2]}</small></div><i class="${set[t[0]]?'on':''}">${set[t[0]]?'Açık':'Kapalı'}</i></div>`).join(''))+
sec('tun','Araç ayarları',sliders(TUNE,TU,'tu'))+sec('ast','Sürüş yardımları (ayrıntılı)',sliders(AST,AS,'as'));
function bindSettings(s,re){bindAll(s,re);s.querySelectorAll('.chip[data-t]').forEach(e=>e.onclick=()=>{tire=+e.dataset.t;custom=true;re()});s.querySelectorAll('.row[data-k]').forEach(r=>r.onclick=()=>{set[r.dataset.k]^=1;re()});
s.querySelectorAll('input[data-o]').forEach(e=>e.oninput=()=>{(e.dataset.o=='tu'?TU:AS)[e.dataset.s]=+e.value;s.querySelector('#v_'+e.dataset.o+e.dataset.s).textContent=(+e.value).toFixed(2);custom=true})}
function startWorld(w){leaveEvent();['#menu','#res','#set'].forEach(s=>$(s).classList.add('hidden'));CURW=WORLDS[w||0];setActive(CURW.reg);reset();mode='drive';buildCtl();['#hud','#mm','#ctl'].forEach(s=>$(s).classList.remove('hidden'))}
const sliders=(D,O,o)=>D.map(t=>`<div class="row" style="display:block"><div>${t[1]} <span id="v_${o}${t[0]}">${(+O[t[0]]).toFixed(2)}</span>${t[2]?'<small>'+t[2]+'</small>':''}</div><input type="range" data-o="${o}" data-s="${t[0]}" min="${t[3]}" max="${t[4]}" step="${t[5]}" value="${O[t[0]]}"></div>`).join('');
function resume(){$('#set').classList.add('hidden');if(mode=='pause'){mode='drive';buildCtl();$('#ctl').classList.remove('hidden')}}
function showSet(){const s=$('#set');s.classList.remove('hidden');if(mode=='drive'){mode='pause';I.l=I.r=I.g=I.b=0;I.sa=0;$('#ctl').classList.add('hidden')}
s.innerHTML=`<div class="bar"><button class="btn" id="cl">Sürüşe dön</button><button class="btn alt" id="mn">Ana menü</button></div><p style="margin:0 0 4px">Oyun duraklatıldı.</p>`+settingsHTML()+
(EV?'':sec('tp','Işınlan','<div class="chips" style="flex-wrap:wrap">'+CURW.tele.map((t,i)=>`<div class="chip" data-p="${i}" style="flex:1 1 40%">${t[0]}</div>`).join('')+'</div>'));
bindSettings(s,showSet);s.querySelectorAll('.chip[data-p]').forEach(e=>e.onclick=()=>{const p=CURW.tele[+e.dataset.p];reset(p[1],p[2],p[3]);resume()});
$('#cl').onclick=resume;$('#mn').onclick=()=>{s.classList.add('hidden');showMenu(['home'])}}
$('#gs').onclick=showSet;$('#ts').onclick=()=>{tire=(tire+1)%TIRES.length;custom=true;note(TIRES[tire].n+' lastik',30)};
// ↺: serbest sürüşte en yakın yola/piste, yarışta pistin en yakın noktasına koyar (süre işlemeye devam eder)
$('#rs').onclick=()=>{if(mode!='drive')return;const TR=EV?EV.TR:MAP.TR,rg=EV?REG[EV.reg]:CUR;if(TR){let i=ti;
// çamurda yeniden doğma: çamurdan çıkana kadar pist boyunca ileri al
if(rg&&rg.inMud)for(let n=0;n<TR.N&&[0,3,-3].some(k=>{const q=TR.P[TR.open?cl(i+k,0,TR.N-1):(i+k+TR.N)%TR.N];return rg.inMud(q[0],q[1])});n++)i=TR.open?Math.min(i+1,TR.N-1):(i+1)%TR.N;
const P=TR.P[i],T=TR.T[i],t=EV?EV.t:0;reset(P[0],P[1],Math.atan2(T[0],T[1]));if(EV){EV.t=t;EV.prev=ti;EV.combo=0;EV.mult=1;EV.ct=0}}else{S.vx=S.vz=S.w=0;S.y=H(S.x,S.z)+.5;S.air=true}};
$('#cm').onclick=()=>{camMode=(camMode+1)%4;note(CAMS[camMode],30)};
{let ci=1;try{const v=localStorage.getItem('lt_car');if(v!=null&&CARS[+v])ci=+v}catch(e){}setCar(ci);PK=CAR.pk}
applyPreset();loadWorld();mmDraw();reset();buildCtl();showMenu();requestAnimationFrame(loop);
