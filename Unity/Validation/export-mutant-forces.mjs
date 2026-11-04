// P4: gerçek TS simülasyonuna dis/ucus girişi; kaynak fizik gövdesi değiştirilmez.
import fs from 'node:fs';import path from 'node:path';
import {baseline,createBaselineLoader,root} from './export-catalog.mjs';
const L=createBaselineLoader({stubs:true}),Sim=L.load('src/fizik/simulasyon'),SU=L.load('tests/yardimci/surucu'),CARS=L.load('src/arac/araclar').CARS;
const W={H:()=>0,surf:()=>1,yakin:()=>[],kutu:()=>[-1e6,1e6,-1e6,1e6],kerb:()=>0,havaTutusu:()=>1,karli:()=>false,yolTuru:()=>null};
const configs=[
 {name:'dis-yerde',height:0,external:{x:4,z:3}},
 {name:'ucus-kalkis',height:0,flight:{y:38,denge:.6,ileri:12,inis:8}},
 {name:'hava-surukleme',height:15,flight:{y:12,denge:0,ileri:14,hava:{parmak:true,yunus:1.1,yalpa:-.7}}},
 {name:'hava-durus',height:18,flight:{y:20,denge:0,ileri:5,hava:{parmak:false,yunus:0,yalpa:0}}},
 {name:'inis-denge',height:5,flight:{y:0,denge:.7,inis:8,yalpa:.4,hava:{parmak:false,yunus:0,yalpa:0}}},
 {name:'sarkac',height:10,external:{x:-3,z:5},flight:{y:24,denge:1,ileri:4}},
];
const scenarios=[];
for(const config of configs){
 const setup=SU.kurulumYap(10,CARS[10].pk,'real');setup.as={grip:0,str:0,stm:0,tcs:0,abs:0,dft:0,ini:0,acc:1,bra:1};
 const sim=new Sim.Simulasyon(7),cx={dunya:W,kurulum:setup,olay:{spin(){},puf(){},caliRengi:()=>0},rng:sim.rng,gorselRng:()=>.5};sim.sifirla(0,0,0,0);
 sim.adim({tg:0,g:0,b:0,analogDireksiyon:false,analogGaz:false,dbr:false},cx);sim.yeni.py+=config.height;
 const rows=[];
 for(let n=0;n<240;n++){
  cx.dis=n<180?config.external:undefined;cx.ucus=config.flight;
  sim.adim({tg:n<60?0:.12,g:1,b:0,analogDireksiyon:false,analogGaz:false,dbr:false},cx);
  if(n%10===9){const y=sim.yeni;rows.push([n+1,y.px,y.py,y.pz,y.vx,y.vy,y.vz,y.ox,y.oy,y.oz,y.qx,y.qy,y.qz,y.qw,y.rpm,y.vites,...y.tk.flatMap(w=>[w.w,w.sik,w.Fz])]);}
 }
 scenarios.push({...config,rows});
}
const data=JSON.stringify({baseline,sources:L.sources,tolerance:1e-6,scenarios})+'\n';
const target=path.join(root,'Unity/Validation/Reference/mutant-forces-0.8.18.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==data)throw Error('P4 kuvvet oracle güncel değil');}else fs.writeFileSync(target,data);
console.log('P4 TS kuvvet: 6 senaryo × 240 gerçek fizik adımı; yatay ivme, kalkış, hava sürükleme/duruş, iniş ve sarkaç.');
