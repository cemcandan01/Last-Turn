// P3 sokak rotaları: gerçek TS startEvent/evTick ve şehir yükseklik/yüzey sorguları.
import fs from 'node:fs';
import path from 'node:path';
import {baseline,createBaselineLoader,root} from './export-catalog.mjs';
const L=createBaselineLoader({stubs:true});
const Y=L.load('src/oyun/yarislar'),P=L.load('src/dunya/pist'),W=L.load('src/dunya/dunya'),S=L.load('src/oyun/surus'),D=L.load('src/oyun/piste-donus');
const N=L.load('src/arayuz/bildirim');N.note=()=>{};
let lastCut=0;const originalCut=D.kesmeAdimi;D.kesmeAdimi=(...args)=>(lastCut=originalCut(...args));
const DT=1/60;
const snap=e=>({t:e.t,lap:e.lap,armed:e.armed,prev:e.prev,bestLap:e.bestLap,lapStart:e.lapStart,offTime:e.pistDisi.sure,exit:e.kesme.cikis,path:e.kesme.yol,stars:e.yildiz,xp:e.xp,money:e.para,state:e.state});
const routes=Y.SOKAK_ETKINLIKLERI.map((e,n)=>{
 const i=40+n,TR=e.TR;
 // Kaynak city surf yalnız bu rotanın ipucunu günceller; yüksekliği bina çatısı da dahil gerçek H fonksiyonudur.
 W.SEHIR.TR=TR;P.ipucu.ti=0;
 const samples=[];
 for(let j=0;j<240;j++){
  const b=P.trackAt(TR,TR.len*j/239),lat=((j*13)%37)-18,x=b.x+Math.cos(b.a)*lat,z=b.z-Math.sin(b.a)*lat;
  samples.push([x,z,W.surfW(x,z),P.ipucu.ti,W.Hw(x,z)]);
 }
 for(const [x,z]of [[9000,150],[9000,0],[9000+880,0],[9000-880,0],[9000+800,0],[9000,881],[9500,-600],[8510,500],[8999,-600]])samples.push([x,z,W.surfW(x,z),P.ipucu.ti,W.Hw(x,z)]);
 if(!Y.startEvent(i,10,true))throw Error('Sokak başlamadı '+e.k);
 const ev=Y.yaris.EV,initial=snap(ev),startHint=P.ipucu.ti;ev.state='run';ev.cd=0;
 let progress=TR.S[startHint];const rows=[];
 for(let step=0;step<20000&&ev.state==='run';step++){
  progress+=55*DT;const b=P.trackAt(TR,progress),vx=Math.sin(b.a)*55,vz=Math.cos(b.a)*55;
  Object.assign(S.sim.S,{x:b.x,z:b.z,vx,vz,hit:-10});const surface=W.surfW(b.x,b.z),hint=P.ipucu.ti;
  S.sim.d.D={act:false,beta:0};lastCut=0;Y.evTick(DT,{v:55,cimTeker:0});
  rows.push([b.x,b.z,vx,vz,surface,hint,lastCut,step%30===0||ev.state!=='run'?snap(ev):null]);
 }
 if(ev.state!=='done')throw Error('Sokak bitmedi '+e.k);
 const result=snap(ev),key=ev.k;Y.leaveEvent();
 return {index:i,key:e.k,type:e.ty,level:e.lv,difficulty:e.sev,name:e.n,description:e.d,region:e.reg,laps:e.laps??0,limit:e.limit,stars:e.ys,start:e.g.slice(1),open:TR.open,kind:e.sokak,initial,startHint,recordKey:key,samples,rows,result};
});
// Gerçek kaynak kesmeAdimi geri dönüş metresini evTick içinden gözle; bu ilk anda gövdeye uygulanır.
const cuts=[];
for(const [n,e]of Y.SOKAK_ETKINLIKLERI.entries()){
 const TR=e.TR;let selected=null;
 for(let a=0;a<TR.N-20&&!selected;a+=10)for(let delta=20;delta<Math.min(160,TR.N-a-1);delta+=10){
  const b=a+delta,chord=Math.hypot(TR.P[b][0]-TR.P[a][0],TR.P[b][1]-TR.P[a][1]),travel=TR.S[b]-TR.S[a];
  if(travel-chord<20||(!TR.open&&travel>TR.len/2))continue;
  let far=false;for(let j=1;j<20;j++){const f=j/20,x=TR.P[a][0]+(TR.P[b][0]-TR.P[a][0])*f,z=TR.P[a][1]+(TR.P[b][1]-TR.P[a][1])*f;if(D.pistKonumu(TR,x,z,a).uzaklik>D.pistKenari(TR)+2)far=true;}
  if(far){selected={a,b,chord};break;}
 }
 if(!selected)continue;
 if(!Y.startEvent(40+n,10,true))throw Error('Kesme denemesi başlamadı');const ev=Y.yaris.EV;ev.state='run';ev.cd=0;const startHint=P.ipucu.ti,rows=[];
 for(let step=0;step<=60&&ev.state==='run';step++){
  const f=step/60,{a,b}=selected,x=TR.P[a][0]+(TR.P[b][0]-TR.P[a][0])*f,z=TR.P[a][1]+(TR.P[b][1]-TR.P[a][1])*f;
  Object.assign(S.sim.S,{x,z,vx:0,vz:0,hit:-10});W.surfW(x,z);const hint=P.ipucu.ti;lastCut=0;S.sim.d.D={act:false,beta:0};Y.evTick(DT,{v:0,cimTeker:0});rows.push([x,z,hint,lastCut,snap(ev)]);
 }
 cuts.push({route:n,startHint,rows});Y.leaveEvent();
}
if(!cuts.some(c=>c.rows.some(r=>r[3]>0)))throw Error('Gerçek kesme örneği yok');
const fixture={baseline,sources:L.sources,routes,cuts};const output=JSON.stringify(fixture)+'\n',target=path.join(root,'Unity/Validation/Reference/mutant-streets-0.8.18.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Sokak oracle güncel değil');}else fs.writeFileSync(target,output);
console.log(`P3 sokak TS: ${routes.length} rota, ${routes.reduce((n,r)=>n+r.rows.length,0)} yarış adımı, ${routes.reduce((n,r)=>n+r.samples.length,0)} şehir sorgusu, ${cuts.length} gerçek kesme izi.`);
