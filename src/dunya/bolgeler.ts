// Bölgeler: her pist dünyada kendi kutusunda (box) durur, kutular çakışmaz. Pist türüne göre kurucu (mkReg):
// asfalt ve drift pistleri (kerb, yükseklik, tema dekoru), toprak pistleri (rampa, çamur, su), ralli etapları
// (doğal tepeler), drag (düz pist) ve Boş Otopark. Yükseklik H(x,z) ve zemin surf(x,z) saf fonksiyonlardır;
// build() görsel nesneleri ve çarpışma nesnelerini kurar.
import * as THREE from "three";
import type { YarisTuru } from "../arac/araclar";
import { sm, type V2 } from "../cekirdek/matematik";
import { ctex, numTex, textTex } from "../cizim/dokular";
import { bx, C3, lam } from "../cizim/yardimci";
import { boards, edgeBush, forest, PROPS } from "./dekor";
import { add, colAdd, cone, H, plane, puddle, rnd, rock, ribbon, startLine, terrain, tree } from "./kurucu";
import { dk } from "../cizim/malzemeler";
import {
  atTrack,
  autoApex,
  bbox,
  clearOf,
  gridNear,
  Hkerb,
  ipucu,
  jumpH,
  kerbProf,
  kerbs,
  KW,
  mkJumps,
  mkTrack,
  parcayaIzdusum,
  nearest,
  off,
  onTrack,
  recenter,
  straightF,
  type Pist,
} from "./pist";
import { TDEF, type PistTanimi } from "./pist-tanimlari";
import { thOf } from "./temalar";

export type Kutu = [number, number, number, number];
export type Tele = [string, number, number, number];

/** yarış ışıkları için yarış durumunun okunan kısmı */
export interface IsikDurumu {
  state: string;
  cd: number;
}

export interface Bolge extends Partial<Omit<PistTanimi, "t" | "n" | "th">> {
  /** bölge sırası (kurulum tohumu) */
  idx: number;
  t: YarisTuru | "park";
  n: string;
  th?: string;
  TR: Pist | null;
  /** merkez */
  c: V2;
  box: Kutu;
  /** mini harita çizgi rengi */
  col: string;
  /** kerbli asfalt pist */
  kerb?: number;
  H: (x: number, z: number) => number;
  surf: (x: number, z: number) => number;
  build: () => void;
  /** kerb yüksekliği (taban hariç): kerb sarsıntısı yalnız teker kerbe çıkınca */
  Hk?: (x: number, z: number) => number;
  /** taban yükseklik (kerbsiz) */
  Hb?: ((x: number, z: number) => number) | null;
  inMud?: (x: number, z: number) => boolean;
  tick?: (e: IsikDurumu) => void;
  lt?: THREE.MeshBasicMaterial[];
  /** kurulmuş görsel grup */
  g?: THREE.Group;
  /** mini harita çizimi (pistsiz bölgeler) */
  mm?: (x: CanvasRenderingContext2D, mmP: (a: number, c: number) => V2) => void;
  tele?: Tele[];
  /** pist küçük resmi (önbellek) */
  _th?: string;
}

const dirtCol = (i: number) => C3(i % 6 < 3 ? 0x8c6b45 : 0x86663f),
  mudMat = new THREE.MeshLambertMaterial({ color: 0x4a3524 });

/** asfalt pist: yol, kenar çizgileri, kerbler, başlangıç çizgisi */
function asphaltTrack(TR: Pist, hb: ((x: number, z: number) => number) | null | undefined, ac?: number) {
  const yb = hb ? (x: number, z: number) => hb(x, z) : () => 0;
  ribbon(TR, -TR.hw, TR.hw, 0.05, () => C3(ac || 0x3a3f4a), yb);
  for (const sd of [-1, 1]) {
    ribbon(TR, sd * (TR.hw - 0.7), sd * (TR.hw - 0.3), 0.07, () => C3(0xffffff), yb);
    const kc = (i: number) => (TR.kb![i] ? C3((i >> 1) % 2 ? 0xffffff : 0xd8323a) : null),
      ky = (x: number, z: number, o: number) => 0.06 + kerbProf(Math.abs(o) - TR.hw) + yb(x, z);
    ribbon(TR, sd * TR.hw, sd * (TR.hw + 0.5), 0, kc, ky);
    ribbon(TR, sd * (TR.hw + 0.5), sd * (TR.hw + KW), 0, kc, ky);
  }
  startLine(TR, 0.09 + yb(TR.P[0][0], TR.P[0][1]));
}

/** drag: düz pist, iki şerit, ışıklı başlangıç ağacı, bitiş takı, beton duvarlar */
function dragReg(R: Bolge, TR: Pist, c: V2): Bolge {
  const z0 = TR.P[0][1],
    z1 = TR.P[TR.N - 1][1],
    x = c[0],
    za = z0 - 60,
    zb = z1 + 380,
    mz = (za + zb) / 2,
    ln = zb - za;
  R.box = [x - 120, x + 140, za - 40, zb + 40];
  R.H = () => 0;
  R.surf = (px, pz) => {
    ipucu.ti = nearest(TR, px, pz, ipucu.ti)[0];
    return px > x - 7 && px < x + 19 && pz > za && pz < zb ? 1 : 2;
  };
  R.build = () => {
    plane(26, ln, x + 6, mz, 0x34383f, 0.05);
    plane(0.25, ln, x + 6, mz, 0xf0f0ea, 0.07);
    for (const sx of [-6.5, 18.5]) plane(0.25, ln, x + sx, mz, 0xf0f0ea, 0.07);
    plane(12, 0.6, x, z0, 0xffffff, 0.08);
    plane(12, 0.6, x + 12, z0, 0xffffff, 0.08);
    for (let k = 0; k < 10; k++) {
      plane(2.6, 1.3, x - 5.7 + k * 2.6, z1, k % 2 ? 0x111111 : 0xffffff, 0.08);
      plane(2.6, 1.3, x - 5.7 + k * 2.6, z1 + 1.3, k % 2 ? 0xffffff : 0x111111, 0.08);
    }
    const cm = lam(0xb9b6ad);
    for (const wx of [x - 7.6, x + 19.6]) {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, ln), cm);
      wl.position.set(wx, 0.55, mz);
      add(wl);
      colAdd({ t: "box", x: wx, z: mz, hx: 0.3, hz: ln / 2 });
    }
    const tx: Record<number, THREE.Texture> = {};
    for (let d = 100; d < z1 - z0; d += 100) {
      tx[d] = tx[d] || numTex(String(d));
      const b = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({ map: tx[d], side: THREE.DoubleSide }),
      );
      b.position.set(x - 8.2, 2.2, z0 + d);
      b.rotation.y = Math.PI;
      add(b);
    }
    // başlangıç ağacı: üç sarı, bir yeşil ışık
    const tm = lam(0x222428);
    add(bx(0.25, 2.6, 0.25, x + 6, 1.3, z0 + 7, tm), bx(0.8, 1.9, 0.25, x + 6, 2.4, z0 + 7, tm));
    R.lt = [];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x332a10 }),
        q = new THREE.Mesh(new THREE.CircleGeometry(0.17, 14), m);
      q.position.set(x + 6, 3.0 - k * 0.42, z0 + 6.86);
      q.rotation.y = Math.PI;
      add(q);
      R.lt.push(m);
    }
    const gm = lam(0x2a2d33);
    add(
      bx(0.5, 7.5, 0.5, x - 8.5, 3.75, z1, gm),
      bx(0.5, 7.5, 0.5, x + 20.5, 3.75, z1, gm),
      bx(29.5, 1.2, 0.6, x + 6, 7.6, z1, gm),
    );
    const sg = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 1.1),
      new THREE.MeshBasicMaterial({
        map: textTex("FİNİŞ", 512, 40, "#2a2d33", "#ff7a3c"),
        side: THREE.DoubleSide,
      }),
    );
    sg.position.set(x + 6, 7.6, z1 - 0.32);
    add(sg);
    const st = lam(0x8d9096);
    for (let k = 0; k < 4; k++)
      add(bx(4, 1 + k * 1.1, (z1 - z0) * 0.6, x - 12 - k * 3, (1 + k * 1.1) / 2, z0 + (z1 - z0) * 0.3, st));
    for (let zz = za; zz < zb; zz += 18) {
      tree(x - 30, zz);
      tree(x + 34, zz);
    }
  };
  R.tick = (e) => {
    const on = e.state == "count" ? Math.min(3, Math.floor(3.4 - e.cd)) : e.state == "run" ? 4 : 0;
    R.lt?.forEach((m, k) =>
      m.color.setHex(k < 3 ? (on > k && on < 4 ? 0xffc21a : 0x332a10) : on == 4 ? 0x2bd34a : 0x0f2a14),
    );
  };
  return R;
}

/** bir pist tanımından bölge kur (k: pist sırası, dünyadaki yerini belirler) */
function mkReg(def: PistTanimi, k: number): Bolge {
  const c: V2 = [((k % 4) - 1.5) * 2600, 3200 + Math.floor(k / 4) * 2600],
    TR = mkTrack(off(recenter(def.p), c[0], c[1]), def.hw, def.t == "rl" || def.t == "dg"),
    hw = def.hw;
  const R: Bolge = {
    ...def,
    idx: k,
    TR,
    c,
    box: bbox(TR, 150),
    col: "#9aa3b5",
    H: () => 0,
    surf: () => 0,
    build: () => {},
  };
  const bb = bbox(TR, 0),
    ext = Math.max(bb[1] - bb[0], bb[3] - bb[2]);
  if (def.t == "dg") return dragReg(R, TR, c);
  R.col = def.t == "gp" || def.t == "dp" ? "#9aa3b5" : "#c9a06b";
  if (def.t == "gp" || def.t == "dp") {
    kerbs(TR);
    R.kerb = 1;
    const A = def.el || 0,
      ep = def.ep || 0,
      HK = (R.Hk = Hkerb(TR)),
      nG = gridNear(TR);
    // pist çizgisi boyunca yükseklik: pist boyunca konumun (s) düzgün fonksiyonu (kapalı pistte başı sonuna bağlanır);
    // çevre arazisi yarı yükseklikte ve bölge kenarında sıfıra iner
    const hS = (q: number) => {
      const u = (q / TR.len) * 6.2832;
      return (A * (1 + 0.6 * Math.sin(u + ep) + 0.4 * Math.sin(2 * u + ep * 1.7 + 1))) / 2;
    };
    TR.hc = TR.S.map(hS);
    const ed = (x: number, z: number) => {
      const b = R.box;
      return sm(10, 140, Math.min(x - b[0], b[1] - x, z - b[2], b[3] - z));
    };
    // yükseklik pist parçasına izdüşümden: noktadan noktaya geçişte basamak ve kırık olmasın (araç titremesin)
    const hAt = (x: number, z: number, i: number) => hS(parcayaIzdusum(TR, x, z, i)[0]);
    const Hb = (R.Hb = A
      ? (x: number, z: number) => {
          const [i, d] = nG(x, z),
            w = 1 - sm(hw + KW + 2, hw + 45, d);
          return hAt(x, z, i) * (0.5 + 0.5 * w) * ed(x, z);
        }
      : null);
    R.H = Hb ? (x, z) => Hb(x, z) + HK(x, z) : HK;
    R.surf = (x, z) => {
      const [i, d] = nearest(TR, x, z, ipucu.ti);
      ipucu.ti = i;
      return d <= hw + KW ? 1 : 2;
    };
    R.build = () => {
      const t = thOf(def.th),
        b = R.box,
        cx = (b[0] + b[1]) / 2,
        cz = (b[2] + b[3]) / 2,
        sz = Math.max(b[1] - b[0], b[3] - b[2]) + 400;
      if (Hb)
        terrain(
          sz,
          Math.min(360, Math.round(sz / 4)),
          ctex(...t.gr, sz / 12.5),
          cx,
          cz,
          (x, z) => Hb(x, z) - 0.3 * (1 - sm(hw + KW, hw + KW + 4, nG(x, z)[1])),
        );
      asphaltTrack(TR, Hb, t.asp);
      if (def.t == "gp") boards(TR, autoApex(TR));
      if (def.pr) PROPS[def.pr](R, TR, Hb);
      if (!def.nf) {
        forest(
          TR,
          Math.round((def.t == "gp" ? 260 : 240) * (def.fd || 1)),
          hw + (def.pr == "mount" ? 6 : 20),
          1e9,
          ext + 500,
          c[0],
          c[1],
        );
        if (def.t == "dp") edgeBush(TR, 40, 6, 14);
      }
    };
    return R;
  }
  const J = mkJumps(
      TR,
      def.j!.map(([q, f]) => [q, straightF(TR, f)]),
    ),
    MUD = def.m!.map((f) => ({ ...onTrack(TR, f), r: def.t == "rl" ? 9 : 15 })),
    WAT = def.w!.map((f, q) => ({
      ...onTrack(TR, f, (q % 2 ? 1 : -1) * (def.t == "rl" ? 1.5 : 3)),
      r: def.t == "rl" ? 4 : 6,
    }));
  const inMud = (x: number, z: number) => MUD.some((m) => (x - m.x) ** 2 + (z - m.z) ** 2 < m.r * m.r);
  R.inMud = inMud;
  const inAs = (i: number) => (def.as || []).some(([a, b]) => TR.S[i] >= a * TR.len && TR.S[i] <= b * TR.len);
  if (def.t == "rx") {
    R.H = (x, z) => jumpH(J, x, z);
    R.surf = (x, z) => {
      const [i, d] = nearest(TR, x, z, ipucu.ti);
      ipucu.ti = i;
      return d > hw + 1 ? 2 : inMud(x, z) ? 3 : inAs(i) ? 1 : 0;
    };
    R.build = () => {
      const t = thOf(def.th),
        sz = ext + 260;
      terrain(sz, Math.round(sz / 3), ctex(...t.gr, sz / 12.5), c[0], c[1]);
      ribbon(
        TR,
        -hw,
        hw,
        0.15,
        (i) => (inAs(i) ? C3(0x3a3f4a) : dirtCol(i)),
        (x, z) => H(x, z),
      );
      startLine(TR, 0.2);
      if (def.pr) PROPS[def.pr](R, TR, (x, z) => H(x, z));
      for (const m of MUD) {
        const q = new THREE.Mesh(new THREE.CircleGeometry(m.r, 28), mudMat);
        q.rotation.x = -Math.PI / 2;
        q.position.set(m.x, H(m.x, m.z) + 0.22, m.z);
        add(q);
      }
      for (const w of WAT) puddle(w.x, w.z, w.r);
      for (let i = 0; i < TR.N; i += 8)
        for (const sd of [-1, 1]) {
          const P = TR.P[i],
            T = TR.T[i],
            o = sd * (hw + 2.5);
          cone(P[0] + T[1] * o, P[1] - T[0] * o);
        }
      forest(TR, Math.round(220 * (def.fd || 1)), hw + 15, 1e9, ext + 300, c[0], c[1]);
      edgeBush(TR, 70, 3, 9);
    };
    return R;
  }
  // ralli: yol enine düz kalsın diye merkez çizgisinin yüksekliğine yaslanır; dışarıda doğal tepeler
  const half = ext / 2 + 130,
    s = def.s || 0,
    ph = [1 + s * 2.1, s * 1.3, s * 0.7];
  R.box = [c[0] - half, c[0] + half, c[1] - half, c[1] + half];
  const H0 = (x: number, z: number) => {
    const lx = x - c[0],
      lz = z - c[1];
    return (
      (14 * Math.sin(lx / 85 + ph[0]) * Math.cos(lz / 95 + ph[1]) +
        8 * Math.sin((lx - lz) / 60 + ph[2]) +
        6 * Math.cos(lz / 140 + ph[0])) *
      (1 - sm(half - 80, half - 10, Math.max(Math.abs(lx), Math.abs(lz))))
    );
  };
  const nearG = gridNear(TR);
  R.H = (x, z) => {
    const [i, d] = nearG(x, z),
      w = 1 - sm(hw + 1, hw + 9, d),
      P = TR.P[i],
      T = TR.T[i],
      s_ = (x - P[0]) * T[0] + (z - P[1]) * T[1];
    return H0(x, z) * (1 - w) + (w > 0 ? H0(P[0] + T[0] * s_, P[1] + T[1] * s_) * w : 0) + jumpH(J, x, z);
  };
  R.surf = (x, z) => {
    const [i, d] = nearest(TR, x, z, ipucu.ti);
    ipucu.ti = i;
    return d > hw + 0.8 ? (def.snow ? 5 : 2) : inMud(x, z) ? 3 : def.snow ? 4 : 0;
  };
  const col = (i: number) => {
    if (i < 2) return C3(0xffffff);
    if (i >= TR.N - 4) return C3(i % 2 ? 0x111111 : 0xffffff);
    const P = TR.P[i];
    for (const m of MUD) if (Math.hypot(P[0] - m.x, P[1] - m.z) < m.r) return C3(0x4a3524);
    for (const w of WAT) if (Math.hypot(P[0] - w.x, P[1] - w.z) < w.r) return C3(0x6d8fa8);
    return def.snow
      ? C3(i % 6 < 3 ? 0x9aa6b0 : 0x939fa9)
      : def.th == "desert"
        ? C3(i % 6 < 3 ? 0x9c7a4c : 0x947246)
        : dirtCol(i);
  };
  R.build = () => {
    const t = thOf(def.th);
    terrain(2 * half + 800, 400, ctex(...t.gr, (2 * half + 800) / 12.5), c[0], c[1]);
    ribbon(TR, -hw, hw, 0.12, col, (x, z) => H(x, z));
    for (const w of WAT) puddle(w.x, w.z, w.r, true);
    if (def.pr) PROPS[def.pr](R, TR, null);
    if (def.rocks) {
      for (let k = 0; k < 260; k++) {
        const i = Math.floor(rnd() * TR.N),
          o = (rnd() < 0.5 ? -1 : 1) * (hw + 5 + rnd() * 70),
          q = atTrack(TR, i, o);
        if (clearOf(TR, q[0], q[1], hw + 4)) rock(q[0], q[1]);
      }
    } else forest(TR, 650, hw + 4, hw + 70, 2 * half - 60, c[0], c[1]);
    edgeBush(TR, def.rocks ? 60 : 170, 1.2, 5);
  };
  return R;
}

/** Boş Otopark: AVM önünde geniş açık otopark (asfalt testleri için) */
function mkPark(idx: number): Bolge {
  const c: V2 = [0, -3400],
    X = c[0],
    Z = c[1],
    L = [-260, 260, -170, 165];
  const inLot = (x: number, z: number) => x > X + L[0] && x < X + L[1] && z > Z + L[2] && z < Z + L[3];
  // park sıraları: her sıra karşılıklı iki dizi park yeri; doğu yarısı boş, test için açık alan
  const ROWS = [-140, -105, -70, -35, 0, 35, 70, 105],
    S0 = -245,
    SW = 2.7,
    SD = 5.5,
    NS = 80;
  const R: Bolge = {
    idx,
    t: "park",
    n: "Boş Otopark",
    c,
    TR: null,
    col: "#9aa3b5",
    box: [X - 340, X + 340, Z - 250, Z + 330],
    H: () => 0,
    surf: (x, z) => (inLot(x, z) ? 1 : 2),
    tele: [
      ["Açık alan", X + 120, Z - 20, -Math.PI / 2],
      ["Park sıraları", X - 10, Z - 122, -Math.PI / 2],
      ["AVM önü", X + 200, Z + 140, -Math.PI / 2],
    ],
    build: () => {},
  };
  R.build = () => {
    plane(L[1] - L[0], L[3] - L[2], X + (L[0] + L[1]) / 2, Z + (L[2] + L[3]) / 2, 0x3c4049, 0.05);
    plane(440, 13, X, Z + 158.5, 0x9a9a94, 0.07);
    const lines: [number, number, number, number][] = [];
    for (const r of ROWS) {
      for (let k = 0; k <= NS; k++) lines.push([X + S0 + k * SW, Z + r, 0.15, 2 * SD]);
      lines.push([X + S0 + (NS * SW) / 2, Z + r, NS * SW, 0.15]);
    }
    for (const z of [L[2] + 3, L[3] - 17]) lines.push([X, Z + z, L[1] - L[0] - 6, 0.2]);
    for (const x of [L[0] + 3, L[1] - 3])
      lines.push([X + x, Z + (L[2] + L[3] - 14) / 2, 0.2, L[3] - L[2] - 20]);
    const m4 = new THREE.Matrix4(),
      li = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xf0f0ea }),
        lines.length,
      );
    li.frustumCulled = false;
    li.userData.flat = 1;
    lines.forEach((l, i) => {
      m4.makeScale(l[2], 1, l[3]);
      m4.setPosition(l[0], 0.08, l[1]);
      li.setMatrixAt(i, m4);
    });
    add(li);
    // park etmiş arabalar
    const pc: V2[] = [];
    for (const r of ROWS)
      for (const sd of [-1, 1])
        for (let k = 0; k < NS; k++)
          if (rnd() < 0.03) pc.push([X + S0 + (k + 0.5) * SW, Z + r + sd * (SD / 2 + 0.2)]);
    if (pc.length) {
      const cb = new THREE.InstancedMesh(
          new THREE.BoxGeometry(1.9, 0.75, 4.3),
          new THREE.MeshLambertMaterial(),
          pc.length,
        ),
        cc = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.55, 2.1), dk, pc.length);
      cb.frustumCulled = cc.frustumCulled = false;
      const PAL = [0xd8323a, 0x2f6fd6, 0xe8e8e8, 0x2a2a2a, 0x8a8f96, 0x2f8a4a, 0xe0b22a];
      pc.forEach(([x, z], i) => {
        m4.makeTranslation(x, 0.72, z);
        cb.setMatrixAt(i, m4);
        cb.setColorAt(i, C3(PAL[i % PAL.length]));
        m4.makeTranslation(x, 1.36, z);
        cc.setMatrixAt(i, m4);
        colAdd({ t: "box", x, z, hx: 0.95, hz: 2.15 });
      });
      add(cb, cc);
    }
    // AVM binası, cam cephe, giriş saçağı ve tabela
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, col: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col }));
      m.position.set(x, y, z);
      add(m);
    };
    box(440, 24, 100, X, 12, Z + 215, 0xd8d2c4);
    box(400, 7, 0.6, X, 5, Z + 164.8, 0x35556e);
    box(50, 0.8, 10, X, 7, Z + 160, 0xff7a3c);
    box(440, 2, 1, X, 24.5, Z + 165, 0xbdb6a6);
    const sg = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 13),
      new THREE.MeshBasicMaterial({ map: textTex("LAST TURN AVM", 1024, 120, "#1d3b44", "#ff7a3c") }),
    );
    sg.position.set(X, 17, Z + 164.4);
    sg.rotation.y = Math.PI;
    add(sg);
    colAdd({ t: "box", x: X, z: Z + 215, hx: 220, hz: 50 });
    // aydınlatma direkleri sıra sonlarında
    const pm = new THREE.MeshLambertMaterial({ color: 0x777b80 });
    for (const r of ROWS) {
      const x = X + S0 + NS * SW + 8,
        z = Z + r;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 9, 8), pm);
      p.position.set(x, 4.5, z);
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.6), pm);
      l.position.set(x, 9, z);
      add(p, l);
      colAdd({ x, z, r: 0.3, t: "solid" });
    }
    // çevrede ağaç sırası
    for (let x = L[0] - 10; x <= L[1] + 10; x += 16) tree(X + x, Z + L[2] - 14);
    for (let z = L[2]; z <= L[3] + 90; z += 16) {
      tree(X + L[0] - 14, Z + z);
      tree(X + L[1] + 14, Z + z);
    }
  };
  R.mm = (x, mmP) => {
    const a = mmP(X + L[0], Z + L[2]),
      b = mmP(X + L[1], Z + L[3]);
    x.fillStyle = "#4a4f59";
    x.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    const m1 = mmP(X - 220, Z + 165),
      m2 = mmP(X + 220, Z + 265);
    x.fillStyle = "#d8d2c4";
    x.fillRect(m1[0], m1[1], m2[0] - m1[0], m2[1] - m1[1]);
    x.strokeStyle = "#e8e8e8";
    x.lineWidth = 1.5;
    for (const r of ROWS) {
      const p = mmP(X + S0, Z + r - SD),
        q = mmP(X + S0 + NS * SW, Z + r + SD);
      x.strokeRect(p[0], p[1], q[0] - p[0], q[1] - p[1]);
    }
  };
  return R;
}

/** tüm bölgeler: 15 pist + Boş Otopark (sonda) */
export const REG: Bolge[] = TDEF.map(mkReg);
export const PARK = mkPark(REG.length);
REG.push(PARK);

/** (x, z) noktasının bölgesi; açık dünyadaysa null */
export function regAt(x: number, z: number): Bolge | null {
  for (const r of REG) {
    const b = r.box;
    if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) return r;
  }
  return null;
}
