// Ortak malzemeler: araç gövdesi, koyu parçalar, camlar, farlar
import * as THREE from "three";
import { lam } from "./yardimci";

export const bm = new THREE.MeshLambertMaterial({ color: 0xff7a3c }),
  dk = new THREE.MeshLambertMaterial({ color: 0x1b2328 }),
  glassM = lam(0x18232d),
  /** ön ve arka cam: kokpitte şeffaflaşır */
  glassQM = new THREE.MeshLambertMaterial({
    color: 0x18232d,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  }),
  blackM = lam(0x15171a),
  lightM = new THREE.MeshBasicMaterial({ color: 0xfff4d6 }),
  tailM = new THREE.MeshBasicMaterial({ color: 0xc81e28 });
