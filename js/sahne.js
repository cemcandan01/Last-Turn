// Sahne: renderer, kamera, ışıklar, doku ve dekor yardımcıları, pist geometrisi (Catmull-Rom), Çorak Topraklar test arazisi, ortak pist yardımcıları
// ---------- sahne
const R=new THREE.WebGLRenderer({canvas:$('#c'),antialias:true});R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.setPixelRatio(Math.min(devicePixelRatio||1,2));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fd0e8);scene.fog=new THREE.Fog(0x9fd0e8,140,900);
const cam=new THREE.PerspectiveCamera(70,1,.5,1500);
const hemi=new THREE.HemisphereLight(0xffffff,0x7a6a50,.8);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1d6,.9);sun.position.set(60,120,40);scene.add(sun,sun.target);sun.shadow.mapSize.set(1024,1024);{const sc=sun.shadow.camera;sc.left=sc.bottom=-45;sc.right=sc.top=45;sc.near=20;sc.far=320}sun.shadow.bias=-.0006;
function rs(){layout();R.setSize(AW,AH,false);cam.aspect=AW/AH;cam.updateProjectionMatrix()}addEventListener('resize',rs);addEventListener('orientationchange',()=>setTimeout(rs,250));rs();
function ctex(b,c1,c2,rep){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=b;x.fillRect(0,0,256,256);
for(let i=0;i<1400;i++){x.fillStyle=Math.random()<.5?c1:c2;x.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*5,2+Math.random()*5)}
const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);return t}
const mT=new THREE.MeshLambertMaterial({color:0x2f6b3a}),mK=new THREE.MeshLambertMaterial({color:0x5b4430}),mR=new THREE.MeshLambertMaterial({color:0x8a8a86}),mC=new THREE.MeshLambertMaterial({color:0xff6a2a});
const gT=new THREE.ConeGeometry(3,9,7),gK=new THREE.CylinderGeometry(.5,.7,3,6),gR=new THREE.DodecahedronGeometry(1.6),gC=new THREE.ConeGeometry(.5,1.2,8);
const C3=h=>new THREE.Color(h);
let G,H=()=>0,surf=()=>0,MAP=null,ti=0;
const add=(...m)=>G.add(...m);
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();
function plane(w,l,x,z,col,y,rz){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),new THREE.MeshLambertMaterial({color:col}));m.rotation.set(-Math.PI/2,0,rz||0);m.position.set(x,y,z);m.userData.flat=1;add(m)}
const cone=(x,z)=>{const c=new THREE.Mesh(gC,mC);c.position.set(x,H(x,z)+.6,z);add(c)};
const gB=new THREE.DodecahedronGeometry(1.4),mB=new THREE.MeshLambertMaterial({color:0x3f7d33}),mW=new THREE.MeshLambertMaterial({color:0x6d8fa8,transparent:true,opacity:.85});
// temas edilebilir objeler: 16 m'lik ızgarada tutulur, araç yalnız çevresindeki 9 hücreye bakar
let INST=null,COLS=null;const GRID=16;
function colAdd(o){if(!COLS)return;const ex=o.hx||0,ez=o.hz||0;for(let i=Math.floor((o.x-ex)/GRID);i<=Math.floor((o.x+ex)/GRID);i++)for(let j=Math.floor((o.z-ez)/GRID);j<=Math.floor((o.z+ez)/GRID);j++){const k=i+','+j;(COLS[k]||(COLS[k]=[])).push(o)}}
function colNear(x,z){const r=new Set();if(!MAP||!MAP.cols)return r;const cx=Math.floor(x/GRID),cz=Math.floor(z/GRID);
for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=MAP.cols[(cx+i)+','+(cz+j)];if(a)for(const o of a)r.add(o)}return r}
function instStart(){INST={k:[],t:[],r:[],b:[]}}
function instEnd(){const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();
const mk=(arr,geo,mat)=>{if(!arr.length)return;const im=new THREE.InstancedMesh(geo,mat,arr.length);im.frustumCulled=false;
arr.forEach((a,i)=>{e.set(0,a[4]||0,0);q.setFromEuler(e);p.set(a[0],a[1],a[2]);s.set(a[3],a[5]??a[3],a[3]);m4.compose(p,q,s);im.setMatrixAt(i,m4)});add(im)};
mk(INST.k,gK,mK);mk(INST.t,gT,mT);mk(INST.r,gR,mR);mk(INST.b,gB,mB);INST=null}
function rock(x,z){if(roadDist(x,z)<10)return;const hy=H(x,z),s=.6+rnd()*1.6;INST.r.push([x,hy+.5,z,s,rnd()*6,s*.7]);colAdd({x,z,r:1.3*s,t:'solid'})}
function tree(x,z){if(roadDist(x,z)<10)return;if(rnd()>=.65)return rock(x,z);const hy=H(x,z),s=.8+rnd()*.8;INST.k.push([x,hy+1.5,z,1]);INST.t.push([x,hy+7,z,s]);colAdd({x,z,r:.9,t:'solid'})}
function bush(x,z){if(roadDist(x,z)<9)return;const hy=H(x,z),s=.9+rnd()*.6;INST.b.push([x,hy+.5,z,s,rnd()*6,s*.6]);colAdd({x,z,r:1.6*s,t:'bush'})}
function puddle(x,z,r,noMesh){if(!noMesh){const c=new THREE.Mesh(new THREE.CircleGeometry(r,24),mW);c.rotation.x=-Math.PI/2;c.position.set(x,H(x,z)+.24,z);add(c)}colAdd({x,z,r,t:'water'})}
function terrain(size,seg,tex,cx=0,cz=0,hf){const gg=new THREE.PlaneGeometry(size,size,seg,seg);gg.rotateX(-Math.PI/2);const ps=gg.attributes.position;
for(let i=0;i<ps.count;i++)ps.setY(i,(hf||H)(ps.getX(i)+cx,ps.getZ(i)+cz));gg.computeVertexNormals();const m=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({map:tex}));m.userData.flat=1;m.position.set(cx,0,cz);add(m)}
// ---------- pist araçları (kapalı Catmull-Rom eğrisi)
function mkTrack(pts,hw,open){const P=[],m=pts.length;
for(let i=0;i<(open?m-1:m);i++){const p0=open&&i==0?pts[0]:pts[(i-1+m)%m],p1=pts[i],p2=pts[(i+1)%m],p3=open&&i+2>=m?pts[m-1]:pts[(i+2)%m],seg=Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/4);
for(let j=0;j<seg;j++){const t=j/seg,t2=t*t,t3=t2*t,f=k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);P.push([f(0),f(1)])}}if(open)P.push([...pts[m-1]]);
const N=P.length,T=[],S=[0];for(let i=0;i<N;i++){const a=P[open?Math.min(i+1,N-1):(i+1)%N],b=P[open?Math.max(i-1,0):(i-1+N)%N],l=Math.hypot(a[0]-b[0],a[1]-b[1]);T.push([(a[0]-b[0])/l,(a[1]-b[1])/l]);if(i)S.push(S[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]))}
return{P,N,T,S,len:open?S[N-1]:S[N-1]+Math.hypot(P[0][0]-P[N-1][0],P[0][1]-P[N-1][1]),hw,open}}
function nearest(TR,x,z,hint,full){let bi=hint,bd=1e18;const N=TR.N;
const scan=(a,b)=>{for(let k=a;k<=b;k++){const i=((k%N)+N)%N,dx=x-TR.P[i][0],dz=z-TR.P[i][1],q=dx*dx+dz*dz;if(q<bd){bd=q;bi=i}}};
if(full)scan(0,N-1);else{scan(hint-40,hint+40);if(Math.sqrt(bd)>TR.hw+25)scan(0,N-1)}return[bi,Math.sqrt(bd)]}
const idxAt=(TR,f)=>{const L0=f*TR.len;let i=0;while(i<TR.N-1&&TR.S[i]<L0)i++;return i};
const tp=(TR,name,i,back)=>{i=((i-back)%TR.N+TR.N)%TR.N;return[name,TR.P[i][0],TR.P[i][1],Math.atan2(TR.T[i][0],TR.T[i][1])]};
function ribbon(TR,o1,o2,y,colFn,yFn){const pos=[],col=[],N=TR.N,M=TR.open?N-1:N;
const p=(i,o)=>{const P=TR.P[i],T=TR.T[i],x=P[0]+T[1]*o,z=P[1]-T[0]*o;return[x,(yFn?yFn(x,z,o):0)+y,z]};
for(let i=0;i<M;i++){const c=colFn(i);if(!c)continue;const j=(i+1)%N,A1=p(i,o1),A2=p(i,o2),B1=p(j,o1),B2=p(j,o2);pos.push(...A1,...A2,...B1,...A2,...B2,...B1);for(let k=0;k<6;k++)col.push(c.r,c.g,c.b)}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
const rm=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));rm.userData.flat=1;add(rm)}
function startLine(TR,y){const p=TR.P[0],t=TR.T[0];plane(TR.hw*2,2.5,p[0],p[1],0xffffff,y,Math.atan2(t[0],t[1]))}
function numTex(n){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);x.fillStyle='#d8323a';x.fillRect(0,0,128,18);x.fillStyle='#111';x.font='bold 54px sans-serif';x.textAlign='center';x.fillText(n,64,88);return new THREE.CanvasTexture(c)}
// ---------- HARİTA 1: test arazisi
const EA=140,EB=90,RW=11,SX=210,HILLS=[[-330,110,45,12],[-400,-160,55,16],[-170,170,30,7],[330,-200,50,10],[100,-300,40,8]];
function Htest(x,z){let h=0;
{const w=cl((11-Math.abs(x+250))/3,0,1),t=(z+130)/30;if(t>=0&&t<=1)h+=4.5*t*w}
{const w=cl((19-Math.abs(x+40))/8,0,1);let y=0;if(z>130&&z<=400)y=30*(z-130)/270;else if(z>400&&z<=440)y=30;else if(z>440&&z<480)y=30*(1-sm(440,480,z));h+=y*w}
for(const b of HILLS)h+=b[3]*Math.exp(-((x-b[0])**2+(z-b[1])**2)/(b[2]*b[2]));return h}
function surfTest(x,z){const q=Math.hypot(x/EA,z/EB);if(q>0){const g=Math.hypot(x/(EA*EA),z/(EB*EB))/q;if(Math.abs(q-1)/g<RW)return 1}return Math.abs(x-SX)<RW&&Math.abs(z)<800?1:0}
function oval(o1,o2,col,y){const n=160,pos=[],idx=[];for(let i=0;i<=n;i++){const t=i/n*6.2832,c=Math.cos(t),s=Math.sin(t);let nx=c/EA,nz=s/EB;const l=Math.hypot(nx,nz);nx/=l;nz/=l;const px=EA*c,pz=EB*s;
pos.push(px+nx*o1,y,pz+nz*o1,px+nx*o2,y,pz+nz*o2);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:col,side:THREE.DoubleSide})))}
function buildTest(){terrain(1800,320,ctex('#8c6b45','#7d5f3c','#9a7a52',144));
oval(-RW,RW,0x363b46,.06);oval(RW-.7,RW,0xffffff,.08);oval(-RW,-RW+.7,0xffffff,.08);
plane(RW*2,1600,SX,0,0x363b46,.06);plane(.7,1600,SX-RW+.35,0,0xffffff,.08);plane(.7,1600,SX+RW-.35,0,0xffffff,.08);
for(let z=-790;z<=790;z+=20)plane(1.2,6,SX,z,0xe8c84a,.08);
for(let i=0;i<300;i++){const x=(rnd()-.5)*1700,z=(rnd()-.5)*1700,q=Math.hypot(x/EA,z/EB);if(q<1.35||Math.abs(x-SX)<24||Math.abs(x+250)<20&&z>-190&&z<-90||Math.abs(x+40)<30&&z>110&&z<500)continue;tree(x,z)}
for(let z=-790;z<=790;z+=40){cone(SX-RW-2,z);cone(SX+RW+2,z)}
for(let i=0;i<36;i++){const t=i/36*6.2832;cone(Math.cos(t)*(EA+RW+3),Math.sin(t)*(EB+RW+3))}
for(let z=140;z<=400;z+=40){cone(-61,z);cone(-19,z)}
for(let i=0;i<60;i++){const x=(rnd()-.5)*700,z=(rnd()-.5)*700,q=Math.hypot(x/EA,z/EB);if(surfTest(x,z)||(q>.75&&q<1.3))continue;bush(x,z)}
for(const [x,z,r] of[[0,0,7],[45,20,5],[-50,-25,6],[-120,-260,8],[60,-200,6]])puddle(x,z,r);cone(-262,-100);cone(-238,-100)}
const off=(a,ox,oz)=>a.map(([x,z])=>[x+ox,z+oz]);
// ---------- ortak pist yardımcıları
function kerbs(TR){TR.kb=TR.P.map((p,i)=>{const a=TR.T[(i-5+TR.N)%TR.N],b=TR.T[(i+5)%TR.N];return Math.abs(Math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]))>.12})}
// kerb yalnız virajlarda (apeks ve çıkış), pistten 9 cm yüksek
const KW=1.6,kerbProf=k=>k<=0||k>=KW?0:.09*sm(0,.4,k)*(1-sm(1.2,KW,k));
function Hkerb(TR){return(x,z)=>{const [i,d]=nearest(TR,x,z,ti);return TR.kb[i]?kerbProf(d-TR.hw):0}}
function asphaltTrack(TR,hb,ac){const yb=hb?(x,z)=>hb(x,z):()=>0;ribbon(TR,-TR.hw,TR.hw,.05,()=>C3(ac||0x3a3f4a),yb);
for(const sd of[-1,1]){ribbon(TR,sd*(TR.hw-.7),sd*(TR.hw-.3),.07,()=>C3(0xffffff),yb);
const kc=i=>TR.kb[i]?C3((i>>1)%2?0xffffff:0xd8323a):null,ky=(x,z,o)=>.06+kerbProf(Math.abs(o)-TR.hw)+yb(x,z);
ribbon(TR,sd*TR.hw,sd*(TR.hw+.5),0,kc,ky);ribbon(TR,sd*(TR.hw+.5),sd*(TR.hw+KW),0,kc,ky)}startLine(TR,.09+yb(TR.P[0][0],TR.P[0][1]))}
function grass(size,rep){const gm=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshLambertMaterial({map:ctex('#3f7a3a','#376d33','#4a8743',rep)}));gm.rotation.x=-Math.PI/2;add(gm)}
function forest(TR,n,dmin,dmax,area,ox,oz){let c=0;for(let i=0;i<n*5&&c<n;i++){const x=ox+(rnd()-.5)*area,z=oz+(rnd()-.5)*area,d=nearest(TR,x,z,0,true)[1];if(d<dmin||d>dmax)continue;tree(x,z);c++}}
function edgeBush(TR,n,a,b){for(let k=0;k<n;k++){const i=Math.floor(rnd()*TR.N),P=TR.P[i],T=TR.T[i],o=(rnd()<.5?-1:1)*(TR.hw+a+rnd()*(b-a));bush(P[0]+T[1]*o,P[1]-T[0]*o)}}
function jumpH(J,x,z){let h=0;for(const j of J){const dx=x-j.x,dz=z-j.z,s=dx*j.tx+dz*j.tz,l=Math.abs(-dx*j.tz+dz*j.tx);if(l>j.w+6||s<-30||s>30)continue;
const w=cl((j.w+6-l)/6,0,1);let p=0;
if(j.k=='kick'){if(s>=-18&&s<0)p=3.2*Math.pow((s+18)/18,1.6);else if(s>=0&&s<4)p=3.2*(1-sm(0,4,s))}
else if(j.k=='table')p=2.4*sm(-16,-6,s)*(1-sm(8,18,s));else p=1.4*Math.exp(-((s/6)**2));h+=p*w}return h}
const mkJumps=(TR,list)=>list.map(([k,f])=>{const i=idxAt(TR,f),p=TR.P[i],t=TR.T[i];return{k,i,x:p[0],z:p[1],tx:t[0],tz:t[1],w:TR.hw}});
const onTrack=(TR,f,lat)=>{const i=idxAt(TR,f),P=TR.P[i],T=TR.T[i];return{i,x:P[0]+T[1]*(lat||0),z:P[1]-T[0]*(lat||0)}};
