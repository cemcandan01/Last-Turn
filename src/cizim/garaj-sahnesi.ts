// Garaj sahnesi: dünyadan uzakta dönen platform, karanlık oda, turuncu çizgiler
import * as THREE from "three";
import { scene } from "./sahne";
import { lam } from "./yardimci";

/** garajın dünyadaki yeri */
export const GX = 0,
  GZ = -9000;

export const garG = new THREE.Group();
scene.add(garG);
garG.visible = false;
{
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 48), lam(0x1c2024));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(GX, 0.01, GZ);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.12, 48), lam(0x3a3f46));
  tb.position.set(GX, 0.06, GZ);
  const rg = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.05, 6, 64),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c }),
  );
  rg.rotation.x = Math.PI / 2;
  rg.position.set(GX, 0.13, GZ);
  const room = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 16, 48, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x161a1e, side: THREE.BackSide }),
  );
  room.position.set(GX, 8, GZ);
  garG.add(fl, tb, rg, room);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 6.2832,
      st = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 10, 0.1),
        new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff7a3c : 0x3a5560 }),
      );
    st.position.set(GX + Math.sin(a) * 29.6, 5.5, GZ + Math.cos(a) * 29.6);
    st.rotation.y = a;
    garG.add(st);
  }
  // eski sürümdeki noktasal ışığın (uzaklıkla doğrusal sönümlenen) karşılığı
  const pl = new THREE.PointLight(0xfff4e0, 1.1 * Math.PI * 0.8, 45, 0);
  pl.position.set(GX + 5, 9, GZ + 6);
  garG.add(pl);
}
