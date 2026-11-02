// Salt sabit TS kaynak kuralı ve depo fonksiyonları; gerçek oyuncu kayıtlarına erişmez.
import fs from 'node:fs';
import path from 'node:path';
import {baseline,createBaselineLoader,root} from './export-catalog.mjs';
const L=createBaselineLoader(),depot=L.load('src/cekirdek/depo');
const source=L.read('src/oyun/mutant.ts');
const block=source.match(/const r = mutantRekoru\(\),[\s\S]*?if \(yeni\) yazJson\(ANAHTAR, \{ bolge: k\.bolge, boss: k\.yenilenBoss \}\);/)?.[0];
if(!block)throw Error('Kaynak Mutant rekor bloğu bulunamadı.');
const update=new Function('k','mutant','mutantRekoru','yazJson','ANAHTAR',block);
const cases=[];
for(const initial of [null,'{}','{"bolge":2}','{"boss":3}','{"bolge":2,"boss":1}']){
 L.storage.clear();if(initial!==null)L.storage.set('lt_mutant',initial);
 const steps=[];
 for(const [phase,region,bosses] of [['boss',1,0],['bitti',1,0],['bitti',1,0],['bitti',1,1],['bitti',0,9],['bitti',2,0],['surus',3,2],['bitti',2,1],['bitti',3,0]]){
  const mutant={yeniRekor:false};
  if(phase==='bitti')update({bolge:region,yenilenBoss:bosses},mutant,()=>depot.okuJson('lt_mutant',{bolge:0,boss:0}),depot.yazJson,'lt_mutant');
  steps.push({phase,region,bosses,changed:mutant.yeniRekor,record:depot.okuJson('lt_mutant',{bolge:0,boss:0}),raw:L.storage.get('lt_mutant')??null});
 }
 cases.push({initial,steps});
}
const output=JSON.stringify({baseline,sources:L.sources,cases})+'\n';
const target=path.join(root,'Unity/Validation/Reference/mutant-records-0.8.18.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Mutant rekor oracle güncel değil.');}
else fs.writeFileSync(target,output);
console.log(`Mutant rekor TS: ${cases.length} eski/boş kayıt, ${cases.reduce((n,c)=>n+c.steps.length,0)} boss/faz/karşılaştırma geçişi.`);
