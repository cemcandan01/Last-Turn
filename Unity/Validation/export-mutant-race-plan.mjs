// Kaynak yarış/rakip planı ve sonuç kararı; sentetik bitiş sınırları gerçek fizik yarışı kabulü değildir.
import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
import {baseline,createBaselineLoader,root} from './export-catalog.mjs';
const L=createBaselineLoader({stubs:true}),K=L.load('src/oyun/mutant-kosu'),Y=L.load('src/oyun/yarislar'),M=L.load('src/oyun/mutant'),R=L.load('src/oyun/rakip'),P=L.load('src/dunya/pist'),W=L.load('src/dunya/bolgeler');
const tracks=M.mutantPistleri();
function declaration(file,names){const source=L.read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);return ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast));}
function compile(code,env,suffix){const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;return new Function(...Object.keys(env),js+'\n'+suffix)(...Object.values(env));}
const funcs=declaration('src/oyun/mutant.ts',['mutantYarisAyari','mutantRakibi']);if(funcs.length!==2)throw Error('Kaynak plan işlevleri bulunamadı.');
const opponentSource=L.read('src/oyun/rakip.ts'),opponentAst=ts.createSourceFile('rakip.ts',opponentSource,ts.ScriptTarget.Latest,true);
const spawn=opponentAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='rakipBaslat');
const spawnPrefix=spawn.body.getText(opponentAst).slice(1).split('  rakip.ayar = r;')[0];
const lead=declaration('src/oyun/rakip.ts',['ileriNokta']);
const spawnFn=compile(lead.join('\n'),{nearest:P.nearest,IZGARA_YAN:L.load('src/yz/yarisci').IZGARA_YAN},'return function(EV,r){'+spawnPrefix+'return {x,z,h};};');
const end=declaration('src/oyun/yarislar.ts',['endEvent'])[0];const endPrefix=end.slice(end.indexOf('{')+1).split('  PROF.races++;')[0];
if(!endPrefix.includes('mutantYarisBitti'))throw Error('Kaynak sonuç bloğu değişti.');
const clean=x=>JSON.parse(JSON.stringify(x)),plans=[];
const casesFor=(e,opponent)=>{
 const outputs=[];
 for(const [time,score,state,exists,finish]of [[1,0,'run',true,null],[10,e.limit||0,'run',true,10],[10,e.limit||0,'run',true,10.01],[10,e.limit||0,'run',true,9.99],[10,e.limit||0,'run',false,null],[e.limit+.001,Math.max(0,e.limit-1),'run',true,null],[0,e.limit,'run',true,null],[10,e.limit,'done',true,null]]){
  const EV={...e,t:time,score,state,mutant:true};let result=null;const game={mode:'drive'};
  R.rakip.y=exists?{bitis:finish}:null;
  new Function('yaris','oyun','girdiSifirla','gizle','mutantRakibi','rakibiGecti','mutantYarisBitti',endPrefix)({EV},game,()=>{},()=>{},()=>opponent,R.rakibiGecti,(passed,beat)=>{result={passed,beat};});
  outputs.push({time,score,state,exists,finish,result,finalState:EV.state,mode:game.mode});
 }return outputs;
};
function plan(seed,region,player,eventIndex,risk,bossType){
 const k=K.kosuBaslat(seed,tracks);k.bolge=region;k.faz=bossType?'boss':'surus';
 const e=eventIndex==null?null:{id:eventIndex,i:eventIndex,ty:tracks[eventIndex].ty,sev:tracks[eventIndex].sev,x:0,z:0,yapildi:false,...(tracks[eventIndex].sokak?{sokak:tracks[eventIndex].sokak}:{}),...(region===1&&eventIndex===0?{rakip:true}:{})};
 if(e)k.etkinlikler=[e];if(bossType)k.boss=K.BOSSLAR.find(b=>b.ty===bossType);
 const mutant={kosu:k,etkinlik:bossType?'boss':e.id,risk};
 const env={exports:{},mutant,mutantArac:player,mutantPistleri:()=>tracks,beceriYarisBasi:K.beceriYarisBasi,kaporaBelirle:K.kaporaBelirle,bossHedefi:K.bossHedefi,etkinlikHedefi:K.etkinlikHedefi,bossRakibi:K.bossRakibi,etkinlikRakibi:K.etkinlikRakibi,DUELLO:K.DUELLO};
 const f=compile(funcs.join('\n'),env,'return {setting:mutantYarisAyari,opponent:mutantRakibi};');
 const inputEntry=clean(e);const index=bossType?K.bossPisti(k,tracks):eventIndex;const base=Y.TUM_ETKINLIKLER[index],target=f.setting(index),opponent=f.opponent();
 const event={...base,...target,TR:base.TR??W.REG[base.reg].TR};const position=opponent?spawnFn(event,opponent):null;
 plans.push(clean({seed,region,player,eventIndex,risk,bossType:bossType??null,index,entry:inputEntry,deposit:e?.kapora??null,metadata:{key:base.k,type:base.ty,level:base.lv,difficulty:base.sev,name:base.n,description:base.d,region:base.reg,preset:base.pk,stars:base.ys,start:base.g.slice(1)},laps:target.laps??0,limit:target.limit,opponent,spawn:position,results:casesFor(event,opponent)}));
}
for(let i=0;i<tracks.length;i++)for(const risk of [0,1,2])for(const player of [0,14])plan(42,i>=40?2:1,player,i,risk,null);
for(const region of [1,2,3])for(const ty of ['gp','rx','rl','dp','dg'])for(const player of [0,14])plan(7,region,player,null,2,ty);
const output=JSON.stringify({baseline,sources:L.sources,plans})+'\n',target=path.join(root,'Unity/Validation/Reference/mutant-race-plan-0.8.18.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Mutant yarış plan oracle güncel değil.');}else fs.writeFileSync(target,output);
console.log(`Mutant yarış planı TS: ${plans.length} plan; 49 etkinlik×3 risk×2 araç, 3 bölge×5 boss×2 araç, kaynak spawn ve ${plans.length*8} sonuç sınırı.`);
