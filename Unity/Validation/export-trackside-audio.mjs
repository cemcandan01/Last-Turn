import fs from "node:fs";
import path from "node:path";
const dir=path.resolve("Unity/Assets/LastTurn/Resources/Audio");
const rate=22050,n=rate*8;
function render(name,seed){
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const samples=new Float64Array(n);
  let low=0,middle=0,pulse=0,breeze=0,target=0;
  for(let i=0;i<n;i++){
    if(random()<.00022)pulse=.3+random()*.6;
    pulse*=name==="servis"?.97:.987;
    if(i%2205===0)target=random();
    breeze+=(target-breeze)*.00015;
    const noise=random()*2-1;
    low+=.035*(noise-low);middle+=.38*(noise-middle);
    samples[i]=name==="orman"?low*(.4+breeze):
      name==="servis"?(noise-middle)*pulse+(middle-low)*.015:(middle-low)*(.12+pulse);
  }
  const rms=Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/n);
  const rawPeak=samples.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
  const gain=Math.min((name==="seyirci"?.075:.045)/rms,.65/rawPeak);
  const data=Buffer.alloc(44+n*2);
  data.write("RIFF");data.writeUInt32LE(data.length-8,4);data.write("WAVEfmt ",8);data.writeUInt32LE(16,16);
  data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);
  data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write("data",36);data.writeUInt32LE(n*2,40);
  let peak=0,energy=0;
  for(let i=0;i<n;i++){
    const x=samples[i]*gain*Math.min(1,i/440,(n-1-i)/440);
    peak=Math.max(peak,Math.abs(x));energy+=x*x;
    data.writeInt16LE(Math.round(x*32767),44+i*2);
  }
  fs.writeFileSync(path.join(dir,name+".wav"),data);
  return {name,seconds:8,rms:Math.sqrt(energy/n),peak};
}
console.log(JSON.stringify([render("seyirci",43573),render("orman",66537),render("servis",43277)]));
