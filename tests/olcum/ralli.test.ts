// Ölçüm: gevşek zeminde (toprak) tam gaz + tam direksiyon ve frensiz tam gaz tur
//   düz zemin: sanal düz toprakta belli hızdan tam direksiyon + tam gaz (3 sn)
//   pistte: otomatik pilotla ısınıp tam direksiyon; frensiz: pilot direksiyonuyla hiç fren yapmadan tur
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { duzZemin, frensiz, tamKirik } from "../yardimci/denemeler";
import { pistNo } from "../../src/dunya/pist-tanimlari";

const derece = (r: number) => (r * 57.3).toFixed(0) + "°";
const kmh = (v: number) => (v * 3.6).toFixed(0);

it("düz toprak", () => {
  for (const arac of [1, 3, 0, 2])
    for (const lk of ["real", "norm", "arc"] as const) {
      const r = [15, 22, 30, 38].map((v) => duzZemin(arac, lk, v));
      console.log(
        `${CARS[arac].n.padEnd(11)} ${lk.padEnd(4)} ` +
          r.map((x) => `${kmh(x.v0)}→${kmh(x.v1)} ${derece(x.bMax)}${x.spin ? " SPİN" : ""}`).join(" | "),
      );
    }
});

it("pistte", () => {
  for (const [yaris, arac] of [
    [pistNo("rx", 2), 1],
    [pistNo("rx", 5), 1],
    [pistNo("rl", 2), 3],
    [pistNo("rl", 5), 3],
  ] as const)
    for (const lk of ["real", "norm", "arc"] as const) {
      const a = tamKirik(yaris, arac, lk),
        b = frensiz(yaris, arac, lk);
      console.log(
        `${String(yaris).padStart(2)} ${CARS[arac].n.padEnd(11)} ${lk.padEnd(4)} | tam kırık: ${kmh(a.v0)}→${kmh(a.v1)} km/sa, en büyük kayma ${derece(a.bMax)}, spin ${a.spin} | frensiz: ${b.t.toFixed(1)} sn, dışarıda ${b.disari.toFixed(1)} sn, spin ${b.spin}`,
      );
    }
});
