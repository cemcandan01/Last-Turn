// Yarış pistleri: TDEF (15 pistin tanımı), drag pisti, temalar (TH), dekorlar (PROPS)
// ---------- yarış pistleri: her yarış türü için 3 pist. Her pist dünyada kendi bölgesinde durur ve menüden seçilince kurulur
const TDEF=[
{t:'gp',n:'Grand Prix',th:'day',el:16,ep:.4,pr:'gp',d:'Tribünler, lastik bariyerler, tepeli bir klasik pist.',hw:10,p:[[0,-300],[0,-100],[0,250],[20,330],[80,360],[140,330],[160,250],[170,150],[230,100],[290,140],[350,100],[380,0],[360,-120],[300,-200],[200,-180],[150,-260],[180,-380],[150,-480],[60,-520],[0,-450]]},
{t:'gp',n:'Kıyı Pisti',th:'coast',el:10,ep:2.1,pr:'coast',d:'Gün batımında deniz kıyısı, geniş ve hızlı, inişli çıkışlı.',hw:12,p:[[0,-320],[0,-200],[0,0],[0,200],[30,290],[120,320],[200,270],[210,170],[280,110],[380,140],[450,80],[450,-100],[390,-190],[290,-170],[220,-250],[160,-370],[70,-410],[20,-380]]},
{t:'gp',n:'Şehir Pisti',th:'city',pr:'city',nf:1,d:'Gece, gökdelenler arasında beton duvarlı dar sokaklar. Hata affetmez.',hw:8,p:[[0,-200],[0,100],[0,175],[15,215],[55,230],[130,230],[160,215],[170,185],[170,130],[180,100],[210,90],[290,90],[320,75],[330,45],[330,-130],[320,-160],[290,-170],[230,-170],[200,-185],[190,-215],[190,-265],[175,-292],[145,-300],[45,-300],[15,-288],[0,-260]]},
{t:'rx',n:'Çamur Vadisi',th:'day',d:'Çamur, su birikintileri ve dört rampa.',hw:11,p:[[0,-250],[0,-50],[30,80],[110,130],[200,90],[230,0],[190,-80],[120,-90],[90,-160],[140,-240],[230,-260],[280,-330],[220,-400],[100,-410],[20,-350]],j:[['table',.07],['bump',.6],['bump',.64],['kick',.83]],m:[.25,.43,.72],w:[.15,.52,.93]},
{t:'rx',n:'Taş Ocağı',th:'quarry',pr:'quarry',as:[[0,.2],[.55,.72]],fd:.3,d:'Gri taş ocağı, dev kayalar. Asfalt ve toprak karışık zemin.',hw:11,p:[[0,-200],[0,40],[50,130],[170,150],[260,80],[220,-10],[150,-40],[180,-120],[280,-150],[290,-250],[180,-300],[60,-280]],j:[['table',.1],['bump',.45],['kick',.75]],m:[.3,.6],w:[.2,.85]},
{t:'rx',n:'Orman Kros',th:'mist',fd:2.2,d:'Sisli sık orman, bol çamur, ritimli tümsekler.',hw:11,p:[[0,-150],[0,120],[80,200],[200,190],[240,100],[170,40],[180,-50],[290,-80],[320,-190],[230,-280],[100,-260],[40,-220]],j:[['kick',.12],['bump',.5],['bump',.54],['table',.8]],m:[.35,.65,.9],w:[.25,.7]},
{t:'dp',n:'Drift Parkı',th:'day',el:6,ep:3,d:'Geniş ve akıcı, uzun drift zincirleri.',hw:16,p:[[0,-250],[0,0],[50,150],[180,220],[320,170],[360,30],[290,-70],[340,-200],[260,-330],[110,-360],[30,-320]]},
{t:'dp',n:'Liman',th:'port',pr:'port',nf:1,d:'Akşam limanı: konteyner yığınları ve vinçler arasında.',hw:13,p:[[0,-200],[0,120],[90,240],[240,250],[330,150],[260,40],[300,-60],[420,-90],[460,-220],[350,-320],[180,-290],[80,-330]]},
{t:'dp',n:'Dağ Yolu',th:'mount',el:60,ep:1.2,pr:'mount',fd:1.6,d:'Dağ yamacında bariyerli yol, büyük iniş ve çıkışlar.',hw:12,p:[[0,-160],[0,140],[110,260],[260,250],[340,140],[300,10],[400,-80],[330,-230],[170,-210],[110,-310],[30,-290]]},
{t:'rl',n:'Orman Etabı',th:'day',d:'Firketeler, tırmanış ve iniş, rampalar.',hw:5.5,s:0,p:[[-200,-400],[-200,-300],[-160,-220],[-80,-200],[-50,-130],[-110,-80],[-170,-20],[-140,60],[-40,80],[30,30],[100,70],[90,170],[0,220],[-80,280],[-50,360],[60,380],[140,330],[200,400]],j:[['kick',.22],['table',.5],['bump',.68],['kick',.86]],m:[.3,.6,.78],w:[.12,.41,.72,.93]},
{t:'rl',n:'Tepe Etabı',th:'snow',snow:1,d:'Karlı tepe yolu: kaygan zemin, büyük bir atlama.',hw:5.5,s:1,p:[[0,-420],[30,-320],[110,-280],[160,-200],[110,-120],[20,-80],[-60,-10],[-50,90],[50,130],[140,90],[230,150],[210,250],[110,290],[60,370],[150,440],[260,420]],j:[['table',.2],['kick',.55],['bump',.8]],m:[.35,.7],w:[.15,.5,.9]},
{t:'rl',n:'Vadi Etabı',th:'desert',pr:'desert',rocks:1,d:'Çöl vadisi: kum, kayalar, sıcak pus.',hw:5.5,s:2,p:[[-400,0],[-300,40],[-240,-40],[-150,-90],[-60,-40],[-70,60],[-10,150],[90,140],[130,40],[230,10],[300,90],[260,190],[330,270],[440,240],[480,140]],j:[['kick',.3],['bump',.45],['table',.75]],m:[.2,.55,.85],w:[.1,.4,.65,.95]},
{t:'dg',n:'Sekizde Bir Mil',d:'201 metre. Kalkış her şey.',hw:6,p:[[0,0],[0,201]],tg:7.0},
{t:'dg',n:'Çeyrek Mil',d:'402 metre, klasik drag mesafesi.',hw:6,p:[[0,0],[0,402]],tg:10.6},
{t:'dg',n:'Yarım Mil',d:'805 metre. Azami hız da önemli.',hw:6,p:[[0,0],[0,805]],tg:17.0}];
function recenter(p){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const [x,z] of p){a=Math.min(a,x);b=Math.max(b,x);c=Math.min(c,z);d=Math.max(d,z)}return p.map(([x,z])=>[x-(a+b)/2,z-(c+d)/2])}
function turnAt(TR,i,k){const g=j=>TR.open?cl(j,0,TR.N-1):(j+TR.N)%TR.N,a=TR.T[g(i-k)],b=TR.T[g(i+k)];return Math.abs(Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]))}
// rampaları düzlüğe kaydır: verilen konumun ±100 m çevresindeki en düz nokta
function straightF(TR,f){const i0=idxAt(TR,f);let bj=i0,bt=1e9;for(let j=i0-25;j<=i0+25;j++){const i=TR.open?cl(j,8,TR.N-9):(j+TR.N)%TR.N,t=turnAt(TR,i,6);if(t<bt){bt=t;bj=i}}return TR.S[bj]/TR.len}
// fren tabelaları: önünde en az 110 m düzlük olan virajlar
function autoApex(TR){const r=[];for(let i=0;i<TR.N;i++){if(!(turnAt(TR,i,5)>.3&&turnAt(TR,(i-1+TR.N)%TR.N,5)<=.3))continue;let j=i,d=0,n=0;while(n++<15&&turnAt(TR,j,5)>.12)j=(j-1+TR.N)%TR.N;
while(d<400){const k=(j-1+TR.N)%TR.N;if(turnAt(TR,k,5)>.2)break;d+=Math.hypot(TR.P[j][0]-TR.P[k][0],TR.P[j][1]-TR.P[k][1]);j=k}if(d>=110)r.push(i)}return r}
function boards(TR,apex){const tx={150:numTex('150'),100:numTex('100'),50:numTex('50')},post=new THREE.MeshLambertMaterial({color:0x666666});
for(const ap of apex)for(const dd of[150,100,50]){let i=ap,d=0;while(d<dd+40){const j=(i-1+TR.N)%TR.N;d+=Math.hypot(TR.P[i][0]-TR.P[j][0],TR.P[i][1]-TR.P[j][1]);i=j}
const P=TR.P[i],T=TR.T[i],o=TR.hw+5,x=P[0]+T[1]*o,z=P[1]-T[0]*o,b=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),new THREE.MeshBasicMaterial({map:tx[dd],side:THREE.DoubleSide}));
const gy=H(x,z);b.position.set(x,gy+2.6,z);b.rotation.y=Math.atan2(-T[0],-T[1]);const pst=new THREE.Mesh(new THREE.BoxGeometry(.2,1.6,.2),post);pst.position.set(x,gy+.8,z);add(b,pst);colAdd({x,z,r:.3,t:'solid'})}}
// drag: düz pist, iki şerit, ışıklı başlangıç ağacı, bitiş takı, beton duvarlar
function dragReg(R,TR,c){const z0=TR.P[0][1],z1=TR.P[TR.N-1][1],x=c[0],za=z0-60,zb=z1+380,mz=(za+zb)/2,ln=zb-za;
R.box=[x-120,x+140,za-40,zb+40];R.H=()=>0;R.surf=(px,pz)=>{ti=nearest(TR,px,pz,ti)[0];return px>x-7&&px<x+19&&pz>za&&pz<zb?1:2};
R.build=()=>{plane(26,ln,x+6,mz,0x34383f,.05);plane(.25,ln,x+6,mz,0xf0f0ea,.07);for(const sx of[-6.5,18.5])plane(.25,ln,x+sx,mz,0xf0f0ea,.07);
plane(12,.6,x,z0,0xffffff,.08);plane(12,.6,x+12,z0,0xffffff,.08);for(let k=0;k<10;k++)plane(2.6,1.3,x-5.7+k*2.6,z1,k%2?0x111111:0xffffff,.08),plane(2.6,1.3,x-5.7+k*2.6,z1+1.3,k%2?0xffffff:0x111111,.08);
const cm=lam(0xb9b6ad);for(const wx of[x-7.6,x+19.6]){const wl=new THREE.Mesh(new THREE.BoxGeometry(.6,1.1,ln),cm);wl.position.set(wx,.55,mz);add(wl);colAdd({t:'box',x:wx,z:mz,hx:.3,hz:ln/2})}
const tx={};for(let d=100;d<z1-z0;d+=100){tx[d]=tx[d]||numTex(String(d));const b=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({map:tx[d],side:THREE.DoubleSide}));b.position.set(x-8.2,2.2,z0+d);b.rotation.y=Math.PI;add(b)}
// başlangıç ağacı: üç sarı, bir yeşil ışık
const tm=lam(0x222428);add(bx(.25,2.6,.25,x+6,1.3,z0+7,tm),bx(.8,1.9,.25,x+6,2.4,z0+7,tm));R.lt=[];
for(let k=0;k<4;k++){const m=new THREE.MeshBasicMaterial({color:0x332a10}),q=new THREE.Mesh(new THREE.CircleGeometry(.17,14),m);q.position.set(x+6,3.0-k*.42,z0+6.86);q.rotation.y=Math.PI;add(q);R.lt.push(m)}
const gm=lam(0x2a2d33);add(bx(.5,7.5,.5,x-8.5,3.75,z1,gm),bx(.5,7.5,.5,x+20.5,3.75,z1,gm),bx(29.5,1.2,.6,x+6,7.6,z1,gm));
const sg=new THREE.Mesh(new THREE.PlaneGeometry(14,1.1),new THREE.MeshBasicMaterial({map:textTex('FİNİŞ',512,40,'#2a2d33','#ff7a3c'),side:THREE.DoubleSide}));sg.position.set(x+6,7.6,z1-.32);add(sg);
const st=lam(0x8d9096);for(let k=0;k<4;k++)add(bx(4,1+k*1.1,(z1-z0)*.6,x-12-k*3,(1+k*1.1)/2,z0+(z1-z0)*.3,st));
for(let zz=za;zz<zb;zz+=18){tree(x-30,zz);tree(x+34,zz)}};
R.tick=e=>{const on=e.state=='count'?Math.min(3,Math.floor(3.4-e.cd)):e.state=='run'?4:0;R.lt.forEach((m,k)=>m.color.setHex(k<3?(on>k&&on<4?0xffc21a:0x332a10):(on==4?0x2bd34a:0x0f2a14)))};return R}
// ---------- pist temaları: gökyüzü, sis, ışık, zemin ve bitki renkleri. Yalnız etkin bölgenin teması uygulanır
const TH0={sky:0x9fd0e8,fog:[140,900],hemi:[0xffffff,0x7a6a50,.8],sun:[0xfff1d6,.9],gr:['#3f7a3a','#376d33','#4a8743'],leaf:0x2f6b3a,trunk:0x5b4430,rock:0x8a8a86,bush:0x3f7d33,asp:0x3a3f4a};
const TH={day:{},
coast:{sky:0xf2b27c,fog:[170,950],hemi:[0xffe2c4,0x8a7055,.68],sun:[0xffb070,.9],gr:['#cfb17a','#c3a46e','#d9bc88'],leaf:0x5a9a40,bush:0x6a9a48,water:0x2f7fa8},
city:{sky:0x0b1428,fog:[50,480],hemi:[0x6a7aa8,0x15151c,.36],sun:[0x8899cc,.22],gr:['#2c3036','#262a2f','#33373d'],leaf:0x1d3a2a,night:1,asp:0x2e3138},
quarry:{sky:0xd9b48a,fog:[80,620],hemi:[0xfff0dc,0x8a7a66,.8],sun:[0xffe0b0,.95],gr:['#8d8a84','#7f7c76','#9b9890'],leaf:0x6b7a4a,rock:0x9b968c,bush:0x7a7a5a},
mist:{sky:0xa9b9a8,fog:[25,280],hemi:[0xdde8dd,0x4a5a44,.72],sun:[0xe8f0e8,.45],gr:['#3c6634','#345c2e','#46703c'],leaf:0x1f4a28},
port:{sky:0xd88a6a,fog:[120,800],hemi:[0xffd2b8,0x5a4a50,.72],sun:[0xff9a6a,.9],gr:['#5a5d62','#525559','#63666b'],water:0x3a6f8a},
mount:{sky:0xf0a878,fog:[120,850],hemi:[0xffe0c8,0x5a5040,.76],sun:[0xffa060,.95],gr:['#4a6a3a','#425f33','#557545'],leaf:0x1f4a2a},
snow:{sky:0xb9cfe0,fog:[55,520],hemi:[0xe8eef4,0x8a96a0,.55],sun:[0xf4f8ff,.45],gr:['#d9e1e7','#cdd6dd','#e4eaee'],leaf:0x4f7562,trunk:0x4a3a2c,rock:0x8f989e,bush:0x6a8a78},
desert:{sky:0xe6c896,fog:[120,820],hemi:[0xfff0d8,0x8a6a48,.62],sun:[0xfff0c8,.8],gr:['#c9a46c','#bd9862','#d3b078'],leaf:0x7a8a4a,rock:0xb08a60,bush:0x8a8a50}};
const thOf=k=>({...TH0,...(TH[k]||{})}),gTex={};
// gece farları: araca bağlı spot ışık, yalnız gece pistlerinde yanar
const headL=new THREE.SpotLight(0xfff2d0,0,90,.55,.45,1.1);headL.position.set(0,1,1.8);headL.target.position.set(0,0,22);
function applyTheme(k){const t=thOf(k);scene.background.setHex(t.sky);scene.fog.color.setHex(t.sky);scene.fog.near=t.fog[0];scene.fog.far=t.fog[1];
hemi.color.setHex(t.hemi[0]);hemi.groundColor.setHex(t.hemi[1]);hemi.intensity=t.hemi[2];sun.color.setHex(t.sun[0]);sun.intensity=t.sun[1];
ground.material.map=gTex[k]||(gTex[k]=ctex(...t.gr,240));ground.material.needsUpdate=true;mT.color.setHex(t.leaf);mK.color.setHex(t.trunk);mR.color.setHex(t.rock);mB.color.setHex(t.bush);headL.intensity=t.night?2.4:0}
// ---------- dekor yardımcıları
const angT=T=>Math.atan2(T[0],T[1]);
const atTrack=(TR,i,o)=>{const P=TR.P[i],T=TR.T[i];return[P[0]+T[1]*o,P[1]-T[0]*o]};
// pistin her yerinden en az m uzakta mı (dönüşlerde karşı kola taşmasın)
const clearOf=(TR,x,z,m)=>nearest(TR,x,z,0,true)[1]>m;
// dikey şerit (duvar, bariyer): pist kenarından o uzaklıkta, h yüksekliğinde
function wallRib(TR,o,h,col,hb,y0,colEvery){const pos=[],N=TR.N,M=TR.open?N-1:N;for(let i=0;i<M;i++){const j=(i+1)%N,a=atTrack(TR,i,o),b=atTrack(TR,j,o),ya=(hb?hb(a[0],a[1]):0)+(y0||0),yb=(hb?hb(b[0],b[1]):0)+(y0||0);
pos.push(a[0],ya,a[1],b[0],yb,b[1],a[0],ya+h,a[1],b[0],yb,b[1],b[0],yb+h,b[1],a[0],ya+h,a[1]);if(colEvery&&i%colEvery==0){const q=atTrack(TR,i,o+Math.sign(o)*.9);colAdd({x:q[0],z:q[1],r:1,t:'solid'})}}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:col,side:THREE.DoubleSide})))}
// eğimli dekor kutusu, çarpışma için daire
function propBox(x,z,ry,w,h,d,m,hb,solid){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(x,(hb?hb(x,z):0)+h/2,z);q.rotation.y=ry;add(q);if(solid)colAdd({x,z,r:Math.min(w,d)/2+.3,t:'solid'});return q}
function winTex(seed){const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');x.fillStyle='#14171d';x.fillRect(0,0,64,128);
for(let r=0;r<16;r++)for(let k=0;k<4;k++){const on=((r*7+k*13+seed*5)%11)<5;x.fillStyle=on?(((r+k+seed)%3)?'#ffd98a':'#bfe1ff'):'#262b33';x.fillRect(4+k*15,4+r*7.8,10,5)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
// tema dekorları
const PROPS={
gp:(R,TR,hb)=>{const st=lam(0x8d9096),seat=[lam(0xd8323a),lam(0x2f6fd6),lam(0xe8e8e8)];
// ana düzlükte tribün
for(let i=4;i<TR.N*.12;i+=6){const T=TR.T[i],[x,z]=atTrack(TR,i,TR.hw+16);for(let k=0;k<4;k++){const [sx,sz]=atTrack(TR,i,TR.hw+12+k*2.6);propBox(sx,sz,angT(T),2.6,1.2+k*1.3,6.4,seat[(i>>3)%3],hb,k==3)}}
// viraj dışlarında lastik bariyer
const tg=new THREE.CylinderGeometry(.5,.5,.42,10),tm=lam(0x18191b),tp=[];for(let i=0;i<TR.N;i+=1){if(!TR.kb[i]||i%2)continue;const a=TR.T[(i-6+TR.N)%TR.N],b=TR.T[(i+6)%TR.N],cr=a[0]*b[1]-a[1]*b[0],o=-Math.sign(cr)*(TR.hw+KW+6);const [x,z]=atTrack(TR,i,o);if(!clearOf(TR,x,z,TR.hw+KW+4))continue;tp.push([x,z])}
if(tp.length){const im=new THREE.InstancedMesh(tg,tm,tp.length*2),m4=new THREE.Matrix4();im.frustumCulled=false;tp.forEach(([x,z],k)=>{const y=hb?hb(x,z):0;for(let l=0;l<2;l++){m4.makeTranslation(x,y+.21+l*.42,z);im.setMatrixAt(k*2+l,m4)}colAdd({x,z,r:.8,t:'solid'})});add(im)}},
coast:(R,TR,hb)=>{const t=thOf('coast'),b=R.box,w=new THREE.Mesh(new THREE.PlaneGeometry(4000,2400),new THREE.MeshLambertMaterial({color:t.water}));w.rotation.x=-Math.PI/2;w.position.set((b[0]+b[1])/2,.15,b[3]+1200-10);add(w);
for(let i=0;i<TR.N;i+=14){const [x,z]=atTrack(TR,i,(i%28?1:-1)*(TR.hw+9));if(clearOf(TR,x,z,TR.hw+6)){const y=hb?hb(x,z):0;add(bx(.35,7,.35,x,y+3.5,z,lam(0x8a6a44)),bx(3.4,.25,.7,x,y+7,z,lam(0x4f8f3a)),bx(.7,.25,3.4,x,y+7,z,lam(0x4f8f3a)));colAdd({x,z,r:.5,t:'solid'})}}},
city:(R,TR,hb)=>{const cw=lam(0x9a9a94);for(const sd of[-1,1])wallRib(TR,sd*(TR.hw+1.2),1.1,0x9a9a94,hb,0,2);
const pm=lam(0x3b3f45),lm=new THREE.MeshBasicMaterial({color:0xffe2a0});for(let i=0;i<TR.N;i+=9){const sd=(i/9)%2?1:-1,[x,z]=atTrack(TR,i,sd*(TR.hw+2.4)),y=hb?hb(x,z):0;add(bx(.18,7,.18,x,y+3.5,z,pm),bx(.9,.18,.4,x,y+7,z,lm))}
const tx=[0,1,2,3].map(winTex);for(let i=0;i<TR.N;i+=7)for(const sd of[-1,1]){const w=10+rnd()*14,d=10+rnd()*12,h=14+rnd()*42,o=sd*(TR.hw+4+d/2+rnd()*6),[x,z]=atTrack(TR,i,o);if(!clearOf(TR,x,z,TR.hw+3+Math.max(w,d)*.7))continue;
const m=new THREE.MeshBasicMaterial({map:tx[(i+sd+3)%4].clone()});m.map.needsUpdate=true;m.map.repeat.set(Math.max(1,Math.round(w/8)),Math.max(1,Math.round(h/16)));propBox(x,z,angT(TR.T[i]),w,h,d,m,hb,true)}},
quarry:(R,TR,hb)=>{for(let k=0;k<70;k++){const i=Math.floor(rnd()*TR.N),o=(rnd()<.5?-1:1)*(TR.hw+12+rnd()*60),[x,z]=atTrack(TR,i,o);if(!clearOf(TR,x,z,TR.hw+8))continue;const s=3+rnd()*6;INST.r.push([x,H(x,z)+s*.4,z,s,rnd()*6,s*.8]);colAdd({x,z,r:s*1.2,t:'solid'})}},
port:(R,TR,hb)=>{const t=thOf('port'),b=R.box,w=new THREE.Mesh(new THREE.PlaneGeometry(4000,2400),new THREE.MeshLambertMaterial({color:t.water}));w.rotation.x=-Math.PI/2;w.position.set(b[0]-1200+10,.15,(b[2]+b[3])/2);add(w);
const CC=[0xc0392b,0x2e86c1,0x27ae60,0xf39c12,0x8e44ad,0xd35400,0x7f8c8d],cs=[];for(let i=0;i<TR.N;i+=5)for(const sd of[-1,1]){const o=sd*(TR.hw+10+rnd()*30),[x,z]=atTrack(TR,i,o);if(rnd()<.45||!clearOf(TR,x,z,TR.hw+9))continue;const n=1+Math.floor(rnd()*3);for(let l=0;l<n;l++)cs.push([x,z,l,angT(TR.T[i])]);colAdd({x,z,r:2.8,t:'solid'})}
if(cs.length){const im=new THREE.InstancedMesh(new THREE.BoxGeometry(2.5,2.6,6.1),new THREE.MeshLambertMaterial(),cs.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();im.frustumCulled=false;
cs.forEach(([x,z,l,ry],k)=>{e.set(0,ry,0);q.setFromEuler(e);m4.compose(V3(x,1.3+l*2.6,z),q,V3(1,1,1));im.setMatrixAt(k,m4);im.setColorAt(k,C3(CC[(k*3+l)%CC.length]))});add(im)}
const cm=lam(0xe0a020);for(let k=0;k<4;k++){const x=b[0]+40+k*90,z=(b[2]+b[3])/2+(k%2?120:-120);for(const [dx,dz] of[[-6,-6],[6,-6],[-6,6],[6,6]])add(bx(1,34,1,x+dx,17,z+dz,cm));add(bx(14,2,40,x,35,z+12,cm))}},
mount:(R,TR,hb)=>{for(const sd of[-1,1]){wallRib(TR,sd*(TR.hw+KW+1),.3,0xb8bec4,hb,.45,3);wallRib(TR,sd*(TR.hw+KW+1),.08,0x6a6e72,hb,.2)}},
desert:(R,TR,hb)=>{const cm=lam(0x5d7a3a);for(let k=0;k<90;k++){const i=Math.floor(rnd()*TR.N),o=(rnd()<.5?-1:1)*(TR.hw+6+rnd()*60),[x,z]=atTrack(TR,i,o);if(!clearOf(TR,x,z,TR.hw+4))continue;const y=H(x,z),h=2+rnd()*3;add(bx(.5,h,.5,x,y+h/2,z,cm),bx(.35,1.2,.35,x+.5,y+h*.6,z,cm));colAdd({x,z,r:.5,t:'solid'})}}};
