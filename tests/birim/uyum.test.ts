// Araç ve yarış türü uyumu: her araç her yarışı bitirebilir, ama türe uygun araç kendi yarışında kendi sınıfındaki ve
// alt sınıflardaki başka türlerin araçlarından daha başarılıdır (yanlış türdeki aracın değeri düşürülmez; üst sınıf
// araç, ör. B sınıfı Kızıl Ok, D sınıfı başlangıç aracını başka türde de geçebilir). Hafif ve sayısal: her yarış türünün pistinde yol tutuşu, drag süresi.
// Tur süreleri ve drift puanı karşılaştırması daha uzun sürdüğü için ölçümde: npm run olcum -- uyum
import { describe, expect, it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { performansPuani, SINIFLAR, sinifHarfi } from "../../src/arac/performans";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { dragSur, virajTutusu } from "../yardimci/uyum";

// türün araçları (her türde birden çok araç olabilir) ve başka türlerin araçları
const sira = CARS.map((_c, i) => i),
  turun = (t: YarisTuru) => sira.filter((i) => CARS[i].ty == t),
  /** stok sınıf sırası (genel puan; D 0, C 1 …) */
  sinif = sira.map((i) => SINIFLAR.findIndex((s) => s.h == sinifHarfi(performansPuani(i, []).puan))),
  /** o türün aracıyla aynı ya da alt sınıftaki başka türlerin araçları */
  digerleri = (t: YarisTuru, o: number) => sira.filter((i) => CARS[i].ty != t && sinif[i] <= sinif[o]);

describe("araç ve yarış türü uyumu", () => {
  for (const [t, zemin, ad] of [
    ["gp", 1, "asfalt yarış pisti"],
    ["rx", 0, "rallikros pisti"],
    ["rl", 0, "ralli etabı"],
  ] as const)
    it(`${ad}: türün araçları en iyi tutar`, { timeout: 120000 }, () => {
      const g = CARS.map((_c, a) => virajTutusu(a, zemin, t));
      for (const o of turun(t))
        for (const a of digerleri(t, o))
          expect(g[o], `${CARS[o].n} / ${CARS[a].n} yanal tutuş (m/s²)`).toBeGreaterThan(g[a] * 1.03);
    });

  // D sınıfında güçlü ama drifte ayarlı Beyaz Kurt var: başlangıç drag aracı (D) onu ve diğer D araçları %3 geçer
  it("drag (Çeyrek Mil): drag araçları en az %8 hızlı (D sınıfında %3)", () => {
    const y = pistNo("dg", 3),
      s = CARS.map((_c, a) => dragSur(y, a));
    for (const o of turun("dg"))
      for (const a of digerleri("dg", o))
        expect(s[a], `${CARS[a].n} / ${CARS[o].n}`).toBeGreaterThan(s[o] * (sinif[o] == 0 ? 1.03 : 1.08));
  });
});
