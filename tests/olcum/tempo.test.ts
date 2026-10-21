// Ölçüm: otomatik pilotla tur süreleri, yarışın hedef süresiyle ve eski (klasik) motorun süresiyle karşılaştırma
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { turSur } from "../yardimci/uyum";
import { EVENTS_HEDEF } from "../yardimci/hedefler";

/** eski klasik motorun (bisiklet modeli, 3.0'a kadar) aynı otomatik pilotla tur süreleri (sn) */
const KLASIK: Record<number, number> = { 0: 52.5, 1: 46.6, 2: 42.7, 3: 42.9, 4: 41.8, 10: 48.8 };

it("tempo", () => {
  for (const [yaris, arac] of [
    [pistNo("gp", 3), 0],
    [pistNo("gp", 2), 0],
    [pistNo("gp", 5), 0],
    [pistNo("rx", 2), 1],
    [pistNo("rx", 3), 1],
    [pistNo("rx", 4), 1],
    [pistNo("rl", 2), 3],
    [pistNo("rl", 6), 3],
    [pistNo("rl", 3), 3],
  ] as const) {
    let en = Infinity,
      enC = 0;
    for (const c of [0.45, 0.6, 0.75, 0.9, 1.05]) {
      const r = turSur(yaris, arac, c);
      if (r.spin == 0 && r.disari < 3 && r.t < en) {
        en = r.t;
        enC = c;
      }
    }
    const h = EVENTS_HEDEF(yaris),
      k = KLASIK[yaris];
    console.log(
      `${h.n.padEnd(14)} ${CARS[arac].n.padEnd(12)} hedef ${h.tur.toFixed(1)} sn/tur | ${en.toFixed(1)} sn (cesaret ${enC})` +
        (k ? ` | eski motor ${k.toFixed(1)} sn` : ""),
    );
  }
});
