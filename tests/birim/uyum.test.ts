// Araç ve yarış türü uyumu: her araç her yarışı bitirebilir, ama türe uygun araç kendi yarışında daha başarılıdır
// (yanlış türdeki aracın değeri düşürülmez). Hafif ve sayısal: her yarış türünün pistinde yol tutuşu, drag süresi.
// Tur süreleri ve drift puanı karşılaştırması daha uzun sürdüğü için ölçümde: npm run olcum -- uyum
import { describe, expect, it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { dragSur, virajTutusu } from "../yardimci/uyum";

const oner = (t: YarisTuru) => CARS.findIndex((c) => c.ty == t),
  digerleri = (a: number) => CARS.map((_c, i) => i).filter((i) => i != a);

describe("araç ve yarış türü uyumu", () => {
  for (const [t, zemin, ad] of [
    ["gp", 1, "asfalt yarış pisti"],
    ["rx", 0, "rallikros pisti"],
    ["rl", 0, "ralli etabı"],
  ] as const)
    it(`${ad}: türün aracı en iyi tutar`, { timeout: 120000 }, () => {
      const o = oner(t),
        g = CARS.map((_c, a) => virajTutusu(a, zemin, t));
      for (const a of digerleri(o))
        expect(g[o], `${CARS[o].n} / ${CARS[a].n} yanal tutuş (m/s²)`).toBeGreaterThan(g[a] * 1.03);
    });

  it("drag (Çeyrek Mil): drag aracı en az %8 hızlı", () => {
    const y = pistNo("dg", 3),
      o = oner("dg"),
      s = CARS.map((_c, a) => dragSur(y, a));
    for (const a of digerleri(o)) expect(s[a], `${CARS[a].n} / ${CARS[o].n}`).toBeGreaterThan(s[o] * 1.08);
  });
});
