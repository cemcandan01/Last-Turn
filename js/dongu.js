// Ana döngü: fizik adımı, kamera, HUD güncellemesi, çizim
// ---------- döngü
const fmt=t=>t==null?'—':Math.floor(t/60)+':'+(t%60).toFixed(1).padStart(4,'0'),fmt3=t=>t.toFixed(3)+' sn';
let last=0,tt=0;
let nearCur=.5;const mmc=$('#mm').getContext?$('#mm').getContext('2d'):null;
function loop(ts){const dt=Math.min(.033,(ts-last)/1000||0);last=ts;tt+=dt;
if(CT.gas=='auto'&&mode=='drive')I.g=I.b?0:1;
let v=Math.hypot(S.vx,S.vz),Sf=SURF[surf(S.x,S.z)],T=TIRES[tire];const frozen=EV&&EV.state=='count';
if(mode=='menu'&&CINE)cineTick(dt);
if(mode=='drive'&&!frozen){PROF.km+=v*dt/1000;if(tt%20<dt)saveProf();const o=phys(dt);v=o.v;Sf=o.Sf;T=o.T;if(EV)evTick(dt,o)}
if(frozen&&mode=='drive'){EV.cd-=dt;const b=$('#big');b.style.fontSize='88px';b.textContent=EV.cd>0?Math.ceil(EV.cd):'';if(EV.cd<=0){EV.state='run';note('BAŞLA!',60)}}
if(EV&&REG[EV.reg].tick)REG[EV.reg].tick(EV);precipTick(dt);shadowTick();
if(bigT>0){bigT-=dt;if(bigT<=0)$('#big').textContent=''}
ground.position.x=Math.round(S.x/GT)*GT;ground.position.z=Math.round(S.z/GT)*GT;
if(mode=='garage'){S.x=GX;S.z=GZ;S.y=.12;S.h=tt*.3+ly;S.vx=S.vz=S.w=0;S.axs=0;delta=0}
const fxm=Math.sin(S.h),fzm=Math.cos(S.h);
car.position.set(S.x,S.y,S.z);car.rotation.y=S.h;for(const pv of steerP)pv.rotation.y=delta;{const vl_=S.vx*fxm+S.vz*fzm;for(const w of wheels)w.rotation.x+=vl_*dt/w.userData.r}
const pt=S.air?Math.atan2(S.vy,Math.max(10,v)):Math.atan2(H(S.x+fxm*1.6,S.z+fzm*1.6)-H(S.x-fxm*1.6,S.z-fzm*1.6),3.2);pitC+=(pt-pitC)*Math.min(1,dt*10);car.rotation.x=-pitC;
body.rotation.z+=(cl(S.w*Math.min(1,v/VMAX)*.06,-.12,.12)-body.rotation.z)*Math.min(1,dt*8);
body.rotation.x+=(cl(-S.axs*.004,-.07,.07)-body.rotation.x)*Math.min(1,dt*6);
const spn=Math.min(1,v/VMAX),shake=mode=='drive'||CINE?(CINE&&CINE.cam=='cock'?.07:0)+(S.kerb?.06:0)+(tt-S.hit<.35?.3:0)+(set.shk&&spn>.7?.03*(spn-.6)*3:0):0;
const inCar=(mode!='menu'||CINE&&CINE.cam=='cock')&&mode!='garage'&&camMode>=2,ck=inCar&&camMode==3,nr=inCar?.15:.5;
if(nr!=nearCur){nearCur=nr;cam.near=nr;cam.updateProjectionMatrix()}
cock.visible=ck;if(carM.g.userData.ck!==ck){carM.g.userData.ck=ck;carM.g.traverse(o=>{if(o.userData.pan)o.visible=!ck})}glassQM.opacity=ck?.12:1;glassQM.depthWrite=!ck;engine(v*3.6,dt);if(ck)gauges(v*3.6);
if(inCar){car.updateMatrixWorld(true);swl.rotation.z=-delta*2.5;const mw=body.matrixWorld;
const hy=CAR.ws[0][1]+.62+(CAR.lift||0),hz=CAR.ws[0][0]-.1;cam.position.copy((ck?V3(...EYE):V3(0,hy,hz)).applyMatrix4(mw));cam.position.y+=(Math.random()-.5)*shake*.4;
cam.up.set(0,1,0).applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()));cam.lookAt((ck?V3(EYE[0],EYE[1]-.15,EYE[2]+14):V3(0,hy-.27,16)).applyMatrix4(mw))}
else{if(mode=='menu'){camYaw+=ad(S.h-camYaw)*Math.min(1,dt*1.5);ly=Math.sin(tt*.13)*1.6;lp=.1+Math.sin(tt*.07)*.1}
else{camYaw+=ad(S.h-camYaw)*Math.min(1,dt*(D.act?2.2:4.5));if(dp===null&&performance.now()-lastDrag>1500){const d=Math.exp(-dt*3);ly*=d;lp*=d}}
const far=camMode==1?1.6:1,pit=.3+lp,dist=(9+spn*3-cl(S.axs*.05,-1.5,1.5))*far,a=camYaw+ly;
let cx=S.x-Math.sin(a)*dist*Math.cos(pit),cz=S.z-Math.cos(a)*dist*Math.cos(pit),cy=S.y+2.4*far+dist*Math.sin(pit);
cy+=(Math.random()-.5)*shake;cx+=(Math.random()-.5)*shake*.6;
cy=Math.max(cy,H(cx,cz)+1);cam.position.set(cx,cy,cz);cam.up.set(0,1,0);cam.lookAt(S.x+fxm*3,S.y+1.2,S.z+fzm*3)}
// garaj kamerası: araç dikeyde üst yarıda, yatayda solda (panel sağda)
if(mode=='garage'){const a=.55,lnd=AW>AH,dd=lnd?8.2:8.8;cam.position.set(GX+Math.sin(a)*dd,lnd?2.3:3.2,GZ+Math.cos(a)*dd);cam.up.set(0,1,0);cam.lookAt(GX+(lnd?Math.cos(a)*3.4:0),lnd?.6:-1.5,GZ-(lnd?Math.sin(a)*3.4:0))}
const bf=camMode==3&&inCar?(AW<AH?64:54):(AW<AH?78:62)+(inCar?6:0),tf=bf+(set.fov?spn*24:0);fovC+=(tf-fovC)*Math.min(1,dt*3);if(Math.abs(cam.fov-fovC)>.05){cam.fov=fovC;cam.updateProjectionMatrix()}
if(mode=='menu'&&CINE)cineCam();
for(const p of parts){if(p.l>0){p.l-=dt*1.1;p.m.position.addScaledVector(p.v,dt);const s=1+(1-p.l)*3;p.m.scale.set(s,s,s);p.m.material.opacity=Math.max(0,p.l*.45);if(p.l<=0)p.m.visible=false}}
if(mode!='menu'&&mode!='garage'){$('#spd').textContent=Math.round(v*3.6);$('.hSP').style.display=camMode==3?'none':'';$('#gear').textContent=GEAR||'N';rpmBar();$('#hName').textContent=EV?EV.n:CURW.n;
$('#sf').textContent=CAR.n+' · '+Sf.n+' · '+T.n+' lastik'+(S.mud>.05?' · Çamur %'+Math.round(S.mud*100):'')+(S.wet>.05?' · Islak':'')+(COND.wx!='sun'?' · '+WXS[COND.wx]:'');
$('#dr').textContent=D.t>0?'DRIFT '+Math.round(Math.abs(D.beta)*57.3)+'°':S.spin?'PATİNAJ':S.air?'HAVADA':'';
$('#lap').textContent=EV||!MAP.TR||MAP.TR.open?(EV&&EV.ty=='dp'?'Drift uzadıkça çarpan artar':''):'Son '+fmt(LAP.last)+' · En iyi '+fmt(LAP.best);
$('#ev').textContent=EV?evText():MAP.TR&&!MAP.TR.open?(LAP.run?'⏱ '+fmt(LAP.t):'Çizgiden geç, tur başlasın'):'';
if(CT.steer=='tilt'){const c=$('#cal');if(c)c.textContent=performance.now()-tiltT<1500?'Ortala':'Sensör izni'}
if(mmc){mmc.clearRect(0,0,240,240);mmc.drawImage(mmBase,0,0);const q=mmP(S.x,S.z);mmc.fillStyle='#fff';mmc.strokeStyle='#ff7a3c';mmc.lineWidth=3;
mmc.beginPath();mmc.moveTo(q[0]+fxm*12,q[1]+fzm*12);mmc.lineTo(q[0]-fxm*6+fzm*6,q[1]-fzm*6-fxm*6);mmc.lineTo(q[0]-fxm*6-fzm*6,q[1]-fzm*6+fxm*6);mmc.closePath();mmc.fill();mmc.stroke()}}
R.render(scene,cam);requestAnimationFrame(loop)}
