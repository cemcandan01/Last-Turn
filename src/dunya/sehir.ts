// Kule Şehri bölgesinin kurulumu ve çizimi (LT-SYS-008). Düzen saf modülde (sehir-duzen.ts); burası Bolge'yi,
// yolları, binaları (tek birleşik geometri, cephe dokusu), parkı, nehri, bariyerleri ve mini haritayı kurar.
// Yarışta bölgenin TR'si o anki sokak rotasıdır (yarislar.ts startEvent kurar, leaveEvent boşaltır).
import * as THREE from "three";
import type { V2 } from "../cekirdek/matematik";
import type { Bolge } from "./bolgeler";
import { add, colAdd, plane, rnd, tree } from "./kurucu";
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
  sehirBinalari,
  sehirYuksekligi,
  sehirZemini,
} from "./sehir-duzen";

/** gündüz cephe dokusu: açık duvar, mavi-gri cam; bir doku hücresi = bir kat × iki pencere */
function cepheDokusu() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e6e2da";
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = "#5d7894";
  x.fillRect(5, 10, 22, 40);
  x.fillRect(37, 10, 22, 40);
  x.fillStyle = "#86a3bf";
  x.fillRect(5, 10, 22, 8);
  x.fillRect(37, 10, 22, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TONLAR = [0xffffff, 0xd9cdb8, 0xb9c2cc, 0xc9b49a, 0xa9b6a2, 0xe0d0c8];

/** binaların birleşik geometrisi: dört cephe (pencere UV: 8 m × 3,6 m hücre) ve çatı ayrı */
function binaGeometrisi() {
  const { binalar } = sehirBinalari(),
    cp: number[] = [],
    cu: number[] = [],
    cc: number[] = [],
    ci: number[] = [],
    rp: number[] = [],
    ri: number[] = [],
    renk = new THREE.Color();
  const yuz = (a: number[], b: number[], c: number[], d: number[], u: number, v: number) => {
    const o = cp.length / 3;
    cp.push(...a, ...b, ...c, ...d);
    cu.push(0, 0, u, 0, u, v, 0, v);
    for (let k = 0; k < 4; k++) cc.push(renk.r, renk.g, renk.b);
    ci.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  for (const b of binalar) {
    renk.setHex(TONLAR[b.ton]);
    const x0 = b.x - b.hx + SEHIR_X,
      x1 = b.x + b.hx + SEHIR_X,
      z0 = b.z - b.hz + SEHIR_Z,
      z1 = b.z + b.hz + SEHIR_Z,
      y = b.y,
      uX = (x1 - x0) / 8,
      uZ = (z1 - z0) / 8,
      v = y / 3.6;
    yuz([x0, 0, z1], [x1, 0, z1], [x1, y, z1], [x0, y, z1], uX, v);
    yuz([x1, 0, z0], [x0, 0, z0], [x0, y, z0], [x1, y, z0], uX, v);
    yuz([x1, 0, z1], [x1, 0, z0], [x1, y, z0], [x1, y, z1], uZ, v);
    yuz([x0, 0, z0], [x0, 0, z1], [x0, y, z1], [x0, y, z0], uZ, v);
    const o = rp.length / 3;
    rp.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    ri.push(o, o + 2, o + 1, o, o + 3, o + 2);
  }
  const cephe = new THREE.BufferGeometry();
  cephe.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
  cephe.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2));
  cephe.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
  cephe.setIndex(ci);
  cephe.computeVertexNormals();
  const cati = new THREE.BufferGeometry();
  cati.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
  cati.setIndex(ri);
  cati.computeVertexNormals();
  return { cephe, cati };
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
    // binalar: cephe dokusu + ton (köşe rengi), çatı düz gri; her bina çarpışma kutusu
    const { cephe, cati } = binaGeometrisi(),
      doku = cepheDokusu();
    add(
      new THREE.Mesh(cephe, new THREE.MeshLambertMaterial({ map: doku, vertexColors: true })),
      new THREE.Mesh(cati, new THREE.MeshLambertMaterial({ color: 0x6b6f76 })),
    );
    for (const b of sehirBinalari().binalar)
      colAdd({ t: "box", x: X + b.x, z: Z + b.z, hx: b.hx, hz: b.hz, y: b.y });
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
