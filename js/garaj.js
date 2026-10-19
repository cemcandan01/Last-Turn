// Garaj: dönen platform, özellik çubukları, yarış öncesi araç seçimi
// ---------- garaj: araçları incele, seç. Yarıştan önce de buradan araç seçilir
const GX=0,GZ=-9000,garG=new THREE.Group();scene.add(garG);garG.visible=false;
{const fl=new THREE.Mesh(new THREE.CircleGeometry(30,48),lam(0x1c2024));fl.rotation.x=-Math.PI/2;fl.position.set(GX,.01,GZ);
const tb=new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.8,.12,48),lam(0x3a3f46));tb.position.set(GX,.06,GZ);
const rg=new THREE.Mesh(new THREE.TorusGeometry(3.7,.05,6,64),new THREE.MeshBasicMaterial({color:0xff7a3c}));rg.rotation.x=Math.PI/2;rg.position.set(GX,.13,GZ);
const room=new THREE.Mesh(new THREE.CylinderGeometry(30,30,16,48,1,true),new THREE.MeshLambertMaterial({color:0x161a1e,side:THREE.BackSide}));room.position.set(GX,8,GZ);garG.add(fl,tb,rg,room);
for(let k=0;k<12;k++){const a=k/12*6.2832,st=new THREE.Mesh(new THREE.BoxGeometry(.3,10,.1),new THREE.MeshBasicMaterial({color:k%2?0xff7a3c:0x3a5560}));st.position.set(GX+Math.sin(a)*29.6,5.5,GZ+Math.cos(a)*29.6);st.rotation.y=a;garG.add(st)}
const pl=new THREE.PointLight(0xfff4e0,1.1,45);pl.position.set(GX+5,9,GZ+6);garG.add(pl)}
// özellik puanları: ölçülen değerlerden (Dengeli yardım seviyesi)
function estTop(c){const pr=PRESETS[c.pk],T=TIRES[pr.tire],top=VMAX*T.t[1]*pr.v.top*c.top*(1-.04*(pr.v.aero-1));let v=1;
while(v<150){const E=Math.min(9.5*c.trq,240*c.pw/v)/c.m*(1-Math.pow(Math.min(v/top,1.2),4))-1.2-.05*v;if(E<=0)break;v+=.05}return v*3.6}
const STAT=c=>[['Azami hız',estTop(c)/360,Math.round(estTop(c))+' km/sa'],['Hızlanma',2/c.a100,'0-100: '+c.a100.toFixed(1)+' sn'],['Güç',c.hp/1100,c.hp+' hp'],
['Yol tutuşu',c.lat/3.4,''],['Arazi',c.gr[0]*(1+.35*c.awd)/1.65,''],['Fren',(30-c.b100)/23,'100-0: '+c.b100+' m'],['Çeviklik',.62/c.t90,'']];
let GAR=null;
function openGarage(ev){const prev=CARS.indexOf(CAR),rec=ev!=null?CARS.findIndex(c=>c.ty==EVENTS[ev].ty):-1;GAR={ev,prev,rec,i:rec>=0?rec:prev};mode='garage';ly=0;
['#menu','#hud','#mm','#ctl','#set','#res'].forEach(s=>$(s).classList.add('hidden'));MAP.g.visible=false;for(const q of REG)if(q.g)q.g.visible=false;ground.visible=false;garG.visible=true;showGar()}
function closeGarage(){garG.visible=false;$('#gar').classList.add('hidden');GAR=null}
function showGar(){const c=CARS[GAR.i];if(CAR!==c)setCar(GAR.i);const g=$('#gar');g.classList.remove('hidden');
g.innerHTML=`<div class="gh"><button class="ga" id="gpv">◀</button><div style="flex:1;text-align:center"><h1>${c.n}</h1><span class="bdg">${c.ic} ${c.st}</span>${GAR.i==GAR.rec?'<span class="bdg rec">Önerilen</span>':''}</div><button class="ga" id="gnx">▶</button></div>
<div class="gl">${CARS.map((q,k)=>`<div class="gc ${k==GAR.i?'sel':''}" data-gi="${k}"><b>${q.ic}</b>${q.n}</div>`).join('')}</div>
<p>${c.d}</p>${STAT(c).map(([n,f,t])=>`<div class="st"><span>${n}</span><i><u style="width:${Math.round(cl(f,.05,1)*100)}%"></u></i><em>${t}</em></div>`).join('')}
<p style="font-size:14px;margin-top:8px">${c.hp} hp · ${c.kg} kg · ${c.awd?'Dört çeker':'Arkadan itiş'} · Önayar: ${PRESETS[c.pk].n}</p>
<button class="btn" id="gok">${GAR.ev!=null?'Bu araçla yarış: '+EVENTS[GAR.ev].n:'Bu aracı kullan'}</button><button class="btn alt" id="gbk">Geri</button>`;
const go=k=>{GAR.i=(k+CARS.length)%CARS.length;showGar()};$('#gpv').onclick=()=>go(GAR.i-1);$('#gnx').onclick=()=>go(GAR.i+1);g.querySelectorAll('.gc').forEach(e=>e.onclick=()=>go(+e.dataset.gi));
$('#gbk').onclick=()=>{setCar(GAR.prev);closeGarage();showMenu()};
$('#gok').onclick=()=>{const {ev,i,prev}=GAR;closeGarage();if(ev!=null){setCar(prev);startEvent(ev,i)}else{PK=CAR.pk;applyPreset();showMenu()}}}
let camMode=0,bigT=0;
function note(t,sz){const b=$('#big');b.textContent=t;b.style.fontSize=(sz||34)+'px';bigT=1.2}
const parts=[];for(let i=0;i<60;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.5,6,5),new THREE.MeshBasicMaterial({color:0xbfa07a,transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);parts.push({m,l:0,v:new THREE.Vector3()})}
let pi=0;function puff(x,y,z,vx,vz,col){const p=parts[pi++%parts.length];p.m.position.set(x,y+.3,z);p.m.material.color.setHex(col);p.l=1;p.v.set(vx*.2,1.2+Math.random(),vz*.2);p.m.visible=true}
