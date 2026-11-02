// P3 oracle: sabit TS koşu işlemleri, gerçek kaynak RNG ve katalog sırası.
import fs from 'node:fs';
import path from 'node:path';
import { baseline, createBaselineLoader, root } from './export-catalog.mjs';
const L=createBaselineLoader({stubs:true});
const K=L.load('src/oyun/mutant-kosu'), B=L.load('src/cekirdek/beceri'), S=L.load('src/dunya/sehir-duzen');
const Y=L.load('src/oyun/yarislar');
const tracks=L.load('src/oyun/mutant').mutantPistleri().map((p,i)=>({...p,n:Y.TUM_ETKINLIKLER[i].n}));
const career=L.load('src/oyun/kariyer');
const types=['gp','rx','rl','dp','dg'];
const catalog={schema:1,baseline,sources:L.sources,passives:K.PASIFLER,addons:K.EKLENTILER,skills:B.BECERILER,skillAddons:B.BECERI_EKLENTILERI,parts:L.load('src/arac/parcalar').PARCALAR,tracks,bosses:K.BOSSLAR,places:K.YERLER,cityPlaces:S.SEHIR_YERLERI,
 startingCars:L.load('src/oyun/ekonomi').BASLANGIC_ARACLARI,carsCount:L.load('src/arac/araclar').CARS.length,workshop:K.ATOLYE,bossPlace:K.BOSS_YERI,cityWorkshop:S.SEHIR_ATOLYE,cityBoss:S.SEHIR_BOSS,
 opponentSetups:Object.fromEntries(types.map(ty=>[ty,Array.from({length:6},(_,i)=>career.kariyerKurulumu(ty,i+1))])),
 bossSetups:Object.fromEntries(types.map(ty=>[ty,Array.from({length:3},(_,i)=>K.bossYapisi(ty,i+1))])),risks:K.RISKLER,curses:K.LANETLER,chestResources:K.SANDIK_KAYNAKLARI,
 stockRefresh:K.STOK_YENILE,body:K.GOVDE,trackNames:Y.TUM_ETKINLIKLER.map(e=>e.n),levelNames:L.load('src/dunya/pist-tanimlari').SEVIYELER.map(e=>e.n),eventRewards:Array.from({length:6},(_,i)=>K.ETKINLIK_ODULU(i+1))};
const clean=(x)=>JSON.parse(JSON.stringify(x));
const fields=['tohum','test','faz','bolge','boss','kalan','xp','seviye','bekleyenSecim','para','pasifler','parcalar','stok','secenekler','etkinlikler','sandiklar','tamamlanan','yenilenBoss','zaman','govde','carpma','spin','kesme','pert','sonNefes','mek','bekleyenHasar','bekleyenRisk','beceriler','bekleyenBeceri','secimNo'];
function snapshot(k){return clean(Object.fromEntries(fields.filter(f=>k[f]!==undefined).map(f=>[f,k[f]])));}
function proof(k){const i=K.bossPisti(k,tracks);return clean({bossTrack:i,bossTarget:K.bossHedefi(k,tracks[i]),bossOpponent:K.bossRakibi(k),events:k.etkinlikler.map(e=>({id:e.id,risks:[0,1,2].map(risk=>({target:K.etkinlikHedefi(tracks[e.i],risk),opponent:K.etkinlikRakibi(k,e,tracks[e.i],risk)}))}))});}
const runs=[];
// Hiç durum hazırlama/ödül müdahalesi olmadan doğal seçim, ekonomi, bölge ve sonlanma izi.
{
 const seed=54321,k=K.kosuBaslat(seed,tracks),initial=snapshot(k),initialProof=proof(k),steps=[];
 const op=(name,args,fn)=>{const result=fn();steps.push({name,args,result:result??null,state:snapshot(k),proof:proof(k)});return result;};
 const settle=()=>{let n=0;while(['basla','secim'].includes(k.faz)&&n++<40){const choice=k.secenekler.find(x=>x.startsWith('b:')||x.startsWith('y:'))??k.secenekler[0];const drop=k.beceriler.length>=3?k.beceriler[0].id:undefined;op('choose',[choice,drop??''],()=>K.pasifSec(k,choice,drop));}};
 settle();for(let region=0;region<3;region++){
  for(const e of [...k.etkinlikler]){if(e.ty==='dp')op('lockDeposit',[e.id],()=>K.kaporaBelirle(k,e.id));op('event',[e.id,true,1,true],()=>K.etkinlikBitti(k,e.id,true,1,true));settle();}
  for(const c of k.sandiklar){const offer=op('offer',[c.id],()=>K.sandikTeklifi(k,c.id));if(offer)op('accept',[c.id,offer],()=>K.sandikAc(k,c.id,offer));}
  op('advance',[30],()=>K.zamanAkis(k,30));op('enterBoss',[],()=>K.bossaGir(k));op('boss',[region<2],()=>K.bossBitti(k,region<2,tracks));settle();
 }runs.push({seed,test:false,natural:true,initial,initialProof,steps});
}
// Envanter işlem sözleşmesi: kaynağın sunduğu geçerli seçeneği kontrollü seviye kartına koy.
// Bu hazırlama gerçek koşuda XP kazanıldığı iddiası değildir; tüm skill/evrim/eklenti/silme ret yollarını ayırır.
for(const [index,{definition,evolution}]of B.BECERILER.flatMap(definition=>(definition.evrimler.length?definition.evrimler:[null]).map(evolution=>({definition,evolution}))).entries()){
 const seed=100+index,k=K.kosuBaslat(seed,tracks),initial=snapshot(k),initialProof=proof(k),steps=[];
 const op=(name,args,fn)=>{const result=fn();steps.push({name,args,result:result??null,state:snapshot(k),proof:proof(k)});};
 const offer=(id,drop='')=>{op('prepareChoice',[id],()=>{k.faz='secim';k.bekleyenSecim=1;k.secenekler=[id];});op('choose',[id,drop],()=>K.pasifSec(k,id,drop||undefined));};
 offer('b:'+definition.id);offer('b:'+definition.id);offer('y:'+definition.id);offer('y:'+definition.id);offer('y:'+definition.id);
 for(const e of B.BECERI_EKLENTILERI.filter(e=>B.eklentiUyar(definition,e)))offer('e:'+e.id+':'+definition.id);
 if(evolution){offer('v:'+definition.id+':'+evolution.id);offer('v:'+definition.id+':'+evolution.id);}
 offer('v:'+definition.id+':yok');offer('e:yok:'+definition.id);
 for(const other of B.BECERILER.filter(d=>d.id!==definition.id).slice(0,2))offer('b:'+other.id);
 const replacement=B.BECERILER.find(d=>!k.beceriler.some(o=>o.id===d.id)).id;
 offer('b:'+replacement);offer('b:'+replacement,'yok');offer('b:'+replacement,definition.id);
 op('removeSkill',[replacement],()=>K.beceriSil(k,replacement));op('removeSkill',['yok'],()=>K.beceriSil(k,'yok'));
 runs.push({seed,test:false,inventory:true,initial,initialProof,steps});
}
for(const seed of [1,7,42,2147483648,4294967295]){
 const k=K.kosuBaslat(seed,tracks), steps=[];
 function op(name,args,fn){const result=fn();steps.push({name,args,result:result??null,state:snapshot(k),proof:proof(k)});return result;}
 const initial=snapshot(k),initialProof=proof(k);
 const settle=()=>{let n=0;while(['basla','secim'].includes(k.faz)&&n++<40)op('choose',[k.secenekler[0]],()=>K.pasifSec(k,k.secenekler[0]));};
 settle();
 // Kaynak pasif kombinasyonları: olay etkilerini dar ve tekrarlanabilir biçimde ayır.
 op('setPassives',[['zirh','hurdaci','tuccar','ogrenci','zaman','tamirci','sonnefes','kumarbaz']],()=>{k.pasifler=['zirh','hurdaci','tuccar','ogrenci','zaman','tamirci','sonnefes','kumarbaz'];});
 op('damage',['carpma'],()=>K.hasarAl(k,'carpma'));op('damage',['spin'],()=>K.hasarAl(k,'spin'));op('repair',[],()=>K.tamirEt(k));
 op('setPassives',[['zirh','camtop','nitro-kalkani','ek-takviye-tampon','hurdaci']],()=>{k.pasifler=['zirh','camtop','nitro-kalkani','ek-takviye-tampon','hurdaci'];});
 op('setNitro',[2.5,1.6],()=>{k.mek.etkiKalan=2.5;k.mek.etkiGuc=1.6;});op('damage',['carpma'],()=>K.hasarAl(k,'carpma'));op('damage',['spin'],()=>K.hasarAl(k,'spin'));
 op('setNitro',[0,1.6],()=>{k.mek.etkiKalan=0;k.mek.etkiGuc=1.6;});op('damage',['carpma'],()=>K.hasarAl(k,'carpma'));op('repair',[],()=>K.tamirEt(k));
 op('setPassives',[['zirh','hurdaci','tuccar','ogrenci','zaman','tamirci','sonnefes','kumarbaz']],()=>{k.pasifler=['zirh','hurdaci','tuccar','ogrenci','zaman','tamirci','sonnefes','kumarbaz'];});
 for(let region=0;region<3;region++){
  for(const e of [...k.etkinlikler]){
   const passed=e.id%3!==1,risk=e.id%3;
   if(e.ty==='dp')op('lockDeposit',[e.id],()=>K.kaporaBelirle(k,e.id));
   op('event',[e.id,passed,risk,e.id%2===0],()=>K.etkinlikBitti(k,e.id,passed,risk,e.id%2===0));
   op('event',[e.id,true,0,null],()=>K.etkinlikBitti(k,e.id,true,0,null));settle();
  }
  for(const c of k.sandiklar){let offer=op('offer',[c.id],()=>K.sandikTeklifi(k,c.id));op('offer',[c.id],()=>K.sandikTeklifi(k,c.id));if(offer){if(c.id===1)op('reject',[c.id],()=>K.sandikReddet(k,c.id));else op('accept',[c.id,offer],()=>K.sandikAc(k,c.id,offer));}}
  if(k.stok.length){const id=k.stok[0],sv=catalog.parts.find(p=>p.id===id).sv;op('buy',[id,sv],()=>K.parcaAl(k,id,sv));op('buy',[id,sv],()=>K.parcaAl(k,id,sv));}
  op('refresh',[],()=>K.stokYenile(k));op('advance',[k.kalan+1],()=>K.zamanAkis(k,k.kalan+1));op('advance',[91],()=>K.zamanAkis(k,91));
  op('enterBoss',[],()=>K.bossaGir(k));op('advance',[10],()=>K.zamanAkis(k,10));op('boss',[region<2],()=>K.bossBitti(k,region<2,tracks));settle();
 }
 op('damage',['carpma'],()=>K.hasarAl(k,'carpma'));runs.push({seed,test:false,initial,initialProof,steps});
}
// Geliştirici koşusu, gerçek pert/kesme, beceri/seviye/evrim/değiştirme sınırları.
for(const test of [false,true]){
 const seed=777,k=K.kosuBaslat(seed,tracks,test),initial=snapshot(k),initialProof=proof(k),steps=[];
 const op=(name,args,fn)=>{const result=fn();steps.push({name,args,result:result??null,state:snapshot(k),proof:proof(k)});};
 op('choose',['yok'],()=>K.pasifSec(k,'yok'));
 op('choose',[k.secenekler[2]],()=>K.pasifSec(k,k.secenekler[2]));
 op('advance',[1000],()=>K.zamanAkis(k,1000));
 for(let i=0;i<14;i++)op('damage',[i%2?'spin':'carpma'],()=>K.hasarAl(k,i%2?'spin':'carpma'));
 op('repair',[],()=>K.tamirEt(k));op('cut',[2000],()=>K.kesmeCezasi(k,2000));
 op('enterBoss',[],()=>K.bossaGir(k));op('boss',[true],()=>K.bossBitti(k,true,tracks));
 runs.push({seed,test,initial,initialProof,steps});
}
const output=JSON.stringify({baseline,catalog:clean(catalog),runs})+'\n';
const resource=JSON.stringify(clean(catalog))+'\n';
for(const [rel,data]of [['Unity/Validation/Reference/mutant-run-0.8.18.json',output],['Unity/Assets/LastTurn/Resources/mutant-catalog.json',resource]]){
 const target=path.join(root,rel);if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==data)throw Error('P3 oracle/katalog güncel değil: '+rel);}else fs.writeFileSync(target,data);
}
console.log(`P3 TS: ${runs.length} koşu, ${runs.reduce((n,r)=>n+r.steps.length,0)} işlem; ${tracks.length} pist, ${catalog.passives.length} pasif, ${catalog.skills.length} skill.`);
