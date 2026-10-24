// Garaj sahnesi: dünyadan uzakta dönen platform, yarı karanlık beton otopark (kolonlar, tavandan ışık hüzmeleri, hafif sis).
// Işık dünyanın saatinden ve havasından bağımsızdır: garajIsigi() açılırken dünya ışığını ezer, kapanırken ortam geri yüklenir.
import * as THREE from "three";
import { scene, hemi, sun, ISIK } from "./sahne";
import { applyEnv, ortam } from "./ortam";
import { lam } from "./yardimci";

/** garajın dünyadaki yeri */
export const GX = 0,
  GZ = -9000;

/** platformun yarı kenarı (kare); köşe lambaları köşelerde durur */
const PK = 4.6;
export const garG = new THREE.Group();
scene.add(garG);
garG.visible = false;
/** beton dokusu (küçük kanvas, bir kez): koyu gri leke + ince çatlak çizgileri */
function betonDoku(taban: string, cizgi = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = taban;
  x.fillRect(0, 0, 128, 128);
  let r = 12345;
  const rnd = () => (r = (r * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let k = 0; k < 420; k++) {
    x.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${0.02 + rnd() * 0.05})`;
    x.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 5, 1 + rnd() * 5);
  }
  if (cizgi) {
    x.strokeStyle = "rgba(0,0,0,.35)";
    x.strokeRect(0.5, 0.5, 127, 127);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** platform halkasının malzemesi: rengi mağazadaki tür süzgecine göre değişir (`garajTemasi`) */
const halkaM = new THREE.MeshBasicMaterial({ color: 0xff8a2a });

/** garaj vurgu rengi: tür rengi ya da (null) varsayılan turuncu */
export function garajTemasi(renk: string | null) {
  halkaM.color.set(renk ?? 0xff8a2a);
}

{
  // zemin: koyu beton plakalar; ortada araç platformu (turuncu halka) ve park çizgileri
  const zt = betonDoku("#3b4047", true);
  zt.repeat.set(12, 12);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshLambertMaterial({ map: zt }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(GX, 0.01, GZ);
  const tb = new THREE.Mesh(new THREE.BoxGeometry(2 * PK, 0.1, 2 * PK), lam(0x4a4f57));
  tb.position.set(GX, 0.06, GZ);
  const rg = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.04, 6, 64), halkaM);
  rg.rotation.x = Math.PI / 2;
  rg.position.set(GX, 0.12, GZ);
  // duvar (silindir) ve alçak beton tavan
  const dt = betonDoku("#2e3238");
  dt.repeat.set(10, 2);
  const room = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 9, 48, 1, true),
    new THREE.MeshLambertMaterial({ map: dt, side: THREE.BackSide }),
  );
  room.position.set(GX, 4.5, GZ);
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshBasicMaterial({ color: 0x14171c, side: THREE.DoubleSide }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(GX, 9, GZ);
  garG.add(fl, tb, rg, room, ceil);
  // kolonlar: iki halka, tavana kadar; tabanında turuncu-sarı uyarı bandı
  const kol = new THREE.BoxGeometry(1.1, 9, 1.1),
    kolM = new THREE.MeshLambertMaterial({ map: betonDoku("#4b5058") }),
    bant = new THREE.BoxGeometry(1.14, 0.5, 1.14),
    bantM = new THREE.MeshBasicMaterial({ color: 0xd8a21c });
  for (const [yaricap, n] of [
    [13, 8],
    [22, 12],
  ] as const)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.2832 + (yaricap > 20 ? 0.26 : 0),
        px = GX + Math.sin(a) * yaricap,
        pz = GZ + Math.cos(a) * yaricap,
        m = new THREE.Mesh(kol, kolM),
        b = new THREE.Mesh(bant, bantM);
      m.position.set(px, 4.5, pz);
      b.position.set(px, 0.55, pz);
      garG.add(m, b);
    }
  // tavandan sarkan ışık armatürleri ve ışık hüzmeleri (yarı saydam, toplamalı koni; ışık kaynağı değil, ucuz)
  const arm = new THREE.BoxGeometry(2.6, 0.12, 0.35),
    armM = new THREE.MeshBasicMaterial({ color: 0xf4f8ff }),
    huzme = new THREE.ConeGeometry(2.6, 8.4, 20, 1, true),
    huzmeM = new THREE.MeshBasicMaterial({
      color: 0x9fc4ff,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  for (const [dx, dz, r] of [
    [-1.2, 1.4, 0.9],
    [3.4, -2.4, 0.3],
    [-5.5, -3.5, 0],
    [6.5, 4, 1.2],
  ] as const) {
    const l = new THREE.Mesh(arm, armM),
      h = new THREE.Mesh(huzme, huzmeM);
    l.position.set(GX + dx, 8.7, GZ + dz);
    l.rotation.y = r;
    h.position.set(GX + dx, 4.5, GZ + dz);
    garG.add(l, h);
  }
  fl.receiveShadow = true;
  tb.receiveShadow = true;
  // tepeden tek genel ışık: yumuşak, hafif gölgeli (küçük gölge haritası); araç altına gölge düşer
  const key = new THREE.DirectionalLight(0xe8f0ff, 0.75 * ISIK);
  key.position.set(GX - 0.6, 11, GZ + 0.8);
  key.target.position.set(GX, 0, GZ);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -5;
  sc.right = sc.top = 5;
  sc.near = 2;
  sc.far = 24;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 6;
  garG.add(key, key.target);
  // platformun dört köşesinde projektör: gövdeleri görünür, ışıkları araca yönelik (gölgesiz SpotLight, sayı sabit)
  const dir = new THREE.BoxGeometry(0.34, 0.34, 0.34),
    dirM = lam(0x2a2e35),
    mercek = new THREE.BoxGeometry(0.26, 0.26, 0.04),
    direk = new THREE.BoxGeometry(0.12, 0.7, 0.12);
  const renk = [0xfff2dc, 0xdbe8ff, 0xdbe8ff, 0xfff2dc];
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].forEach(([sx, sz], k) => {
    const px = GX + sx * (PK - 0.35),
      pz = GZ + sz * (PK - 0.35),
      ph = new THREE.Group();
    ph.position.set(px, 0.1, pz);
    const d = new THREE.Mesh(direk, dirM);
    d.position.y = 0.35;
    const g = new THREE.Mesh(dir, dirM);
    g.position.y = 0.85;
    const m = new THREE.Mesh(mercek, new THREE.MeshBasicMaterial({ color: renk[k] }));
    m.position.set(0, 0.85, -0.19);
    ph.add(d, g, m);
    ph.lookAt(GX, 0.85, GZ);
    garG.add(ph);
    const sp = new THREE.SpotLight(renk[k], 2.1 * ISIK, 0, 0.62, 0.85, 0);
    sp.position.set(px, 0.95, pz);
    sp.target.position.set(GX, 0.55, GZ);
    garG.add(sp, sp.target);
  });
  // zemin diski üstünde yumuşak, koyu gölge lekesi (gölge haritası kapalı ya da zayıf olsa da kök oturur)
  const lc = document.createElement("canvas");
  lc.width = lc.height = 128;
  const cx = lc.getContext("2d")!,
    gr = cx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.7)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(GX, 0.125, GZ);
  garG.add(blob);
}

/** garaj ışığı: dünya ışığını (gökyüzü, sis, yarım küre ışığı, güneş) kapatıp nötr-sıcak showroom ışığına geç; kapanınca dünya ortamı geri gelir */
export function garajIsigi(ac: boolean) {
  if (!ac) {
    applyEnv(ortam.k);
    sun.visible = true;
    return;
  }
  sun.visible = false;
  // koyu soğuk mavi-gri depo: sis uzak duvarları ve kolonları karanlığa gömer (araç sahnenin tek parlak şeyi)
  (scene.background as THREE.Color).setHex(0x0a0d12);
  const fog = scene.fog as THREE.Fog;
  fog.color.setHex(0x0a0d12);
  fog.near = 10;
  fog.far = 42;
  hemi.color.setHex(0x9db4d6);
  hemi.groundColor.setHex(0x1b1d22);
  hemi.intensity = 0.28 * ISIK;
}
