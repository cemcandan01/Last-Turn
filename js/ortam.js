// Ortam: günün saati ve hava (applyEnv), yağış parçacıkları, gölge
// ---------- ortam: günün saati ve hava. Tema zemini ve dekoru verir, saat ve hava ışığı, gökyüzünü, yağışı ve tutuşu belirler
const TODS={morning:'Sabah',noon:'Öğlen',evening:'Akşam'},WXS={sun:'Güneşli',rain:'Yağmurlu',snow:'Karlı'};
const COND={tod:'noon',wx:'sun'},WX={g:1},SUNDIR=new THREE.Vector3(60,120,40).normalize();
// temanın varsayılan koşulları (karlı haritada kar yağar, gece temaları akşam)
const condOf=k=>({tod:{city:'evening',coast:'evening',port:'evening',mount:'evening'}[k]||'noon',wx:k=='snow'?'snow':'sun'});
let ENVK='day';
function applyEnv(k){ENVK=k;const t=thOf(k),c=COND,sky=C3(t.sky),night=t.night&&c.tod=='evening'||c.tod=='night';let hi=t.hemi[2],si=t.sun[1],sc=C3(t.sun[0]),fn=t.fog[0],ff=t.fog[1];
if(t.night&&!night){sky.setHex(0x9fb8d0);hi=.78;si=.85;sc.setHex(0xfff1d6)}
if(c.tod=='night'&&!t.night){sky.setHex(0x070b12);hi=.26;si=.08;sc.setHex(0x8899cc);fn*=.5;ff*=.6}
if(c.tod=='morning'){sky.lerp(C3(0xf6dcb4),.35);sc.lerp(C3(0xffe2b0),.6);si*=.85;hi*=.9;SUNDIR.set(-80,45,60).normalize()}
else if(c.tod=='evening'&&!night){sky.lerp(C3(0xf08a5a),.45);sc.lerp(C3(0xff8a4a),.7);si*=.75;hi*=.75;SUNDIR.set(85,28,-40).normalize()}
else SUNDIR.set(60,120,40).normalize();
WX.g=1;if(c.wx=='rain'){sky.lerp(C3(night?0x0d1218:0x6f7882),.7);fn*=.35;ff*=.5;hi*=.75;si*=.3;WX.g=.84}
else if(c.wx=='snow'){sky.lerp(C3(night?0x1a2028:0xc9d3dc),.7);fn*=.3;ff*=.5;hi*=.9;si*=.4;WX.g=k=='snow'?.9:.74}
scene.background.copy(sky);scene.fog.color.copy(sky);scene.fog.near=fn;scene.fog.far=ff;hemi.color.setHex(t.hemi[0]);hemi.groundColor.setHex(t.hemi[1]);hemi.intensity=hi;sun.color.copy(sc);sun.intensity=si;
const gk=k+(c.wx=='snow'&&k!='snow'?'_s':'');ground.material.map=gTex[gk]||(gTex[gk]=ctex(...t.gr.map(h=>c.wx=='snow'&&k!='snow'?'#'+C3(h).lerp(C3(0xe8eef2),.7).getHexString():h),240));ground.material.needsUpdate=true;
mT.color.setHex(t.leaf);mK.color.setHex(t.trunk);mR.color.setHex(t.rock);mB.color.setHex(t.bush);headL.intensity=night||c.wx=='rain'&&c.tod=='evening'?2.4:0;
precip.visible=c.wx!='sun';precip.userData.snow=c.wx=='snow';precip.material.color.setHex(c.wx=='snow'?0xffffff:0xa9b8c8);precip.material.size=c.wx=='snow'?.22:.09}
// yağış: kameranın çevresinde dönen parçacık bulutu
const PN=1600,precip=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xffffff,size:.2,transparent:true,opacity:.85,depthWrite:false}));
{const a=new Float32Array(PN*3);for(let i=0;i<PN;i++){a[i*3]=(Math.random()-.5)*70;a[i*3+1]=Math.random()*30;a[i*3+2]=(Math.random()-.5)*70}precip.geometry.setAttribute('position',new THREE.BufferAttribute(a,3));precip.frustumCulled=false;precip.visible=false;scene.add(precip)}
function precipTick(dt){if(!precip.visible)return;const a=precip.geometry.attributes.position.array,sn=precip.userData.snow,vy=sn?2.2:26;
for(let i=0;i<PN;i++){let y=a[i*3+1]-vy*dt;if(sn){a[i*3]+=Math.sin(tt*1.3+i)*dt*.8}if(y<0){y+=30;a[i*3]=(Math.random()-.5)*70;a[i*3+2]=(Math.random()-.5)*70}a[i*3+1]=y}
precip.geometry.attributes.position.needsUpdate=true;precip.position.set(cam.position.x,cam.position.y-12,cam.position.z)}
// gölge: güneş aracı izler, yalnız çevresindeki 90 m gölge alır
function shadowTick(){if(!set.shd){if(sun.castShadow){sun.castShadow=false}return}sun.castShadow=true;sun.target.position.set(S.x,S.y,S.z);sun.position.set(S.x+SUNDIR.x*150,S.y+SUNDIR.y*150,S.z+SUNDIR.z*150)}
function shadowize(g){g.traverse(o=>{if(o.isMesh||o.isInstancedMesh){o.receiveShadow=true;o.castShadow=!o.userData.flat}})}
