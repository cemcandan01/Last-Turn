// Ölçüm: drift pistinde 24 sürüş tarzı (açı, gaz, bakış): kaçı turun %80'ini tek komboda geçer (adil zorluk)
//   YARIS=6,7,8 npm run olcum -- drift-izgara
import { it } from "vitest";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";
import { pistNo } from "../../src/dunya/pist-tanimlari";
it("ızgara", () => {
  for (const yaris of (process.env.YARIS || String(pistNo("dp", 3))).split(",").map(Number))
    for (const lk of ["real", "norm"] as const) {
      const sonuc: number[] = [];
      for (const aci of [0.35, 0.45, 0.55, 0.65])
        for (const gaz of [0.6, 0.75, 0.9])
          for (const bak of [6, 10])
            sonuc.push(driftTuru(yaris, lk, { ...DRIFT_PILOT, aci, gaz, bak }, 100).oran);
      const b = sonuc.filter((x) => x >= 0.8).length;
      console.log(
        `IZGARA ${yaris} ${lk}: ${b}/${sonuc.length} tarz turun %80'ini geçiyor; ortanca %${Math.round(100 * [...sonuc].sort((a, b) => a - b)[12])}; ${sonuc.map((x) => Math.round(100 * x)).join(" ")}`,
      );
    }
});
