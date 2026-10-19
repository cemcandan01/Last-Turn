// Yarış akışı: startEvent, evTick (tur, drift puanı, bitiş), sonuç ekranı
// ---------- yarışlar
let EV=null;
const best=k=>{try{return +localStorage.getItem('sv_'+k)||0}catch(e){return 0}},saveBest=(k,v)=>{try{localStorage.setItem('sv_'+k,v)}catch(e){}};
function startEvent(i,ci){const e=EVENTS[i],sv=EV&&EV.sv?EV.sv:{PK,LK,tire,TU:{...TU},AS:{...AS},custom,car:CARS.indexOf(CAR)};
// açık dünyada sürdüğün araçla girersen ayarları aynen kalır (drift otoparktaki gibi); başka araçta o aracın önayarı yüklenir
if(ci!=null&&CARS[ci]!==CAR){setCar(ci);PK=CAR.pk;applyPreset()}{const u=CARS.indexOf(CAR);PROF.use[u]=(PROF.use[u]||0)+1}
['#res','#set','#menu'].forEach(s=>$(s).classList.add('hidden'));setActive(REG[e.reg]);reset(e.g[1],e.g[2],e.g[3]);mode='drive';buildCtl();['#hud','#mm','#ctl'].forEach(s=>$(s).classList.remove('hidden'));
EV={...e,i,sv,TR:REG[e.reg].TR,state:'count',cd:3,t:0,score:0,combo:0,ct:0,mult:1,gap:0,best:0,armed:0,lap:0,lapStart:0,bestLap:null,prev:ti,time:e.time||0,limit:e.limit||0}}
function leaveEvent(){if(!EV)return;const sv=EV.sv;if(CARS[sv.car]!==CAR)setCar(sv.car);PK=sv.PK;LK=sv.LK;tire=sv.tire;TU=sv.TU;AS=sv.AS;custom=sv.custom;EV=null;$('#ev').textContent=''}
function bank(){const p=Math.round(EV.combo*EV.mult);if(p>0){EV.score+=p;EV.best=Math.max(EV.best,p);note('+'+p,40)}EV.combo=0;EV.ct=0;EV.mult=1;EV.gap=0}
function evTick(dt,o){if(EV.state!='run')return;EV.t+=dt;
if(EV.ty=='dp'){EV.time-=dt;const lost=o.si==2||tt-S.hit<.05||Math.abs(D.beta)>1.4;
if(EV.combo>0&&lost){EV.combo=0;EV.ct=0;EV.mult=1;note('KOMBO YANDI',30)}
else if(D.act&&!lost){EV.combo+=o.v*Math.abs(D.beta)*dt*3;EV.ct+=dt;EV.gap=0;const m=Math.min(5,1+Math.floor(EV.ct/2.5));if(m>EV.mult)note('x'+m,44);EV.mult=m}
else if(EV.combo>0){EV.gap+=dt;if(EV.gap>.8)bank()}
if(EV.time<=0){bank();endEvent()}return}
const N=EV.TR.N;
if(EV.laps){if(ti>N*.4&&ti<N*.6)EV.armed=1;if(EV.prev>N*.8&&ti<N*.2&&EV.armed){EV.armed=0;EV.lap++;const lt=EV.t-EV.lapStart;EV.lapStart=EV.t;EV.bestLap=EV.bestLap==null?lt:Math.min(EV.bestLap,lt);
if(EV.lap>=EV.laps)endEvent();else note('Tur '+(EV.lap+1)+'/'+EV.laps+' · '+fmt(lt),30)}EV.prev=ti}
else{if(ti>N*.5)EV.armed=1;if(EV.armed&&ti>=N-(EV.ty=='dg'?1:4)){EV.trap=Math.hypot(S.vx,S.vz)*3.6;endEvent()}}}
function evText(){if(!EV)return'';if(EV.ty=='dp')return'⏱ '+Math.max(0,EV.time).toFixed(1)+' · Puan '+EV.score+(EV.combo>0?' · Kombo '+Math.round(EV.combo)+' x'+EV.mult:'');
if(EV.ty=='dg')return'⏱ '+EV.t.toFixed(2)+' / '+EV.limit.toFixed(1)+' sn · '+Math.round(100*ti/(EV.TR.N-1))+'%';
return'⏱ '+fmt(EV.t)+' / '+fmt(EV.limit)+(EV.t>EV.limit?' · SÜRE AŞILDI':'')+(EV.laps?' · Tur '+Math.min(EV.lap+1,EV.laps)+'/'+EV.laps:' · %'+Math.round(100*ti/EV.TR.N))}
function endEvent(){EV.state='done';mode='result';PROF.races++;if(EV.ty=='dp'?EV.score>0:EV.t<=EV.limit)PROF.wins++;saveProf();I.g=I.b=I.l=I.r=0;I.sa=0;$('#ctl').classList.add('hidden');let h,p;
const row=(a,b)=>`<div class="rk"><span>${a}</span><span>${b}</span></div>`;
if(EV.ty=='dp'){const b=best(EV.k),nb=EV.score>b;if(nb)saveBest(EV.k,EV.score);h='Drift yarışması bitti';p=row('Toplam puan',EV.score)+row('En iyi kombo',EV.best)+row('Rekor',Math.max(b,EV.score)+(nb?' · YENİ':''))}
else{const ok=EV.t<=EV.limit,b=best(EV.k),nb=ok&&(!b||EV.t<b);if(nb)saveBest(EV.k,EV.t.toFixed(EV.ty=='dg'?3:2));h=ok?(EV.laps?'Yarış tamamlandı':EV.ty=='dg'?'Hedef geçildi':'Etap tamamlandı'):'Süre aşıldı';
p=EV.ty=='dg'?row('Süren',fmt3(EV.t))+row('Hedef',fmt3(EV.limit))+row('Bitiş hızı',Math.round(EV.trap)+' km/sa')+row('Rekor',nb?fmt3(EV.t)+' · YENİ':b?fmt3(+b):'—'):row('Süren',fmt(EV.t))+row('Hedef',fmt(EV.limit))+(EV.laps?row('En iyi tur',fmt(EV.bestLap)):'')+row('Rekor',nb?fmt(EV.t)+' · YENİ':b?fmt(b):'—')}
const r=$('#res'),k=EV.i;r.classList.remove('hidden');r.innerHTML=`<h1>${h}</h1>${p}<button class="btn" id="again">Tekrar</button><button class="btn alt" id="free">Açık dünyaya dön</button><button class="btn alt" id="rm">Ana menü</button>`;
$('#again').onclick=()=>startEvent(k);$('#free').onclick=()=>{r.classList.add('hidden');startWorld(WORLDS.indexOf(CURW))};$('#rm').onclick=()=>{r.classList.add('hidden');leaveEvent();showMenu(['home'])}}
