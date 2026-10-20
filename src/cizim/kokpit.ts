// Kokpit: her aracın kendi iç mekânı. Kaput ve araç üstü parçalar gerçek modelden görünür, ön cam şeffaflaşır.
// Gövde içeriden görünmez (tek yüzlü), iç mekân bu gruptadır.
import * as THREE from "three";
import type { Arac } from "../arac/araclar";
import { cl } from "../cekirdek/matematik";
import { bx, lam, V3 } from "./yardimci";
import { aynaYuzu } from "./ayna";

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

/** gösterge kadranı: ibre açısı φ(v) saat yönünde, sol alttan sağ alta */
const dialA = (f: number) => Math.PI * 0.75 + cl(f, 0, 1) * Math.PI * 1.5;

function dialTex(mx: number, step: number, lbl: string, red?: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0c0e11";
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
  x.fillStyle = "#e8eaed";
  x.strokeStyle = "#e8eaed";
  x.font = "bold 24px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  for (let v = 0; v <= mx + 1e-6; v += step) {
    const a = dialA(v / mx);
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    x.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
    x.stroke();
    x.fillText(String(Math.round(v)), 128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78);
  }
  x.font = "16px sans-serif";
  x.fillStyle = "#9aa3ad";
  x.fillText(lbl, 128, 196);
  return new THREE.CanvasTexture(c);
}

// iç mekân renkleri: sıcak kahve ve taba deri; gri-mavi asfalttan kolayca ayrılsın
// d: torpido, taban, direkler; p: torpido üstü ve kapı panelleri; l: koltuklar; k: siyah ayrıntılar
const intM = {
  d: lam(0x3a2a22),
  p: lam(0x7e5636),
  l: lam(0x8e3a2c),
  k: lam(0x141210),
  d2: new THREE.MeshLambertMaterial({ color: 0x3a2a22, side: THREE.DoubleSide }),
  p2: new THREE.MeshLambertMaterial({ color: 0x7e5636, side: THREE.DoubleSide }),
};

/** iki yüzlü üçgen (yan dolgu parçaları için) */
const tri = (a: number[], b: number[], c: number[], m: THREE.Material) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
};

export function buildInterior(d: Arac) {
  cock.clear();
  const M = intM,
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
    gw = w * 0.43,
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
  // kapı iç panellerinin üstü göz hizasının belirgin altında: yan camdan yol ve yan ayna görünsün
  // (dış gövde içeriden görünmez, bu yüzden panelin üstü pencere eşiği olur)
  const kt = (kokpit.kt = Math.max(fy + 0.25, Math.min(yb, ey - 0.2)));
  // zemin ve kapı iç panelleri (yol ve tekerler alttan görünmesin)
  cock.add(bx(2 * hw, 0.04, L + 0.5, 0, fy, mz, M.d));
  for (const sd of [-1, 1])
    cock.add(
      bx(0.06, kt - fy, L + 0.3, sd * hw, (kt + fy) / 2, mz, M.p),
      bx(0.1, 0.025, L + 0.3, sd * (hw - 0.03), kt, mz, M.d),
      bx(0.1, 0.04, L * 0.5, sd * (hw - 0.05), kt - 0.12, mz - 0.1, M.l),
    );
  // torpido: gövdesi tabandan dt'ye, üstü göstergelerin arkasından ön camın alt kenarına yükselir
  // (cam ile torpido arasında boşluk kalmaz); iki yanı üçgen dolgu, kapı eşiğinden A direğinin dibine
  const tl = Math.hypot(zc - zd, yc - dt);
  cock.add(
    bx(2 * hw, dt - fy, zc - zd + 0.1, 0, (dt + fy) / 2, (zc + zd) / 2 + 0.05, M.d),
    bx(2 * hw, 0.04, tl + 0.04, 0, (yc + dt) / 2 - 0.02, (zc + zd) / 2, M.p, -Math.atan2(yc - dt, zc - zd)),
  );
  for (const sd of [-1, 1])
    cock.add(
      tri([sd * hw, dt, zd], [sd * hw, dt, zc + 0.05], [sd * hw, yc, zc + 0.05], M.d2),
      tri([sd * hw, kt, zc + 0.05], [sd * hw, yc, zc + 0.05], [sd * hw, kt, zc - 0.35], M.p2),
    );
  // gösterge grubu: kadranlar sürücüye dönük ve eğik; arka panel kadranların arkasında, siperlik üstünde
  // (kutu kadranların önünde kalırsa alt yarılarını kapatır). Grup Y'de π döndüğü için yerel x ters.
  const gk = new THREE.Group();
  gk.position.set(ex, dt + 0.056, ez + 0.56);
  gk.rotation.set(0.7, Math.PI, 0);
  gk.add(bx(0.27, 0.12, 0.02, 0, -0.002, -0.015, M.k), bx(0.29, 0.01, 0.05, 0, 0.06, 0.012, M.d));
  cock.add(gk);
  const mkG = (x: number, mx: number, st: number, lbl: string, red?: number) => {
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(
        new THREE.CircleGeometry(0.052, 28),
        new THREE.MeshBasicMaterial({ map: dialTex(mx, st, lbl, red) }),
      ),
    );
    const pv = new THREE.Group();
    pv.position.z = 0.004;
    pv.add(bx(0.044, 0.006, 0.003, 0.021, 0, 0, new THREE.MeshBasicMaterial({ color: 0xff5a1f })));
    g.add(pv);
    g.position.x = -x;
    gk.add(g);
    return pv;
  };
  kokpit.ndR = mkG(0.06, 8, 1, "x1000 d/dk", 0.8);
  kokpit.ndS = mkG(-0.06, 320, 40, "km/sa");
  // direksiyon: üç kollu, kolonuyla
  const swl = (kokpit.swl = new THREE.Group());
  swl.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 8, 28), M.k));
  for (const a of [0, Math.PI, -Math.PI / 2]) {
    const sp = bx(0.17, 0.04, 0.022, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0, M.k);
    sp.rotation.z = a;
    swl.add(sp);
  }
  swl.add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14).rotateX(Math.PI / 2), M.p),
    bx(0.04, 0.02, 0.03, 0, 0.19, -0.01, new THREE.MeshBasicMaterial({ color: 0xff7a3c })),
  );
  const sg = new THREE.Group();
  sg.position.set(ex, ey - 0.36, ez + 0.46);
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
  // kabin iskeleti birbirine bağlı: A direkleri ön cam kenarında torpidodan tavana, üst çerçeve, tavan
  // kenarı A direğinden B direğine, B direği kapı eşiğinden tavana
  const rl = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * hw, zh - zB + 0.1),
    new THREE.MeshLambertMaterial({ color: 0x3a3d43, side: THREE.DoubleSide }),
  );
  rl.rotation.x = Math.PI / 2;
  rl.position.set(0, yl, (zh + zB) / 2 - 0.05);
  cock.add(rl, bx(2 * gw, 0.045, 0.08, 0, yh - 0.035, zh - 0.03, M.d));
  for (const sd of [-1, 1])
    cock.add(
      beam([sd * gw, yc, zc], [sd * (gw - 0.05), yh - 0.03, zh], M.d, 0.075),
      beam([sd * (gw - 0.05), yh - 0.04, zh], [sd * (hw - 0.03), yl, zB], M.d, 0.07),
      beam([sd * hw, kt, zB], [sd * (hw - 0.03), yl, zB], M.d, 0.1),
    );
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
  kokpit.ndR.rotation.z = -dialA(rpm / 8);
}
