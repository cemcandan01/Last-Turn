import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const p=JSON.parse(fs.readFileSync(path.join(root,'Logs/p7-preparation-f-play.json'),'utf8'));
if(p.result!=='p7-preparation-f-passed'||p.error||p.runtimeErrors.length)throw Error('Hazırlık Play başarısız: '+p.error);
for(const check of [
 'Pist kartı Enter hazırlığı açar; aynı tuş yarışı başlatmaz',
 'Fare saat ve hava seçimini gerçek koşullara yazar','Araç değişiminde pist/saat/hava korunur',
 'Araç seçimi gerçek diskten yüklenir','Garaj iptal Esc hazırlığa döner',
 'Bütçe dışı başlatma mevcut gerçek deneme yarışına gider','Seçilen yağmur gerçek yarış tutuşuna aktarılır',
 'Kilitli pist doğrudan komutta da reddedilir','Fare Başla gerçek ödüllü kariyer yarışını açar',
 'Kar ve sabah gerçek yarışa aktarılır','İzole ürün oyuncu dosyaları aynı hash\'te'
])if(!p.checks.includes(check))throw Error('Eksik davranış: '+check);
const files=fs.readdirSync(path.join(root,'Assets/LastTurn'),{recursive:true}).filter(f=>/\.(cs|uss)$/.test(f));
if(p.sources?.length!==files.length)throw Error('Hazırlık kaynak kapsamı eski');
for(const file of files){const name='Assets/LastTurn/'+file.replaceAll('\\','/');const hash=createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').toUpperCase();if(!p.sources.some(s=>s.path===name&&s.hash===hash))throw Error('Eski kaynak: '+name);}
for(const [screen,width,height] of [['ready',1280,720],['ready',1920,1080],['practice',1920,1080],['locked',1280,720]]){
 const file=`p7-preparation-${screen}-${width}.png`;if(!p.images.includes(file))throw Error('Eksik Game View: '+file);const png=fs.readFileSync(path.join(root,'Logs',file));if(png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==height)throw Error('Yanlış boyut: '+file);
}
console.log(`Hazırlık F: ${p.checks.length} gerçek Unity Play kontrolü; dört Game View; ${files.length} güncel kaynak; çalışma hatası ${p.runtimeErrors.length}, Editor tanısı ${p.editorDiagnostics.length}; ${p.utc}. İnsan kabulü değildir.`);
