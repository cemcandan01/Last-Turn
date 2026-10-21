// Pist testleri: 5 tür × 6 seviye, pistler kendini kesmez, virajlar yola sığar, bölgeler çakışmaz, hedefler sıralı
import { describe, expect, it } from "vitest";
import "../yardimci/sahte-tuval";
import { REG } from "../../src/dunya/bolgeler";
import { pistParcalari } from "../../src/dunya/pist-ciz";
import { KW } from "../../src/dunya/pist";
import { SEVIYELER, TDEF } from "../../src/dunya/pist-tanimlari";
import { EVENTS_HEDEF } from "../yardimci/hedefler";

const TURLER = ["gp", "rx", "dp", "rl", "dg"] as const;

describe("pist düzeni", () => {
  it("her türde 6 seviye, her seviyede bir pist", () => {
    expect(SEVIYELER.length).toBe(6);
    expect(TDEF.length).toBe(30);
    for (const t of TURLER)
      expect(
        TDEF.filter((d) => d.t == t)
          .map((d) => d.lv)
          .sort(),
        t,
      ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("seviye yükseldikçe yol daralır ya da aynı kalır", () => {
    for (const t of TURLER) {
      const hw = [1, 2, 3, 4, 5, 6].map((lv) => TDEF.find((d) => d.t == t && d.lv == lv)!.hw);
      for (let k = 1; k < 6; k++) expect(hw[k], `${t} seviye ${k + 1}`).toBeLessThanOrEqual(hw[k - 1]);
    }
  });

  it("bölgeler çakışmaz", () => {
    for (let a = 0; a < REG.length; a++)
      for (let b = a + 1; b < REG.length; b++) {
        const A = REG[a].box,
          B = REG[b].box,
          ust = A[0] < B[1] && B[0] < A[1] && A[2] < B[3] && B[2] < A[3];
        expect(ust, `${REG[a].n} / ${REG[b].n}`).toBe(false);
      }
  });

  for (let i = 0; i < TDEF.length; i++) {
    const d = TDEF[i];
    if (d.t == "dg") continue;
    it(`${d.n}: kendini kesmez, virajlar yola sığar`, () => {
      const TR = REG[i].TR!;
      // pist boyunca uzak (yol > 2,2 × uzaklık) iki nokta, iki yol genişliğinden fazla açık olmalı
      let dmin = 1e9;
      for (let a = 0; a < TR.N; a += 2)
        for (let b = a + 2; b < TR.N; b += 2) {
          let s = Math.abs(TR.S[b] - TR.S[a]);
          if (!TR.open) s = Math.min(s, TR.len - s);
          const dd = Math.hypot(TR.P[a][0] - TR.P[b][0], TR.P[a][1] - TR.P[b][1]);
          if (s > 2.2 * dd && s > 30) dmin = Math.min(dmin, dd);
        }
      expect(dmin, "en yakın iki kol arası (m)").toBeGreaterThan(2 * d.hw + 4);
      if (d.tarif) {
        const rmin = Math.min(
          ...pistParcalari(d.tarif)
            .filter((p) => p.t != "D")
            .map((p) => p.a),
        );
        expect(rmin, "en küçük viraj yarıçapı (m)").toBeGreaterThan(d.hw + KW);
      }
      const b = REG[i].box;
      expect(Math.max(b[1] - b[0], b[3] - b[2]), "bölge boyutu (m)").toBeLessThan(2500);
    });
  }

  it("her yarışın ölçülmüş hedef süresi var (npm run olcum -- pistler)", () => {
    for (const t of ["gp", "rx", "rl", "dg"] as const)
      for (const d of TDEF.filter((q) => q.t == t)) {
        const h = EVENTS_HEDEF(TDEF.indexOf(d));
        expect(d.tg, `${d.n}: hedef süre`).toBeGreaterThan(0);
        expect(h.limit, d.n).toBe(d.tg);
      }
  });
});
