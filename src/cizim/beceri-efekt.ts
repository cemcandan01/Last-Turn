// MUTANT skill efektleri (LT-SYS-005): her skill'in ayırt edici, ucuz görüntüsü. Yalnız gösterir; oynanışa yazmaz.
// Grafik ayarından (gölge) bağımsız aynı çizilir: efekt oyuncuya bilgi verir (kanca neye bağlı, faz ne zaman biter,
// alev izi nerede yakar), bu yüzden kapatılmaz; hepsi gölgesiz, ışıksız (MeshBasic) ve sabit havuzlu, en çok ~40 çizim.
//  - Grappling Hook: araçtan bağlantıya parlak halat + uçta kanca halkası; bağlanınca kısa parlama.
//  - Flying Dutchman: araç yarı saydam soluk mavi hayalet; faz başlarken ve biterken genişleyen halka.
//  - Risk Taker: dönüşümde araçtan çıkan alevler, yerde gerçek alev izinin (hasar alanı) kor alevleri, dönüşüm anında
//    turuncu halka.
//  - Slipstream Engine: depo boşalırken araç çevresinde mavi rüzgâr çizgileri.
import * as THREE from "three";
import { scene } from "./sahne";
import { puff } from "./parcaciklar";

export interface BeceriEfektGirdisi {
  /** oyuncu aracının çizim konumu ve yönü */
  x: number;
  y: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  /** kanca bağlıysa ucu (dünya, zemin yüksekliği dahil) */
  kanca: [number, number, number] | null;
  hayalet: boolean;
  /** Risk Taker dönüşümü açık mı; alev izinin noktaları [x, z, kalan sn] ve zemin yüksekliği */
  donusum: boolean;
  iz: readonly (readonly [number, number, number])[];
  zemin(x: number, z: number): number;
  /** Slipstream gücü boşalıyor */
  ruzgar: boolean;
}

const halatMat = new THREE.MeshBasicMaterial({ color: 0xffd23c }),
  halat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true), halatMat),
  ucMat = new THREE.MeshBasicMaterial({ color: 0xffd23c }),
  uc = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.14, 6, 14), ucMat),
  halkaMat = new THREE.MeshBasicMaterial({
    color: 0x9fe8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
  halka = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.4, 32), halkaMat),
  hayaletMat = new THREE.MeshBasicMaterial({
    color: 0xb8ecff,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  }),
  korGeo = new THREE.ConeGeometry(0.45, 1.3, 6),
  korMat = new THREE.MeshBasicMaterial({
    color: 0xff6a1f,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }),
  KOR_SAYI = 26,
  korlar: THREE.Mesh[] = [];
halat.visible = uc.visible = halka.visible = false;
halka.rotation.x = -Math.PI / 2;
scene.add(halat, uc, halka);
for (let i = 0; i < KOR_SAYI; i++) {
  const m = new THREE.Mesh(korGeo, korMat);
  m.visible = false;
  scene.add(m);
  korlar.push(m);
}

const once = { kanca: false, hayalet: false, donusum: false };
let halkaT = 0,
  sayac = 0,
  t = 0;
const YUKARI = new THREE.Vector3(0, 1, 0),
  A = new THREE.Vector3(),
  B = new THREE.Vector3();

/** kısa genişleyen halka (faz/dönüşüm/kanca başlangıcı) */
function halkaBaslat(col: number) {
  halkaMat.color.setHex(col);
  halkaT = 0.45;
}

/** hayalet malzemesi: gövde ağaçlarındaki mesh'lerin özgün malzemesi userData'da saklanır */
function hayaletUygula(kok: THREE.Object3D | null, acik: boolean) {
  kok?.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (acik) {
      if (!m.userData.ozgunMat) m.userData.ozgunMat = m.material;
      m.material = hayaletMat;
      m.castShadow = false;
    } else if (m.userData.ozgunMat) {
      m.material = m.userData.ozgunMat;
      delete m.userData.ozgunMat;
      m.castShadow = true;
    }
  });
}

/** her karede (sürüşte): efektleri yerleştir. govde: oyuncu aracının görünen modeli (hayalet için) */
export function beceriEfektleri(
  dt: number,
  e: BeceriEfektGirdisi | null,
  govde: readonly (THREE.Object3D | null)[],
) {
  t += dt;
  const k = e?.kanca ?? null;
  // kanca halatı: aracın burnundan bağlantıya
  if (e && k) {
    const fx = Math.sin(e.h),
      fz = Math.cos(e.h);
    A.set(e.x + fx * 1.6, e.y + 0.7, e.z + fz * 1.6);
    B.set(k[0], k[1], k[2]);
    const L = A.distanceTo(B);
    halat.position.copy(A).add(B).multiplyScalar(0.5);
    halat.scale.set(1, L, 1);
    halat.quaternion.setFromUnitVectors(YUKARI, B.sub(A).normalize());
    uc.position.set(k[0], k[1], k[2]);
    uc.rotation.y += dt * 9;
    // halat gerilir: hafif titreşen parlaklık
    halatMat.color.setHSL(0.13, 1, 0.55 + 0.12 * Math.sin(t * 40));
    if (!once.kanca) halkaBaslat(0xffd23c);
  }
  halat.visible = uc.visible = !!(e && k);
  once.kanca = !!(e && k);
  // hayalet: gövde yarı saydam, giriş/çıkışta halka
  const hay = !!e?.hayalet;
  if (hay != once.hayalet) {
    for (const g of govde) hayaletUygula(g, hay);
    halkaBaslat(0x9fe8ff);
  }
  if (hay) hayaletMat.opacity = 0.26 + 0.1 * Math.sin(t * 12);
  once.hayalet = hay;
  // Risk Taker: dönüşüm anı halkası, araçtan alev, yerde kor (alev izinin gerçek hasar noktaları)
  const don = !!e?.donusum;
  if (don && !once.donusum) halkaBaslat(0xff7a1f);
  once.donusum = don;
  sayac++;
  if (e && don && sayac % 2 == 0) {
    const gx = -Math.sin(e.h),
      gz = -Math.cos(e.h),
      yx = Math.cos(e.h),
      yz = -Math.sin(e.h),
      yan = sayac % 4 ? 0.8 : -0.8;
    puff(
      e.x + gx * 2 + yx * yan,
      e.y - 0.2,
      e.z + gz * 2 + yz * yan,
      e.vx * 0.6,
      e.vz * 0.6,
      sayac % 6 ? 0xff6a1f : 0xffc23c,
      0.5,
    );
  }
  if (e && hay && sayac % 5 == 0)
    puff(
      e.x + (Math.random() - 0.5) * 2,
      e.y,
      e.z + (Math.random() - 0.5) * 3,
      e.vx * 0.8,
      e.vz * 0.8,
      0xcfefff,
      0.6,
    );
  if (e && e.ruzgar && sayac % 3 == 0) {
    const yx = Math.cos(e.h),
      yz = -Math.sin(e.h),
      yan = sayac % 2 ? 1.3 : -1.3;
    puff(e.x + yx * yan, e.y + 0.4, e.z + yz * yan, -e.vx * 0.5, -e.vz * 0.5, 0x8fd0ff, 0.3);
  }
  const iz = e?.iz ?? [];
  for (let i = 0; i < KOR_SAYI; i++) {
    const m = korlar[i],
      p = iz[iz.length - 1 - i];
    m.visible = !!p && !!e;
    if (!p || !e) continue;
    const s = Math.min(1, p[2] / 0.6) * (0.85 + 0.25 * Math.sin(t * 30 + i));
    m.position.set(p[0], e.zemin(p[0], p[1]) + 0.6 * s, p[1]);
    m.scale.set(s, s * (1 + 0.3 * Math.sin(t * 22 + i * 1.7)), s);
  }
  // genişleyen halka (aracın altında)
  if (halkaT > 0 && e) {
    halkaT -= dt;
    const f = 1 - halkaT / 0.45;
    halka.visible = true;
    halka.position.set(e.x, e.y - 0.3, e.z);
    halka.scale.setScalar(1 + f * 3);
    halkaMat.opacity = 0.85 * (1 - f);
  } else halka.visible = false;
}

/** sürüş dışında (menü, garaj) her şeyi gizle ve hayaleti geri al */
export function beceriEfektleriSifirla(govde: readonly (THREE.Object3D | null)[]) {
  beceriEfektleri(0, null, govde);
  halkaT = 0;
  halka.visible = false;
}
