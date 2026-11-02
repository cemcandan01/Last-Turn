// Gerçek mutantAdimi ve yolGoreviAdimi gövdeleri; P4 beceri/enerji yürütmesi bu oracle kapsamı dışındadır.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {baseline,createBaselineLoader,root} from './export-catalog.mjs';
const L=createBaselineLoader({stubs:true}),K=L.load('src/oyun/mutant-kosu'),G=L.load('src/oyun/mutant-gorev');
const CARS=L.load('src/arac/araclar').CARS,parts=L.load('src/arac/parcalar'),R=L.load('src/cekirdek/rastgele');
L.load('src/oyun/yarislar');const tracks=L.load('src/oyun/mutant').mutantPistleri();
const ramp=L.load('src/dunya/corak').TELEW.find(t=>t[0]==='Zıplama rampası');
const source=L.read('src/oyun/mutant.ts'),ast=ts.createSourceFile('mutant.ts',source,ts.ScriptTarget.Latest,true);
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['mutantAdimi','yolGoreviAdimi'].includes(n.name?.text));
if(functions.length!==2)throw Error('Kaynak oturum işlevleri bulunamadı.');
const compiled=ts.transpileModule(functions.map(n=>n.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const clean=x=>JSON.parse(JSON.stringify(x));
const runs=[];
for(const [seed,test,wreck] of [[1,false,false],[7,false,true],[42,true,false],[2147483648,false,false]]){
 const k=K.kosuBaslat(seed,tracks,test),events=[];let refreshes=0,energyCalls=0;
 const mutant={kosu:k,sonHit:-9,spinde:false,nitro:false,beceriIstek:[],beceriBasili:[],red:{n:0},bossBekliyor:false,icinde:'a',kapali:'a',bekle:0,gorev:G.bosGorev()};
 const mission=o=>({mission:clean(o.gorev)});
 mutant.ui={hasar:(type,wrecked)=>events.push({kind:'hasar',detail:type,id:null,wrecked}),sureDoldu:()=>events.push({kind:'sureDoldu',detail:'',id:null,wrecked:false}),isaret:i=>events.push({kind:'isaret',detail:i.tur,id:i.id??null,wrecked:false}),gorev:o=>events.push({kind:'gorev',detail:o.tur,id:null,wrecked:false,...mission(o)})};
 const env={exports:{},mutant,hasarAl:K.hasarAl,mutantAracGuncelle:()=>refreshes++,rakipGovdesi:()=>null,beceriDunyasiYap:()=>({}),beceriGorunumu:()=>[],enerjiAdimi:()=>{energyCalls++;return false;},rakip:{y:false},rakipEtkisi:()=>{},RAKIP:'rakip',zamanAkis:K.zamanAkis,atolyeYeri:K.atolyeYeri,bossYeri:K.bossYeri,ISARET_R:10,ISARET_V:5,ISARET_SURE:.5,gorevAdimi:G.gorevAdimi,gorevCek:G.gorevCek,mulberry32:R.mulberry32,CARS,mutantArac:0,RAMPA:ramp,engelListesi:d=>d.obstacles??[]};
 const tick=new Function(...Object.keys(env),compiled+'\nreturn mutantAdimi;')(...Object.values(env));
 const snapshot=()=>clean({run:Object.fromEntries(['faz','bolge','kalan','zaman','govde','para','carpma','spin','pert','bekleyenHasar','sonNefes'].map(f=>[f,k[f]])),energy:k.mek.enerji,markers:{inside:mutant.icinde,closed:mutant.kapali,wait:mutant.bekle},missions:mutant.gorev,pendingBoss:mutant.bossBekliyor,lastHit:mutant.sonHit,spinning:mutant.spinde,refreshes,energyCalls});
 const initial=snapshot(),steps=[];
 const record=(name,args,result=null)=>steps.push({name,args,result,state:snapshot()});
 const choose=()=>{while(k.faz==='basla'||k.faz==='secim'){const id=k.secenekler[0];record('choose',[id],K.pasifSec(k,id));}};choose();
 const step=(values,dt)=>{
  const i={x:1000,z:1000,speed:0,hit:-9,beta:0,racing:false,hasSimulation:true,raceStarted:true,drifting:false,airborne:false,obstacles:[],...values};events.length=0;
  const d=i.hasSimulation?{S:{x:i.x,z:i.z,h:0,vx:0,vz:i.speed,air:i.airborne},DR:{},D:{act:i.drifting}}:null;
  tick(i.x,i.z,i.speed,dt,i.racing,i.hit,i.beta,d,{TR:null,dunya:{obstacles:i.obstacles},kosuyor:i.raceStarted});record('step',[i,dt],clean(events));
 };
 const a=K.atolyeYeri(k);step({x:a[0],z:a[1]},.6);step({},.1);step({x:a[0],z:a[1]},.3);step({x:a[0],z:a[1]},.2);step({x:a[0],z:a[1]},.8);
 step({speed:35},6);
 for(let n=0;n<8;n++)step({speed:50,drifting:true,airborne:true,obstacles:[{id:'o'+Math.floor(n/2),x:n%2?1008:1001,z:1000,r:1}]},1);
 step({speed:20},8);step({},26);
 const e=k.etkinlikler[0];step({x:e.x,z:e.z,speed:6},.5);step({x:e.x,z:e.z,speed:0},.5);step({x:e.x,z:e.z,speed:0},.5);
 step({speed:10,beta:1.4,hit:0},1/60);step({speed:10,beta:1.4,hit:0},1/60);step({speed:10,beta:.3,hit:0},1/60);step({speed:10,beta:1.4,hit:0},1/60);step({speed:10,beta:1.4,hit:-9},1/60);step({speed:10,beta:.3,hit:-8.75},1/60);step({speed:10,beta:.3,hit:-8.74},1/60);
 if(wreck){for(let n=1;n<15;n++)step({speed:10,hit:n},1/60);}
 else{
  step({racing:true,raceStarted:false},.5);step({racing:true},k.kalan+1);step({},.2);
  record('enterBoss',[],K.bossaGir(k));step({racing:true,hit:1},.5);record('boss',[false],K.bossBitti(k,false,tracks));step({},.5);
 }
 const built=parts.aracKur(0,k.parcalar);const car=K.toprakDengesi(K.kosuAraci(built.car,k),built.tire);
 runs.push({seed,test,car:0,initial,steps,finalCar:car});
}
// Aynı kaynak simülasyonunda 120'şer adım sonra kurulum değişir; hiçbir fizik durumu sıfırlanmaz.
const Sim=L.load('src/fizik/simulasyon'),SU=L.load('tests/yardimci/surucu'),reconfiguration=[];
const W={H:()=>0,surf:()=>1,yakin:()=>[],kutu:()=>[-1e6,1e6,-1e6,1e6],kerb:()=>0,havaTutusu:()=>1,karli:()=>false,yolTuru:()=>null};
for(const car of [10,2]){
 const setup=SU.kurulumYap(car,CARS[car].pk,'real');setup.as={grip:0,str:0,stm:0,tcs:0,abs:0,dft:0,ini:0,acc:1,bra:1};
 const sim=new Sim.Simulasyon(7),cx={dunya:W,kurulum:setup,olay:{spin(){},puf(){},caliRengi:()=>0},rng:sim.rng,gorselRng:()=>.5};sim.sifirla(0,0,0,0);
 const changes=[{at:120,body:64,passives:['guc','hafif','asfalt'],remaining:2.5,power:1.6},{at:240,body:64,passives:['guc','hafif','asfalt'],remaining:0,power:1.6},{at:360,body:100,passives:['guc','hafif','asfalt'],remaining:0,power:1.6}];
 const rows=[];
 for(let n=0;n<480;n++){
  const change=changes.find(c=>c.at===n);if(change)setup.car=K.toprakDengesi(K.kosuAraci(CARS[car],{pasifler:change.passives,govde:change.body,mek:{etkiKalan:change.remaining,etkiGuc:change.power}}),setup.tire);
  sim.adim({tg:n<300?0:.12,g:1,b:0,analogDireksiyon:false,analogGaz:false,dbr:false},cx);
  if(n%30===29){const S=sim.d.S,Y=sim.yeni;rows.push([n+1,S.x,S.z,S.h,S.vx,S.vz,Y.rpm,Y.vites,Y.vitesT,Y.turbo,...Y.tk.flatMap(w=>[w.w,w.don,w.sik,w.Fz,w.kap,w.tanA,w.abs])]);}
 }
 reconfiguration.push({car,tire:setup.tire,changes,rows,tolerance:1e-6});
}
const output=JSON.stringify({baseline,sources:L.sources,ramp,runs,reconfiguration,p4Boundary:'enerjiAdimi no-op; yalnız çağrı sırası/sayısı doğrulanır'})+'\n',target=path.join(root,'Unity/Validation/Reference/mutant-session-0.8.18.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Mutant oturum oracle güncel değil.');}else fs.writeFileSync(target,output);
console.log(`Mutant oturum TS: ${runs.length} doğal başlangıç, ${runs.reduce((n,r)=>n+r.steps.length,0)} işlem; fizik sonrası zaman/hasar/görev/işaret. P4 yürütmesi kapsam dışı.`);
