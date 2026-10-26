// Açık dünya işaretleri (MUTANT): uzaktan görünen yarı saydam ışık sütunu + yerde halka. Renk etkinlik türünü söyler.
// Fizik ve çarpışma yok; yalnız çizim. Yerleşim zemin yüksekliğine göre (H).
import * as THREE from "three";
import { scene } from "./sahne";

export interface Isaret {
  x: number;
  z: number;
  renk: number;
  /** sütun yüksekliği (m); boss daha uzun */
  boy?: number;
  /** Her tür haritaya gitmeden okunabilsin: renk tek başına kimlik değildir. */
  etiket?: string;
}

const grup = new THREE.Group();
grup.visible = false;
scene.add(grup);
const sutunG = new THREE.CylinderGeometry(3.2, 3.2, 1, 20, 1, true),
  halkaG = new THREE.RingGeometry(8, 10, 40);
const malzemeler = new Map<number, [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial]>();
function malzeme(renk: number) {
  let m = malzemeler.get(renk);
  if (!m) {
    m = [
      new THREE.MeshBasicMaterial({
        color: renk,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.75, depthWrite: false }),
    ];
    malzemeler.set(renk, m);
  }
  return m;
}

/** Aynı türdeki işaretler birer tuval dokusu paylaşır; oyun döngüsünde yeni doku yaratılmaz. */
const yaziMalzemeleri = new Map<string, THREE.SpriteMaterial>();
function etiketMalzemesi(ad: string): THREE.SpriteMaterial {
  let m = yaziMalzemeleri.get(ad);
  if (m) return m;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "rgba(8, 15, 23, 0.82)";
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = "#f1f4f5";
    g.lineWidth = 2;
    g.strokeRect(2, 2, 252, 60);
    g.font = "bold 28px sans-serif";
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(ad, 128, 33, 240);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false });
  yaziMalzemeleri.set(ad, m);
  return m;
}

/** MUTANT'ın mevcut işaret renkleriyle eşleşen işlevsel yarış tabelaları. */
const renkYazisi = new Map<number, string>([
  [0xff5a3c, "ASFALT"],
  [0xd08a48, "RALLİKROS"],
  [0x4fbf74, "RALLİ"],
  [0xb67cff, "DRİFT"],
  [0xffd23c, "DRAG"],
  [0x3cc8ff, "ATÖLYE"],
  [0xff2a2a, "BOSS"],
  [0xfff0a8, "SANDIK"],
  [0xff3cc8, "LANETLİ"],
]);

/** işaretleri yeniden kur (boş liste: gizle) */
export function isaretleriKur(liste: readonly Isaret[], H: (x: number, z: number) => number) {
  grup.clear();
  for (const i of liste) {
    const [ms, mh] = malzeme(i.renk),
      boy = i.boy ?? 70,
      y = H(i.x, i.z);
    const s = new THREE.Mesh(sutunG, ms);
    s.scale.y = boy;
    s.position.set(i.x, y + boy / 2, i.z);
    const h = new THREE.Mesh(halkaG, mh);
    h.rotation.x = -Math.PI / 2;
    h.position.set(i.x, y + 0.15, i.z);
    grup.add(s, h);
    const ad = i.etiket ?? renkYazisi.get(i.renk);
    if (ad) {
      const etiket = new THREE.Sprite(etiketMalzemesi(ad));
      etiket.scale.set(28, 7, 1);
      etiket.position.set(i.x, y + 15, i.z);
      etiket.name = "mutant-etiket-" + ad;
      etiket.renderOrder = 10;
      grup.add(etiket);
    }
  }
  grup.visible = liste.length > 0;
}

/** yarışa girince gizle, haritaya dönünce göster */
export const isaretlerGorunur = (g: boolean) => void (grup.visible = g && grup.children.length > 0);
