// Araçlar: 5 aracın modeli ve fizik değerleri (CARS), setCar, kokpit iç mekânı ve göstergeler
// ---------- araç
const car=new THREE.Group(),body=new THREE.Group();car.rotation.order='YXZ';car.add(body);
const bm=new THREE.MeshLambertMaterial({color:0xff7a3c}),dk=new THREE.MeshLambertMaterial({color:0x1b2328});
// ---------- araçlar: her yarış türü için kendi aracı. Gövde, yan profilin enine uzatılmasıyla kurulur
const lam=c=>new THREE.MeshLambertMaterial({color:c}),glassM=lam(0x18232d),glassQM=new THREE.MeshLambertMaterial({color:0x18232d,side:THREE.DoubleSide,transparent:true,opacity:1}),blackM=lam(0x15171a),lightM=new THREE.MeshBasicMaterial({color:0xfff4d6}),tailM=new THREE.MeshBasicMaterial({color:0xc81e28});
// yan profil (z ileri, y yukarı) → genişliği w olan gövde parçası
function prof(pts,w,m,bev){const sh=new THREE.Shape();pts.forEach(([z,y],i)=>i?sh.lineTo(z,y):sh.moveTo(z,y));const b=bev??.04;
const g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:1,steps:1});g.rotateY(-Math.PI/2);g.translate(w/2,0,0);g.computeVertexNormals();return new THREE.Mesh(g,m)}
// iki profil noktası arasında cam (ön/arka cam), dışa doğru hafifçe kaldırılmış
function glassQ(a,b,ww){const dz=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dz,dy),q=new THREE.Mesh(new THREE.PlaneGeometry(ww,l),glassQM);
q.rotation.x=Math.atan2(dz,dy);q.position.set(0,(a[1]+b[1])/2-dz/l*.05,(a[0]+b[0])/2+dy/l*.05);return q}
const bx=(w,h,d,x,y,z,m,rx)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(x,y,z);if(rx)q.rotation.x=rx;return q};
function decal(t,w,h,fg){const c=document.createElement('canvas');c.width=128;c.height=96;const x=c.getContext('2d');x.fillStyle=fg||'#fff';x.font='bold 80px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(t,64,52);
const tx=new THREE.CanvasTexture(c);return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}))}
function numbers(g,t,w,z,y,s,fg){for(const sd of[-1,1]){const d=decal(t,.75*s,.56*s,fg);d.position.set(sd*(w/2+.06),y,z);d.rotation.y=sd*Math.PI/2;g.add(d)}}
function mkWheel(r,wd,rimC){const g=new THREE.Group(),rm=lam(rimC);g.add(new THREE.Mesh(new THREE.CylinderGeometry(r,r,wd,18).rotateZ(Math.PI/2),blackM));
g.add(new THREE.Mesh(new THREE.CylinderGeometry(r*.64,r*.64,wd+.02,12).rotateZ(Math.PI/2),rm));const sp=bx(wd+.04,r*1.2,r*.16,0,0,0,rm);g.add(sp);const s2=sp.clone();s2.rotation.x=Math.PI/2;g.add(s2);return g}
// ortak gövde: profil + yan camlar + ön/arka cam + renk panelleri + farlar
function body0(d){const g=new THREE.Group(),m=lam(d.col),w=d.w;g.add(prof(d.p,w,m));g.add(prof(d.gh,w+.1,glassM,0));g.add(glassQ(d.ws[0],d.ws[1],w*.86),glassQ(d.rw[0],d.rw[1],w*.82));
for(const [pts,c] of d.pan||[]){const q=prof(pts,w+.1,lam(c),0);q.userData.pan=1;g.add(q)}const zf=Math.max(...d.p.map(p=>p[0])),zr=Math.min(...d.p.map(p=>p[0]));
for(const sd of[-1,1]){if(!d.rhl)g.add(bx(.36,.12,.06,sd*(w/2-.28),d.hl,zf+.02,lightM));g.add(bx(.34,.12,.06,sd*(w/2-.26),d.tl,zr-.02,tailM))}return g}
const CARS=[
{k:'gt',ty:'gp',a100:3.0,lat:3.31,b100:7,t90:.67,ic:'🧲',st:'Viraj tutuşu',n:'Kızıl Ok',d:'Ortadan motorlu pist arabası. Asfaltta yüksek tutuş, keskin yön değişimi.',pk:'ar',gr:[.88,1.15],trq:1.0,pw:1.2,top:1.1,awd:0,iz:.8,m:1.0,fb:1.08,rb:1.0,brk:1.25,ae:1.5,wk:.7,hp:480,kg:1240,
w:1.8,col:0xd01f26,hl:.62,tl:.72,p:[[-2.18,.3],[-2.22,.55],[-2.2,.86],[-2.0,.92],[-1.2,.98],[-.62,1.16],[.3,1.17],[1.1,.84],[2.05,.66],[2.22,.52],[2.2,.36],[2.05,.28]],
gh:[[-.6,.98],[-.5,1.12],[.26,1.13],[.98,.87]],ws:[[1.1,.84],[.3,1.17]],rw:[[-.62,1.16],[-1.2,.98]],
pan:[[[[-.62,1.1],[.3,1.11],[.3,1.24],[-.62,1.23]],0x111214],[[[-1.15,.55],[-.72,.86],[-.66,.55]],0x111214]],
wh:{r:.33,wd:.26,rim:0xc8ccd2,x:.8,zf:1.3,zr:-1.36},
ex:(g,d)=>{g.add(bx(1.72,.05,.2,0,.98,-2.04,blackM,-.15),bx(1.86,.06,.22,0,.3,2.12,blackM))}},
{k:'rx',ty:'rx',a100:2.3,lat:2.92,b100:12,t90:1.28,ic:'⚡',st:'Hızlanma',n:'Kor RX',d:'Dört çeker rallikros hatchback. Güçlü kalkış, toprakta çevik.',pk:'tr',gr:[1.12,1.0],trq:1.4,pw:1.0,top:.86,awd:.45,iz:.72,m:.92,fb:.98,rb:.94,brk:1.05,ae:.9,wk:1.0,hp:600,kg:1300,
w:1.84,col:0x1b2340,hl:.72,tl:.86,p:[[-1.98,.32],[-2.05,.55],[-2.02,.82],[-1.92,1.06],[-1.62,1.4],[.12,1.45],[1.0,1.0],[1.88,.86],[2.05,.66],[2.05,.42],[1.92,.3]],
gh:[[-1.56,1.08],[-1.5,1.36],[.08,1.4],[.86,1.04]],ws:[[1.0,1.0],[.12,1.45]],rw:[[-1.62,1.4],[-1.92,1.06]],
pan:[[[[.35,.34],[.35,.96],[.98,.98],[1.86,.84],[2.0,.6],[2.0,.34]],0xd42a2a],[[[-.55,.36],[-.2,.98],[.3,.98],[.3,.36]],0xf2c200],[[[-1.95,.34],[-1.95,.8],[-1.2,.8],[-1.0,.34]],0xd42a2a]],
wh:{r:.36,wd:.28,rim:0x222428,x:.86,zf:1.28,zr:-1.28},
ex:(g,d)=>{const r=lam(0x15171a);g.add(bx(1.74,.06,.46,0,1.58,-1.78,r,.2),bx(.05,.32,.5,-.85,1.48,-1.76,r),bx(.05,.32,.5,.85,1.48,-1.76,r),bx(1.96,.05,.3,0,.3,2.06,r));
for(const sd of[-1,1])for(const z of[1.28,-1.28])g.add(bx(.12,.16,.95,sd*(d.w/2+.05),.72,z,r));numbers(g,'71',d.w,-.05,.72,1,'#ffffff')}},
{k:'dr',ty:'dp',a100:3.3,lat:2.49,b100:15,t90:.93,ic:'🌀',st:'Drift',n:'Beyaz Kurt',d:'Geniş gövdeli arkadan itişli drift arabası. Kilitli diferansiyel, büyük kanat.',pk:'dr',gr:[.95,1.0],trq:1.05,pw:1.12,top:1.0,awd:0,iz:.78,m:.96,fb:1.08,rb:.86,brk:1.0,ae:1.0,wk:1.1,hp:450,kg:1250,
w:2.02,col:0xf0f0ec,hl:.62,tl:.74,p:[[-2.22,.24],[-2.3,.5],[-2.26,.82],[-2.1,.92],[-1.45,.95],[-1.0,1.24],[.2,1.26],[1.0,.92],[2.12,.77],[2.36,.56],[2.38,.32],[2.3,.2]],
gh:[[-.98,.97],[-.88,1.22],[.17,1.23],[.92,.94]],ws:[[1.0,.92],[.2,1.26]],rw:[[-1.0,1.24],[-1.45,.95]],
pan:[[[[-.15,.26],[-.15,.9],[.95,.9],[2.0,.74],[2.25,.52],[2.25,.26]],0xf2b81e],[[[-2.25,.3],[-2.25,.5],[-1.5,.5],[-1.4,.3]],0x15171a]],
wh:{r:.35,wd:.32,rim:0x18181a,x:.96,zf:1.35,zr:-1.32},
ex:(g,d)=>{const k=blackM,wm=lam(0xf0f0ec);g.add(bx(1.98,.05,.4,0,1.5,-1.98,k,.12),bx(.06,.52,.2,-.62,1.2,-1.92,k),bx(.06,.52,.2,.62,1.2,-1.92,k),bx(.06,.24,.5,-.99,1.52,-1.98,k),bx(.06,.24,.5,.99,1.52,-1.98,k));
g.add(bx(2.04,.04,.4,0,.2,2.32,k));numbers(g,'23',d.w,.35,.6,1.1,'#15171a')}},
{k:'rl',ty:'rl',a100:2.8,lat:2.83,b100:13,t90:1.25,ic:'⛰️',st:'Arazi',n:'Mavi Yıldız',d:'Dört çeker ralli sedanı. Uzun süspansiyon, toprak ve çamurda sağlam.',pk:'rl',gr:[1.18,.95],trq:1.2,pw:.98,top:.95,awd:.5,iz:1.05,m:1.05,fb:1.0,rb:1.02,brk:.95,ae:.8,wk:1.5,hp:330,kg:1230,
w:1.76,col:0x1d4fc4,hl:.7,tl:.84,lift:.06,p:[[-2.15,.36],[-2.25,.6],[-2.22,.9],[-2.1,.98],[-1.35,1.0],[-1.0,1.38],[.3,1.42],[1.08,.99],[2.0,.86],[2.22,.66],[2.22,.42],[2.08,.36]],
gh:[[-.98,1.03],[-.9,1.34],[.27,1.38],[.98,1.02]],ws:[[1.08,.99],[.3,1.42]],rw:[[-1.0,1.38],[-1.35,1.0]],
pan:[[[[-2.18,.46],[-1.2,.7],[.4,.62],[2.15,.66],[2.15,.5],[.4,.48],[-1.2,.56],[-2.18,.38]],0x9de03a]],
wh:{r:.35,wd:.25,rim:0xc9a227,x:.82,zf:1.36,zr:-1.32},
ex:(g,d)=>{const k=blackM,bm=lam(d.col);g.add(bx(1.62,.06,.36,0,1.34,-1.98,bm,.1),bx(.06,.34,.14,-.6,1.16,-1.98,k),bx(.06,.34,.14,.6,1.16,-1.98,k),bx(.5,.1,.5,0,.95,1.45,k));
for(const sd of[-1,1])for(const z of[1.36,-1.32])g.add(bx(.3,.36,.03,sd*.82,.42,z-.42,k));numbers(g,'5',d.w,-.4,.8,1,'#ffffff')}},
{k:'dg',ty:'dg',a100:2.2,lat:2.32,b100:23,t90:1.58,ic:'🚀',st:'Azami hız',n:'Gece Mavisi',d:'Kompresörlü klasik drag arabası. Çok güçlü, düz çizgide rakipsiz, virajda hantal.',pk:'dg',gr:[.8,.88],trq:2.0,pw:1.85,top:1.2,awd:0,iz:1.4,m:1.4,fb:.84,rb:.96,brk:.72,ae:.4,wk:1.3,hp:1100,kg:1550,
w:1.86,col:0x1d3a8c,hl:.72,tl:.8,p:[[-2.32,.4],[-2.36,.62],[-2.32,.88],[-2.2,.98],[-1.5,1.0],[-1.05,1.3],[.1,1.31],[.82,1.0],[2.2,.93],[2.36,.86],[2.38,.5],[2.3,.4]],
gh:[[-1.02,1.03],[-.94,1.27],[.07,1.28],[.78,1.02]],ws:[[.82,1.0],[.1,1.31]],rw:[[-1.05,1.3],[-1.5,1.0]],
rhl:1,wh:{r:.32,wd:.18,rim:0xd8dbe0,x:.8,zf:1.42,zr:-1.36,rr:.44,rwd:.42,rx:.84},
ex:(g,d)=>{const s=lam(0xc9ccd1),rd=lam(0xd8232a),wt=lam(0xf2f2f2);g.add(bx(.56,.28,.72,0,1.07,1.2,s));
for(const x of[-.19,0,.19]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.2,14).rotateX(Math.PI/2),rd);c.position.set(x,1.3,1.42);g.add(c)}
for(const x of[-.16,.16]){g.add(bx(.18,.02,1.42,x,.975,1.5,wt,-.05),bx(.18,.02,1.16,x,1.33,-.48,wt),bx(.18,.02,.7,x,1.01,-1.85,wt))}
g.add(bx(1.9,.14,.12,0,.5,2.4,s),bx(1.9,.14,.12,0,.46,-2.38,s));for(const sd of[-1,1]){const h=new THREE.Mesh(new THREE.CircleGeometry(.12,14),lightM);h.position.set(sd*.68,.72,2.39);g.add(h)}}}];
function buildCar(d){const g=body0(d);d.ex(g,d);g.position.y=d.lift||0;const W=d.wh,ws=[];
for(const [x,z,f] of[[-W.x,W.zf,1],[W.x,W.zf,1],[-(W.rx||W.x),W.zr,0],[W.rx||W.x,W.zr,0]]){const r=f?W.r:(W.rr||W.r),w=mkWheel(r,f?W.wd:(W.rwd||W.wd),W.rim),pv=new THREE.Group();w.userData.r=r;pv.position.set(x,r+(d.lift||0)*.5,z);pv.add(w);ws.push({pv,w,f})}
return{g,ws}}
let CAR=CARS[0],carM=null,steerP=[],wheels=[];
function setCar(i){CAR=CARS[i];if(carM){body.remove(carM.g);for(const w of carM.ws)car.remove(w.pv)}carM=buildCar(CAR);body.add(carM.g);for(const w of carM.ws)car.add(w.pv);carM.g.traverse(o=>{if(o.isMesh)o.castShadow=true});for(const w of carM.ws)w.w.traverse(o=>{if(o.isMesh)o.castShadow=true});
steerP=carM.ws.filter(w=>w.f).map(w=>w.pv);wheels=carM.ws.map(w=>w.w);bm.color.setHex(CAR.col);buildInterior(CAR);try{localStorage.setItem('lt_car',i)}catch(e){}}
car.add(headL,headL.target);scene.add(car);const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
// ---------- kokpit: her aracın kendi iç mekânı. Kaput ve araç üstü parçalar gerçek modelden görünür, ön cam şeffaflaşır
const cock=new THREE.Group();body.add(cock);cock.visible=false;
let swl=new THREE.Group(),ndS=null,ndR=null,EYE=[.4,1.3,-.2];
const beam=(a,b,m,t)=>{const A=V3(...a),B=V3(...b),d=B.clone().sub(A),q=new THREE.Mesh(new THREE.BoxGeometry(t,d.length(),t),m);q.position.copy(A).add(B).multiplyScalar(.5);q.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());return q};
// gösterge kadranı: ibre açısı φ(v) saat yönünde, sol alttan sağ alta
const dialA=f=>Math.PI*.75+cl(f,0,1)*Math.PI*1.5;
function dialTex(mx,step,lbl,red){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#0c0e11';x.beginPath();x.arc(128,128,126,0,7);x.fill();
x.strokeStyle='#5a6068';x.lineWidth=5;x.beginPath();x.arc(128,128,121,0,7);x.stroke();if(red){x.strokeStyle='#e0303a';x.lineWidth=10;x.beginPath();x.arc(128,128,108,dialA(red),dialA(1));x.stroke()}
x.fillStyle='#e8eaed';x.strokeStyle='#e8eaed';x.font='bold 24px sans-serif';x.textAlign='center';x.textBaseline='middle';
for(let v=0;v<=mx+1e-6;v+=step){const a=dialA(v/mx);x.lineWidth=3;x.beginPath();x.moveTo(128+Math.cos(a)*100,128+Math.sin(a)*100);x.lineTo(128+Math.cos(a)*116,128+Math.sin(a)*116);x.stroke();x.fillText(String(Math.round(v)),128+Math.cos(a)*78,128+Math.sin(a)*78)}
x.font='16px sans-serif';x.fillStyle='#9aa3ad';x.fillText(lbl,128,196);return new THREE.CanvasTexture(c)}
const intM={d:lam(0x23262b),p:lam(0x2f3338),l:lam(0x3c4046),k:lam(0x111316)};
function buildInterior(d){cock.clear();const M=intM,w=d.w,hw=w/2-.07,lf=d.lift||0,gh=d.gh,yb=(gh[0][1]+gh[3][1])/2+lf,yr=Math.max(...d.p.map(p=>p[1]))+lf,
zf=d.ws[0][0],zt=d.ws[1][0],zr=gh[1][0]-.15,fy=Math.min(...d.p.map(p=>p[1]))+lf+.08,ex=w*.21,ey=yr-.24,ez=zt-.4,mz=(zf+zr)/2,L=zf-zr,dt=Math.min(yb-.02,ey-.22);EYE=[ex,ey,ez];
// zemin ve kapı iç panelleri (yol ve tekerler alttan görünmesin)
cock.add(bx(2*hw,.04,L+.5,0,fy,mz,M.d));for(const sd of[-1,1])cock.add(bx(.06,yb-fy,L+.3,sd*hw,(yb+fy)/2,mz,M.p),bx(.13,.05,L*.6,sd*(hw-.06),yb-.14,mz-.1,M.l),bx(.04,.03,L*.5,sd*(hw-.02),yb-.3,mz,M.k));
// torpido ön camın dibine kadar, üstü bel çizgisinin hemen üstünde
cock.add(bx(2*hw,dt-fy,.75,0,(dt+fy)/2,zf-.18,M.d),bx(2*hw-.1,.03,.4,0,dt+.015,zf-.05,M.p));
// gösterge kutusu ve iki kadran (devir solda, hız sağda)
cock.add(bx(.34,.06,.16,ex,dt+.03,ez+.62,M.d));
const mkG=(x,mx,st,lbl,red)=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CircleGeometry(.052,28),new THREE.MeshBasicMaterial({map:dialTex(mx,st,lbl,red)})));
const pv=new THREE.Group();pv.position.z=.004;pv.add(bx(.044,.006,.003,.021,0,0,new THREE.MeshBasicMaterial({color:0xff5a1f})));g.add(pv);g.position.set(x,dt+.04,ez+.56);g.rotation.set(.7,Math.PI,0);cock.add(g);return pv};
ndR=mkG(ex+.06,8,1,'x1000 d/dk',.8);ndS=mkG(ex-.06,320,40,'km/sa');
// direksiyon: üç kollu, kolonuyla
swl=new THREE.Group();swl.add(new THREE.Mesh(new THREE.TorusGeometry(.17,.026,8,28),M.k));for(const a of[0,Math.PI,-Math.PI/2]){const sp=bx(.17,.04,.022,Math.cos(a)*.09,Math.sin(a)*.09,0,M.k);sp.rotation.z=a;swl.add(sp)}
swl.add(new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.05,14).rotateX(Math.PI/2),M.p),bx(.04,.02,.03,0,.19,-.01,new THREE.MeshBasicMaterial({color:0xff7a3c})));
const sg=new THREE.Group();sg.position.set(ex,ey-.36,ez+.46);sg.rotation.x=.5;sg.add(swl,bx(.07,.07,.5,0,0,.28,M.d));cock.add(sg);
// orta konsol, vites kolu, yolcu koltuğu
cock.add(bx(.3,.34,1.15,0,fy+.17,zf-.95,M.d));const sh=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.24,6),M.l);sh.position.set(0,fy+.44,zf-1.1);sh.rotation.x=-.3;cock.add(sh,bx(.06,.06,.06,0,fy+.56,zf-1.14,M.k));
cock.add(bx(.5,.14,.52,-ex,fy+.22,ez+.05,M.l),bx(.5,.72,.12,-ex,fy+.62,ez-.26,M.l,-.15),bx(.32,.2,.1,-ex,fy+1.05,ez-.3,M.l,-.15));
// tavan döşemesi, ön cam üst çerçevesi, iç dikiz aynası
const rl=new THREE.Mesh(new THREE.PlaneGeometry(2*hw,zt-zr+.4),new THREE.MeshLambertMaterial({color:0x3a3d43,side:THREE.DoubleSide}));rl.rotation.x=Math.PI/2;rl.position.set(0,yr-.07,(zt+zr)/2);cock.add(rl);
cock.add(bx(2*hw,.05,.1,0,yr-.065,zt-.02,M.d),bx(.025,.05,.025,0,yr-.1,zt-.06,M.k),bx(.22,.06,.025,0,yr-.15,zt-.07,M.k));
// direkler: A (ön cam kenarı) ve B (yan camın arkası)
for(const sd of[-1,1])cock.add(beam([sd*(hw-.03),d.ws[0][1]+lf,zf],[sd*(hw-.12),yr-.08,zt],M.d,.08),beam([sd*hw,yb,gh[1][0]+.06],[sd*(hw-.05),yr-.08,gh[1][0]],M.d,.1))}
// ibreler: hız ve sahte vitesli devir
const GEARS=[0,60,100,145,190,240,400];
let RPM=1,GEAR=1;const RPMB=$('#rpmb');RPMB.innerHTML='<i></i>'.repeat(16);
function rpmBar(){const n=Math.round(RPM/8*16);[...RPMB.children].forEach((e,k)=>e.className=k<n?(k>=13?'on r':k>=10?'on w':'on'):'')}
function engine(kmh,dt){let g=1;while(g<GEARS.length-1&&kmh>GEARS[g])g++;const lo=GEARS[g-1],hi=GEARS[g],tg=kmh<3?(.9+1.4*S.gas):1.6+5.8*cl((kmh-lo)/(hi-lo),0,1);GEAR=kmh<1&&I.b&&!I.g?0:g;RPM+=(tg-RPM)*Math.min(1,dt*(tg<RPM?3.2:9))}
function gauges(kmh){if(!ndS)return;ndS.rotation.z=-dialA(kmh/320);ndR.rotation.z=-dialA(RPM/8)}
