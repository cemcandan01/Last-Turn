// Araç ve yarış türü: pist türüne göre araç optimizasyonu yok (kullanıcı kararı). Aynı araç, aynı parça ve aynı lastikle
// zemin aynıysa her yarış türünün pistinde aynı fiziği verir: asfalt yarış pisti ile drift pisti, rallikros ile ralli
// toprağı birebir aynı. Türe uygunluk yalnız aracın kendi özelliklerinden, takılan parçalardan ve lastikten gelir.
import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { SURF } from "../../src/fizik/veriler";
import { virajTutusu } from "../yardimci/uyum";

// her türden birer araç (kendi türü ve başka türün pisti aynı sonucu vermeli)
const ornek = ["gp", "rx", "rl", "dp", "dg"].map((t) => CARS.findIndex((c) => c.ty == t));

describe("araç ve yarış türü uyumu", () => {
  it("asfalt: yarış pisti, drift pisti ve drag pisti aynı tutuşu verir", { timeout: 120000 }, () => {
    for (const a of ornek) {
      const g = ["gp", "dp", "dg", null].map((t) => virajTutusu(a, 1, t));
      for (const x of g) expect(x, CARS[a].n).toBe(g[0]);
    }
  });
  it("toprak: rallikros ve ralli aynı tutuşu verir", { timeout: 120000 }, () => {
    for (const a of ornek) {
      const g = ["rx", "rl", null].map((t) => virajTutusu(a, 0, t));
      for (const x of g) expect(x, CARS[a].n).toBe(g[0]);
    }
  });
  it("zeminlerin sürtünme sabiti sabit: asfalt 30, toprak 26", () => {
    expect(SURF[1]).toMatchObject({ n: "Asfalt", a: 30 });
    expect(SURF[0]).toMatchObject({ n: "Toprak", a: 26 });
  });
});
