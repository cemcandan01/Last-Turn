// Zemin çimi araçla birlikte kayar (doku adımına oturtulur), böylece her bölgenin altında çim olur
import * as THREE from "three";
import { ctex } from "./dokular";
import { scene } from "./sahne";

/** zemin dokusunun adımı (m) */
export const GT = 12.5;

export const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial());
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
ground.receiveShadow = true;
scene.add(ground);

/** doku tarayıcıda (canvas) çizilir: Node testlerinde çağrılmaz */
export function zeminKur() {
  ground.material.map = ctex("#3f7a3a", "#376d33", "#4a8743", 240);
  ground.material.needsUpdate = true;
}

/** zemini aracın altına taşı */
export function zeminTasi(x: number, z: number) {
  ground.position.x = Math.round(x / GT) * GT;
  ground.position.z = Math.round(z / GT) * GT;
}
