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
  }
  grup.visible = liste.length > 0;
}

/** yarışa girince gizle, haritaya dönünce göster */
export const isaretlerGorunur = (g: boolean) => void (grup.visible = g && grup.children.length > 0);
