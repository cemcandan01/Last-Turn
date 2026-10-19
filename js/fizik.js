// Fizik ve kontroller: araç durumu (S), dokunmatik/telefon/klavye girişleri, bisiklet modeli, drift mantığı (DR), çarpışmalar
// ---------- durum
let S,mode='menu',I={l:0,r:0,g:0,b:0,sa:0},ly=0,lp=0,lastDrag=0,camYaw=0,st=0,fovC=70,pitC=0,delta=0;
const D={act:0,t:0,score:0,gap:0,beta:0},DR={on:0,dir:1,hold:0,bt:0,t:0,k:0,cool:0},LAP={run:0,t:0,last:null,best:null,armed:0,prev:0};
function reset(x,z,h){const sp=CURW.tele[0];x=x??sp[1];z=z??sp[2];h=h??sp[3];S={x,z,y:H(x,z),vy:0,h,vx:0,vz:0,w:0,axs:0,air:false,mud:0,gas:0,wet:0,hit:-9,kerb:0,spin:0};
camYaw=S.h;st=0;ly=lp=0;D.act=D.t=D.score=0;DR.on=DR.k=0;DR.cool=0;LAP.run=0;LAP.t=0;LAP.armed=0;CUR=regAt(x,z);MAP.TR=CUR?CUR.TR:null;LAP.reg=CUR;if(MAP.TR){ti=nearest(MAP.TR,x,z,0,true)[0];LAP.prev=ti}}
function bindK(id,k){const e=$(id);e.addEventListener('pointerdown',v=>{v.preventDefault();e.setPointerCapture(v.pointerId);I[k]=1;e.classList.add('on')});
['pointerup','pointercancel'].forEach(n=>e.addEventListener(n,()=>{I[k]=0;e.classList.remove('on')}))}
const CT={steer:'btn',gas:'btn'};let tB=0,tG=0,tiltZero=0,wheelA=0,tiltT=-1e9;
function askTilt(){try{const D_=window.DeviceOrientationEvent;if(D_&&D_.requestPermission)D_.requestPermission().then(r=>note(r=='granted'?'Sensör izni verildi':'Sensör izni reddedildi',26)).catch(()=>note('Bu görünümde sensör izni alınamıyor',24));
else if(!D_)note('Cihaz yön sensörü bulunamadı',24)}catch(e){note('Sensör izni alınamadı',24)}}
addEventListener('deviceorientation',e=>{if(e.beta==null||e.gamma==null)return;tiltT=performance.now();tB=e.beta;tG=e.gamma});
// telefonun ekran düzleminde yana yatma açısı (derece). sağ kenar aşağı = pozitif
function tiltRoll(){const b=tB*Math.PI/180,g=tG*Math.PI/180,gx=Math.sin(g)*Math.cos(b),gy=-Math.sin(b);
const o=((devO()+ROT)%360+360)%360;
const sx=o==90?-gy:o==270?gy:o==180?-gx:gx;return Math.asin(cl(sx,-1,1))*57.3}
function tiltSteer(){let a=ad((tiltRoll()-tiltZero)/57.3)*57.3;const dz=2.5;a=Math.abs(a)<dz?0:a-Math.sign(a)*dz;const x=cl(a/(set.tlt-dz),-1,1);return -Math.sign(x)*Math.pow(Math.abs(x),1.35)}
function bindWheel(z,e){let id=null,a0=0,base=0;const ang=v=>{const r=e.getBoundingClientRect();return Math.atan2(v.clientY-(r.top+r.height/2),v.clientX-(r.left+r.width/2))};
z.addEventListener('pointerdown',v=>{v.preventDefault();z.setPointerCapture(v.pointerId);id=v.pointerId;a0=ang(v);base=wheelA});
z.addEventListener('pointermove',v=>{if(v.pointerId!==id)return;const a=ang(v);wheelA=cl(wheelA+ad(a-a0),-2.1,2.1);a0=a;I.sa=-wheelA/2.1;e.style.transform=`rotate(${wheelA}rad)`});
['pointerup','pointercancel'].forEach(n=>z.addEventListener(n,v=>{if(v.pointerId!==id)return;id=null;wheelA=0;I.sa=0;e.style.transform=''}))}
function bindPedal(e){const fg=e.querySelector('i'),fb=e.querySelector('u'),set_=v=>{const r=e.getBoundingClientRect(),c=toApp(r.left+r.width/2,r.top+r.height/2),q=toApp(v.clientX,v.clientY);let y=(c[1]-q[1])/(e.offsetHeight/2);
const dz=.08,m=Math.abs(y)<dz?0:cl((Math.abs(y)-dz)/(.9-dz),0,1);I.g=y>0?m:0;I.b=y<0?m:0;fg.style.height=I.g*50+'%';fb.style.height=I.b*50+'%'};
e.addEventListener('pointerdown',v=>{v.preventDefault();e.setPointerCapture(v.pointerId);set_(v)});e.addEventListener('pointermove',v=>{if(e.hasPointerCapture(v.pointerId))set_(v)});
['pointerup','pointercancel'].forEach(n=>e.addEventListener(n,()=>{I.g=I.b=0;fg.style.height=fb.style.height='0'}))}
function buildCtl(){const c=$('#ctl');I.l=I.r=I.g=I.b=0;I.sa=0;
const L=CT.steer=='btn'?'<div class="g"><div class="k" id="l">◀</div><div class="k" id="r">▶</div></div>':CT.steer=='wheel'?'<div class="wz" id="wz"><div class="wheel" id="wh"></div></div>':'<div class="g"><div class="k" id="cal">Ortala</div></div>';
const B=CT.gas=='analog'?'':`<div class="k" id="b"${CT.gas=='auto'?' style="width:124px;height:116px;font-size:22px"':''}>FREN</div>`;
c.innerHTML=L+'<div class="g">'+B+(CT.gas=='btn'?'<div class="k" id="g">GAZ</div>':CT.gas=='analog'?'<div class="pedal" id="pd"><i></i><u></u><b>GAZ</b><s>FREN</s></div>':'')+'</div>';
if(CT.steer=='btn'){bindK('#l','l');bindK('#r','r')}else if(CT.steer=='wheel')bindWheel($('#wz'),$('#wh'));else $('#cal').onclick=()=>{if(performance.now()-tiltT>1500){askTilt();return}tiltZero=tiltRoll();note('Ortalandı',30)};
if(CT.gas!='analog')bindK('#b','b');if(CT.gas=='btn')bindK('#g','g');else if(CT.gas=='analog')bindPedal($('#pd'))}

const KM={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'g',ArrowDown:'b'};
addEventListener('keydown',e=>{if(KM[e.key])I[KM[e.key]]=1});addEventListener('keyup',e=>{if(KM[e.key])I[KM[e.key]]=0});
let dp=null,lx=0,ly0=0;const cvs=$('#c');
cvs.addEventListener('pointerdown',e=>{if(dp===null){dp=e.pointerId;[lx,ly0]=toApp(e.clientX,e.clientY)}});
cvs.addEventListener('pointermove',e=>{if(e.pointerId!==dp)return;const [ax,ay]=toApp(e.clientX,e.clientY);ly-=(ax-lx)*.009;lp=cl(lp+(ay-ly0)*.006,-.25,1);lx=ax;ly0=ay;lastDrag=performance.now()});
['pointerup','pointercancel'].forEach(n=>cvs.addEventListener(n,e=>{if(e.pointerId===dp)dp=null}));
// ---------- fizik (bisiklet modeli). Büyük kayma açısında tutuş tamamen kaybolmaz: araç sürtünerek yavaşlar
const pac=(al,B,C)=>{const p=Math.sin(C*Math.atan(B*al)),b=sm(.6,1.2,Math.abs(al));return p*(1-b)+Math.sign(al)*.45*b},cap=(Dm,F)=>Math.sqrt(Math.max(Dm*Dm-F*F,.09*Dm*Dm));
function sub(h,P,M){const fx=Math.sin(S.h),fz=Math.cos(S.h),ux=Math.cos(S.h),uz=-Math.sin(S.h);
const vl=S.vx*fx+S.vz*fz,vt=S.vx*ux+S.vz*uz,sg=vl>=0?1:-1,vxs=Math.max(Math.abs(vl),4),a=L/2,dl=P.delta,sp=Math.hypot(vl,vt);
const af=Math.atan2(vt+a*S.w,vxs)-dl*sg,ar=Math.atan2(vt-a*S.w,vxs);
const wt=cl(S.axs*M.wk,-.15,.1),Df=P.Af*(.5-wt),Dr=P.Ar*(.5+wt)*M.rb;
let ax=0,Fxr=0,Fxf=0,spin=0;
if(I.b){if(vl>.5){const Bk=Math.min(30*M.brk,P.A*1.05)*I.b;ax=-Bk;Fxf=M.bb*Bk*M.bc;Fxr=(1-M.bb)*Bk*M.bc}else if(vl>-10){const Rv=Math.min(12,Dr)*I.b;ax=-Rv;Fxr=Rv*.6*M.bc}}
else if(S.gas>.01){const av=Math.abs(vl),lw=Math.max(0,1-av/15),an=CT.gas=='analog',Lc=an?1+2*P.lch*S.gas*S.gas*lw:1+.7*P.lch*lw,
E0=M.acc*P.gas*S.gas*Math.min(9.5*Lc*CAR.trq,240*CAR.pw/Math.max(av,1))/CAR.m*(1-Math.pow(cl(av/P.top,0,1.2),4)),f4=CAR.awd,lim=Math.min(P.A*.9,(f4?Math.min(Dr/(1-f4),Df/f4):Dr)*.55*M.lim)*P.lg,
// kalkış patinajı: tuşla ya da otomatik gazda aracın sabit değeri (M.sc); analog pedalda gazın ne kadar açıldığına bağlı
E=an?E0:Math.min(E0,lim*(1+M.sc+Math.max(0,av-6)/10)),sl=Math.max(0,E/lim-1),sk=Math.min(1,sl*2.5);
spin=sk;const e=sl>0?lim*(1-(.03+.05*P.lz)*sk):E;ax=e;Fxr=Math.max(Math.abs(e)*(1-f4)*M.tc*1.1,Dr*(.6+.3*P.lz)*sk*(1-.5*f4));
// dört çekerde ön tekerler de çeker; ön tutuşun bir kısmını kullanır
if(f4)Fxf=Math.max(Math.abs(e)*f4*1.2,Df*.5*sk*f4)}
if(!I.b)ax-=sg*(1.2+(S.gas>.05?0:2.8))+vl*.05;
ax-=sg*P.drag*3+vl*P.drag*.04;
const Fyf=-cap(Df,Fxf)*pac(af,P.Bf,P.C),Fyr=-cap(Dr,Fxr)*pac(ar,P.Br,P.C);
ax-=Fyf*Math.sin(dl);const ay=Fyf*Math.cos(dl)+Fyr,dw=(a*Fyf*Math.cos(dl)-a*Fyr)/(IZ*CAR.iz)-S.w*M.dmp;
S.vx+=(ax*fx+ay*ux)*h;S.vz+=(ax*fz+ay*uz)*h;S.w+=dw*h;
if(M.kin>0&&sp>2){const lim=P.A*1.1/Math.max(sp,1),wk=cl(vl/L*Math.tan(dl),-lim,lim);S.w+=(wk-S.w)*Math.min(1,h*M.kin);const k=Math.min(1,h*M.al);S.vx-=ux*vt*k;S.vz-=uz*vt*k}
const lk=cl(1-sp/5,0,1);if(lk>0){S.w+=(vl/L*Math.tan(dl)-S.w)*Math.min(1,h*12)*lk;const k=Math.min(1,h*10)*lk;S.vx-=ux*vt*k;S.vz-=uz*vt*k}
S.h+=S.w*h;S.axs+=(ax-S.axs)*Math.min(1,h*8);return{ar,spin}}
function phys(dt){const si=surf(S.x,S.z),Sf=SURF[si],T=TIRES[tire],tu=TU,as=AS,loose=si!=1;
if(si==3)S.mud=1;else S.mud=Math.max(0,S.mud-dt*Math.hypot(S.vx,S.vz)/(si==1?120:200));S.wet=Math.max(0,S.wet-dt/2.5);
// lastik basıncı: yüksek = keskin ve erken kayar; gevşek zeminde düşük basınç tutuş verir
const pg=tp=>1-(loose?.35:.15)*(tp-1),A0=Sf.a*T.g[Sf.ti]*CAR.gr[Sf.ti]*WX.g/(1+.5*S.mud)*(1-.3*S.wet)*(1+.25*as.grip),B0=T.B[Sf.ti]*(si==3?.85:1);
const P={A:A0,Af:A0*pg(tu.tpf)*CAR.fb,Ar:A0*pg(tu.tpr)*CAR.rb,Bf:B0*tu.tpf,Br:B0*tu.tpr,C:T.C[Sf.ti],top:VMAX*T.t[Sf.ti]*tu.top*CAR.top*(1-.04*(tu.aero-1)),drag:Sf.dr,gas:1,lch:tu.lch,loose,lz:loose?1:0,lg:T.lg?T.lg[Sf.ti]:1};
const tg=(CT.steer=='btn'?I.l-I.r:CT.steer=='tilt'?tiltSteer():I.sa)*(set.inv?-1:1),rate=CT.steer!='btn'?14*tu.sens:tg==0?10:(set.sm?6.5*tu.sens:30);st+=(tg-st)*Math.min(1,rate*dt);S.gas+=(+I.g-S.gas)*Math.min(1,dt*(2+18*tu.thr));
let v=Math.hypot(S.vx,S.vz);
let fx=Math.sin(S.h),fz=Math.cos(S.h),vl=S.vx*fx+S.vz*fz,vt=S.vx*Math.cos(S.h)-S.vz*Math.sin(S.h);
const be=Math.atan2(vt,Math.max(vl,.5)),ab=Math.abs(be),bmax=.9-.35*cl((v-10)/45,0,1);
// drift penceresi: açı pencere içinde kaldıkça drift sürer; çok düşerse araç düzelir, abartılırsa spin
if(DR.cool>0)DR.cool-=dt;
if(!S.air){if(!DR.on&&DR.cool<=0){const full=Math.abs(st)>(I.g>.5?.6:.7);DR.hold=full&&v>11?DR.hold+dt:0;
const dth=PK=='dr'||PK=='fd'||PK=='fa'?.35:.55;DR.nc=ab>dth&&I.g>.5&&v>11?(DR.nc||0)+dt:0;
if(as.dft>0&&DR.nc>.25){DR.on=1;DR.dir=-Math.sign(be);DR.bt=Math.min(ab,bmax)}
else if(as.ini>0&&full&&((v>13&&DR.hold>.15)||(as.ini>=.8&&v>11&&I.b))){DR.on=1;DR.dir=Math.sign(st);DR.bt=.35}if(DR.on)DR.t=0}
else if(DR.on){DR.t+=dt;const into=st*DR.dir,gz=Math.min(1,+I.g);
const hd=1.6-as.dft;// destek azaldıkça açı daha hızlı büyür: denge oyuncuya kalır
if(into>.3)DR.bt+=(.5+.3*gz)*hd*into*dt;else if(into<-.3)DR.bt+=.9*into*dt;else DR.bt+=(gz>.5?.12*hd:-.2)*dt;if(gz<.2)DR.bt-=.5*dt;DR.bt=Math.min(DR.bt,bmax+.9);
if(ab>bmax+.6){DR.on=0;DR.cool=1.2;note('SPİN',40)}else if(DR.bt<.1||v<6||(ab<.07&&DR.t>.5))DR.on=0}}
DR.k+=((DR.on?1:0)-DR.k)*Math.min(1,dt*(DR.on?7:3));
// asfaltta drift: arka lastik kaymaya başlayınca (drift yardımı açıkken) toprakta olduğu gibi yumuşak ve uzun kayar
{const kz=Math.max(DR.k,sm(.1,.3,ab)*Math.min(1,+I.g)*as.dft);if(!loose&&kz>0){P.Br*=1-.45*kz;P.Bf*=1-.2*kz;P.Ar*=1-.1*kz;P.C+=(1.3-P.C)*kz;P.lz=kz}}
// çekiş kontrolü: drift dışındaki arka kaymada gazı keser
if(as.tcs>0&&!DR.on)P.gas=1-as.tcs*sm(.12,.35,ab);
const M={rb:tu.bal*(1-.3*as.ini*DR.k),bc:.45*(1-as.abs),bb:tu.bb,tc:.8*tu.diff*(1-.7*as.tcs),wk:.012*tu.susp*CAR.wk,kin:5*as.str*(1-DR.k),al:2.5*as.str*(1-DR.k),
dmp:.35+1.6*as.stm*(1-DR.k),acc:as.acc*tu.pow,brk:as.bra*tu.brk*CAR.brk/CAR.m,lim:1+.6*as.tcs,sc:.02+.08*tu.lch};
let info={ar:0,spin:0};const pv0=Math.atan2(S.vx,S.vz);
if(!S.air){const e=2;S.vx-=24*(H(S.x+e,S.z)-H(S.x-e,S.z))/(2*e)*dt;S.vz-=24*(H(S.x,S.z+e)-H(S.x,S.z-e))/(2*e)*dt;
const spn=Math.min(1,Math.abs(vl)/VMAX),ae=1+.5*tu.aero*CAR.ae*spn*spn;P.A*=ae;P.Af*=ae;P.Ar*=ae;
const dmax=tu.lock*(set.ss?1-.5*Math.pow(spn,.8)*(1-sm(.1,.3,ab)):1)*(1+.12*as.str);let dlt=st*dmax;
if(DR.k>0&&as.dft>0){const dc=cl(2*(be+DR.dir*DR.bt),-.6,.6),w=as.dft*DR.k;dlt=dlt*(1-w)+dc*w;
const wv=ad(Math.atan2(S.vx,S.vz)-(S.pv??Math.atan2(S.vx,S.vz)))/dt,wd=wv+5*(be+DR.dir*DR.bt);S.w+=(wd-S.w)*Math.min(1,dt*10)*w}
delta=cl(dlt,-.8,.8);P.delta=delta;
const v0=Math.hypot(S.vx,S.vz);for(let i=0;i<8;i++){const r=sub(dt/8,P,M);info.ar=r.ar;info.spin=Math.max(info.spin,r.spin)}S.pv=pv0;
// drift desteği hızı korur: driftte kaybedilen hızın çoğu geri verilir ve araç drift hızına doğru itilir
if(DR.k>.05&&as.dft>0&&I.g>0){const v1=Math.hypot(S.vx,S.vz);if(v1>1){const w=as.dft*DR.k*I.g,tgt=Math.min(P.top*.45,30),dv=Math.max(0,v0-v1)*.75*w+Math.max(0,tgt-v1)*.35*w*dt,k=(v1+dv)/v1;S.vx*=k;S.vz*=k}}
}else S.h+=S.w*dt;
const mx=S.x+S.vx*dt,mz=S.z+S.vz*dt,run=Math.hypot(S.vx,S.vz)*dt;
if(run>1e-4&&H(mx,mz)-S.y>Math.max(.3,.6*run+(S.air?.3:.05))){const gx=(H(mx+1,mz)-H(mx-1,mz))/2,gz=(H(mx,mz+1)-H(mx,mz-1))/2,gl=Math.hypot(gx,gz)||1,nx=gx/gl,nz=gz/gl,vn=S.vx*nx+S.vz*nz;
if(vn>0){S.vx-=nx*vn*1.15;S.vz-=nz*vn*1.15}S.vx*=.97;S.vz*=.97;S.w*=.5}else{const b=EV?REG[EV.reg].box:CURW.box;S.x=mx;S.z=mz;if(S.x<b[0]+5||S.x>b[1]-5){S.x=cl(S.x,b[0]+5,b[1]-5);S.vx*=-.3}if(S.z<b[2]+5||S.z>b[3]-5){S.z=cl(S.z,b[2]+5,b[3]-5);S.vz*=-.3}}
// çarpışma: ağaç ve taş sert, çalı yavaşlatır, su ıslatır
for(const o of colNear(S.x,S.z)){const dx=S.x-o.x,dz=S.z-o.z,d=Math.hypot(dx,dz)||.01;
if(o.t=='box'){const px=o.hx+1.4-Math.abs(dx),pz=o.hz+1.4-Math.abs(dz);if(px>0&&pz>0){let nx=0,nz=0;if(px<pz){nx=Math.sign(dx)||1;S.x+=nx*px}else{nz=Math.sign(dz)||1;S.z+=nz*pz}
const vn=S.vx*nx+S.vz*nz;if(vn<0){S.vx-=1.3*vn*nx;S.vz-=1.3*vn*nz;S.vx*=.75;S.vz*=.75;S.w+=(Math.random()-.5)*2*Math.min(1,-vn/15);if(-vn>3)S.hit=tt}}continue}
if(o.t=='solid'){const rr=o.r+1.5;if(d<rr){const nx=dx/d,nz=dz/d,vn=S.vx*nx+S.vz*nz;S.x+=nx*(rr-d);S.z+=nz*(rr-d);
if(vn<0){S.vx-=1.3*vn*nx;S.vz-=1.3*vn*nz;S.vx*=.75;S.vz*=.75;S.w+=(Math.random()-.5)*2*Math.min(1,-vn/15);if(-vn>3)S.hit=tt}}}
else if(o.t=='bush'){if(d<o.r+1){const k=Math.exp(-2.2*dt);S.vx*=k;S.vz*=k;if(ENVK!='snow'&&Math.random()<.4)puff(S.x,S.y,S.z,S.vx,S.vz,mB.color.getHex())}}
else if(d<o.r){S.wet=1;const k=Math.exp(-1.2*dt*Math.min(1,v/10));S.vx*=k;S.vz*=k;if(v>4)for(const s2 of[-1,1])if(Math.random()<.7)puff(S.x+Math.cos(S.h)*s2,S.y,S.z-Math.sin(S.h)*s2,S.vx*.5,S.vz*.5,0xcfe3f0)}}
const g2=H(S.x,S.z);
S.kerb=CUR&&CUR.kerb&&!S.air&&g2>.02?1:0;
if(S.air){S.vy-=24*dt;const ay=S.y+S.vy*dt;if(ay>g2)S.y=ay;else{S.air=false;S.y=g2}}
else{const gv=(g2-S.y)/dt;if(g2<S.y-.02&&gv<S.vy-24*dt-.5){S.air=true;S.vy-=24*dt;S.y+=S.vy*dt}else{S.vy=cl(gv,-30,30);S.y=g2}}
v=Math.hypot(S.vx,S.vz);fx=Math.sin(S.h);fz=Math.cos(S.h);vl=S.vx*fx+S.vz*fz;vt=S.vx*Math.cos(S.h)-S.vz*Math.sin(S.h);
S.spin=info.spin>.3&&v<25?1:0;if(info.spin&&loose&&!S.air)S.w+=(Math.random()-.5)*dt*1.5*(1-as.tcs)*info.spin;const beta=Math.atan2(vt,Math.max(Math.abs(vl),1)),dri=!S.air&&v>10&&(DR.on||Math.abs(beta)>.5);D.beta=beta;D.act=dri?1:0;
if(dri){D.t+=dt;D.gap=0;D.score+=v*Math.abs(beta)*dt*4}else{D.gap+=dt;if(D.gap>.6){D.t=0;D.score=0}}
const sm2=!S.air&&v>5&&(Math.abs(info.ar)>.16||info.spin>.2||dri),dust=!S.air&&(si==0||si==3||si>=4)&&v>6;
if((sm2||dust)&&Math.random()<.85){const col=si>=4?0xf2f6f8:si==3?0x4a3524:si==1?0xe6e6e6:si==2?0x9a8f6a:0xbfa07a;for(const s2 of[-.9,.9]){if(Math.random()<.6)puff(S.x-fx*1.6+Math.cos(S.h)*s2,S.y,S.z-fz*1.6-Math.sin(S.h)*s2,S.vx,S.vz,col)}}
// tur zamanı
MAP.TR=CUR?CUR.TR:null;if(LAP.reg!==CUR){LAP.reg=CUR;LAP.run=0;LAP.armed=0;LAP.prev=ti}
if(MAP.TR&&!MAP.TR.open&&!EV){const N=MAP.TR.N;if(ti>N*.4&&ti<N*.6)LAP.armed=1;
if(LAP.prev>N*.8&&ti<N*.2){if(LAP.run&&LAP.armed){LAP.last=LAP.t;LAP.best=LAP.best==null?LAP.t:Math.min(LAP.best,LAP.t)}LAP.run=1;LAP.t=0;LAP.armed=0}
if(LAP.run)LAP.t+=dt;LAP.prev=ti}
return{Sf,T,v,si}}
