// Çorak Topraklar: açık dünya test arazisi. Asfalt oval, uzun düz yol, onları ve etkinlik yerlerini bağlayan asfalt
// yol ağı (yollar.ts), zıplama rampası, tırmanış yolu, tepeler.
import * as THREE from "three";
import { cl, sm } from "../cekirdek/matematik";
import { ctex } from "../cizim/dokular";
import { add, cone, plane, puddle, rnd, terrain, tree, bush } from "./kurucu";
import { YOLLAR, YOL_YARI, yolMesafesi, yoldaMi } from "./yollar";

/** oval yarı eksenleri, yol yarı genişliği, düz yolun x konumu */
export const EA = 140,
  EB = 90,
  RW = 11,
  SX = 210;
const HILLS = [
  [-330, 110, 45, 12],
  [-400, -160, 55, 16],
  [-170, 170, 30, 7],
  [330, -200, 50, 10],
  [100, -300, 40, 8],
];

export function Htest(x: number, z: number): number {
  let h = 0;
  // zıplama rampası
  {
    const w = cl((11 - Math.abs(x + 250)) / 3, 0, 1),
      t = (z + 130) / 30;
    if (t >= 0 && t <= 1) h += 4.5 * t * w;
  }
  // tırmanış yolu
  {
    const w = cl((19 - Math.abs(x + 40)) / 8, 0, 1);
    let y = 0;
    if (z > 130 && z <= 400) y = (30 * (z - 130)) / 270;
    else if (z > 400 && z <= 440) y = 30;
    else if (z > 440 && z < 480) y = 30 * (1 - sm(440, 480, z));
    h += y * w;
  }
  for (const b of HILLS) h += b[3] * Math.exp(-((x - b[0]) ** 2 + (z - b[1]) ** 2) / (b[2] * b[2]));
  return h;
}

/** zemin: oval, düz yol ve yol ağı asfalt (1), geri kalan toprak (0) */
export function surfTest(x: number, z: number): number {
  const q = Math.hypot(x / EA, z / EB);
  if (q > 0) {
    const g = Math.hypot(x / (EA * EA), z / (EB * EB)) / q;
    if (Math.abs(q - 1) / g < RW) return 1;
  }
  return (Math.abs(x - SX) < RW && Math.abs(z) < 800) || yoldaMi(x, z) ? 1 : 0;
}

/** ışınlanma noktaları [ad, x, z, yön] */
export const TELEW: [string, number, number, number][] = [
  ["Merkez", 0, -90, Math.PI / 2],
  ["Düz yol", SX, -780, 0],
  ["Zıplama rampası", -250, -175, 0],
  ["Tırmanış yolu", -40, 60, 0],
];

function oval(o1: number, o2: number, col: number, y: number) {
  const n = 160,
    pos: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 6.2832,
      c = Math.cos(t),
      s = Math.sin(t);
    let nx = c / EA,
      nz = s / EB;
    const l = Math.hypot(nx, nz);
    nx /= l;
    nz /= l;
    const px = EA * c,
      pz = EB * s;
    pos.push(px + nx * o1, y, pz + nz * o1, px + nx * o2, y, pz + nz * o2);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })));
}

/** yol ağı: araziyi izleyen asfalt şerit (yükseklik Htest'ten; ovalin boya çizgileri üstte kalır) */
function yolAgi() {
  const mat = new THREE.MeshLambertMaterial({
      color: 0x363b46,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    serit = new THREE.MeshLambertMaterial({ color: 0xe8c84a, polygonOffset: true, polygonOffsetFactor: -3 });
  for (const y of YOLLAR)
    for (let i = 0; i + 1 < y.length; i++) {
      const [ax, az] = y[i],
        [bx, bz] = y[i + 1],
        L = Math.hypot(bx - ax, bz - az),
        ux = (bx - ax) / L,
        uz = (bz - az) / L,
        // köşede bir sonraki parçayla boşluk kalmasın: parça yarı genişlik kadar uzatılır
        bas = i == 0 ? 0 : -YOL_YARI,
        son = L + (i + 2 < y.length ? YOL_YARI : 0),
        n = Math.max(1, Math.ceil((son - bas) / 4)),
        pos: number[] = [],
        idx: number[] = [];
      for (let k = 0; k <= n; k++) {
        const s0 = bas + ((son - bas) * k) / n,
          cx = ax + ux * s0,
          cz = az + uz * s0;
        for (const yan of [-1, 1]) {
          const px = cx + uz * YOL_YARI * yan,
            pz = cz - ux * YOL_YARI * yan;
          pos.push(px, Htest(px, pz) + 0.05, pz);
        }
        if (k < n) {
          const a = k * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        // orta şerit: 20 m'de bir sarı çizgi
        if (k % 5 == 2) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), serit);
          m.rotation.set(-Math.PI / 2, 0, Math.atan2(ux, uz));
          m.position.set(cx, Htest(cx, cz) + 0.09, cz);
          add(m);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(new THREE.Mesh(g, mat));
    }
}

/** çalı, koni ve ağaç yolun üstüne konmaz (yol kenarında 2 m pay) */
const yolKenari = (x: number, z: number, pay: number) => yolMesafesi(x, z) < YOL_YARI + pay;

export function buildTest() {
  terrain(1800, 320, ctex("#8c6b45", "#7d5f3c", "#9a7a52", 144));
  oval(-RW, RW, 0x363b46, 0.06);
  oval(RW - 0.7, RW, 0xffffff, 0.08);
  oval(-RW, -RW + 0.7, 0xffffff, 0.08);
  plane(RW * 2, 1600, SX, 0, 0x363b46, 0.06);
  plane(0.7, 1600, SX - RW + 0.35, 0, 0xffffff, 0.08);
  plane(0.7, 1600, SX + RW - 0.35, 0, 0xffffff, 0.08);
  for (let z = -790; z <= 790; z += 20) plane(1.2, 6, SX, z, 0xe8c84a, 0.08);
  yolAgi();
  for (let i = 0; i < 300; i++) {
    const x = (rnd() - 0.5) * 1700,
      z = (rnd() - 0.5) * 1700,
      q = Math.hypot(x / EA, z / EB);
    if (
      q < 1.35 ||
      Math.abs(x - SX) < 24 ||
      (Math.abs(x + 250) < 20 && z > -190 && z < -90) ||
      (Math.abs(x + 40) < 30 && z > 110 && z < 500) ||
      yolKenari(x, z, 9)
    )
      continue;
    tree(x, z);
  }
  // koni: yol ağının kesiştiği yerde konmaz (bağlantı ağzı açık)
  const koni = (x: number, z: number) => void (yolKenari(x, z, 2) || cone(x, z));
  for (let z = -790; z <= 790; z += 40) {
    koni(SX - RW - 2, z);
    koni(SX + RW + 2, z);
  }
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * 6.2832;
    koni(Math.cos(t) * (EA + RW + 3), Math.sin(t) * (EB + RW + 3));
  }
  for (let z = 140; z <= 400; z += 40) {
    koni(-61, z);
    koni(-19, z);
  }
  for (let i = 0; i < 60; i++) {
    const x = (rnd() - 0.5) * 700,
      z = (rnd() - 0.5) * 700,
      q = Math.hypot(x / EA, z / EB);
    if (surfTest(x, z) || (q > 0.75 && q < 1.3) || yolKenari(x, z, 3)) continue;
    bush(x, z);
  }
  for (const [x, z, r] of [
    [0, 0, 7],
    [45, 20, 5],
    [-50, -25, 6],
    [-120, -260, 8],
    [60, -200, 6],
  ])
    puddle(x, z, r);
  cone(-262, -100);
  cone(-238, -100);
}
