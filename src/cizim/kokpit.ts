// Kokpit: her aracın kendi iç mekânı. Kaput ve araç üstü parçalar gerçek modelden görünür, ön cam şeffaflaşır.
// Gövde içeriden görünmez (tek yüzlü), iç mekân bu gruptadır.
import * as THREE from "three";
import type { Arac } from "../arac/araclar";
import { cl } from "../cekirdek/matematik";
import { bx, lam, V3 } from "./yardimci";
import { aynaYuzu } from "./ayna";
import { yariGenislik } from "./govde";

export const cock = new THREE.Group();
cock.visible = false;

export const kokpit = {
  /** direksiyon simidi (sürüşte döner) */
  swl: new THREE.Group(),
  /** hız ve devir ibreleri */
  ndS: null as THREE.Group | null,
  ndR: null as THREE.Group | null,
  /** sürücünün göz konumu (gövde koordinatı) */
  EYE: [0.4, 1.3, -0.2] as [number, number, number],
  /** kapı iç panelinin üstü (pencere eşiği) */
  kt: 0,
  /** devir saatinin son değeri (x1000 d/dk) */
  rmx: 8,
  /** iç tasarımın adı (testler için) */
  stil: "",
};

const beam = (a: number[], b: number[], m: THREE.Material, t: number) => {
  const A = V3(a[0], a[1], a[2]),
    B = V3(b[0], b[1], b[2]),
    d = B.clone().sub(A),
    q = new THREE.Mesh(new THREE.BoxGeometry(t, d.length(), t), m);
  q.position.copy(A).add(B).multiplyScalar(0.5);
  q.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return q;
};

/** iki nokta arası yuvarlak boru */
const boru = (a: number[], b: number[], r: number, m: THREE.Material) => {
  const A = V3(a[0], a[1], a[2]),
    B = V3(b[0], b[1], b[2]),
    d = B.clone().sub(A),
    q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), m);
  q.position.copy(A).add(B).multiplyScalar(0.5);
  q.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return q;
};

/** gösterge kadranı: ibre açısı φ(v) saat yönünde, sol alttan sağ alta */
const dialA = (f: number) => Math.PI * 0.75 + cl(f, 0, 1) * Math.PI * 1.5;

function dialTex(mx: number, step: number, lbl: string, red: number, yuz: string, yazi: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = yuz;
  x.beginPath();
  x.arc(128, 128, 126, 0, 7);
  x.fill();
  x.strokeStyle = "#5a6068";
  x.lineWidth = 5;
  x.beginPath();
  x.arc(128, 128, 121, 0, 7);
  x.stroke();
  if (red) {
    x.strokeStyle = "#e0303a";
    x.lineWidth = 10;
    x.beginPath();
    x.arc(128, 128, 108, dialA(red), dialA(1));
    x.stroke();
  }
  x.fillStyle = yazi;
  x.strokeStyle = yazi;
  x.font = "bold 24px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const yz = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1));
  for (let v = 0; v <= mx + 1e-6; v += step) {
    const a = dialA(v / mx);
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
    x.stroke();
    x.fillText(yz(v), 128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78);
  }
  x.font = "16px sans-serif";
  x.globalAlpha = 0.7;
  x.fillText(lbl, 128, 196);
  return new THREE.CanvasTexture(c);
}

// her aracın kendi iç tasarımı: türüne uygun gösterge, direksiyon, koltuk ve kafes; aracın rengi vurgu olarak
// (koltuk, şerit, kafes). Zemin sıcak kahve/taba tonlarında kalır: gri-mavi asfalttan kolayca ayrılsın.
// d: torpido, taban, direkler; p: torpido üstü ve kapı panelleri; l: koltuklar; k: siyah ayrıntılar; tv: tavan;
// a: vurgu; ib: ibre; kd: kadran yüzü ve yazısı
interface IcStil {
  ad: string;
  d: number;
  p: number;
  l: number;
  k: number;
  tv: number;
  a: number;
  ib: number;
  kd: [string, string];
  gosterge: "ikiz" | "merkez" | "klasik" | "uclu";
  simit: "spor" | "derin" | "kucuk" | "klasik";
  /** koruma kafesi rengi (yarış araçları) */
  kafes?: number;
  /** yarış koltuğu (yanları yüksek) */
  kova?: boolean;
  /** yolcu tarafında ralli mesafe ölçeri */
  ralli?: boolean;
}
const STIL: Record<string, IcStil> = {
  gt: {
    ad: "GT: kırmızı deri, ikiz kadran",
    d: 0x3a2a22,
    p: 0x7e5636,
    l: 0xa8232a,
    k: 0x141210,
    tv: 0x3a3d43,
    a: 0xd01f26,
    ib: 0xff3a2a,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "ikiz",
    simit: "spor",
  },
  rx: {
    ad: "Rallikros: turuncu kafes, büyük devir saati",
    d: 0x30251f,
    p: 0x5e4634,
    l: 0x262c44,
    k: 0x121110,
    tv: 0x1e1f22,
    a: 0xff7a1a,
    ib: 0xff7a1a,
    kd: ["#101114", "#ffb070"],
    gosterge: "merkez",
    simit: "derin",
    kafes: 0xff7a1a,
    kova: true,
  },
  dr: {
    ad: "Drift: beyaz koltuk, ek göstergeler",
    d: 0x3a2e28,
    p: 0x9a7a58,
    l: 0xe6e2da,
    k: 0x161412,
    tv: 0x7a746c,
    a: 0xf0f0ec,
    ib: 0xe0303a,
    kd: ["#f2f0ea", "#15171a"],
    gosterge: "uclu",
    simit: "kucuk",
    kafes: 0xd8d8d2,
    kova: true,
  },
  rl: {
    ad: "Ralli: mavi koltuk, gümüş kafes, mesafe ölçer",
    d: 0x34281f,
    p: 0x7a5a3c,
    l: 0x1d4fc4,
    k: 0x141210,
    tv: 0x2a2c30,
    a: 0x1d4fc4,
    ib: 0xffc21a,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "merkez",
    simit: "derin",
    kafes: 0xc9ccd1,
    kova: true,
    ralli: true,
  },
  dg: {
    ad: "Klasik: krem kadranlar, krom, mavi vinil",
    d: 0x4a2f1e,
    p: 0x96643a,
    l: 0x1d3a8c,
    k: 0x1a1612,
    tv: 0x9a8a72,
    a: 0xc9ccd1,
    ib: 0xe0303a,
    kd: ["#efe6d0", "#1a1612"],
    gosterge: "klasik",
    simit: "klasik",
  },
  gt3: {
    ad: "GT3: kova koltuk, turuncu dikiş, ikiz kadran",
    d: 0x3a2a22,
    p: 0x7e5636,
    l: 0x2a2b2e,
    k: 0x141210,
    tv: 0x3a3d43,
    a: 0xe6a21a,
    ib: 0xff9a1a,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "ikiz",
    simit: "spor",
    kova: true,
  },
  t16: {
    ad: "Grup B: kafesli, kum rengi koltuk, sade kadran",
    d: 0x34281f,
    p: 0x6e5238,
    l: 0x7a3f1d,
    k: 0x121110,
    tv: 0x2a2c30,
    a: 0xd2a24c,
    ib: 0xffb070,
    kd: ["#101114", "#ffd9a0"],
    gosterge: "merkez",
    simit: "klasik",
    kafes: 0x15171a,
    kova: true,
  },
  int: {
    ad: "Ralli: sarı koltuk, gümüş kafes, mesafe ölçer",
    d: 0x34281f,
    p: 0x7a5a3c,
    l: 0xe0b020,
    k: 0x141210,
    tv: 0x2a2c30,
    a: 0xf2c200,
    ib: 0xffc21a,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "merkez",
    simit: "derin",
    kafes: 0xc9ccd1,
    kova: true,
    ralli: true,
  },
  ae86: {
    ad: "Panda: sade klasik kadranlar, siyah-beyaz koltuk",
    d: 0x3a2e28,
    p: 0x9a7a58,
    l: 0x2a2a2c,
    k: 0x161412,
    tv: 0x7a746c,
    a: 0xf0f0ec,
    ib: 0xe0303a,
    kd: ["#efe6d0", "#1a1612"],
    gosterge: "klasik",
    simit: "kucuk",
  },
  supra: {
    ad: "Drag: turuncu vurgu, ek göstergeler, spor simit",
    d: 0x3a2a22,
    p: 0x7e5636,
    l: 0x2a2a2d,
    k: 0x141210,
    tv: 0x3a3d43,
    a: 0xff6a00,
    ib: 0xff6a00,
    kd: ["#0c0e11", "#ffb070"],
    gosterge: "uclu",
    simit: "spor",
  },
  e30: {
    ad: "Eski sedan: gri kumaş koltuk, sade kadranlar",
    d: 0x3a2e28,
    p: 0x8a6a4a,
    l: 0x5a5c60,
    k: 0x161412,
    tv: 0x6a665e,
    a: 0xc9ccd1,
    ib: 0xff8a2a,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "ikiz",
    simit: "klasik",
  },
  golf: {
    ad: "Eski hatchback: ekose koltuk, ince kafes",
    d: 0x34281f,
    p: 0x7a5a3c,
    l: 0x8a3a2a,
    k: 0x141210,
    tv: 0x2a2c30,
    a: 0xc58a2e,
    ib: 0xff9a2a,
    kd: ["#101114", "#ffd9a0"],
    gosterge: "merkez",
    simit: "kucuk",
    kafes: 0x2a2c30,
  },
  niva: {
    ad: "Arazi: haki kumaş, büyük düz kadranlar",
    d: 0x3a3024,
    p: 0x8a7050,
    l: 0x5a6234,
    k: 0x161412,
    tv: 0x4a4a40,
    a: 0x8a9a52,
    ib: 0xffc21a,
    kd: ["#efe6d0", "#1a1612"],
    gosterge: "klasik",
    simit: "klasik",
  },
  c33: {
    ad: "Eski sedan: bordo kadife koltuk, ahşap görünüm",
    d: 0x4a2f1e,
    p: 0x96643a,
    l: 0x6a1f33,
    k: 0x1a1612,
    tv: 0x8a7a62,
    a: 0xc9ccd1,
    ib: 0x40c8ff,
    kd: ["#0c0e11", "#e8eaed"],
    gosterge: "uclu",
    simit: "klasik",
  },
  fox: {
    ad: "Eski muscle: siyah vinil, krom kadranlar",
    d: 0x3a2a22,
    p: 0x7e5636,
    l: 0x222224,
    k: 0x141210,
    tv: 0x3a3d43,
    a: 0xd8232a,
    ib: 0xff3a2a,
    kd: ["#efe6d0", "#1a1612"],
    gosterge: "klasik",
    simit: "spor",
  },
};

function malzemeler(st: IcStil) {
  const iki = (c: number) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide });
  return {
    d: lam(st.d),
    p: lam(st.p),
    l: lam(st.l),
    k: lam(st.k),
    a: lam(st.a),
    d2: iki(st.d),
    p2: iki(st.p),
    tv: iki(st.tv),
    kf: st.kafes === undefined ? null : lam(st.kafes),
    ib: new THREE.MeshBasicMaterial({ color: st.ib }),
  };
}

/** iki yüzlü üçgen (yan dolgu parçaları için) */
const tri = (a: number[], b: number[], c: number[], m: THREE.Material) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
};

export function buildInterior(d: Arac) {
  cock.clear();
  const st = STIL[d.k] || STIL.gt,
    M = malzemeler(st),
    w = d.w,
    hw = w / 2 - 0.07,
    lf = d.lift || 0,
    gh = d.gh,
    yb = (gh[0][1] + gh[3][1]) / 2 + lf,
    yr = Math.max(...d.p.map((p) => p[1])) + lf,
    // ön cam: alt kenarı (torpidonun cama değdiği yer) ve üst kenarı; cam yarı genişliği
    [zc, yc0] = d.ws[0],
    [zh, yh0] = d.ws[1],
    yc = yc0 + lf,
    yh = yh0 + lf,
    // ön cam kenarları: gövde kabinin tavana doğru daraldığı biçimi izler (cam yarı genişliğinin %93'ü)
    gwA = yariGenislik(d, yc0, zc) * 0.93,
    gwT = yariGenislik(d, yh0, zh) * 0.93 - 0.02,
    zf = zc,
    zt = zh,
    fy = Math.min(...d.p.map((p) => p[1])) + lf + 0.08,
    ex = w * 0.21,
    // göz ön camın alt kenarının belirgin üstünde (yol torpidonun üstünden görünsün), tavana en az 13 cm
    ey = cl(yc + 0.15, yr - 0.24, yr - 0.13),
    ez = zt - 0.4,
    // B direği sürücünün arkasında; tavan döşemesi ön camın üst çerçevesinin altında
    zB = Math.max(gh[1][0] + 0.06, ez - 0.55),
    yl = Math.min(yr, yh) - 0.035,
    zr = zB - 0.3,
    mz = (zf + zr) / 2,
    L = zf - zr,
    dt = Math.min(yb - 0.02, ey - 0.22),
    zd = ez + 0.62;
  kokpit.EYE = [ex, ey, ez];
  kokpit.stil = st.ad;
  kokpit.rmx = Math.ceil((d.dv || 7500) / 1000) + 1;
  // kapı iç panellerinin üstü göz hizasının belirgin altında: yan camdan yol ve yan ayna görünsün
  // (dış gövde içeriden görünmez, bu yüzden panelin üstü pencere eşiği olur)
  // tavan kenarının B direğindeki yarı genişliği
  const hwT = Math.min(hw, yariGenislik(d, yl - lf, zB) - 0.02);
  const kt = (kokpit.kt = Math.max(fy + 0.25, Math.min(yb, ey - 0.2)));
  // zemin ve kapı iç panelleri (yol ve tekerler alttan görünmesin)
  const z0 = mz - (L + 0.3) / 2;
  cock.add(bx(2 * hw, 0.04, L + 0.5, 0, fy, mz, M.d));
  for (const sd of [-1, 1])
    cock.add(
      bx(0.06, kt - fy, L + 0.3, sd * hw, (kt + fy) / 2, mz, M.p),
      // eşik: sürücünün yanına kadar düz, oradan A direğinin dibine (ön camın alt kenarına) yükselir
      bx(0.045, 0.045, ez - z0 + 0.02, sd * (hw - 0.03), kt, (ez + z0) / 2 + 0.01, M.d),
      beam([sd * (hw - 0.03), kt, ez], [sd * (hw - 0.03), yc, zc + 0.05], M.d, 0.045),
      bx(0.1, 0.04, L * 0.5, sd * (hw - 0.05), kt - 0.12, mz - 0.1, M.l),
      // kapıda aracın renginde şerit
      bx(0.012, 0.03, L * 0.7, sd * (hw - 0.035), kt - 0.06, mz, M.a),
    );
  // torpido: gövdesi tabandan dt'ye, üstü göstergelerin arkasından ön camın alt kenarına yükselir
  // (cam ile torpido arasında boşluk kalmaz); iki yanı üçgen dolgu, kapı eşiğinden A direğinin dibine
  const tl = Math.hypot(zc - zd, yc - dt);
  cock.add(
    bx(2 * hw, dt - fy, zc - zd + 0.1, 0, (dt + fy) / 2, (zc + zd) / 2 + 0.05, M.d),
    bx(2 * hw, 0.04, tl + 0.04, 0, (yc + dt) / 2 - 0.02, (zc + zd) / 2, M.p, -Math.atan2(yc - dt, zc - zd)),
    // torpidonun sürücüye bakan yüzünde aracın renginde şerit
    bx(2 * hw - 0.08, 0.016, 0.012, 0, dt - 0.035, zd - 0.006, M.a),
  );
  for (const sd of [-1, 1])
    cock.add(
      tri([sd * hw, dt, zd], [sd * hw, dt, zc + 0.05], [sd * hw, yc, zc + 0.05], M.d2),
      // kapı paneli yükselen eşiğin altını doldurur (torpidonun yanı eşiğin üstünden görünmesin)
      tri(
        [sd * (hw - 0.005), kt, ez],
        [sd * (hw - 0.005), kt, zc + 0.05],
        [sd * (hw - 0.005), yc, zc + 0.05],
        M.p2,
      ),
    );
  // gösterge grubu: kadranlar sürücüye dönük ve eğik; arka panel kadranların arkasında, siperlik üstünde
  // (kutu kadranların önünde kalırsa alt yarılarını kapatır). Grup Y'de π döndüğü için yerel x ters:
  // yerel +x sürücünün sağı.
  const gk = new THREE.Group(),
    gen = st.gosterge == "ikiz" || st.gosterge == "uclu" ? 0.27 : 0.31;
  gk.position.set(ex, dt + 0.056, ez + 0.56);
  gk.rotation.set(0.7, Math.PI, 0);
  gk.add(bx(gen, 0.12, 0.02, 0, -0.002, -0.015, M.k), bx(gen + 0.02, 0.01, 0.05, 0, 0.06, 0.012, M.d));
  cock.add(gk);
  const halka = st.gosterge == "klasik" ? M.a : M.k;
  /** kadran: yerel x, yarıçap, son değer, aralık, yazı, kırmızı bölge; ibresi döner (sabit ibre için açı ver) */
  const mkG = (
    par: THREE.Object3D,
    x: number,
    r: number,
    mx: number,
    stp: number,
    lbl: string,
    red = 0,
    sabit?: number,
  ) => {
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(
        new THREE.CircleGeometry(r, 28),
        new THREE.MeshBasicMaterial({ map: dialTex(mx, stp, lbl, red, st.kd[0], st.kd[1]) }),
      ),
      new THREE.Mesh(new THREE.TorusGeometry(r, 0.0045, 6, 28), halka),
    );
    const pv = new THREE.Group();
    pv.position.z = 0.004;
    pv.add(bx(r * 0.85, 0.006, 0.003, r * 0.4, 0, 0, M.ib));
    if (sabit !== undefined) pv.rotation.z = -dialA(sabit);
    g.add(pv);
    g.position.x = x;
    par.add(g);
    return pv;
  };
  const rm = kokpit.rmx,
    kr = (rm - 1.5) / rm;
  if (st.gosterge == "merkez") {
    // yarış düzeni: ortada büyük devir saati, sağda hız, solda yağ sıcaklığı
    kokpit.ndR = mkG(gk, 0, 0.064, rm, 1, "x1000 d/dk", kr);
    kokpit.ndS = mkG(gk, 0.105, 0.04, 240, 40, "km/sa");
    mkG(gk, -0.105, 0.034, 150, 50, "yağ °C", 0, 0.55);
  } else {
    // ikiz ve klasik: solda devir, sağda hız
    const r = st.gosterge == "klasik" ? 0.058 : 0.052;
    kokpit.ndR = mkG(gk, -0.065, r, rm, 1, "x1000 d/dk", kr);
    kokpit.ndS = mkG(gk, 0.065, r, 320, 40, "km/sa");
  }
  if (st.gosterge == "uclu") {
    // drift: torpidonun ortasında üç ek gösterge (turbo, yağ basıncı, su sıcaklığı)
    const ek = new THREE.Group();
    ek.position.set(0.02, dt + 0.04, zd + 0.06);
    // yüzü doğrudan sürücünün gözüne bakar (yana yatmadan)
    ek.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(V3(ex, ey, ez), ek.position, V3(0, 1, 0)));
    ek.add(bx(0.2, 0.075, 0.03, 0, 0, -0.018, M.k));
    mkG(ek, -0.065, 0.027, 2, 0.5, "turbo", 0, 0.6);
    mkG(ek, 0, 0.027, 8, 2, "yağ bar", 0, 0.45);
    mkG(ek, 0.065, 0.027, 120, 40, "su °C", 0.85, 0.7);
    cock.add(ek);
  }
  if (st.ralli) {
    // ralli: yolcu tarafında mesafe ölçer (yeşil ekran)
    const tm = new THREE.Group();
    tm.position.set(-ex * 0.9, dt + 0.04, zd + 0.04);
    tm.rotation.set(0.5, Math.PI, 0);
    const ekr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.045),
      new THREE.MeshBasicMaterial({ color: 0x7cff9a }),
    );
    ekr.position.z = 0.017;
    tm.add(bx(0.19, 0.075, 0.03, 0, 0, 0, M.k), ekr);
    cock.add(tm);
  }
  // direksiyon: türüne göre spor (üç kollu deri), derin (süet, kolları öne çökük), küçük (drift), klasik (ince, iki kollu)
  const swl = (kokpit.swl = new THREE.Group()),
    sm = st.simit,
    sr = sm == "klasik" ? 0.2 : sm == "kucuk" ? 0.15 : sm == "derin" ? 0.165 : 0.17,
    kalin = sm == "klasik" ? 0.012 : sm == "derin" ? 0.03 : 0.026,
    cuk = sm == "derin" ? 0.04 : 0,
    simM = sm == "klasik" ? M.l : M.k,
    kollar =
      sm == "klasik"
        ? [0, Math.PI]
        : sm == "kucuk"
          ? [-0.3, Math.PI + 0.3, -Math.PI / 2]
          : [0, Math.PI, -Math.PI / 2];
  swl.add(new THREE.Mesh(new THREE.TorusGeometry(sr, kalin, 8, 32), simM));
  for (const a of kollar)
    swl.add(
      beam(
        [Math.cos(a) * 0.045, Math.sin(a) * 0.045, cuk],
        [Math.cos(a) * (sr - kalin), Math.sin(a) * (sr - kalin), 0],
        sm == "klasik" ? M.a : M.k,
        sm == "klasik" ? 0.012 : 0.03,
      ),
    );
  swl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14).rotateX(Math.PI / 2), M.p));
  swl.children[swl.children.length - 1].position.z = cuk;
  if (sm == "klasik") swl.add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 24), M.a));
  else
    swl.add(
      bx(
        0.045,
        0.022,
        0.034,
        0,
        sr + 0.004,
        -0.004,
        new THREE.MeshBasicMaterial({ color: st.a == 0xf0f0ec ? 0xe0303a : st.a }),
      ),
    );
  const sg = new THREE.Group();
  // klasik büyük simit biraz aşağıda: kadranların altını kesmesin
  sg.position.set(ex, ey - 0.36 - (sm == "klasik" ? 0.04 : 0), ez + 0.46);
  sg.rotation.x = 0.5;
  sg.add(swl, bx(0.07, 0.07, 0.5, 0, 0, 0.28, M.d));
  cock.add(sg);
  // orta konsol, vites kolu, yolcu koltuğu
  cock.add(bx(0.3, 0.34, 1.15, 0, fy + 0.17, zf - 0.95, M.d));
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 6), M.l);
  sh.position.set(0, fy + 0.44, zf - 1.1);
  sh.rotation.x = -0.3;
  cock.add(sh, bx(0.06, 0.06, 0.06, 0, fy + 0.56, zf - 1.14, M.k));
  cock.add(
    bx(0.5, 0.14, 0.52, -ex, fy + 0.22, ez + 0.05, M.l),
    bx(0.5, 0.72, 0.12, -ex, fy + 0.62, ez - 0.26, M.l, -0.15),
    bx(0.32, 0.2, 0.1, -ex, fy + 1.05, ez - 0.3, M.l, -0.15),
  );
  if (st.kova)
    // yarış koltuğu: yanları yüksek, sırtında kemer
    for (const sd of [-1, 1])
      cock.add(
        bx(0.07, 0.62, 0.2, -ex + sd * 0.25, fy + 0.62, ez - 0.22, M.k, -0.15),
        bx(0.06, 0.06, 0.5, -ex + sd * 0.25, fy + 0.32, ez + 0.05, M.k),
        bx(0.05, 0.6, 0.01, -ex + sd * 0.09, fy + 0.66, ez - 0.19, M.a, -0.15),
      );
  // kabin iskeleti birbirine bağlı: A direkleri ön cam kenarında torpidodan tavana, üst çerçeve, tavan
  // kenarı A direğinden B direğine, B direği kapı eşiğinden tavana
  const rl = new THREE.Mesh(new THREE.PlaneGeometry(2 * hwT, zh - zB + 0.1), M.tv);
  rl.rotation.x = Math.PI / 2;
  rl.position.set(0, yl, (zh + zB) / 2 - 0.05);
  cock.add(rl, bx(2 * gwT + 0.06, 0.045, 0.08, 0, yh - 0.035, zh - 0.03, M.d));
  for (const sd of [-1, 1])
    cock.add(
      beam([sd * gwA, yc, zc], [sd * gwT, yh - 0.03, zh], M.d, 0.075),
      beam([sd * gwT, yh - 0.04, zh], [sd * hwT, yl, zB], M.d, 0.07),
      beam([sd * hw, kt, zB], [sd * hwT, yl, zB], M.d, 0.1),
    );
  if (M.kf) {
    // koruma kafesi (yuvarlak borular): gövde iskeletine yaslanır, görüşü daraltmaz.
    // Ön ve tavan boruları direklerin sürücü gözüyle arasına, direğe 7 cm yaklaştırılır: gözden bakınca
    // direğin üstünde ince bir boru olarak görünür. Ana çember B direğinde, sürücünün arkasında; kapı boruları
    // pencere eşiğinin altında (sürücü tarafı iki yatay, yolcu tarafı çapraz).
    const kf = M.kf,
      E = [ex, ey, ez],
      yasla = (q: number[], m = 0.07) => {
        const d = Math.hypot(E[0] - q[0], E[1] - q[1], E[2] - q[2]);
        return q.map((v, i) => v + ((E[i] - v) * m) / d);
      },
      r = 0.02,
      kx = hw - 0.06,
      kxT = hwT - 0.05,
      zk = zB - 0.05,
      ky = yl - 0.03,
      zo = zc - 0.12,
      dugum = (q: number[]) => {
        const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 8, 6), kf);
        k.position.set(q[0], q[1], q[2]);
        return k;
      };
    // ana çember ve arkasındaki çapraz
    cock.add(boru([-kxT, ky, zk], [kxT, ky, zk], r, kf), boru([kxT, ky, zk], [-kx, fy + 0.1, zk], r, kf));
    for (const sd of [-1, 1]) {
      const aAlt = yasla([sd * gwA, yc + 0.02, zc - 0.02]),
        aUst = yasla([sd * gwT, yh - 0.05, zh + 0.01]),
        cUst = [sd * kxT, ky, zk],
        ayak = [sd * kx, fy, zo];
      cock.add(
        boru([sd * kx, fy, zk], cUst, r, kf),
        // A borusu: tabandan ön cam köşesine, oradan direği izleyerek tavana; tavan borusu ana çembere
        boru(ayak, aAlt, r, kf),
        boru(aAlt, aUst, r, kf),
        boru(aUst, yasla([sd * hwT, yl - 0.01, zB]), r, kf),
        boru(yasla([sd * hwT, yl - 0.01, zB]), cUst, r, kf),
        dugum(aAlt),
        dugum(aUst),
        dugum(cUst),
      );
      const ka = kt - 0.05,
        kb = Math.max(fy + 0.12, kt - 0.2);
      if (sd > 0)
        cock.add(
          boru([sd * kx, ka, zk], [sd * kx, ka, zo], r, kf),
          boru([sd * kx, kb, zk], [sd * kx, kb, zo], r, kf),
          // sürücü tarafındaki üst kapı borusunda siyah koruma süngeri
          boru([sd * kx, ka, zk + 0.15], [sd * kx, ka, zo - 0.25], r * 1.9, M.k),
        );
      else
        cock.add(
          boru([sd * kx, ka, zk], [sd * kx, kb, zo], r, kf),
          boru([sd * kx, kb, zk], [sd * kx, ka, zo], r, kf),
        );
    }
    // ön cam üstünde iki A borusunu bağlayan üst boru
    cock.add(boru(yasla([gwT, yh - 0.05, zh + 0.01]), yasla([-gwT, yh - 0.05, zh + 0.01]), r, kf));
  }
  // iç dikiz aynası: ön camın üst ortasına sapıyla bağlı, göz hizasının biraz üstünde
  // (ortadan biraz sürücüye kaydırılmış ve ona çevrilmiş: geniş görüş açısında ekranın kenarına kaçmasın)
  const ym = Math.min(ey + 0.1, yh - 0.1),
    zg = (y: number) => zh + ((yh - y) / (yh - yc)) * (zc - zh),
    zm = zg(ym + 0.04) - 0.06,
    xm = ex * 0.4,
    da = new THREE.Group();
  cock.add(beam([xm, ym + 0.02, zm], [xm, ym + 0.06, zg(ym + 0.06) - 0.01], M.k, 0.022));
  da.position.set(xm, ym, zm);
  da.rotation.y = -0.5 * Math.atan2(ex - xm, zm - ez);
  const dk = aynaYuzu(0.2, 0.052, 1, 0);
  dk.position.z = -0.014;
  da.add(bx(0.22, 0.066, 0.025, 0, 0, 0, M.k), dk);
  cock.add(da);
}

/** ibreler: hız (km/sa) ve devir (x1000) */
export function gauges(kmh: number, rpm: number) {
  if (!kokpit.ndS || !kokpit.ndR) return;
  kokpit.ndS.rotation.z = -dialA(kmh / 320);
  kokpit.ndR.rotation.z = -dialA(rpm / kokpit.rmx);
}
