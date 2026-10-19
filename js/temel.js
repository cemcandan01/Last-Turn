// Temel: ekran yönü kilidi, yardımcılar, sabitler, lastikler, önayarlar, sürüş yardımı seviyeleri
// ekran yönü kilidi: iOS ana ekran uygulamasında yön kilitlenemediği için, telefon kilitli yönün dışına dönerse içerik 90° döndürülür
const APP=document.createElement('div');APP.id='app';[...document.body.children].filter(e=>e.tagName!='SCRIPT').forEach(e=>APP.appendChild(e));document.body.prepend(APP);
const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.appendChild(probe);
let OLOCK='land',ROT=0,lastLand=90,AW=innerWidth,AH=innerHeight;
const devO=()=>{const o=typeof window.orientation=='number'?window.orientation:(screen.orientation&&screen.orientation.angle)||0;return(o%360+360)%360};
function layout(){const W=innerWidth,H=innerHeight,land=W>H,o=devO();if(land)lastLand=o==270?270:90;
ROT=OLOCK=='land'&&!land?(lastLand==270?-90:90):OLOCK=='port'&&land?(o==90?-90:90):0;
// içeriğin üst/sağ/alt/sol kenarı ekranın hangi kenarına denk geliyor
const cs=getComputedStyle(probe),e=[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].map(v=>parseFloat(v)||0),m=ROT==90?[1,2,3,0]:ROT==-90?[3,0,1,2]:[0,1,2,3];
AW=ROT?H:W;AH=ROT?W:H;APP.classList.toggle('land',AW>AH);const st=APP.style;st.width=AW+'px';st.height=AH+'px';st.transform=ROT==90?`translate(${W}px,0) rotate(90deg)`:ROT==-90?`translate(0,${H}px) rotate(-90deg)`:'';
['--sat','--sar','--sab','--sal'].forEach((k,i)=>st.setProperty(k,e[m[i]]+'px'));st.setProperty('--aw',AW+'px');st.setProperty('--ah',AH+'px')}
// ekran koordinatını içerik koordinatına çevirir
const toApp=(x,y)=>ROT==90?[y,innerWidth-x]:ROT==-90?[innerHeight-y,x]:[x,y];
layout();
const $=s=>document.querySelector(s);
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=(a,b,v)=>{const t=cl((v-a)/(b-a),0,1);return t*t*(3-2*t)},ad=a=>((a+Math.PI)%6.2832+6.2832)%6.2832-Math.PI;
const L=3.2,VMAX=77.2,ACCEL=20,IZ=1.9;
// ti: lastik tablosunda hangi sütun (0 toprak, 1 asfalt). dr: ekstra sürtünme
const SURF=[{n:'Toprak',a:26,ti:0,dr:0},{n:'Asfalt',a:30,ti:1,dr:0},{n:'Çim',a:19,ti:0,dr:.5},{n:'Çamur',a:20,ti:0,dr:.9},{n:'Kar',a:16,ti:0,dr:.12},{n:'Derin kar',a:12,ti:0,dr:.8}];
const TIRES=[
{n:'Yarış',d:'Asfaltta en iyi, toprakta kayar',g:[.45,1.15],B:[6,10],C:[1.7,1.58],t:[.78,1.08]},
{n:'Toprak',d:'Toprakta tam tutuş, asfaltta yavaş',g:[1.25,.78],B:[4.5,7],C:[1.3,1.48],t:[1,.9]},
{n:'Karışık',d:'Dengeli, uçlarda zayıf',g:[.8,.97],B:[5.5,8.5],C:[1.45,1.52],t:[.9,.97]},
{n:'Drift',d:'Yanlamasına düşük tutuş, yumuşak ve uzun kayma; ileri yönde iyi çekiş',lg:[1.35,1.3],g:[.68,.76],B:[4.2,5.5],C:[1.22,1.28],t:[.9,.95]}];
const TUNE=[['pow','Motor gücü','Hızlanma',.6,1.5,.05],['top','Vites oranı','Yüksek: tepe hız artar, çıkış yavaşlar',.85,1.15,.01],
['brk','Fren gücü','',.6,1.4,.05],['bb','Fren dengesi (ön)','Düşük: arka erken kilitlenir, araç frende döner',.4,.8,.01],
['tpf','Ön lastik basıncı','Düşük: affedici, toprakta tutuş. Yüksek: keskin, erken kayar',.8,1.25,.01],['tpr','Arka lastik basıncı','Yüksek: arka kolay kayar (drift)',.8,1.25,.01],
['bal','Viraj dengesi','Düşük: arka gevşek, araç döner. Yüksek: stabil, önden kayar',.7,1.15,.01],['diff','Diferansiyel kilidi','Yüksek: gaz arkayı daha kolay kaydırır',.2,1.2,.05],
['lock','Direksiyon açısı','Yüksek: driftte daha fazla karşı direksiyon payı',.4,.8,.01],['sens','Direksiyon hassasiyeti','Düşük: yumuşak, yüksek: çabuk',.4,1.6,.05],
['susp','Süspansiyon yumuşaklığı','Yüksek: frende ve gazda ağırlık daha çok aktarılır',.4,1.6,.05],['aero','Aerodinamik bastırma','Yüksek hızda tutuş artar, tepe hız biraz düşer',0,2,.1],
['thr','Gaz tepkisi','Düşük: gaz yavaş açılır, araç ağır ve dengeli kalkar',.2,1,.05],['lch','Kalkış torku','Yüksek: kalkışta patinaj artar (özellikle toprakta)',0,1,.05]];
const AST=[['grip','Yol tutuş desteği','Tüm lastiklere ek tutuş',0,1,.05],['str','Viraj desteği','Araç direksiyonun gösterdiği çizgiye çekilir',0,1,.05],
['stm','Denge kontrolü','Savrulmayı söndürür (driftte devre dışı)',0,1,.05],['tcs','Çekiş kontrolü','Gazda patinajı ve istenmeyen arka kaymayı azaltır',0,1,.05],
['abs','ABS','Frende kilitlenmeyi ve arka savrulmayı önler',0,1,.05],['dft','Drift desteği','Seçtiğin drift açısını tutar. Açıyı abartırsan yine spin olur',0,1,.05],
['ini','Drift başlatma','Hızlıyken direksiyonu tam kırınca arka gevşer',0,1,.05],['acc','Güç desteği','',1,1.35,.01],['bra','Fren desteği','',1,1.35,.01]];
const LEVELS={arc:{n:'Arcade',d:'Tüm yardımlar açık',v:{grip:1,str:1,stm:.7,tcs:.8,abs:1,dft:.75,ini:1,acc:1.3,bra:1.35}},
norm:{n:'Dengeli',d:'Orta seviye yardım',v:{grip:.4,str:.4,stm:.4,tcs:.5,abs:1,dft:.55,ini:.5,acc:1.15,bra:1.15}},
real:{n:'Gerçekçi',d:'Minimum yardım, gerçek tutuş sınırı',v:{grip:0,str:0,stm:0,tcs:0,abs:0,dft:.4,ini:0,acc:1,bra:1}}};
const PRESETS={
ar:{n:'Asfalt yarışı',d:'Yarış lastiği, sıkı arka, yüksek bastırma',tire:0,cap:{ini:.3,dft:.5},v:{pow:1,top:1,brk:1.1,bb:.62,tpf:1,tpr:.97,bal:1.03,diff:.45,lock:.5,sens:.5,susp:.8,aero:1.3,thr:.6,lch:.35}},
tr:{n:'Toprak yarışı',d:'Toprak lastiği, düşük basınç, yumuşak süspansiyon',tire:1,cap:{ini:.4,dft:.7},v:{pow:1,top:.95,brk:.95,bb:.58,tpf:.9,tpr:.9,bal:.98,diff:.7,lock:.6,sens:.5,susp:1.15,aero:.6,thr:.55,lch:.6}},
fd:{n:'Serbest (toprak)',d:'Rahat, kaymaya izin veren toprak sürüşü',tire:1,v:{pow:1,top:1,brk:1,bb:.6,tpf:.9,tpr:.92,bal:1,diff:.8,lock:.55,sens:.5,susp:1,aero:.5,thr:.5,lch:.55}},
fa:{n:'Serbest (asfalt)',d:'Toprak hissini asfalta taşır: yumuşak lastik, affedici kayma',tire:2,v:{pow:1,top:1,brk:1,bb:.6,tpf:.85,tpr:.88,bal:1.02,diff:.6,lock:.55,sens:.5,susp:.95,aero:.8,thr:.55,lch:.4},ast:{ini:.5}},
rl:{n:'Ralli',d:'Toprak lastiği, uzun ve yumuşak süspansiyon, dengeli diferansiyel',tire:1,cap:{ini:.4},v:{pow:1,top:.97,brk:1,bb:.6,tpf:.88,tpr:.9,bal:1,diff:.6,lock:.62,sens:.5,susp:1.4,aero:.7,thr:.6,lch:.4}},
dg:{n:'Drag',d:'Yarış lastiği, sert arka, düz çizgi için ayar',tire:0,cap:{ini:0,dft:0},v:{pow:1,top:1.05,brk:1,bb:.62,tpf:1.1,tpr:.9,bal:1.1,diff:1,lock:.45,sens:.5,susp:1.3,aero:.4,thr:.7,lch:.7}},
dr:{n:'Drift',d:'Drift lastiği, kilitli diferansiyel, geniş direksiyon açısı',tire:3,v:{pow:1.15,top:.92,brk:.9,bb:.55,tpf:.95,tpr:1.18,bal:.92,diff:1.1,lock:.78,sens:.5,susp:1.2,aero:.4,thr:.8,lch:.3},ast:{ini:.8}}};
let PK='fd',LK='real',TU={},AS={},custom=false;
function applyPreset(){const p=PRESETS[PK];TU={...p.v};tire=p.tire;AS={...LEVELS[LK].v};if(p.ast)for(const k in p.ast)AS[k]=Math.max(AS[k],p.ast[k]);if(p.cap)for(const k in p.cap)AS[k]=Math.min(AS[k],p.cap[k]);custom=false}
const set={ss:1,sm:1,fov:1,shk:1,inv:0,tlt:38,ac:1,shd:1};let tire=1;
const TOG=[['inv','Direksiyon yönünü ters çevir','Sağ ve sol tuşlarının yönünü değiştirir'],['ss','Hıza duyarlı direksiyon','Hızlandıkça direksiyon açısı azalır'],['sm','Direksiyon yumuşatma','Tuşa basınca direksiyon kademeli döner'],['fov','Hıza göre görüş açısı','Hızlandıkça görüş genişler'],['shd','Gölgeler','Kapatmak eski telefonlarda akıcılığı artırır'],['shk','Hız sarsıntısı','Yüksek hızda kamera hafif titrer']];
