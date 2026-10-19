// Bölgeler: pist kurucusu (mkReg), REG, yarış listesi (TYP, EVENTS), Boş Otopark, açık dünya (WORLDS), zemin, mini harita
const dirtCol=i=>C3(i%6<3?0x8c6b45:0x86663f),mudMat=new THREE.MeshLambertMaterial({color:0x4a3524});
function gridNear(TR){const GRD={};for(let i=0;i<TR.N;i++){const q=Math.floor(TR.P[i][0]/30)+','+Math.floor(TR.P[i][1]/30);(GRD[q]||(GRD[q]=[])).push(i)}
return(x,z)=>{let bi=0,bd=1e18;const cx=Math.floor(x/30),cz=Math.floor(z/30);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=GRD[(cx+a)+','+(cz+b)];if(L)for(const i of L){const p=TR.P[i],q=(x-p[0])**2+(z-p[1])**2;if(q<bd){bd=q;bi=i}}}return[bi,Math.sqrt(bd)]}}
function mkReg(def,k){const c=[(k%4-1.5)*2600,3200+Math.floor(k/4)*2600],TR=mkTrack(off(recenter(def.p),c[0],c[1]),def.hw,def.t=='rl'||def.t=='dg'),R={...def,TR,c},hw=def.hw;
const bb=bbox(TR,0),ext=Math.max(bb[1]-bb[0],bb[3]-bb[2]);R.box=bbox(TR,150);
if(def.t=='dg'){R.col='#9aa3b5';return dragReg(R,TR,c)}R.col=def.t=='gp'||def.t=='dp'?'#9aa3b5':'#c9a06b';
if(def.t=='gp'||def.t=='dp'){kerbs(TR);R.kerb=1;const A=def.el||0,ep=def.ep||0,HK=Hkerb(TR),nG=gridNear(TR);
// pist çizgisi boyunca yükseklik (kapalı pistte başı sonuna bağlanır), çevre arazisi yarı yükseklikte ve bölge kenarında sıfıra iner
TR.hc=TR.S.map(q=>{const u=q/TR.len*6.2832;return A*(1+.6*Math.sin(u+ep)+.4*Math.sin(2*u+ep*1.7+1))/2});
const ed=(x,z)=>{const b=R.box;return sm(10,140,Math.min(x-b[0],b[1]-x,z-b[2],b[3]-z))};
// yükseklik iki pist noktası arasında doğrusal: basamak olmasın
const hAt=(x,z,i)=>{const P=TR.P[i],T=TR.T[i],pr=(x-P[0])*T[0]+(z-P[1])*T[1],j=(i+(pr>=0?1:-1)+TR.N)%TR.N,Q=TR.P[j],l=Math.hypot(Q[0]-P[0],Q[1]-P[1])||1;return TR.hc[i]+(TR.hc[j]-TR.hc[i])*cl(Math.abs(pr)/l,0,1)};
R.Hb=A?(x,z)=>{const [i,d]=nG(x,z),w=1-sm(hw+KW+2,hw+45,d);return hAt(x,z,i)*(.5+.5*w)*ed(x,z)}:null;
R.H=A?(x,z)=>R.Hb(x,z)+HK(x,z):HK;R.surf=(x,z)=>{const [i,d]=nearest(TR,x,z,ti);ti=i;return d<=hw+KW?1:2};
R.build=()=>{const t=thOf(def.th),b=R.box,cx=(b[0]+b[1])/2,cz=(b[2]+b[3])/2,sz=Math.max(b[1]-b[0],b[3]-b[2])+400;
if(A)terrain(sz,Math.min(360,Math.round(sz/4)),ctex(...t.gr,sz/12.5),cx,cz,(x,z)=>R.Hb(x,z)-.3*(1-sm(hw+KW,hw+KW+4,nG(x,z)[1])));
asphaltTrack(TR,R.Hb,t.asp);if(def.t=='gp')boards(TR,autoApex(TR));if(def.pr)PROPS[def.pr](R,TR,R.Hb);
if(!def.nf){forest(TR,Math.round((def.t=='gp'?260:240)*(def.fd||1)),hw+(def.pr=='mount'?6:20),1e9,ext+500,c[0],c[1]);if(def.t=='dp')edgeBush(TR,40,6,14)}};return R}
const J=mkJumps(TR,def.j.map(([q,f])=>[q,straightF(TR,f)])),MUD=def.m.map(f=>({...onTrack(TR,f),r:def.t=='rl'?9:15})),WAT=def.w.map((f,q)=>({...onTrack(TR,f,(q%2?1:-1)*(def.t=='rl'?1.5:3)),r:def.t=='rl'?4:6}));
const inMud=(x,z)=>MUD.some(m=>(x-m.x)**2+(z-m.z)**2<m.r*m.r);R.inMud=inMud;
const inAs=i=>(def.as||[]).some(([a,b])=>TR.S[i]>=a*TR.len&&TR.S[i]<=b*TR.len);
if(def.t=='rx'){R.H=(x,z)=>jumpH(J,x,z);R.surf=(x,z)=>{const [i,d]=nearest(TR,x,z,ti);ti=i;return d>hw+1?2:inMud(x,z)?3:inAs(i)?1:0};
R.build=()=>{const t=thOf(def.th),sz=ext+260;terrain(sz,Math.round(sz/3),ctex(...t.gr,sz/12.5),c[0],c[1]);ribbon(TR,-hw,hw,.15,i=>inAs(i)?C3(0x3a3f4a):dirtCol(i),(x,z)=>H(x,z));startLine(TR,.2);if(def.pr)PROPS[def.pr](R,TR,(x,z)=>H(x,z));
for(const m of MUD){const q=new THREE.Mesh(new THREE.CircleGeometry(m.r,28),mudMat);q.rotation.x=-Math.PI/2;q.position.set(m.x,H(m.x,m.z)+.22,m.z);add(q)}
for(const w of WAT)puddle(w.x,w.z,w.r);for(let i=0;i<TR.N;i+=8)for(const sd of[-1,1]){const P=TR.P[i],T=TR.T[i],o=sd*(hw+2.5);cone(P[0]+T[1]*o,P[1]-T[0]*o)}
forest(TR,Math.round(220*(def.fd||1)),hw+15,1e9,ext+300,c[0],c[1]);edgeBush(TR,70,3,9)};return R}
// ralli: yol enine düz kalsın diye merkez çizgisinin yüksekliğine yaslanır; dışarıda doğal tepeler
const half=ext/2+130,ph=[1+def.s*2.1,def.s*1.3,def.s*.7];R.box=[c[0]-half,c[0]+half,c[1]-half,c[1]+half];
const H0=(x,z)=>{const lx=x-c[0],lz=z-c[1];return(14*Math.sin(lx/85+ph[0])*Math.cos(lz/95+ph[1])+8*Math.sin((lx-lz)/60+ph[2])+6*Math.cos(lz/140+ph[0]))*(1-sm(half-80,half-10,Math.max(Math.abs(lx),Math.abs(lz))))};
const nearG=gridNear(TR);
R.H=(x,z)=>{const [i,d]=nearG(x,z),w=1-sm(hw+1,hw+9,d),P=TR.P[i],T=TR.T[i],s_=(x-P[0])*T[0]+(z-P[1])*T[1];return H0(x,z)*(1-w)+(w>0?H0(P[0]+T[0]*s_,P[1]+T[1]*s_)*w:0)+jumpH(J,x,z)};
R.surf=(x,z)=>{const [i,d]=nearest(TR,x,z,ti);ti=i;return d>hw+.8?(def.snow?5:2):inMud(x,z)?3:def.snow?4:0};
const col=i=>{if(i<2)return C3(0xffffff);if(i>=TR.N-4)return C3(i%2?0x111111:0xffffff);const P=TR.P[i];
for(const m of MUD)if(Math.hypot(P[0]-m.x,P[1]-m.z)<m.r)return C3(0x4a3524);for(const w of WAT)if(Math.hypot(P[0]-w.x,P[1]-w.z)<w.r)return C3(0x6d8fa8);return def.snow?C3(i%6<3?0x9aa6b0:0x939fa9):def.th=='desert'?C3(i%6<3?0x9c7a4c:0x947246):dirtCol(i)};
R.build=()=>{const t=thOf(def.th);terrain(2*half+800,400,ctex(...t.gr,(2*half+800)/12.5),c[0],c[1]);ribbon(TR,-hw,hw,.12,col,(x,z)=>H(x,z));
for(const w of WAT)puddle(w.x,w.z,w.r,true);if(def.pr)PROPS[def.pr](R,TR,null);
if(def.rocks){for(let k=0;k<260;k++){const i=Math.floor(rnd()*TR.N),o=(rnd()<.5?-1:1)*(hw+5+rnd()*70),q=atTrack(TR,i,o);if(clearOf(TR,q[0],q[1],hw+4))rock(q[0],q[1])}}else forest(TR,650,hw+4,hw+70,2*half-60,c[0],c[1]);edgeBush(TR,def.rocks?60:170,1.2,5)};return R}
const roadDist=()=>1e9;
const bbox=(TR,m)=>{let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of TR.P){a=Math.min(a,p[0]);b=Math.max(b,p[0]);c=Math.min(c,p[1]);d=Math.max(d,p[1])}return[a-m,b+m,c-m,d+m]};
const REG=TDEF.map(mkReg);
let CUR=null;
function regAt(x,z){for(const r of REG){const b=r.box;if(x>b[0]&&x<b[1]&&z>b[2]&&z<b[3])return r}return null}
const HUBB=[-880,880,-880,880],inHub=(x,z)=>Math.abs(x)<900&&Math.abs(z)<900;
function Hw(x,z){const r=regAt(x,z);if(r)return r.H(x,z);return inHub(x,z)?Htest(x,z):0}
function surfW(x,z){CUR=regAt(x,z);if(CUR)return CUR.surf(x,z);return inHub(x,z)?surfTest(x,z):2}
// yarışlar: hedef süre, pist uzunluğundan ve ilk pistlerin ayarlı hızından hesaplanır
const TYP={gp:{k:'asphalt',pk:'ar',laps:3,v:35.3,n:'Asfalt yarışları',d:'3 tur. Fren tabelalarını kullan, hedef süreyi geç.'},
rx:{k:'dirt',pk:'tr',laps:3,v:28.5,n:'Toprak yarışları',d:'3 tur: çamur, su ve rampalar. Hedef süreyi geç.'},
dp:{k:'drift',pk:'dr',time:90,n:'Drift yarışmaları',d:'90 saniye puan topla. Drift uzadıkça çarpan x5’e çıkar; çime çıkmak, çarpmak ya da spin komboyu yakar. Drift ayarları otomatik gelir.'},
rl:{k:'rally',pk:'rl',v:12.2,n:'Ralli etapları',d:'Orman yolunda A’dan B’ye. Hedef süreyi geç.'},
dg:{k:'drag',pk:'dg',n:'Drag yarışları',d:'Düz çizgide en kısa süre. Işıklar yeşile dönünce gaz. Kalkışta patinajı iyi ayarla.'}};
const EVENTS=REG.map((r,i)=>{const y=TYP[r.t],no=REG.filter((q,j)=>j<=i&&q.t==r.t).length;
return{k:y.k+(no>1?no:''),ty:r.t,n:r.n,d:r.d,reg:i,pk:y.pk,laps:y.laps,time:y.time,limit:r.tg||(y.v?Math.round(r.TR.len*(y.laps||1)/y.v/5)*5:0)}});
const gate=e=>{const TR=REG[e.reg].TR;return tp(TR,e.n,e.ty=='dg'?1:TR.open?4:TR.N,TR.open?0:6)};
EVENTS.forEach(e=>e.g=gate(e));
const TELEW=[['Merkez',0,-90,Math.PI/2],['Düz yol',SX,-780,0],['Zıplama rampası',-250,-175,0],['Tırmanış yolu',-40,60,0]];
// ---------- açık dünya: Boş Otopark (AVM önünde geniş açık otopark)
function textTex(t,w,h,bg,fg){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.font=`bold ${Math.round(h*.62)}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(t,w/2,h/2+2);return new THREE.CanvasTexture(c)}
function mkPark(){const c=[0,-3400],X=c[0],Z=c[1],L=[-260,260,-170,165],R={t:'park',n:'Boş Otopark',c,col:'#9aa3b5',box:[X-340,X+340,Z-250,Z+330]};
const inLot=(x,z)=>x>X+L[0]&&x<X+L[1]&&z>Z+L[2]&&z<Z+L[3];R.H=()=>0;R.surf=(x,z)=>inLot(x,z)?1:2;
// park sıraları: her sıra karşılıklı iki dizi park yeri; doğu yarısı boş, test için açık alan
const ROWS=[-140,-105,-70,-35,0,35,70,105],S0=-245,SW=2.7,SD=5.5,NS=80;
R.tele=[['Açık alan',X+120,Z-20,-Math.PI/2],['Park sıraları',X-10,Z-122,-Math.PI/2],['AVM önü',X+200,Z+140,-Math.PI/2]];
R.build=()=>{plane(L[1]-L[0],L[3]-L[2],X+(L[0]+L[1])/2,Z+(L[2]+L[3])/2,0x3c4049,.05);plane(440,13,X,Z+158.5,0x9a9a94,.07);
const lines=[];for(const r of ROWS){for(let k=0;k<=NS;k++)lines.push([X+S0+k*SW,Z+r,.15,2*SD]);lines.push([X+S0+NS*SW/2,Z+r,NS*SW,.15])}
for(const z of[L[2]+3,L[3]-17])lines.push([X,Z+z,L[1]-L[0]-6,.2]);for(const x of[L[0]+3,L[1]-3])lines.push([X+x,Z+(L[2]+L[3]-14)/2,.2,L[3]-L[2]-20]);
const m4=new THREE.Matrix4(),li=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xf0f0ea}),lines.length);li.frustumCulled=false;
lines.forEach((l,i)=>{m4.makeScale(l[2],1,l[3]);m4.setPosition(l[0],.08,l[1]);li.setMatrixAt(i,m4)});add(li);
// park etmiş arabalar
const pc=[];for(const r of ROWS)for(const sd of[-1,1])for(let k=0;k<NS;k++)if(rnd()<.03)pc.push([X+S0+(k+.5)*SW,Z+r+sd*(SD/2+.2)]);
if(pc.length){const cb=new THREE.InstancedMesh(new THREE.BoxGeometry(1.9,.75,4.3),new THREE.MeshLambertMaterial(),pc.length),cc=new THREE.InstancedMesh(new THREE.BoxGeometry(1.6,.55,2.1),dk,pc.length);
cb.frustumCulled=cc.frustumCulled=false;const PAL=[0xd8323a,0x2f6fd6,0xe8e8e8,0x2a2a2a,0x8a8f96,0x2f8a4a,0xe0b22a];
pc.forEach(([x,z],i)=>{m4.makeTranslation(x,.72,z);cb.setMatrixAt(i,m4);cb.setColorAt(i,C3(PAL[i%PAL.length]));m4.makeTranslation(x,1.36,z);cc.setMatrixAt(i,m4);colAdd({t:'box',x,z,hx:.95,hz:2.15})});add(cb,cc)}
// AVM binası, cam cephe, giriş saçağı ve tabela
const box=(w,h,d,x,y,z,col)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));m.position.set(x,y,z);add(m)};
box(440,24,100,X,12,Z+215,0xd8d2c4);box(400,7,.6,X,5,Z+164.8,0x35556e);box(50,.8,10,X,7,Z+160,0xff7a3c);box(440,2,1,X,24.5,Z+165,0xbdb6a6);
const sg=new THREE.Mesh(new THREE.PlaneGeometry(110,13),new THREE.MeshBasicMaterial({map:textTex('LAST TURN AVM',1024,120,'#1d3b44','#ff7a3c')}));sg.position.set(X,17,Z+164.4);sg.rotation.y=Math.PI;add(sg);
colAdd({t:'box',x:X,z:Z+215,hx:220,hz:50});
// aydınlatma direkleri sıra sonlarında
const pm=new THREE.MeshLambertMaterial({color:0x777b80});for(const r of ROWS){const x=X+S0+NS*SW+8,z=Z+r;const p=new THREE.Mesh(new THREE.CylinderGeometry(.15,.22,9,8),pm);p.position.set(x,4.5,z);
const l=new THREE.Mesh(new THREE.BoxGeometry(1.4,.3,.6),pm);l.position.set(x,9,z);add(p,l);colAdd({x,z,r:.3,t:'solid'})}
// çevrede ağaç sırası
for(let x=L[0]-10;x<=L[1]+10;x+=16)tree(X+x,Z+L[2]-14);for(let z=L[2];z<=L[3]+90;z+=16){tree(X+L[0]-14,Z+z);tree(X+L[1]+14,Z+z)}};
R.mm=x=>{const a=mmP(X+L[0],Z+L[2]),b=mmP(X+L[1],Z+L[3]);x.fillStyle='#4a4f59';x.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);const m1=mmP(X-220,Z+165),m2=mmP(X+220,Z+265);x.fillStyle='#d8d2c4';x.fillRect(m1[0],m1[1],m2[0]-m1[0],m2[1]-m1[1]);
x.strokeStyle='#e8e8e8';x.lineWidth=1.5;for(const r of ROWS){const p=mmP(X+S0,Z+r-SD),q=mmP(X+S0+NS*SW,Z+r+SD);x.strokeRect(p[0],p[1],q[0]-p[0],q[1]-p[1])}};return R}
const PARK=mkPark();REG.push(PARK);
const WORLDS=[{n:'Çorak Topraklar',d:'Toprak arazi: asfalt oval, uzun düz yol, zıplama rampası ve tırmanış yolu.',reg:null,tele:TELEW,box:HUBB},
{n:'Boş Otopark',d:'AVM önünde geniş açık otopark: park sıraları, park etmiş arabalar ve boş asfalt alan. Asfalt testleri için.',reg:PARK,tele:PARK.tele,box:PARK.box}];
let CURW=WORLDS[0];
// zemin çimi araçla birlikte kayar (doku adımına oturtulur), böylece her bölgenin altında çim olur
const GT=12.5,ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshLambertMaterial({map:ctex('#3f7a3a','#376d33','#4a8743',240)}));ground.rotation.x=-Math.PI/2;ground.position.y=-.2;ground.receiveShadow=true;scene.add(ground);
function buildWorld(){buildTest()}
const WORLD={H:Hw,surf:surfW,TR:null,tele:TELEW,build:buildWorld};
function loadWorld(){MAP=WORLD;H=Hw;surf=surfW;ti=0;if(!MAP.g){G=new THREE.Group();COLS={};instStart();MAP.build();instEnd();MAP.cols=COLS;COLS=null;shadowize(G);scene.add(G);MAP.g=G}}
function ensureBuilt(r){if(r.g)return;G=new THREE.Group();COLS=MAP.cols;instStart();r.build();instEnd();COLS=null;shadowize(G);scene.add(G);r.g=G}
// yalnız kullanılan bölge çizilir
function setActive(r){applyEnv(r&&r.th||'day');if(r)ensureBuilt(r);ground.visible=!(r&&r.t=='rl');MAP.g.visible=!r;for(const q of REG)if(q.g)q.g.visible=q===r;mmDraw(r)}
// mini harita: serbest sürüşte test alanı, yarışta o pist
const mmBase=document.createElement('canvas');mmBase.width=mmBase.height=240;let MMV={cx:0,cz:0,r:900};
const mmP=(a,c)=>[120+(a-MMV.cx)/MMV.r*112,120+(c-MMV.cz)/MMV.r*112];
function mmDraw(r){const x=mmBase.getContext('2d');x.clearRect(0,0,240,240);
if(r&&r.mm){const b=r.box;MMV={cx:(b[0]+b[1])/2,cz:(b[2]+b[3])/2,r:Math.max(b[1]-b[0],b[3]-b[2])/2-20};r.mm(x)}
else if(r){const b=r.box;MMV={cx:(b[0]+b[1])/2,cz:(b[2]+b[3])/2,r:Math.max(b[1]-b[0],b[3]-b[2])/2-100};const TR=r.TR;x.strokeStyle=r.col;x.lineWidth=6;x.lineJoin='round';x.beginPath();
TR.P.forEach((p,i)=>{const q=mmP(p[0],p[1]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])});if(!TR.open)x.closePath();x.stroke();
const s=mmP(TR.P[0][0],TR.P[0][1]);x.fillStyle='#fff';x.fillRect(s[0]-5,s[1]-5,10,10);if(TR.open){const e=mmP(TR.P[TR.N-1][0],TR.P[TR.N-1][1]);x.fillStyle='#ff7a3c';x.fillRect(e[0]-5,e[1]-5,10,10)}}
else{MMV={cx:0,cz:0,r:900};const h=mmP(-900,-900),e=mmP(900,900);x.fillStyle='rgba(140,107,69,.55)';x.fillRect(h[0],h[1],e[0]-h[0],e[1]-h[1]);x.strokeStyle='#9aa3b5';x.lineWidth=4;
const o=mmP(0,0);x.beginPath();x.ellipse(o[0],o[1],EA/MMV.r*112,EB/MMV.r*112,0,0,7);x.stroke();const a=mmP(SX,-800),b=mmP(SX,800);x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke()}}
