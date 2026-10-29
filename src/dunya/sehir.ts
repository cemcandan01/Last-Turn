// Kule Şehri bölgesinin kurulumu ve çizimi (LT-SYS-008). Düzen saf modülde (sehir-duzen.ts); burası Bolge'yi,
// yolları, binaları (tek birleşik geometri, cephe dokusu), parkı, nehri, bariyerleri ve mini haritayı kurar.
// Yarışta bölgenin TR'si o anki sokak rotasıdır (yarislar.ts startEvent kurar, leaveEvent boşaltır).
import * as THREE from "three";
import type { V2 } from "../cekirdek/matematik";
import type { Bolge } from "./bolgeler";
import { add, colAdd, kur, plane, rnd, tree } from "./kurucu";
import { ipucu, nearest } from "./pist";
import {
  CADDE_YARI,
  CADDELER,
  GOL,
  PARK,
  PARK_YOLU,
  SEHIR_ATOLYE,
  SEHIR_BOSS,
  SEHIR_GIRIS,
  SEHIR_KUTU,
  SEHIR_X,
  SEHIR_YARI,
  SEHIR_Z,
  SOKAK_YARI,
  SOKAKLAR,
  binaTepesi,
  semt,
  sehirBinalari,
  sehirYuksekligi,
  type Bina,
  type Blok,
  type Meydan,
  sehirZemini,
} from "./sehir-duzen";

/**
 * LT-SYS-009 semt cepheleri (SEMT_DOKU sırasıyla): taş, cam kule, tuğla, sıvalı konut, sanayi. Bir doku hücresi bir
 * kat × iki pencere (sanayide oluklu sac + üstte bant pencere). Renk tonu köşe rengiyle çarpılır.
 */
function cepheDokulari(): THREE.CanvasTexture[] {
  const ciz = (f: (x: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    f(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const pencere = (
    x: CanvasRenderingContext2D,
    cam: string,
    ust: string,
    px: number,
    py: number,
    w: number,
    h: number,
  ) => {
    x.fillStyle = cam;
    x.fillRect(px, py, w, h);
    x.fillStyle = ust;
    x.fillRect(px, py, w, h * 0.2);
  };
  return [
    // taş: açık duvar, mavi-gri cam
    ciz((x) => {
      x.fillStyle = "#e6e2da";
      x.fillRect(0, 0, 64, 64);
      pencere(x, "#5d7894", "#86a3bf", 5, 10, 22, 40);
      pencere(x, "#5d7894", "#86a3bf", 37, 10, 22, 40);
      x.fillStyle = "#cfc9bd";
      x.fillRect(0, 58, 64, 6);
    }),
    // cam kule: koyu turkuaz cam, ince açık kayıtlar, yansıma
    ciz((x) => {
      const g = x.createLinearGradient(0, 0, 64, 64);
      g.addColorStop(0, "#5f8fa6");
      g.addColorStop(1, "#2c4f63");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      x.fillStyle = "#c9dbe4";
      x.fillRect(0, 0, 64, 3);
      x.fillRect(0, 0, 2, 64);
      x.fillRect(31, 0, 2, 64);
      x.fillStyle = "#ffffff22";
      x.fillRect(6, 6, 12, 52);
    }),
    // tuğla: kırmızı-kahve tuğla örgüsü, beyaz çerçeveli pencere
    ciz((x) => {
      x.fillStyle = "#a4533a";
      x.fillRect(0, 0, 64, 64);
      x.fillStyle = "#8b4330";
      for (let r = 0; r < 16; r++)
        for (let k = 0; k < 5; k++) x.fillRect(((r % 2) * 7 + k * 14) % 64, r * 4, 1, 4);
      for (let r = 0; r < 16; r++) x.fillRect(0, r * 4, 64, 1);
      x.fillStyle = "#f1eadf";
      x.fillRect(8, 12, 18, 36);
      x.fillRect(38, 12, 18, 36);
      pencere(x, "#3e4d5c", "#5c6f80", 10, 14, 14, 32);
      pencere(x, "#3e4d5c", "#5c6f80", 40, 14, 14, 32);
    }),
    // konut: sıva, balkon korkuluğu, perdeli sıcak pencere
    ciz((x) => {
      x.fillStyle = "#f4efe4";
      x.fillRect(0, 0, 64, 64);
      pencere(x, "#6f8aa0", "#e9c98f", 7, 12, 20, 30);
      pencere(x, "#6f8aa0", "#e9c98f", 37, 12, 20, 30);
      x.fillStyle = "#7d7a74";
      x.fillRect(4, 40, 56, 3);
      for (let k = 0; k < 9; k++) x.fillRect(5 + k * 7, 40, 1, 10);
      x.fillRect(4, 50, 56, 2);
    }),
    // sanayi: oluklu sac, üstte bant pencere
    ciz((x) => {
      x.fillStyle = "#b9bec4";
      x.fillRect(0, 0, 64, 64);
      x.fillStyle = "#9aa1a8";
      for (let k = 0; k < 64; k += 4) x.fillRect(k, 0, 2, 64);
      pencere(x, "#55697a", "#7f95a8", 0, 6, 64, 9);
    }),
  ];
}

/** semt (doku) başına cephe tonları ve pencere hücresi (m: yatay, dikey) */
const TONLAR = [
  [0xffffff, 0xd9cdb8, 0xb9c2cc, 0xc9b49a, 0xa9b6a2, 0xe0d0c8],
  [0xffffff, 0xcfefff, 0xd8e6ff, 0xe0ffe8, 0xfff2d8, 0xc8d8e8],
  [0xffffff, 0xffd8c8, 0xf0c8a8, 0xe8e0d0, 0xffc8b0, 0xd8b8a0],
  [0xfff0cc, 0xffd8d8, 0xd4ecff, 0xe2f8d0, 0xffe2b4, 0xeadcff],
  [0xd0d6dc, 0xb0c8e0, 0xe0d0b4, 0xc4dccc, 0xe8e8e8, 0xdcbcbc],
];
const HUCRE: [number, number][] = [
  [8, 3.6],
  [5, 3.6],
  [7, 3.4],
  [7, 3.2],
  [10, 6],
];
const CATI_RENK = [0x6b6f76, 0x4a5560, 0x5e4a42, 0x8a7a6a, 0x707780];
const TENTE_RENK = [0xc8323a, 0x2f8a4a, 0x2f62b8, 0xe0a020, 0xd06020, 0x7a3aa0];

/** binaların birleşik geometrileri: her doku için cephe (pencere UV), çatılar (köşe rengi), dükkân tenteleri */
function binaGeometrisi() {
  const { binalar } = sehirBinalari(),
    renk = new THREE.Color();
  const cep = TONLAR.map(() => ({
      p: [] as number[],
      u: [] as number[],
      c: [] as number[],
      i: [] as number[],
    })),
    cati = { p: [] as number[], c: [] as number[], i: [] as number[] },
    tente = { p: [] as number[], c: [] as number[], i: [] as number[] };
  const yuz = (
    g: { p: number[]; u?: number[]; c: number[]; i: number[] },
    a: number[],
    b: number[],
    c: number[],
    d: number[],
    u = 0,
    v = 0,
    v0 = 0,
  ) => {
    const o = g.p.length / 3;
    g.p.push(...a, ...b, ...c, ...d);
    g.u?.push(0, v0, u, v0, u, v, 0, v);
    for (let k = 0; k < 4; k++) g.c.push(renk.r, renk.g, renk.b);
    g.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  /** kutu yan yüzleri + çatı: y0–y1 arası, x0..x1 × z0..z1 */
  const kutu = (d: number, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => {
    const g = cep[d],
      [hu, hv] = HUCRE[d],
      uX = (x1 - x0) / hu,
      uZ = (z1 - z0) / hu,
      v0 = y0 / hv,
      v = y1 / hv;
    yuz(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], uX, v, v0);
    yuz(g, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], uX, v, v0);
    yuz(g, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], uZ, v, v0);
    yuz(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], uZ, v, v0);
  };
  const ust = (x0: number, x1: number, z0: number, z1: number, y: number) =>
    yuz(cati, [x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]);
  for (const b of binalar) {
    renk.setHex(TONLAR[b.doku][b.ton]);
    const x0 = b.x - b.hx + SEHIR_X,
      x1 = b.x + b.hx + SEHIR_X,
      z0 = b.z - b.hz + SEHIR_Z,
      z1 = b.z + b.hz + SEHIR_Z;
    kutu(b.doku, x0, x1, z0, z1, 0, b.y);
    if (b.ust) {
      const ux0 = b.x - b.ust.hx + SEHIR_X,
        ux1 = b.x + b.ust.hx + SEHIR_X,
        uz0 = b.z - b.ust.hz + SEHIR_Z,
        uz1 = b.z + b.ust.hz + SEHIR_Z;
      kutu(b.doku, ux0, ux1, uz0, uz1, b.y, b.ust.y);
      renk.setHex(CATI_RENK[b.doku]);
      ust(ux0, ux1, uz0, uz1, b.ust.y);
    } else renk.setHex(CATI_RENK[b.doku]);
    ust(x0, x1, z0, z1, b.y);
    if (b.tente) {
      // zemin katta binayı saran renkli tente bandı (3–3,7 m; araç altından geçer)
      renk.setHex(TENTE_RENK[(b.ton + b.doku) % TENTE_RENK.length]);
      const e = 1.1,
        a0 = x0 - e,
        a1 = x1 + e,
        c0 = z0 - e,
        c1 = z1 + e;
      for (const [y0, y1] of [[3, 3.7]] as const) {
        yuz(tente, [a0, y0, c1], [a1, y0, c1], [x1, y1, z1], [x0, y1, z1]);
        yuz(tente, [a1, y0, c0], [a0, y0, c0], [x0, y1, z0], [x1, y1, z0]);
        yuz(tente, [a1, y0, c1], [a1, y0, c0], [x1, y1, z0], [x1, y1, z1]);
        yuz(tente, [a0, y0, c0], [a0, y0, c1], [x0, y1, z1], [x0, y1, z0]);
      }
    }
  }
  const geo = (g: { p: number[]; u?: number[]; c: number[]; i: number[] }) => {
    const r = new THREE.BufferGeometry();
    r.setAttribute("position", new THREE.Float32BufferAttribute(g.p, 3));
    if (g.u) r.setAttribute("uv", new THREE.Float32BufferAttribute(g.u, 2));
    r.setAttribute("color", new THREE.Float32BufferAttribute(g.c, 3));
    r.setIndex(g.i);
    r.computeVertexNormals();
    return r;
  };
  return { cepheler: cep.map(geo), cati: geo(cati), tente: geo(tente) };
}

/** çatı süsleri (su deposu, anten, klima, baca) ve sokak donatısı (lamba) toplu çizim */
function topluCiz(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  l: [number, number, number, number, number][],
) {
  if (!l.length) return;
  const im = new THREE.InstancedMesh(geo, mat, l.length),
    m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    sc = new THREE.Vector3();
  l.forEach(([x, y, z, s, sy], i) => {
    p.set(x, y, z);
    sc.set(s, sy, s);
    m4.compose(p, q, sc);
    im.setMatrixAt(i, m4);
  });
  im.frustumCulled = false;
  add(im);
}

/** düz dörtgenler tek geometride (kaldırım tonları, yaya geçitleri, meydanlar): [x0, z0, x1, z1, y, renk] */
function dortgenler(l: [number, number, number, number, number, number][]) {
  const p: number[] = [],
    c: number[] = [],
    ix: number[] = [],
    renk = new THREE.Color();
  for (const [x0, z0, x1, z1, y, col] of l) {
    const o = p.length / 3;
    renk.setHex(col);
    p.push(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
    for (let k = 0; k < 4; k++) c.push(renk.r, renk.g, renk.b);
    ix.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.userData.flat = 1;
  add(m);
}

/** semt kaldırım tonu */
const KALDIRIM_RENK: Record<string, number> = {
  tas: 0x9a9ca0,
  cam: 0xa9adb2,
  eski: 0xa08e7e,
  konut: 0xa6a296,
  sanayi: 0x85857f,
};

/**
 * LT-SYS-009 şehir donatısı: semt tonlu kaldırımlar, yaya geçitleri, meydanlar, cadde ağaçları (eski şehir, konut,
 * taş semt; çarpışmalı), sokak lambaları (çarpışmasız, gece parlar), çatı süsleri. Hepsi toplu çizim.
 */
function sehirDonatisi(binalar: readonly Bina[], bloklar: readonly Blok[], meydanlar: readonly Meydan[]) {
  const X = SEHIR_X,
    Z = SEHIR_Z,
    d: [number, number, number, number, number, number][] = [];
  // kaldırım tonu blok blok (semt)
  for (const k of bloklar)
    d.push([
      X + k.x0,
      Z + k.z0,
      X + k.x1,
      Z + k.z1,
      0.03,
      KALDIRIM_RENK[semt((k.x0 + k.x1) / 2, (k.z0 + k.z1) / 2)],
    ]);
  // meydan: açık taş döşeme
  for (const m of meydanlar)
    d.push([X + m.x - m.hx, Z + m.z - m.hz, X + m.x + m.hx, Z + m.z + m.hz, 0.05, 0xc9bfa8]);
  // yaya geçidi: kavşağa giren her yolda beyaz şeritler
  const cizgi = (x0: number, z0: number, x1: number, z1: number) =>
    d.push([X + x0, Z + z0, X + x1, Z + z1, 0.08, 0xe9e9e4]);
  for (const cx of CADDELER)
    for (const sz of SOKAKLAR) {
      if (cx > PARK.x0 && cx < PARK.x1 && sz > PARK.z0 && sz < PARK.z1) continue;
      for (const yon of [-1, 1]) {
        // caddede (kuzey-güney) geçit: sokağın kenarından 1–4 m dışarıda, enine şeritler
        const z0 = sz + yon * (SOKAK_YARI + 1);
        for (let k = -CADDE_YARI + 1; k < CADDE_YARI - 1; k += 2.2)
          cizgi(cx + k, Math.min(z0, z0 + yon * 3), cx + k + 1.1, Math.max(z0, z0 + yon * 3));
        const x0 = cx + yon * (CADDE_YARI + 1);
        for (let k = -SOKAK_YARI + 1; k < SOKAK_YARI - 1; k += 2.2)
          cizgi(Math.min(x0, x0 + yon * 3), sz + k, Math.max(x0, x0 + yon * 3), sz + k + 1.1);
      }
    }
  dortgenler(d);
  // cadde ağaçları: ağaçlı semtlerde, kaldırımın yola yakın şeridinde, kavşaklardan uzak; meydanda dört ağaç
  const agac = (x: number, z: number, s: number) => {
    kur.inst!.k.push([x, 1.5, z, 0.7]);
    kur.inst!.t.push([x, 6, z, s]);
    colAdd({ x, z, r: 0.6, t: "solid" });
  };
  const agacli = (x: number, z: number) => {
    const t = semt(x, z);
    return t == "konut" || t == "eski" || t == "tas";
  };
  const lambalar: [number, number, number, number, number][] = [],
    basliklar: [number, number, number, number, number][] = [];
  CADDELER.forEach((cx, i) => {
    for (let z = -770; z < 770; z += 18) {
      const kavsak = SOKAKLAR.some((sz) => Math.abs(z - sz) < SOKAK_YARI + 7);
      if (kavsak || (cx > PARK.x0 && cx < PARK.x1 && z > PARK.z0 - 10 && z < PARK.z1 + 10)) continue;
      for (const yon of [-1, 1]) {
        const x = cx + yon * (CADDE_YARI + 1.4);
        if (i % 2 == 0 && agacli(x, z)) agac(X + x, Z + z, 0.45 + rnd() * 0.2);
        // lamba: bina tarafında, her ikinci noktada
        else if ((Math.round(z / 18) + (yon > 0 ? 1 : 0)) % 2 == 0) {
          const lx = cx + yon * (CADDE_YARI + 3.4);
          lambalar.push([X + lx, 3.2, Z + z, 1, 1]);
          basliklar.push([X + lx - yon * 0.9, 6.3, Z + z, 1, 1]);
        }
      }
    }
  });
  for (const m of meydanlar)
    for (const [ax, az] of [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ])
      agac(X + m.x + ax * m.hx, Z + m.z + az * m.hz, 0.5 + rnd() * 0.25);
  topluCiz(
    new THREE.CylinderGeometry(0.12, 0.16, 6.4, 5),
    new THREE.MeshLambertMaterial({ color: 0x3b3f45 }),
    lambalar,
  );
  topluCiz(new THREE.BoxGeometry(2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }), basliklar);
  // çatı süsleri
  const depo: [number, number, number, number, number][] = [],
    anten: [number, number, number, number, number][] = [],
    klima: [number, number, number, number, number][] = [],
    baca: [number, number, number, number, number][] = [];
  for (const b of binalar) {
    const ty = binaTepesi(b),
      hx = b.ust?.hx ?? b.hx,
      hz = b.ust?.hz ?? b.hz,
      x = X + b.x,
      z = Z + b.z,
      o = ((b.ton % 3) - 1) * 0.3;
    if (b.cati == 1) depo.push([x + hx * o, ty + 3, z - hz * 0.3, 1, 1]);
    else if (b.cati == 2) anten.push([x + hx * o, ty + 7, z, 1, 1 + (b.ton % 3) * 0.4]);
    else if (b.cati == 3)
      for (const k of [-0.4, 0.3]) klima.push([x + hx * k, ty + 0.8, z + hz * k * o, 1, 1]);
    else if (b.cati == 4) baca.push([x + hx * 0.6, ty + 6, z + hz * 0.5, 1, 1]);
  }
  topluCiz(
    new THREE.CylinderGeometry(2.2, 2.2, 4.5, 10),
    new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
    depo,
  );
  topluCiz(
    new THREE.CylinderGeometry(0.25, 0.35, 14, 5),
    new THREE.MeshLambertMaterial({ color: 0xb8bcc2 }),
    anten,
  );
  topluCiz(new THREE.BoxGeometry(3, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: 0xc9cdd2 }), klima);
  topluCiz(
    new THREE.CylinderGeometry(1, 1.3, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x7a3e2e }),
    baca,
  );
}

export function mkSehir(idx: number): Bolge {
  const X = SEHIR_X,
    Z = SEHIR_Z,
    Y = SEHIR_YARI,
    K = SEHIR_KUTU;
  const R: Bolge = {
    idx,
    t: "park",
    n: "Kule Şehri",
    c: [X, Z],
    TR: null,
    col: "#ffd34d",
    box: [X - K, X + K, Z - K, Z + K],
    H: (x, z) => sehirYuksekligi(x - X, z - Z),
    surf: (x, z) => {
      if (R.TR) ipucu.ti = nearest(R.TR, x, z, ipucu.ti)[0];
      return sehirZemini(x - X, z - Z);
    },
    tele: [
      ["Atölye önü", SEHIR_GIRIS[0], SEHIR_GIRIS[1], SEHIR_GIRIS[2]],
      ["Büyük Park", X, Z - PARK_YOLU.z, 0],
      ["Kuzey", SEHIR_BOSS[0], SEHIR_BOSS[1] - 40, Math.PI],
    ],
    build: () => {},
  };
  R.build = () => {
    // zemin: kaldırım betonu, yollar, park, nehir
    plane(2 * Y, 2 * Y, X, Z, 0x9a9ca0, 0.02);
    plane(2 * K, 2 * K, X, Z, 0x2f6f95, -0.4);
    for (const cx of CADDELER) {
      // park içinden geçmeyen parçalar
      for (const [a, b] of cx > PARK.x0 && cx < PARK.x1
        ? [
            [-Y, PARK.z0],
            [PARK.z1, Y],
          ]
        : [[-Y, Y]]) {
        plane(2 * CADDE_YARI, b - a, X + cx, Z + (a + b) / 2, 0x34383f, 0.05);
        plane(0.3, b - a, X + cx, Z + (a + b) / 2, 0xe8c547, 0.07);
      }
    }
    for (const sz of SOKAKLAR) {
      for (const [a, b] of sz > PARK.z0 && sz < PARK.z1
        ? [
            [-Y, PARK.x0],
            [PARK.x1, Y],
          ]
        : [[-Y, Y]])
        plane(b - a, 2 * SOKAK_YARI, X + (a + b) / 2, Z + sz, 0x34383f, 0.04);
    }
    // Büyük Park: çim, göl, halka park yolu, ağaçlar
    plane(PARK.x1 - PARK.x0, PARK.z1 - PARK.z0, X, Z, 0x4f8a3c, 0.06);
    const gol = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40),
      new THREE.MeshLambertMaterial({ color: 0x3f7fae }),
    );
    gol.rotation.x = -Math.PI / 2;
    gol.scale.set(GOL.rx, GOL.rz, 1);
    gol.position.set(X + GOL.x, 0.08, Z + GOL.z);
    gol.userData.flat = 1;
    add(gol);
    const py = PARK_YOLU;
    plane(2 * py.x, 2 * py.yari, X, Z - py.z, 0x3a3e45, 0.09);
    plane(2 * py.x, 2 * py.yari, X, Z + py.z, 0x3a3e45, 0.09);
    plane(2 * py.yari, 2 * py.z, X - py.x, Z, 0x3a3e45, 0.09);
    plane(2 * py.yari, 2 * py.z, X + py.x, Z, 0x3a3e45, 0.09);
    for (let n = 0; n < 260; n++) {
      const x = PARK.x0 + 6 + rnd() * (PARK.x1 - PARK.x0 - 12),
        z = PARK.z0 + 6 + rnd() * (PARK.z1 - PARK.z0 - 12),
        g = sehirZemini(x, z);
      if (g == 2) tree(X + x, Z + z);
    }
    // binalar: semt cephesi + ton (köşe rengi), çatı semt renginde, tenteler; her gövde çarpışma kutusu
    const { cepheler, cati, tente } = binaGeometrisi(),
      dokular = cepheDokulari();
    cepheler.forEach((g, d) =>
      add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: dokular[d], vertexColors: true }))),
    );
    add(
      new THREE.Mesh(cati, new THREE.MeshLambertMaterial({ vertexColors: true })),
      new THREE.Mesh(tente, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    );
    const { binalar, bloklar, meydanlar } = sehirBinalari();
    for (const b of binalar) {
      colAdd({ t: "box", x: X + b.x, z: Z + b.z, hx: b.hx, hz: b.hz, y: b.y });
      if (b.ust) colAdd({ t: "box", x: X + b.x, z: Z + b.z, hx: b.ust.hx, hz: b.ust.hz, y: b.ust.y });
    }
    sehirDonatisi(binalar, bloklar, meydanlar);
    // kenar bariyeri (nehre düşmesin)
    const bm = new THREE.MeshLambertMaterial({ color: 0xb9b6ad });
    for (const [x, z, hx, hz] of [
      [0, -Y - 2, Y + 4, 1],
      [0, Y + 2, Y + 4, 1],
      [-Y - 2, 0, 1, Y + 4],
      [Y + 2, 0, 1, Y + 4],
    ] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2 * hx, 1.2, 2 * hz), bm);
      m.position.set(X + x, 0.6, Z + z);
      add(m);
      colAdd({ t: "box", x: X + x, z: Z + z, hx, hz });
    }
    // atölye ve boss işaret alanları için hafif zemin vurgusu
    for (const [x, z, col] of [
      [SEHIR_ATOLYE[0], SEHIR_ATOLYE[1], 0x3a86ff],
      [SEHIR_BOSS[0], SEHIR_BOSS[1], 0xd8323a],
    ] as const)
      plane(14, 14, x, z, col, 0.1);
  };
  R.mm = (x: CanvasRenderingContext2D, mmP: (a: number, c: number) => V2) => {
    const a = mmP(X - Y, Z - Y),
      b = mmP(X + Y, Z + Y);
    x.fillStyle = "#3a3e45";
    x.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    x.fillStyle = "#8d9096";
    for (const k of sehirBinalari().bloklar) {
      const p = mmP(X + k.x0, Z + k.z0),
        q = mmP(X + k.x1, Z + k.z1);
      x.fillRect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]));
    }
    const p = mmP(X + PARK.x0, Z + PARK.z0),
      q = mmP(X + PARK.x1, Z + PARK.z1);
    x.fillStyle = "#4f8a3c";
    x.fillRect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]));
    // yarışta rota
    const TR = R.TR;
    if (TR) {
      x.strokeStyle = R.col;
      x.lineWidth = 3;
      x.beginPath();
      TR.P.forEach((t, i) => {
        const m = mmP(t[0], t[1]);
        if (i) x.lineTo(m[0], m[1]);
        else x.moveTo(m[0], m[1]);
      });
      if (!TR.open) x.closePath();
      x.stroke();
    }
  };
  return R;
}
