// Aynalar: yan aynalar ve iç dikiz aynası, aracın arkasına bakan küçük bir kameranın görüntüsünü gösterir.
// Görüntü yalnız kokpitte ve iki karede bir, düşük çözünürlükte çizilir (telefonda kare hızı korunsun);
// başka kameralarda ayna yüzleri koyu camdır.
import * as THREE from "three";
import { scene } from "./sahne";

const rt = new THREE.WebGLRenderTarget(384, 128);
/** arkaya bakan kamera: gövdeye bağlı, aracın arka üstünde (aracModeliKur yerleştirir) */
export const arkaKam = new THREE.PerspectiveCamera(42, 3, 0.5, 400);
const aynaM = new THREE.MeshBasicMaterial({ map: rt.texture }),
  kapaliM = new THREE.MeshLambertMaterial({ color: 0x2a3540 });
const yuzler: THREE.Mesh[] = [];
let acik = false,
  sayac = 0,
  cizim = 0;

/** araç yeniden kurulurken eski ayna yüzlerini unut */
export function aynalariSifirla() {
  yuzler.length = 0;
}

/**
 * sürücüye (gövdenin arkasına) dönük ayna yüzü. Arka görüntünün yatay aralığı: a yüzün sürücüye göre solunda,
 * b sağında (aynada sağ-sol ters: 1 aracın sol arkası, 0 sağ arkası)
 */
export function aynaYuzu(w: number, h: number, a: number, b: number) {
  const g = new THREE.PlaneGeometry(w, h),
    uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) < 0.5 ? a : b);
  const q = new THREE.Mesh(g, acik ? aynaM : kapaliM);
  q.rotation.y = Math.PI;
  yuzler.push(q);
  return q;
}

/** her karede, sahne çizildikten sonra: kokpitteyse arka görüntüyü tazele */
export function aynaCiz(R: THREE.WebGLRenderer, ck: boolean) {
  if (ck != acik) {
    acik = ck;
    for (const q of yuzler) q.material = ck ? aynaM : kapaliM;
  }
  if (!ck || ++sayac % 2) return;
  for (const q of yuzler) q.visible = false;
  const au = R.shadowMap.autoUpdate;
  R.shadowMap.autoUpdate = false;
  R.setRenderTarget(rt);
  R.render(scene, arkaKam);
  R.setRenderTarget(null);
  cizim++;
  R.shadowMap.autoUpdate = au;
  for (const q of yuzler) q.visible = true;
}

/** testler için: ayna yüzü sayısı, açık mı, kaç kez çizildi, arka görüntünün ortasındaki piksel */
export function aynaDurumu(R: THREE.WebGLRenderer) {
  const px = new Uint8Array(4);
  R.readRenderTargetPixels(rt, rt.width / 2, rt.height / 2, 1, 1, px);
  return { yuz: yuzler.length, acik, cizim, orta: [...px] };
}
