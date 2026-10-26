// Parçacıklar: toz, lastik dumanı, su sıçraması. 60 kürelik havuz, sırayla yeniden kullanılır.
import * as THREE from "three";
import { cam, scene } from "./sahne";
import { cock } from "./kokpit";

/** kokpit kamerasında bu yarıçaptaki (aracın içi ve hemen çevresi) parçacıklar çizilmez */
const KOKPIT_YARICAP2 = 5 * 5;

interface Parcacik {
  m: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  l: number;
  v: THREE.Vector3;
  /** boy çarpanı (alev küçük, toz büyük) */
  b: number;
}

const parts: Parcacik[] = [];
const geo = new THREE.SphereGeometry(0.5, 6, 5);
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0xbfa07a, transparent: true, opacity: 0, depthWrite: false }),
  );
  m.visible = false;
  scene.add(m);
  parts.push({ m, l: 0, v: new THREE.Vector3(), b: 1 });
}
let pi = 0;

/** bir toz bulutu çıkar */
export function puff(x: number, y: number, z: number, vx: number, vz: number, col: number, b = 1) {
  const p = parts[pi++ % parts.length];
  p.m.position.set(x, y + 0.3, z);
  p.m.material.color.setHex(col);
  p.l = 1;
  p.b = b;
  p.v.set(vx * 0.2, (1.2 + Math.random()) * b, vz * 0.2);
  p.m.visible = true;
}

/** MUTANT nitro alevi: egzozdan geriye kısa, küçük turuncu/mavi dil (toz havuzunu paylaşır; 3 karede bir) */
let alevSayac = 0;
export function nitroAlevi(x: number, y: number, z: number, h: number, vx: number, vz: number) {
  if (alevSayac++ % 3) return;
  const gx = -Math.sin(h),
    gz = -Math.cos(h);
  puff(
    x + gx * 2.3,
    y - 0.1,
    z + gz * 2.3,
    vx + gx * 12,
    vz + gz * 12,
    alevSayac % 2 ? 0xff7a3c : 0x5ab4ff,
    0.35,
  );
}

/** parçacıkları ilerlet: büyür, söner */
export function parcacikTick(dt: number) {
  for (const p of parts) {
    if (p.l > 0) {
      p.l -= dt * 1.1;
      p.m.position.addScaledVector(p.v, dt);
      const s = p.b * (1 + (1 - p.l) * 3);
      p.m.scale.set(s, s, s);
      p.m.material.opacity = Math.max(0, p.l * 0.45);
      if (cock.visible && p.m.position.distanceToSquared(cam.position) < KOKPIT_YARICAP2)
        p.m.material.opacity = 0;
      if (p.l <= 0) p.m.visible = false;
    }
  }
}
