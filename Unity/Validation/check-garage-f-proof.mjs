import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),p=JSON.parse(fs.readFileSync(path.join(root,'Logs/p7-garage-play.json'),'utf8'));
if(p.result!=='p7-garage-passed'||p.error)throw Error('F Garaj Play başarısız: '+p.error);
for(const check of ['Fare gerçek araç kartını seçer','İkinci Enter parçayı satın alır ve takar','X söker; iade üretmez','Diskten yeniden açılınca araç/parça/bakiye korunur','Oyuncu kayıt dosyaları aynı hash’te'.replace('’',"'")]){
 if(!p.checks.includes(check))throw Error('Eksik davranış: '+check);
}
const files=fs.readdirSync(path.join(root,'Assets/LastTurn'),{recursive:true}).filter(f=>/\.(cs|uss)$/.test(f));
if(p.sources?.length!==files.length)throw Error('F Garaj kaynak kapsamı değişti');
for(const file of files){const name='Assets/LastTurn/'+file.replaceAll('\\','/');const hash=createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex').toUpperCase();if(!p.sources.some(s=>s.path===name&&s.hash===hash))throw Error('Eski F Garaj kaynağı: '+name);}
for(const file of p.images){const b=fs.readFileSync(path.join(root,'Logs',file));const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(file.includes('1920')?(width!==1920||height!==1080):(width!==1280||height!==720))throw Error('Yanlış görüntü boyutu: '+file);}
console.log(`F Garaj gerçek Unity Play: ${p.checks.length} kontrol, fare/klavye, gerçek işlemler, disk yeniden açma, dört UI render; ${files.length} güncel kaynak; ${p.utc}. İnsan oyuncu kabulü değildir.`);
