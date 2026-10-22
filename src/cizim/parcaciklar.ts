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
  parts.push({ m, l: 0, v: new THREE.Vector3() });
}
let pi = 0;

/** bir toz bulutu çıkar */
export function puff(x: number, y: number, z: number, vx: number, vz: number, col: number) {
  const p = parts[pi++ % parts.length];
  p.m.position.set(x, y + 0.3, z);
  p.m.material.color.setHex(col);
  p.l = 1;
  p.v.set(vx * 0.2, 1.2 + Math.random(), vz * 0.2);
  p.m.visible = true;
}

/** parçacıkları ilerlet: büyür, söner */
export function parcacikTick(dt: number) {
  for (const p of parts) {
    if (p.l > 0) {
      p.l -= dt * 1.1;
      p.m.position.addScaledVector(p.v, dt);
      const s = 1 + (1 - p.l) * 3;
      p.m.scale.set(s, s, s);
      p.m.material.opacity = Math.max(0, p.l * 0.45);
      if (cock.visible && p.m.position.distanceToSquared(cam.position) < KOKPIT_YARICAP2)
        p.m.material.opacity = 0;
      if (p.l <= 0) p.m.visible = false;
    }
  }
}
