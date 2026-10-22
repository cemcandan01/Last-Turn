// Uzak araçların çizimi: her uzak araç için ayrı model (iç mekân yok). Konum, gövde yönelimi, direksiyon,
// süspansiyon ve teker dönüşü anlık görüntüden (fizik/anlik.ts → UzakArac.goster). Hayalet yarı saydamdır.
import * as THREE from "three";
import { CARS } from "../arac/araclar";
import type { UzakArac } from "../fizik/anlik";
import { buildCar, type TekerModeli } from "./arac-modeli";
import { scene } from "./sahne";

interface UzakModel {
  arac: number;
  g: THREE.Group;
  ws: TekerModeli[];
  mats: THREE.Material[];
}

const modeller = new Map<string, UzakModel>();

function kur(u: UzakArac, saydam: boolean): UzakModel {
  const { g, ws } = buildCar(CARS[u.arac]),
    dis = new THREE.Group();
  dis.rotation.order = "YXZ";
  dis.add(g);
  for (const w of ws) dis.add(w.pv);
  // malzemeler kopyalanır: yerel aracın ortak malzemeleri (kokpitte saydamlaşan cam) etkilenmesin
  const kopya = new Map<THREE.Material, THREE.Material>();
  const kopyala = (m: THREE.Material) => {
    let k = kopya.get(m);
    if (!k) {
      k = m.clone();
      if (saydam) {
        k.transparent = true;
        k.opacity = 0.45 * (m.transparent ? m.opacity : 1);
        k.depthWrite = false;
      }
      kopya.set(m, k);
    }
    return k;
  };
  dis.traverse((o) => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    me.material = Array.isArray(me.material) ? me.material.map(kopyala) : kopyala(me.material);
    me.castShadow = !saydam;
  });
  scene.add(dis);
  return { arac: u.arac, g: dis, ws, mats: [...kopya.values()] };
}

function sil(id: string) {
  const m = modeller.get(id);
  if (!m) return;
  scene.remove(m.g);
  for (const k of m.mats) k.dispose();
  modeller.delete(id);
}

/** her karede: uzak araçların modellerini kur, yerleştir; listede olmayanları kaldır */
export function uzakAraclariCiz(araclar: UzakArac[], gorunur: boolean, saydam: (u: UzakArac) => boolean) {
  for (const u of araclar) {
    let m = modeller.get(u.id);
    if (m && m.arac != u.arac) {
      sil(u.id);
      m = undefined;
    }
    if (!m) {
      m = kur(u, saydam(u));
      modeller.set(u.id, m);
    }
    m.g.visible = gorunur && u.hazir;
    if (!m.g.visible) continue;
    const a = u.goster,
      s = [a.s0, a.s1, a.s2, a.s3];
    m.g.position.set(a.x, a.y, a.z);
    m.g.quaternion.set(a.qx, a.qy, a.qz, a.qw);
    for (const tm of m.ws) {
      const fi = tm.pv.userData.fi as number;
      tm.pv.position.y = tm.pv.userData.y0 + s[fi];
      tm.w.rotation.x = u.don[fi];
      if (tm.f) tm.pv.rotation.y = a.delta;
    }
  }
  for (const id of [...modeller.keys()]) if (!araclar.some((u) => u.id == id)) sil(id);
}
