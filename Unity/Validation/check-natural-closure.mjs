import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const p=JSON.parse(fs.readFileSync(path.join(root,'Logs/p10-natural-play.json'),'utf8'));
if(p.result!=='p10-natural-passed'||p.error||p.runtimeErrors.length||p.editorDiagnostics.length)throw Error('Gerçek boss/görev Play başarısız');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const assets=files(path.join(root,'Assets/LastTurn')).filter(f=>/\.(cs|uss|json|png|wav|bytes)$/.test(f));
if(p.sources.length!==assets.length)throw Error('Kaynak kapsamı eski');
for(const f of assets){const rel=path.relative(root,f).replaceAll('\\','/'),sha=createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();if(!p.sources.some(s=>s.path===rel&&s.hash===sha))throw Error('Eski kaynak: '+rel);}
for(const label of ['Gercek boss galibiyeti bolge3 zinciri','Galibiyet sonrasi bolge3 sehir','Gorev parasi gercek duruma uygulandi','Gorev tamamlama HUD geri bildirimi','Kariyer profil ayni','Kalici kayit hashleri ayni'])if(!p.checks.includes(label))throw Error('Eksik kabul: '+label);
if(!p.checks.some(s=>s.startsWith('Boss gercek fizik galibiyeti / player='))||!p.checks.some(s=>s.startsWith('Bolge3 yol gorevi gercek hedefe ulasti /')))throw Error('Gerçek bitiş/hedef yok');
for(const phase of ['real-boss-win','region3-world','region3-mission-complete'])for(const w of [1280,1920]){const name=`p10-natural-${phase}-${w}.png`,b=fs.readFileSync(path.join(root,'Logs',name));if(!p.images.includes(name)||b.readUInt32BE(16)!==w||b.readUInt32BE(20)!==(w===1280?720:1080))throw Error('Game View eksik: '+name);}
console.log(`Gerçek boss → bölge3 → doğal yol görevi: ${p.checks.length} kontrol/${p.sources.length} güncel kaynak/6 Game View; hata0. Başlangıç bölgesi ve kurulum fixture, sonuç/hedef enjeksiyonu yok.`);
