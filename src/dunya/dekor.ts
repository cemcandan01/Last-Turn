// Pist dekorları: orman, çalılar, fren tabelaları, duvar ve bariyerler, tema dekorları (PROPS)
import * as THREE from "three";
import { numTex, winTex } from "../cizim/dokular";
import { bx, C3, lam, V3 } from "../cizim/yardimci";
import { add, bigRock, bush, colAdd, H, rnd, tree } from "./kurucu";
import { angT, atTrack, clearOf, KW, nearest, type Pist } from "./pist";
import { thOf } from "./temalar";

/** pistten dmin..dmax uzaklıkta n ağaç (area kare alanında rastgele) */
export function forest(
  TR: Pist,
  n: number,
  dmin: number,
  dmax: number,
  area: number,
  ox: number,
  oz: number,
) {
  let c = 0;
  for (let i = 0; i < n * 5 && c < n; i++) {
    const x = ox + (rnd() - 0.5) * area,
      z = oz + (rnd() - 0.5) * area,
      d = nearest(TR, x, z, 0, true)[1];
    if (d < dmin || d > dmax) continue;
    tree(x, z);
    c++;
  }
}

/** pist kenarında a..b uzaklıkta n çalı */
export function edgeBush(TR: Pist, n: number, a: number, b: number) {
  for (let k = 0; k < n; k++) {
    const i = Math.floor(rnd() * TR.N),
      P = TR.P[i],
      T = TR.T[i],
      o = (rnd() < 0.5 ? -1 : 1) * (TR.hw + a + rnd() * (b - a));
    bush(P[0] + T[1] * o, P[1] - T[0] * o);
  }
}

/** fren tabelaları (150, 100, 50 m) */
export function boards(TR: Pist, apex: number[]) {
  const tx: Record<number, THREE.Texture> = { 150: numTex("150"), 100: numTex("100"), 50: numTex("50") },
    post = new THREE.MeshLambertMaterial({ color: 0x666666 });
  for (const ap of apex)
    for (const dd of [150, 100, 50]) {
      let i = ap,
        d = 0;
      while (d < dd + 40) {
        const j = (i - 1 + TR.N) % TR.N;
        d += Math.hypot(TR.P[i][0] - TR.P[j][0], TR.P[i][1] - TR.P[j][1]);
        i = j;
      }
      const P = TR.P[i],
        T = TR.T[i],
        o = TR.hw + 5,
        x = P[0] + T[1] * o,
        z = P[1] - T[0] * o,
        b = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 2.4),
          new THREE.MeshBasicMaterial({ map: tx[dd], side: THREE.DoubleSide }),
        );
      const gy = H(x, z);
      b.position.set(x, gy + 2.6, z);
      b.rotation.y = Math.atan2(-T[0], -T[1]);
      const pst = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.2), post);
      pst.position.set(x, gy + 0.8, z);
      add(b, pst);
      colAdd({ x, z, r: 0.3, t: "solid" });
    }
}

type Yukseklik = ((x: number, z: number) => number) | null | undefined;

/** dikey şerit (duvar, bariyer): pist kenarından o uzaklıkta, h yüksekliğinde. colEvery: her kaç noktada çarpışma */
export function wallRib(
  TR: Pist,
  o: number,
  h: number,
  col: number,
  hb: Yukseklik,
  y0?: number,
  colEvery?: number,
) {
  const pos: number[] = [],
    N = TR.N,
    M = TR.open ? N - 1 : N;
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % N,
      a = atTrack(TR, i, o),
      b = atTrack(TR, j, o),
      ya = (hb ? hb(a[0], a[1]) : 0) + (y0 || 0),
      yb = (hb ? hb(b[0], b[1]) : 0) + (y0 || 0);
    pos.push(
      a[0],
      ya,
      a[1],
      b[0],
      yb,
      b[1],
      a[0],
      ya + h,
      a[1],
      b[0],
      yb,
      b[1],
      b[0],
      yb + h,
      b[1],
      a[0],
      ya + h,
      a[1],
    );
    if (colEvery && i % colEvery == 0) {
      const q = atTrack(TR, i, o + Math.sign(o) * 0.9);
      colAdd({ x: q[0], z: q[1], r: 1, t: "solid" });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })));
}

/** eğimli dekor kutusu, çarpışma için daire */
export function propBox(
  x: number,
  z: number,
  ry: number,
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
  hb: Yukseklik,
  solid: boolean,
) {
  const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  q.position.set(x, (hb ? hb(x, z) : 0) + h / 2, z);
  q.rotation.y = ry;
  add(q);
  if (solid) colAdd({ x, z, r: Math.min(w, d) / 2 + 0.3, t: "solid" });
  return q;
}

/** bölgenin sınır kutusu (tema dekorları için) */
interface DekorBolgesi {
  box: [number, number, number, number];
}

/** tema dekorları */
export const PROPS: Record<string, (R: DekorBolgesi, TR: Pist, hb: Yukseklik) => void> = {
  gp: (_R, TR, hb) => {
    const seat = [lam(0xd8323a), lam(0x2f6fd6), lam(0xe8e8e8)];
    // ana düzlükte tribün
    for (let i = 4; i < TR.N * 0.12; i += 6) {
      const T = TR.T[i];
      for (let k = 0; k < 4; k++) {
        const [sx, sz] = atTrack(TR, i, TR.hw + 12 + k * 2.6);
        propBox(sx, sz, angT(T), 2.6, 1.2 + k * 1.3, 6.4, seat[(i >> 3) % 3], hb, k == 3);
      }
    }
    // viraj dışlarında lastik bariyer
    const tg = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 10),
      tm = lam(0x18191b),
      tp: [number, number][] = [];
    for (let i = 0; i < TR.N; i += 1) {
      if (!TR.kb![i] || i % 2) continue;
      const a = TR.T[(i - 6 + TR.N) % TR.N],
        b = TR.T[(i + 6) % TR.N],
        cr = a[0] * b[1] - a[1] * b[0],
        o = -Math.sign(cr) * (TR.hw + KW + 6);
      const [x, z] = atTrack(TR, i, o);
      if (!clearOf(TR, x, z, TR.hw + KW + 4)) continue;
      tp.push([x, z]);
    }
    if (tp.length) {
      const im = new THREE.InstancedMesh(tg, tm, tp.length * 2),
        m4 = new THREE.Matrix4();
      im.frustumCulled = false;
      tp.forEach(([x, z], k) => {
        const y = hb ? hb(x, z) : 0;
        for (let l = 0; l < 2; l++) {
          m4.makeTranslation(x, y + 0.21 + l * 0.42, z);
          im.setMatrixAt(k * 2 + l, m4);
        }
        colAdd({ x, z, r: 0.8, t: "solid" });
      });
      add(im);
    }
  },
  coast: (R, TR, hb) => {
    const t = thOf("coast"),
      b = R.box,
      w = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 2400),
        new THREE.MeshLambertMaterial({ color: t.water }),
      );
    w.rotation.x = -Math.PI / 2;
    w.position.set((b[0] + b[1]) / 2, 0.15, b[3] + 1200 - 10);
    add(w);
    for (let i = 0; i < TR.N; i += 14) {
      const [x, z] = atTrack(TR, i, (i % 28 ? 1 : -1) * (TR.hw + 9));
      if (clearOf(TR, x, z, TR.hw + 6)) {
        const y = hb ? hb(x, z) : 0;
        add(
          bx(0.35, 7, 0.35, x, y + 3.5, z, lam(0x8a6a44)),
          bx(3.4, 0.25, 0.7, x, y + 7, z, lam(0x4f8f3a)),
          bx(0.7, 0.25, 3.4, x, y + 7, z, lam(0x4f8f3a)),
        );
        colAdd({ x, z, r: 0.5, t: "solid" });
      }
    }
  },
  city: (_R, TR, hb) => {
    for (const sd of [-1, 1]) wallRib(TR, sd * (TR.hw + 1.2), 1.1, 0x9a9a94, hb, 0, 2);
    const pm = lam(0x3b3f45),
      lm = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
    for (let i = 0; i < TR.N; i += 9) {
      const sd = (i / 9) % 2 ? 1 : -1,
        [x, z] = atTrack(TR, i, sd * (TR.hw + 2.4)),
        y = hb ? hb(x, z) : 0;
      add(bx(0.18, 7, 0.18, x, y + 3.5, z, pm), bx(0.9, 0.18, 0.4, x, y + 7, z, lm));
    }
    const tx = [0, 1, 2, 3].map(winTex);
    for (let i = 0; i < TR.N; i += 7)
      for (const sd of [-1, 1]) {
        const w = 10 + rnd() * 14,
          d = 10 + rnd() * 12,
          h = 14 + rnd() * 42,
          o = sd * (TR.hw + 4 + d / 2 + rnd() * 6),
          [x, z] = atTrack(TR, i, o);
        if (!clearOf(TR, x, z, TR.hw + 3 + Math.max(w, d) * 0.7)) continue;
        const m = new THREE.MeshBasicMaterial({ map: tx[(i + sd + 3) % 4].clone() });
        m.map!.needsUpdate = true;
        m.map!.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16)));
        propBox(x, z, angT(TR.T[i]), w, h, d, m, hb, true);
      }
  },
  quarry: (_R, TR) => {
    for (let k = 0; k < 70; k++) {
      const i = Math.floor(rnd() * TR.N),
        o = (rnd() < 0.5 ? -1 : 1) * (TR.hw + 12 + rnd() * 60),
        [x, z] = atTrack(TR, i, o);
      if (!clearOf(TR, x, z, TR.hw + 8)) continue;
      const s = 3 + rnd() * 6;
      bigRock(x, z, H(x, z) + s * 0.4, s, rnd() * 6, s * 0.8);
      colAdd({ x, z, r: s * 1.2, t: "solid" });
    }
  },
  port: (R, TR) => {
    const t = thOf("port"),
      b = R.box,
      w = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 2400),
        new THREE.MeshLambertMaterial({ color: t.water }),
      );
    w.rotation.x = -Math.PI / 2;
    w.position.set(b[0] - 1200 + 10, 0.15, (b[2] + b[3]) / 2);
    add(w);
    const CC = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf39c12, 0x8e44ad, 0xd35400, 0x7f8c8d],
      cs: [number, number, number, number][] = [];
    for (let i = 0; i < TR.N; i += 5)
      for (const sd of [-1, 1]) {
        const o = sd * (TR.hw + 10 + rnd() * 30),
          [x, z] = atTrack(TR, i, o);
        if (rnd() < 0.45 || !clearOf(TR, x, z, TR.hw + 9)) continue;
        const n = 1 + Math.floor(rnd() * 3);
        for (let l = 0; l < n; l++) cs.push([x, z, l, angT(TR.T[i])]);
        colAdd({ x, z, r: 2.8, t: "solid" });
      }
    if (cs.length) {
      const im = new THREE.InstancedMesh(
          new THREE.BoxGeometry(2.5, 2.6, 6.1),
          new THREE.MeshLambertMaterial(),
          cs.length,
        ),
        m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        e = new THREE.Euler();
      im.frustumCulled = false;
      cs.forEach(([x, z, l, ry], k) => {
        e.set(0, ry, 0);
        q.setFromEuler(e);
        m4.compose(V3(x, 1.3 + l * 2.6, z), q, V3(1, 1, 1));
        im.setMatrixAt(k, m4);
        im.setColorAt(k, C3(CC[(k * 3 + l) % CC.length]));
      });
      add(im);
    }
    const cm = lam(0xe0a020);
    for (let k = 0; k < 4; k++) {
      const x = b[0] + 40 + k * 90,
        z = (b[2] + b[3]) / 2 + (k % 2 ? 120 : -120);
      for (const [dx, dz] of [
        [-6, -6],
        [6, -6],
        [-6, 6],
        [6, 6],
      ])
        add(bx(1, 34, 1, x + dx, 17, z + dz, cm));
      add(bx(14, 2, 40, x, 35, z + 12, cm));
    }
  },
  mount: (_R, TR, hb) => {
    for (const sd of [-1, 1]) {
      wallRib(TR, sd * (TR.hw + KW + 1), 0.3, 0xb8bec4, hb, 0.45, 3);
      wallRib(TR, sd * (TR.hw + KW + 1), 0.08, 0x6a6e72, hb, 0.2);
    }
  },
  desert: (_R, TR) => {
    const cm = lam(0x5d7a3a);
    for (let k = 0; k < 90; k++) {
      const i = Math.floor(rnd() * TR.N),
        o = (rnd() < 0.5 ? -1 : 1) * (TR.hw + 6 + rnd() * 60),
        [x, z] = atTrack(TR, i, o);
      if (!clearOf(TR, x, z, TR.hw + 4)) continue;
      const y = H(x, z),
        h = 2 + rnd() * 3;
      add(bx(0.5, h, 0.5, x, y + h / 2, z, cm), bx(0.35, 1.2, 0.35, x + 0.5, y + h * 0.6, z, cm));
      colAdd({ x, z, r: 0.5, t: "solid" });
    }
  },
};
