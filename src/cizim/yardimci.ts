// three.js kısayolları: renk, vektör, mat malzeme, kutu
import * as THREE from "three";

export const C3 = (h: number) => new THREE.Color(h);
export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });

/** konumlanmış kutu; rx verilirse x ekseninde eğilir */
export const bx = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
  rx?: number,
) => {
  const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  q.position.set(x, y, z);
  if (rx) q.rotation.x = rx;
  return q;
};
