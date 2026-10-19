// Dünya kurucusu: bir bölge kurulurken görsel nesneleri gruba ekler, çarpışma nesnelerini ızgaraya yazar.
// Ağaç, kaya ve çalılar tek tek değil, türlerine göre toplu çizilir (InstancedMesh).
// Her bölge kendi tohumuyla kurulur: dekor her açılışta aynı yerde, çarpışmalar tekrar oynatılabilir.
import * as THREE from "three";
import { lcg, type Rastgele } from "../cekirdek/rastgele";
import type { V2 } from "../cekirdek/matematik";
import { CarpismaIzgarasi, type Carpisan } from "../fizik/carpisma";
import { C3 } from "../cizim/yardimci";
import type { Pist } from "./pist";

// ortak dekor malzemeleri: tema ve hava renklerini değiştirir
export const mT = new THREE.MeshLambertMaterial({ color: 0x2f6b3a }),
  mK = new THREE.MeshLambertMaterial({ color: 0x5b4430 }),
  mR = new THREE.MeshLambertMaterial({ color: 0x8a8a86 }),
  mC = new THREE.MeshLambertMaterial({ color: 0xff6a2a }),
  mB = new THREE.MeshLambertMaterial({ color: 0x3f7d33 }),
  mW = new THREE.MeshLambertMaterial({ color: 0x6d8fa8, transparent: true, opacity: 0.85 });
const gT = new THREE.ConeGeometry(3, 9, 7),
  gK = new THREE.CylinderGeometry(0.5, 0.7, 3, 6),
  gR = new THREE.DodecahedronGeometry(1.6),
  gC = new THREE.ConeGeometry(0.5, 1.2, 8),
  gB = new THREE.DodecahedronGeometry(1.4);

/** toplu çizim kaydı: [x, y, z, ölçek, dönüş, dikey ölçek] */
type Ornek = [number, number, number, number, number?, number?];

/** kurulum sırasında geçerli olan durum */
export const kur = {
  G: null as THREE.Group | null,
  inst: null as { k: Ornek[]; t: Ornek[]; r: Ornek[]; b: Ornek[] } | null,
  cols: null as CarpismaIzgarasi | null,
  rnd: lcg(7) as Rastgele,
  /** dünyanın yükseklik fonksiyonu (dekoru zemine oturtmak için) */
  H: ((_x: number, _z: number) => 0) as (x: number, z: number) => number,
};

/** kurulumu başlat: yeni grup, tohumlu rastgele, çarpışma ızgarası */
export function kurulumBaslat(tohum: number, cols: CarpismaIzgarasi) {
  kur.G = new THREE.Group();
  kur.inst = { k: [], t: [], r: [], b: [] };
  kur.cols = cols;
  kur.rnd = lcg(tohum);
}

/** toplu çizimleri oluştur, gölgeleri ayarla ve grubu döndür */
export function kurulumBitir(): THREE.Group {
  const I = kur.inst!;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    s = new THREE.Vector3();
  const mk = (arr: Ornek[], geo: THREE.BufferGeometry, mat: THREE.Material) => {
    if (!arr.length) return;
    const im = new THREE.InstancedMesh(geo, mat, arr.length);
    im.frustumCulled = false;
    arr.forEach((a, i) => {
      e.set(0, a[4] || 0, 0);
      q.setFromEuler(e);
      p.set(a[0], a[1], a[2]);
      s.set(a[3], a[5] ?? a[3], a[3]);
      m4.compose(p, q, s);
      im.setMatrixAt(i, m4);
    });
    add(im);
  };
  mk(I.k, gK, mK);
  mk(I.t, gT, mT);
  mk(I.r, gR, mR);
  mk(I.b, gB, mB);
  const G = kur.G!;
  shadowize(G);
  kur.G = null;
  kur.inst = null;
  kur.cols = null;
  return G;
}

/** gölge: düz zeminler (userData.flat) gölge düşürmez, yalnız alır */
export function shadowize(g: THREE.Object3D) {
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh || (o as THREE.InstancedMesh).isInstancedMesh) {
      o.receiveShadow = true;
      o.castShadow = !o.userData.flat;
    }
  });
}

export const add = (...m: THREE.Object3D[]) => kur.G!.add(...m);
export const rnd = () => kur.rnd();
export const colAdd = (o: Carpisan) => kur.cols?.ekle(o);
export const H = (x: number, z: number) => kur.H(x, z);

/** yatay düzlem (yol, çizgi) */
export function plane(w: number, l: number, x: number, z: number, col: number, y: number, rz?: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshLambertMaterial({ color: col }));
  m.rotation.set(-Math.PI / 2, 0, rz || 0);
  m.position.set(x, y, z);
  m.userData.flat = 1;
  add(m);
}

export const cone = (x: number, z: number) => {
  const c = new THREE.Mesh(gC, mC);
  c.position.set(x, H(x, z) + 0.6, z);
  add(c);
};

export function rock(x: number, z: number) {
  const hy = H(x, z),
    s = 0.6 + rnd() * 1.6;
  kur.inst!.r.push([x, hy + 0.5, z, s, rnd() * 6, s * 0.7]);
  colAdd({ x, z, r: 1.3 * s, t: "solid" });
}

/** ağaç (üçte birinde kaya) */
export function tree(x: number, z: number) {
  if (rnd() >= 0.65) return rock(x, z);
  const hy = H(x, z),
    s = 0.8 + rnd() * 0.8;
  kur.inst!.k.push([x, hy + 1.5, z, 1]);
  kur.inst!.t.push([x, hy + 7, z, s]);
  colAdd({ x, z, r: 0.9, t: "solid" });
}

export function bush(x: number, z: number) {
  const hy = H(x, z),
    s = 0.9 + rnd() * 0.6;
  kur.inst!.b.push([x, hy + 0.5, z, s, rnd() * 6, s * 0.6]);
  colAdd({ x, z, r: 1.6 * s, t: "bush" });
}

/** taş ya da kaya (taş ocağı, çöl): ölçeği verilmiş */
export function bigRock(x: number, z: number, y: number, s: number, ry: number, sy: number) {
  kur.inst!.r.push([x, y, z, s, ry, sy]);
}

export function puddle(x: number, z: number, r: number, noMesh?: boolean) {
  if (!noMesh) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mW);
    c.rotation.x = -Math.PI / 2;
    c.position.set(x, H(x, z) + 0.24, z);
    add(c);
  }
  colAdd({ x, z, r, t: "water" });
}

/** yükseklik haritalı arazi (hf verilmezse dünya yüksekliği) */
export function terrain(
  size: number,
  seg: number,
  tex: THREE.Texture,
  cx = 0,
  cz = 0,
  hf?: (x: number, z: number) => number,
) {
  const gg = new THREE.PlaneGeometry(size, size, seg, seg);
  gg.rotateX(-Math.PI / 2);
  const ps = gg.attributes.position;
  for (let i = 0; i < ps.count; i++) ps.setY(i, (hf || H)(ps.getX(i) + cx, ps.getZ(i) + cz));
  gg.computeVertexNormals();
  const m = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: tex }));
  m.userData.flat = 1;
  m.position.set(cx, 0, cz);
  add(m);
}

/** pist boyunca şerit: merkezden o1..o2 arası, colFn null dönerse o parça atlanır */
export function ribbon(
  TR: Pist,
  o1: number,
  o2: number,
  y: number,
  colFn: (i: number) => THREE.Color | null,
  yFn?: ((x: number, z: number, o: number) => number) | null,
) {
  const pos: number[] = [],
    col: number[] = [],
    N = TR.N,
    M = TR.open ? N - 1 : N;
  const p = (i: number, o: number) => {
    const P = TR.P[i],
      T = TR.T[i],
      x = P[0] + T[1] * o,
      z = P[1] - T[0] * o;
    return [x, (yFn ? yFn(x, z, o) : 0) + y, z];
  };
  for (let i = 0; i < M; i++) {
    const c = colFn(i);
    if (!c) continue;
    const j = (i + 1) % N,
      A1 = p(i, o1),
      A2 = p(i, o2),
      B1 = p(j, o1),
      B2 = p(j, o2);
    pos.push(...A1, ...A2, ...B1, ...A2, ...B2, ...B1);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const rm = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  rm.userData.flat = 1;
  add(rm);
}

export function startLine(TR: Pist, y: number) {
  const p = TR.P[0],
    t = TR.T[0];
  plane(TR.hw * 2, 2.5, p[0], p[1], 0xffffff, y, Math.atan2(t[0], t[1]));
}

export { C3 };
export type { V2 };
