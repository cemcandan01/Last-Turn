// Garaj sahnesi: dünyadan uzakta dönen platform, kapalı showroom odası (tavan ışıkları yanık), turuncu çizgiler.
// Işık dünyanın saatinden ve havasından bağımsızdır: garajIsigi() açılırken dünya ışığını ezer, kapanırken ortam geri yüklenir.
import * as THREE from "three";
import { scene, hemi, sun, ISIK } from "./sahne";
import { applyEnv, ortam } from "./ortam";
import { lam } from "./yardimci";

/** garajın dünyadaki yeri */
export const GX = 0,
  GZ = -9000;

export const garG = new THREE.Group();
scene.add(garG);
garG.visible = false;
{
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 48), lam(0x4a4d53));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(GX, 0.01, GZ);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.12, 48), lam(0x5d626a));
  tb.position.set(GX, 0.06, GZ);
  const rg = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.05, 6, 64),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c }),
  );
  rg.rotation.x = Math.PI / 2;
  rg.position.set(GX, 0.13, GZ);
  const room = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 16, 48, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x8d877e, side: THREE.BackSide }),
  );
  room.position.set(GX, 8, GZ);
  // tavan ve parlak ışık şeritleri (kapalı bina)
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshBasicMaterial({ color: 0xe9e3d8, side: THREE.DoubleSide }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(GX, 16, GZ);
  garG.add(fl, tb, rg, room, ceil);
  for (let k = 0; k < 4; k++) {
    const lp = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.05, 22),
      new THREE.MeshBasicMaterial({ color: 0xfff6e6 }),
    );
    lp.position.set(GX + (k - 1.5) * 3.2, 15.9, GZ);
    garG.add(lp);
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 6.2832,
      st = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 10, 0.1),
        new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff7a3c : 0x6f8c98 }),
      );
    st.position.set(GX + Math.sin(a) * 29.6, 5.5, GZ + Math.cos(a) * 29.6);
    st.rotation.y = a;
    garG.add(st);
  }
  fl.receiveShadow = true;
  tb.receiveShadow = true;
  // anahtar ışık: tek gölge atan ışık (küçük gölge haritası); sol önden, yüksekten
  const key = new THREE.DirectionalLight(0xfff2e0, 1.0 * ISIK);
  key.position.set(GX - 5, 9, GZ + 6);
  key.target.position.set(GX, 0, GZ);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  const sc = key.shadow.camera;
  sc.left = sc.bottom = -5;
  sc.right = sc.top = 5;
  sc.near = 2;
  sc.far = 24;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 4;
  // dolgu (sağ ön, soğuk, gölgesiz) ve arka kenar ışığı (turuncu)
  const fill = new THREE.DirectionalLight(0xe4ecff, 0.4 * ISIK);
  fill.position.set(GX + 7, 3, GZ + 5);
  fill.target.position.set(GX, 0.5, GZ);
  const rim = new THREE.DirectionalLight(0xffd2a8, 0.55 * ISIK);
  rim.position.set(GX + 2, 4, GZ - 8);
  rim.target.position.set(GX, 0.5, GZ);
  garG.add(key, key.target, fill, fill.target, rim, rim.target);
  // zemin diski üstünde yumuşak, koyu gölge lekesi (gölge haritası kapalı ya da zayıf olsa da kök oturur)
  const lc = document.createElement("canvas");
  lc.width = lc.height = 128;
  const cx = lc.getContext("2d")!,
    gr = cx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.55)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.4),
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
  (scene.background as THREE.Color).setHex(0xe9e3d8);
  // sis kapatılmaz (malzemeler yeniden derlenmesin), yalnız çok uzağa itilir
  const fog = scene.fog as THREE.Fog;
  fog.near = 1e5;
  fog.far = 2e5;
  hemi.color.setHex(0xfff4e4);
  hemi.groundColor.setHex(0x9a9288);
  hemi.intensity = 0.6 * ISIK;
}
