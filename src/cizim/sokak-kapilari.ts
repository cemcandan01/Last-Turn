// LT-SYS-008 sokak yarışı kontrol noktaları: rota boyunca her ~250 m'de bir kapı (iki direk + üst bant), bitişte
// damalı bant. Yalnız sokak yarışı sürerken görünür; yarış bitince kaldırılır. Görsel: kuralı yarislar.ts işler.
import * as THREE from "three";
import type { Pist } from "../dunya/pist";
import { scene } from "./sahne";

const grup = new THREE.Group();
grup.name = "sokak-kapilari";
scene.add(grup);
const direkMat = new THREE.MeshLambertMaterial({ color: 0xff8fd8 }),
  bantMat = new THREE.MeshBasicMaterial({ color: 0xff8fd8, transparent: true, opacity: 0.85 }),
  bitisMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

/** kontrol noktası aralığı (m) */
export const KAPI_ARA = 250;

/** rota için kapıları kur (null: kaldır) */
export function sokakKapilariKur(TR: Pist | null) {
  for (const c of [...grup.children]) {
    grup.remove(c);
    (c as THREE.Mesh).geometry?.dispose();
  }
  if (!TR) return;
  const ekle = (i: number, bitis: boolean) => {
    const [x, z] = TR.P[i],
      [tx, tz] = TR.T[i],
      nx = tz,
      nz = -tx,
      w = TR.hw + 1;
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), direkMat);
      d.position.set(x + nx * w * s, 3, z + nz * w * s);
      grup.add(d);
    }
    const b = new THREE.Mesh(new THREE.BoxGeometry(2 * w, 1, 0.3), bitis ? bitisMat : bantMat);
    b.position.set(x, 6, z);
    b.rotation.y = Math.atan2(tx, tz);
    grup.add(b);
  };
  let son = 0;
  for (let i = 1; i < TR.N; i++)
    if (TR.S[i] - son >= KAPI_ARA) {
      son = TR.S[i];
      ekle(i, false);
    }
  ekle(TR.open ? TR.N - 1 : 0, true);
}
