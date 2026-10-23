// Araç modeli: gövde yan profilin enine uzatılmasıyla kurulur; camlar, renk panelleri, farlar, tekerler ve
// her araca özel ek parçalar (kanat, numara, kompresör). Gece farı araca bağlı spot ışıktır.
import * as THREE from "three";
import type { Arac } from "../arac/araclar";
import { yaziTuvali } from "./dokular";
import { blackM, dk, glassM, glassQM, lightM, tailM, bm } from "./malzemeler";
import { scene } from "./sahne";
import { bx, lam } from "./yardimci";
import { buildInterior, cock } from "./kokpit";
import { arkaKam, aynalariSifirla, aynaYuzu } from "./ayna";
import { enineGovde, kemerler, kemerliProfil, tekerYerleri, yamukCam, yariGenislik } from "./govde";

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

function decal(t: string, w: number, h: number, fg?: string) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: yaziTuvali(t, fg || "#fff"), transparent: true, depthWrite: false }),
  );
}

/** profilin y yüksekliğinde en öndeki (on) ya da en arkadaki noktası: z ve yüzeyin eğimi (dz/dy) */
function uc(d: Arac, y: number, on: boolean) {
  let z = on ? -Infinity : Infinity,
    s = 0;
  for (let i = 0; i < d.p.length; i++) {
    const a = d.p[i],
      b = d.p[(i + 1) % d.p.length];
    if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue;
    const t = (y - a[1]) / (b[1] - a[1]),
      q = a[0] + (b[0] - a[0]) * t;
    if (on ? q > z : q < z) {
      z = q;
      s = (b[0] - a[0]) / (b[1] - a[1]);
    }
  }
  return { z, s };
}

/** profilin z konumundaki üst yüzeyi (en yüksek y) */
function ust(d: Arac, z: number) {
  let y = -Infinity;
  for (let i = 0; i < d.p.length; i++) {
    const a = d.p[i],
      b = d.p[(i + 1) % d.p.length];
    if ((a[0] - z) * (b[0] - z) > 0 || a[0] === b[0]) continue;
    y = Math.max(y, a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]));
  }
  return y;
}

/** gövde yüzeyine yaslı ön ya da arka şerit/tampon: genişliği o yükseklikteki gövdeyle uyumlu, en fazla taş kadar çıkık */
function tampon(
  g: THREE.Group,
  d: Arac,
  y: number,
  on: boolean,
  h: number,
  dep: number,
  tas: number,
  ek: number,
  m: THREE.Material,
) {
  const { z, s } = uc(d, y, on),
    w = 2 * yariGenislik(d, y, z) + ek;
  const q = bx(w, h, dep, 0, y, z + (on ? 1 : -1) * (tas - dep / 2), m);
  q.rotation.x = Math.atan(s) * 0.5;
  g.add(q);
}

/** kaputa/çatıya yatan şerit: profilin üst yüzeyini izler (havada kalmaz) */
function serit(g: THREE.Group, d: Arac, x: number, w: number, z0: number, z1: number, m: THREE.Material) {
  const n = Math.max(2, Math.ceil(Math.abs(z1 - z0) / 0.12));
  for (let i = 0; i < n; i++) {
    const za = z0 + ((z1 - z0) * i) / n,
      zb = z0 + ((z1 - z0) * (i + 1)) / n,
      ya = ust(d, za),
      yb = ust(d, zb),
      l = Math.hypot(zb - za, yb - ya) + 0.01,
      q = bx(w, 0.02, l, x, (ya + yb) / 2 + 0.004, (za + zb) / 2, m);
    q.rotation.x = -Math.atan2(yb - ya, zb - za);
    g.add(q);
  }
}

/** iki yanda yarış numarası */
function numbers(g: THREE.Group, t: string, w: number, z: number, y: number, s: number, fg: string) {
  for (const sd of [-1, 1]) {
    const d = decal(t, 0.75 * s, 0.56 * s, fg);
    d.position.set(sd * (w / 2 + 0.012), y, z);
    d.rotation.y = (sd * Math.PI) / 2;
    g.add(d);
  }
}

/** teker: lastik (yanakları yuvarlatılmış), beş kollu jant, göbek kapağı */
function mkWheel(r: number, wd: number, rimC: number) {
  const g = new THREE.Group(),
    rm = lam(rimC),
    dis = new THREE.CylinderGeometry(r, r, wd * 0.82, 20).rotateZ(Math.PI / 2),
    yanak = new THREE.CylinderGeometry(r * 0.93, r * 0.93, wd, 20).rotateZ(Math.PI / 2);
  g.add(new THREE.Mesh(dis, blackM), new THREE.Mesh(yanak, blackM));
  const jr = r * 0.66;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(jr, jr, wd + 0.012, 18).rotateZ(Math.PI / 2), dk));
  for (const s of [-1, 1]) {
    // jant yüzü: dış halka ve beş kol; iki yanda (teker hangi tarafta olursa olsun dış yüz görünür)
    const yuz = new THREE.Group();
    yuz.position.x = (s * (wd + 0.014)) / 2;
    yuz.add(new THREE.Mesh(new THREE.TorusGeometry(jr * 0.94, jr * 0.07, 4, 18).rotateY(Math.PI / 2), rm));
    for (let i = 0; i < 5; i++) {
      const k = bx(0.012, jr * 0.9, jr * 0.2, 0, 0, 0, rm);
      k.geometry.translate(0, jr * 0.45, 0);
      k.rotation.x = (i * Math.PI * 2) / 5;
      yuz.add(k);
    }
    yuz.add(
      new THREE.Mesh(new THREE.CylinderGeometry(jr * 0.2, jr * 0.2, 0.02, 10).rotateZ(Math.PI / 2), rm),
    );
    g.add(yuz);
  }
  return g;
}

/** ortak gövde: profil + yan camlar + ön/arka cam + renk panelleri + farlar */
function body0(d: Arac) {
  const g = new THREE.Group(),
    m = lam(d.col),
    w = d.w;
  const hw = (y: number, z: number) => yariGenislik(d, y, z);
  // gövde: kabin içe çekilmiş, burun ve kuyruk yuvarlanmış, alt kenarda teker kemerleri
  g.add(enineGovde(kemerliProfil(d), hw, m));
  // yan camlar ve renk panelleri gövdenin hemen üstünde, onun biçimini izler.
  // Yan camlar içeriden görünmez; alt yüzeyleri göz hizasında kaldığı için kokpitte gizlenir
  const yan = enineGovde(d.gh, hw, glassM, 0.012);
  yan.userData.pan = 1;
  g.add(yan);
  g.add(yamukCam(d, d.ws[0], d.ws[1], glassQM), yamukCam(d, d.rw[0], d.rw[1], glassQM));
  for (const [pts, c] of d.pan || []) {
    const q = enineGovde(pts, hw, lam(c), 0.008, kemerler(d));
    q.userData.pan = 1;
    g.add(q);
  }
  // teker kemerlerinin içi koyu (gövdenin içi görünmesin); kemerler arasında yan etek
  const T = tekerYerleri(d),
    K = kemerler(d),
    ya = Math.min(d.p[0][1], d.p[d.p.length - 1][1]);
  T.forEach((t, i) => {
    const R = K[i].R;
    g.add(bx(2 * (t.x - t.wd / 2) - 0.01, t.y + R - ya, 2 * R, 0, (t.y + R + ya) / 2, t.z, dk));
  });
  const [on, ar] = K[0].z > K[1].z ? K : [K[1], K[0]],
    eb = on.z - on.R - (ar.z + ar.R);
  for (const sd of [-1, 1])
    g.add(
      bx(0.05, 0.09, eb, sd * (hw(ya + 0.05, 0) + 0.01), ya + 0.05, (on.z - on.R + ar.z + ar.R) / 2, blackM),
    );
  // farlar ve stoplar: gövdenin o yükseklikteki yüzeyine gömülü, yüzeyin eğimiyle aynı yatık (küp gibi çıkık durmaz)
  for (const sd of [-1, 1]) {
    for (const [y, on, bw, c] of [
      [d.hl, true, 0.36, lightM],
      [d.tl, false, 0.34, tailM],
    ] as [number, boolean, number, THREE.Material][]) {
      if (on && d.rhl) continue;
      const { z, s } = uc(d, y, on),
        x = Math.min(w / 2 - 0.28, yariGenislik(d, y, z) - bw / 2 - 0.06),
        q = bx(bw, 0.12, 0.08, sd * x, y, z + (on ? -0.025 : 0.025), c);
      q.rotation.x = Math.atan(s);
      g.add(q);
    }
  }
  // yan aynalar: ön camın dibinde, kapının dışında; yüzleri arka görüntünün kendi yanını gösterir
  const [az, ay] = d.ws[0];
  for (const sd of [-1, 1]) {
    const y = ay + 0.1,
      z = az - 0.22,
      x = sd * (hw(y, z) + 0.13),
      yz = aynaYuzu(0.21, 0.12, sd > 0 ? 1 : 0.5, sd > 0 ? 0.5 : 0);
    yz.position.set(x, y, z - 0.046);
    g.add(
      bx(0.24, 0.15, 0.09, x, y, z, m),
      bx(0.14, 0.03, 0.04, sd * (hw(y, z) + 0.02), y - 0.03, z, blackM),
      yz,
    );
  }
  return g;
}

/** araca özel ek parçalar */
const EK: Record<string, (g: THREE.Group, d: Arac) => void> = {
  gt: (g, d) => {
    // arka dudak kuyruğun üstüne yatar, ön ayırıcı burun altında gövde genişliğinde
    const zr = -2.1,
      yr = ust(d, zr) + 0.03;
    g.add(bx(2 * yariGenislik(d, yr, zr) - 0.06, 0.05, 0.2, 0, yr, zr, blackM, -0.15));
    tampon(g, d, 0.3, true, 0.06, 0.22, 0.05, -0.04, blackM);
  },
  rx: (g, d) => {
    const r = lam(0x15171a);
    g.add(
      bx(1.74, 0.06, 0.46, 0, 1.58, -1.78, r, 0.2),
      bx(0.05, 0.32, 0.5, -0.85, 1.48, -1.76, r),
      bx(0.05, 0.32, 0.5, 0.85, 1.48, -1.76, r),
    );
    // kanat gövdeye iki ayakla bağlanır
    const yz = ust(d, -1.78) - 0.05;
    for (const sd of [-1, 1]) g.add(bx(0.06, 1.55 - yz, 0.16, sd * 0.45, (1.55 + yz) / 2, -1.78, r));
    tampon(g, d, 0.3, true, 0.05, 0.3, 0.1, 0.1, r);
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
    tampon(g, d, 0.2, true, 0.04, 0.4, 0.12, 0.1, k);
    numbers(g, "23", d.w, 0.35, 0.6, 1.1, "#15171a");
  },
  rl: (g, d) => {
    const k = blackM,
      bmm = lam(d.col);
    g.add(
      bx(1.62, 0.06, 0.36, 0, 1.34, -1.98, bmm, 0.1),
      bx(0.06, 0.34, 0.14, -0.6, 1.16, -1.98, k),
      bx(0.06, 0.34, 0.14, 0.6, 1.16, -1.98, k),
    );
    // kaput hava girişi kaputa gömülü
    g.add(bx(0.5, 0.12, 0.5, 0, ust(d, 1.45) - 0.01, 1.45, k));
    for (const sd of [-1, 1])
      for (const z of [1.36, -1.32])
        g.add(bx(0.3, 0.36, 0.03, sd * (yariGenislik(d, 0.42, z - 0.42) + 0.005), 0.42, z - 0.42, k));
    numbers(g, "5", d.w, -0.4, 0.8, 1, "#ffffff");
  },
  dg: (g, d) => {
    const s = lam(0xc9ccd1),
      rd = lam(0xd8232a),
      wt = lam(0xf2f2f2),
      yk = ust(d, 1.2) - 0.05;
    // kompresör kaputa gömülü oturur, huniler üstünde
    g.add(bx(0.56, 1.21 - yk, 0.72, 0, (1.21 + yk) / 2, 1.2, s));
    for (const x of [-0.19, 0, 0.19]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 14).rotateX(Math.PI / 2), rd);
      c.position.set(x, 1.3, 1.42);
      g.add(c);
    }
    // beyaz şeritler kaput, tavan ve bagaj boyunca yüzeyi izler
    for (const x of [-0.16, 0.16]) {
      serit(g, d, x, 0.18, 0.8, 2.15, wt);
      serit(g, d, x, 0.18, -1.0, 0.08, wt);
      serit(g, d, x, 0.18, -2.15, -1.55, wt);
    }
    tampon(g, d, 0.5, true, 0.14, 0.12, 0.05, 0.04, s);
    tampon(g, d, 0.46, false, 0.14, 0.12, 0.05, 0.04, s);
    for (const sd of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), lightM),
        { z } = uc(d, 0.72, true);
      h.position.set(sd * 0.62, 0.72, z + 0.008);
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

/** gövde ve tekerler (iç mekân yok): yerel aracın modeli ve uzak araçlar bununla kurulur */
export function buildCar(d: Arac) {
  const g = body0(d);
  EK[d.k]?.(g, d);
  g.position.y = d.lift || 0;
  // tekerler kemerlerin içinde, dış yüzleri gövde yüzeyinin hemen içinde (yalnız görünüm; fizik kendi izini kullanır)
  const W = d.wh,
    [on, ar] = tekerYerleri(d),
    ws: TekerModeli[] = [];
  for (const [x, z, f] of [
    [-on.x, W.zf, 1],
    [on.x, W.zf, 1],
    [-ar.x, W.zr, 0],
    [ar.x, W.zr, 0],
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
