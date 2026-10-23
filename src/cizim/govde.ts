// Gövde biçimi: yan profil artık düz uzatılmaz, enine biçimlenir. Kabin (cam hizasından tavana) içe çekilir,
// burun ve kuyruk plandan yuvarlanır, alt kenar hafifçe içe döner: kutu yerine akan bir gövde.
// Profilin alt kenarına teker kemerleri açılır; tekerler kemerin içinde, gövde yüzeyinin hemen içinde durur.
// Kokpit de aynı genişlik fonksiyonunu kullanır (A direkleri ön cam kenarına oturur).
import * as THREE from "three";
import type { Arac } from "../arac/araclar";
import { sm, type V2 } from "../cekirdek/matematik";

/** kabinin tavana doğru içe çekilme oranı (araç türüne göre) */
const KABIN: Record<string, number> = {
  gt: 0.2,
  rx: 0.13,
  dr: 0.16,
  rl: 0.12,
  dg: 0.1,
  gt3: 0.2,
  t16: 0.13,
  int: 0.1,
  ae86: 0.11,
  supra: 0.14,
};

/** teker ile kemer arasındaki boşluk: drift ve pist arabası alçak ve sıkı, diğerleri ralli için daha açık */
const KEMER: Record<string, number> = { dr: 0.025, gt: 0.03, gt3: 0.03, ae86: 0.03, supra: 0.03 };

/** kemer: tekerin gövdedeki daire biçimli boşluğu (z, y merkez; R yarıçap) */
export interface Kemer {
  z: number;
  y: number;
  R: number;
}

/** gövdenin y yüksekliğinde (kaldırma hariç gövde koordinatı) ve z konumunda yarı genişliği */
export function yariGenislik(d: Arac, y: number, z: number) {
  const ys = d.p.map((p) => p[1]),
    zs = d.p.map((p) => p[0]),
    yr = Math.max(...ys),
    yb = (d.gh[0][1] + d.gh[3][1]) / 2,
    z0 = Math.min(...zs),
    z1 = Math.max(...zs),
    u = Math.abs(z - (z0 + z1) / 2) / ((z1 - z0) / 2),
    kabin = 1 - (KABIN[d.k] ?? 0.12) * sm(yb - 0.04, yr, y),
    plan = 1 - 0.07 * sm(0.72, 1, u),
    alt = 1 - 0.035 * sm(0.48, 0.3, y);
  return (d.w / 2) * kabin * plan * alt;
}

/** tekerlerin gövdedeki yerleri: z, merkez yüksekliği (gövde koordinatı), yarıçap, genişlik, x */
export function tekerYerleri(d: Arac) {
  const W = d.wh,
    lf = d.lift || 0;
  return [
    { z: W.zf, r: W.r, wd: W.wd },
    { z: W.zr, r: W.rr || W.r, wd: W.rwd || W.wd },
  ].map((t) => {
    const y = t.r - lf * 0.5;
    // tekerin dış yüzü gövde yüzeyinin 1,5 cm içinde: gövdeyle aynı düzlemde titreşmez, dışarı taşmaz
    return { ...t, y, x: yariGenislik(d, y, t.z) - t.wd / 2 - 0.015 };
  });
}

export const kemerler = (d: Arac): Kemer[] =>
  tekerYerleri(d).map((t) => ({ z: t.z, y: t.y, R: t.r + (KEMER[d.k] ?? 0.06) }));

/** köşeleri hafifçe yuvarla (Chaikin), alt kenar (son nokta → ilk nokta) olduğu gibi kalır */
function yuvarla(p: V2[], k = 0.16): V2[] {
  const o: V2[] = [p[0]];
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1],
      b = p[i],
      c = p[i + 1];
    o.push(
      [b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k],
      [b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k],
    );
  }
  o.push(p[p.length - 1]);
  return o;
}

/** yan profil: köşeler yuvarlanmış, alt kenarında (öndeki son noktadan arkadaki ilk noktaya) teker kemerleri */
export function kemerliProfil(d: Arac): V2[] {
  const p = yuvarla(d.p),
    a = p[p.length - 1],
    b = p[0],
    yAlt = (z: number) => a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]),
    out = [...p];
  // önden arkaya: z azalan sırada
  for (const t of kemerler(d).sort((m, n) => n.z - m.z)) {
    const R = t.R,
      ya = yAlt(t.z),
      a0 = Math.asin(Math.max(-1, Math.min(1, (ya - t.y) / R)));
    for (let i = 0; i <= 12; i++) {
      const q = a0 + ((Math.PI - 2 * a0) * i) / 12;
      out.push([t.z + R * Math.cos(q), Math.max(ya, t.y + R * Math.sin(q))]);
    }
  }
  return out;
}

/**
 * profil + enine biçim → kapalı gövde parçası. hw(y, z) yarı genişlik, ek: yüzeyden dışarı pay
 * (camlar ve renk panelleri gövdenin hemen üstüne oturur). delik: bu kemerlerin içine düşen yüzeyler atılır
 * (renk panelleri teker kemerinin üstünden geçip lastiği örtmesin)
 */
export function enineGovde(
  pts: V2[],
  hw: (y: number, z: number) => number,
  m: THREE.Material,
  ek = 0,
  delik: Kemer[] = [],
) {
  const kon = pts.map(([z, y]) => new THREE.Vector2(z, y)),
    ucg = THREE.ShapeUtils.triangulateShape(kon, []),
    poz: number[] = [],
    nk = (z: number, y: number, s: number) => [s * (hw(y, z) + ek), y, z],
    // profilin yönü (z-y düzleminde işaretli alan): kenarların dış normali buna göre
    alan = pts.reduce((s, p, i) => {
      const q = pts[(i + 1) % pts.length];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0),
    yon = alan > 0 ? 1 : -1;
  /** üçgeni dışa (verilen yöne) bakacak sırayla ekle */
  const ekle = (A: number[], B: number[], C: number[], dis: number[]) => {
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]],
      v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]],
      n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (n[0] * dis[0] + n[1] * dis[1] + n[2] * dis[2] < 0) poz.push(...A, ...C, ...B);
    else poz.push(...A, ...B, ...C);
  };
  const icinde = (z: number, y: number) => delik.some((c) => (z - c.z) ** 2 + (y - c.y) ** 2 < c.R * c.R),
    yakin = (q: V2[]) =>
      delik.some(
        (c) =>
          Math.min(...q.map((p) => p[0])) < c.z + c.R &&
          Math.max(...q.map((p) => p[0])) > c.z - c.R &&
          Math.min(...q.map((p) => p[1])) < c.y + c.R &&
          Math.max(...q.map((p) => p[1])) > c.y - c.R,
      );
  /** yan yüz üçgeni: kemere değiyorsa küçük parçalara bölünür, kemerin içindeki parçalar atılır */
  const yan = (a: V2, b: V2, c: V2, derin: number) => {
    if (icinde(...a) && icinde(...b) && icinde(...c)) return;
    if (derin < 7 && yakin([a, b, c])) {
      const ab: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        bc: V2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2],
        ca: V2 = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
      for (const q of [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, ca],
      ] as V2[][])
        yan(q[0], q[1], q[2], derin + 1);
      return;
    }
    if (yakin([a, b, c]) && icinde((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)) return;
    for (const s of [-1, 1]) ekle(nk(a[0], a[1], s), nk(b[0], b[1], s), nk(c[0], c[1], s), [s, 0, 0]);
  };
  for (const [i, j, k] of ucg) yan(pts[i], pts[j], pts[k], delik.length ? 0 : 7);
  for (let i = 0; i < pts.length; i++) {
    const [z1, y1] = pts[i],
      [z2, y2] = pts[(i + 1) % pts.length],
      // kenarın dış normali (z, y düzleminde): saat yönünün tersine dolaşan profilde (dy, -dz)
      dis = [0, -yon * (z2 - z1), yon * (y2 - y1)],
      // kemere yakın kenar 3 cm'lik parçalara bölünür, kemerin içindekiler atılır
      n = yakin([pts[i], pts[(i + 1) % pts.length]]) ? Math.ceil(Math.hypot(z2 - z1, y2 - y1) / 0.03) : 1;
    for (let k = 0; k < n; k++) {
      const za = z1 + ((z2 - z1) * k) / n,
        ya = y1 + ((y2 - y1) * k) / n,
        zb = z1 + ((z2 - z1) * (k + 1)) / n,
        yb = y1 + ((y2 - y1) * (k + 1)) / n;
      if (n > 1 && icinde((za + zb) / 2, (ya + yb) / 2)) continue;
      const L1 = nk(za, ya, 1),
        L2 = nk(zb, yb, 1),
        R1 = nk(za, ya, -1),
        R2 = nk(zb, yb, -1);
      ekle(L1, L2, R2, dis);
      ekle(L1, R2, R1, dis);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(poz, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}

/** iki profil noktası arasında cam (ön/arka cam): kabinin daralmasına uyan yamuk, dışa doğru hafifçe kaldırılmış */
export function yamukCam(d: Arac, a: V2, b: V2, m: THREE.Material) {
  const dz = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dz, dy),
    nz = (dy / l) * 0.03,
    ny = (-dz / l) * 0.03,
    // dış normal: profilin dışına (yukarı/öne ya da yukarı/arkaya)
    s = ny < 0 ? -1 : 1,
    xa = yariGenislik(d, a[1], a[0]) * 0.93,
    xb = yariGenislik(d, b[1], b[0]) * 0.93,
    k = [
      [-xa, a[1] + s * ny, a[0] + s * nz],
      [xa, a[1] + s * ny, a[0] + s * nz],
      [xb, b[1] + s * ny, b[0] + s * nz],
      [-xb, b[1] + s * ny, b[0] + s * nz],
    ],
    g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([...k[0], ...k[1], ...k[2], ...k[0], ...k[2], ...k[3]], 3),
  );
  g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}
