// Araç gövdesi: tekerler kemerlerin içinde ve gövde yüzeyinin hemen içinde; kemerli profil kendini kesmez
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { kemerliProfil, tekerYerleri, yariGenislik } from "../../src/cizim/govde";

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
      for (const t of tekerYerleri(d)) {
        const dis = t.x + t.wd / 2,
          yuzey = yariGenislik(d, t.y, t.z);
        // dış yüz gövdenin içinde (taşmaz) ama yüzeye yakın (kemerde görünür, gövdeyle aynı düzlemde titreşmez)
        expect(dis).toBeLessThan(yuzey - 0.005);
        expect(dis).toBeGreaterThan(yuzey - 0.05);
        // teker kemerin altında kalır: kemer tepesi tekerin üstünde ve gövdenin içinde
        const tepe = t.y + t.r + 0.07,
          ust = Math.max(...d.p.filter((p) => Math.abs(p[0] - t.z) < 0.9).map((p) => p[1]));
        expect(tepe).toBeLessThan(ust);
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
