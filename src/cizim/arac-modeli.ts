// Araç modeli: gövde yan profilin enine uzatılmasıyla kurulur; camlar, renk panelleri, farlar, tekerler ve
// her araca özel ek parçalar (kanat, numara, kompresör). Gece farı araca bağlı spot ışıktır.
import * as THREE from "three";
import type { Arac } from "../arac/araclar";
import type { V2 } from "../cekirdek/matematik";
import { yaziTuvali } from "./dokular";
import { blackM, glassM, glassQM, lightM, tailM, bm } from "./malzemeler";
import { scene } from "./sahne";
import { bx, lam } from "./yardimci";
import { buildInterior, cock } from "./kokpit";
import { arkaKam, aynalariSifirla, aynaYuzu } from "./ayna";

/** araç: dış grup (konum, yön, eğim), gövde (yalpa, yatış) */
export const car = new THREE.Group(),
  body = new THREE.Group();
car.rotation.order = "YXZ";
car.add(body);
body.add(cock);
scene.add(car);

/** gece farları: yalnız gece ve yağmurlu akşamlarda yanar */
export const headL = new THREE.SpotLight(0xfff2d0, 0, 90, 0.55, 0.45, 1.1);
headL.position.set(0, 1, 1.8);
headL.target.position.set(0, 0, 22);
car.add(headL, headL.target);

/** yan profil (z ileri, y yukarı) → genişliği w olan gövde parçası */
function prof(pts: V2[], w: number, m: THREE.Material, bev?: number) {
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  const b = bev ?? 0.04;
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: w,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    steps: 1,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}

/** iki profil noktası arasında cam (ön/arka cam), dışa doğru hafifçe kaldırılmış */
function glassQ(a: V2, b: V2, ww: number) {
  const dz = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dz, dy),
    q = new THREE.Mesh(new THREE.PlaneGeometry(ww, l), glassQM);
  q.rotation.x = Math.atan2(dz, dy);
  q.position.set(0, (a[1] + b[1]) / 2 - (dz / l) * 0.05, (a[0] + b[0]) / 2 + (dy / l) * 0.05);
  return q;
}

function decal(t: string, w: number, h: number, fg?: string) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: yaziTuvali(t, fg || "#fff"), transparent: true, depthWrite: false }),
  );
}

/** iki yanda yarış numarası */
function numbers(g: THREE.Group, t: string, w: number, z: number, y: number, s: number, fg: string) {
  for (const sd of [-1, 1]) {
    const d = decal(t, 0.75 * s, 0.56 * s, fg);
    d.position.set(sd * (w / 2 + 0.06), y, z);
    d.rotation.y = (sd * Math.PI) / 2;
    g.add(d);
  }
}

function mkWheel(r: number, wd: number, rimC: number) {
  const g = new THREE.Group(),
    rm = lam(rimC);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, wd, 18).rotateZ(Math.PI / 2), blackM));
  g.add(
    new THREE.Mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, wd + 0.02, 12).rotateZ(Math.PI / 2), rm),
  );
  const sp = bx(wd + 0.04, r * 1.2, r * 0.16, 0, 0, 0, rm);
  g.add(sp);
  const s2 = sp.clone();
  s2.rotation.x = Math.PI / 2;
  g.add(s2);
  return g;
}

/** ortak gövde: profil + yan camlar + ön/arka cam + renk panelleri + farlar */
function body0(d: Arac) {
  const g = new THREE.Group(),
    m = lam(d.col),
    w = d.w;
  g.add(prof(d.p, w, m));
  // yan camlar içeriden görünmez; alt yüzeyleri göz hizasında kaldığı için kokpitte gizlenir
  const yan = prof(d.gh, w + 0.1, glassM, 0);
  yan.userData.pan = 1;
  g.add(yan);
  g.add(glassQ(d.ws[0], d.ws[1], w * 0.86), glassQ(d.rw[0], d.rw[1], w * 0.82));
  for (const [pts, c] of d.pan || []) {
    const q = prof(pts, w + 0.1, lam(c), 0);
    q.userData.pan = 1;
    g.add(q);
  }
  const zf = Math.max(...d.p.map((p) => p[0])),
    zr = Math.min(...d.p.map((p) => p[0]));
  for (const sd of [-1, 1]) {
    if (!d.rhl) g.add(bx(0.36, 0.12, 0.06, sd * (w / 2 - 0.28), d.hl, zf + 0.02, lightM));
    g.add(bx(0.34, 0.12, 0.06, sd * (w / 2 - 0.26), d.tl, zr - 0.02, tailM));
  }
  // yan aynalar: ön camın dibinde, kapının dışında; yüzleri arka görüntünün kendi yanını gösterir
  const [az, ay] = d.ws[0];
  for (const sd of [-1, 1]) {
    const x = sd * (w / 2 + 0.15),
      y = ay + 0.1,
      z = az - 0.22,
      yz = aynaYuzu(0.21, 0.12, sd > 0 ? 1 : 0.5, sd > 0 ? 0.5 : 0);
    yz.position.set(x, y, z - 0.046);
    g.add(
      bx(0.24, 0.15, 0.09, x, y, z, m),
      bx(0.14, 0.03, 0.04, sd * (w / 2 + 0.03), y - 0.03, z, blackM),
      yz,
    );
  }
  return g;
}

/** araca özel ek parçalar */
const EK: Record<string, (g: THREE.Group, d: Arac) => void> = {
  gt: (g) => {
    g.add(bx(1.72, 0.05, 0.2, 0, 0.98, -2.04, blackM, -0.15), bx(1.86, 0.06, 0.22, 0, 0.3, 2.12, blackM));
  },
  rx: (g, d) => {
    const r = lam(0x15171a);
    g.add(
      bx(1.74, 0.06, 0.46, 0, 1.58, -1.78, r, 0.2),
      bx(0.05, 0.32, 0.5, -0.85, 1.48, -1.76, r),
      bx(0.05, 0.32, 0.5, 0.85, 1.48, -1.76, r),
      bx(1.96, 0.05, 0.3, 0, 0.3, 2.06, r),
    );
    for (const sd of [-1, 1])
      for (const z of [1.28, -1.28]) g.add(bx(0.12, 0.16, 0.95, sd * (d.w / 2 + 0.05), 0.72, z, r));
    numbers(g, "71", d.w, -0.05, 0.72, 1, "#ffffff");
  },
  dr: (g, d) => {
    const k = blackM;
    g.add(
      bx(1.98, 0.05, 0.4, 0, 1.5, -1.98, k, 0.12),
      bx(0.06, 0.52, 0.2, -0.62, 1.2, -1.92, k),
      bx(0.06, 0.52, 0.2, 0.62, 1.2, -1.92, k),
      bx(0.06, 0.24, 0.5, -0.99, 1.52, -1.98, k),
      bx(0.06, 0.24, 0.5, 0.99, 1.52, -1.98, k),
    );
    g.add(bx(2.04, 0.04, 0.4, 0, 0.2, 2.32, k));
    numbers(g, "23", d.w, 0.35, 0.6, 1.1, "#15171a");
  },
  rl: (g, d) => {
    const k = blackM,
      bmm = lam(d.col);
    g.add(
      bx(1.62, 0.06, 0.36, 0, 1.34, -1.98, bmm, 0.1),
      bx(0.06, 0.34, 0.14, -0.6, 1.16, -1.98, k),
      bx(0.06, 0.34, 0.14, 0.6, 1.16, -1.98, k),
      bx(0.5, 0.1, 0.5, 0, 0.95, 1.45, k),
    );
    for (const sd of [-1, 1])
      for (const z of [1.36, -1.32]) g.add(bx(0.3, 0.36, 0.03, sd * 0.82, 0.42, z - 0.42, k));
    numbers(g, "5", d.w, -0.4, 0.8, 1, "#ffffff");
  },
  dg: (g) => {
    const s = lam(0xc9ccd1),
      rd = lam(0xd8232a),
      wt = lam(0xf2f2f2);
    g.add(bx(0.56, 0.28, 0.72, 0, 1.07, 1.2, s));
    for (const x of [-0.19, 0, 0.19]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 14).rotateX(Math.PI / 2), rd);
      c.position.set(x, 1.3, 1.42);
      g.add(c);
    }
    for (const x of [-0.16, 0.16]) {
      g.add(
        bx(0.18, 0.02, 1.42, x, 0.975, 1.5, wt, -0.05),
        bx(0.18, 0.02, 1.16, x, 1.33, -0.48, wt),
        bx(0.18, 0.02, 0.7, x, 1.01, -1.85, wt),
      );
    }
    g.add(bx(1.9, 0.14, 0.12, 0, 0.5, 2.4, s), bx(1.9, 0.14, 0.12, 0, 0.46, -2.38, s));
    for (const sd of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), lightM);
      h.position.set(sd * 0.68, 0.72, 2.39);
      g.add(h);
    }
  },
};

interface TekerModeli {
  pv: THREE.Group;
  w: THREE.Group;
  f: number;
}

export type { TekerModeli };

function buildCar(d: Arac) {
  const g = body0(d);
  EK[d.k]?.(g, d);
  g.position.y = d.lift || 0;
  const W = d.wh,
    ws: TekerModeli[] = [];
  for (const [x, z, f] of [
    [-W.x, W.zf, 1],
    [W.x, W.zf, 1],
    [-(W.rx || W.x), W.zr, 0],
    [W.rx || W.x, W.zr, 0],
  ]) {
    const r = f ? W.r : W.rr || W.r,
      w = mkWheel(r, f ? W.wd : W.rwd || W.wd, W.rim),
      pv = new THREE.Group();
    w.userData.r = r;
    pv.position.set(x, r + (d.lift || 0) * 0.5, z);
    // yeni fizikte süspansiyon hareketi için taban yükseklik; fizik teker sırası: sol ön, sağ ön, sol arka, sağ arka
    pv.userData.y0 = pv.position.y;
    pv.userData.fi = (f ? 0 : 2) + (x > 0 ? 0 : 1);
    pv.add(w);
    ws.push({ pv, w, f });
  }
  return { g, ws };
}

/** kurulu araç modeli: gövde grubu, tekerler, ön teker pivotları */
export const model = {
  carM: null as { g: THREE.Group; ws: TekerModeli[] } | null,
  steerP: [] as THREE.Group[],
  wheels: [] as THREE.Group[],
};

/** aracın görsel modelini kur (iç mekân dahil) */
export function aracModeliKur(d: Arac) {
  const M = model;
  aynalariSifirla();
  if (M.carM) {
    body.remove(M.carM.g);
    for (const w of M.carM.ws) car.remove(w.pv);
  }
  const cm = (M.carM = buildCar(d));
  body.add(cm.g);
  for (const w of cm.ws) car.add(w.pv);
  cm.g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  for (const w of cm.ws)
    w.w.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  M.steerP = cm.ws.filter((w) => w.f).map((w) => w.pv);
  M.wheels = cm.ws.map((w) => w.w);
  bm.color.setHex(d.col);
  buildInterior(d);
  // aynaların kamerası: aracın arka üstünde, arkaya (gövdenin -z yönüne) bakar
  arkaKam.position.set(
    0,
    Math.max(...d.p.map((p) => p[1])) + (d.lift || 0) + 0.12,
    Math.min(...d.p.map((p) => p[0])) - 0.1,
  );
  arkaKam.rotation.set(-0.06, 0, 0);
  body.add(arkaKam);
}
