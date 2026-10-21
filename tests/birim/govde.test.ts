// Araç gövdesi: tekerler kemerlerin içinde ve gövde yüzeyinin hemen içinde; kemerli profil kendini kesmez;
// renk panelleri kemerin içine girmez
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import * as THREE from "three";
import { enineGovde, kemerler, kemerliProfil, tekerYerleri, yariGenislik } from "../../src/cizim/govde";

/** iki doğru parçası kesişiyor mu (uç noktaları paylaşanlar hariç) */
function kesisir(a: number[], b: number[], c: number[], d: number[]) {
  const y = (p: number[], q: number[], r: number[]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = y(c, d, a),
    d2 = y(c, d, b),
    d3 = y(a, b, c),
    d4 = y(a, b, d);
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9;
}

describe("gövde ve teker kemerleri", () => {
  for (const d of CARS)
    it(d.n, () => {
      const K = kemerler(d);
      tekerYerleri(d).forEach((t, i) => {
        const dis = t.x + t.wd / 2,
          yuzey = yariGenislik(d, t.y, t.z);
        // dış yüz gövdenin içinde (taşmaz) ama yüzeye yakın (kemerde görünür, gövdeyle aynı düzlemde titreşmez)
        expect(dis).toBeLessThan(yuzey - 0.005);
        expect(dis).toBeGreaterThan(yuzey - 0.05);
        // teker kemerin altında kalır: kemer tepesi tekerin üstünde ve gövdenin içinde
        const tepe = K[i].y + K[i].R,
          ust = Math.max(...d.p.filter((p) => Math.abs(p[0] - t.z) < 0.9).map((p) => p[1]));
        expect(tepe).toBeLessThan(ust);
        // drift ve pist arabasında teker kemere yakın (alçak duruş)
        if (d.k == "dr" || d.k == "gt") expect(K[i].R - t.r).toBeLessThanOrEqual(0.03);
      });
      // renk panelleri (şeritler, çıkartmalar) kemerin içine girmez: lastiği örtmez
      for (const [pts] of d.pan || []) {
        const m = enineGovde(pts, (y, z) => yariGenislik(d, y, z), new THREE.MeshBasicMaterial(), 0.008, K),
          a = m.geometry.attributes.position;
        for (let v = 0; v < a.count; v += 3) {
          const z = (a.getZ(v) + a.getZ(v + 1) + a.getZ(v + 2)) / 3,
            y = (a.getY(v) + a.getY(v + 1) + a.getY(v + 2)) / 3;
          for (const k of K) expect((z - k.z) ** 2 + (y - k.y) ** 2).toBeGreaterThan(k.R * k.R * 0.98);
        }
      }
      const p = kemerliProfil(d),
        n = p.length;
      for (let i = 0; i < n; i++)
        for (let j = i + 2; j < n; j++) {
          if (i == 0 && j == n - 1) continue;
          expect(kesisir(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])).toBe(false);
        }
    });
});
