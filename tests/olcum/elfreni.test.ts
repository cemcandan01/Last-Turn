// Ölçüm: el freniyle drifte giriş (aracın kendi önayarı), Drift Okulu başlangıç düzlüğü. Hız ve el freni süresi
//   ızgarasında en büyük açı, drift modu, drift süresi ve spin oranı; karşılaştırma aynısı el frenisiz.
//   npm run olcum -- elfreni   (ARAC=0,10 LK=real,norm V=12,16,20 SURE=0.25,0.5 LV=1; LV=park: otopark)
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { driftGirisi } from "../yardimci/elfreni";

const adla = (n: string) => CARS.findIndex((c) => c.n == n);

it("el freniyle drifte giriş", () => {
  const araclar = process.env.ARAC
      ? process.env.ARAC.split(",").map(Number)
      : ["Bordo Tilki", "Gümüş Serçe", "Bozkır Tavşanı", "Kızıl Ok"].map(adla),
    seviyeler = (process.env.LK || "real,norm").split(",") as SeviyeAnahtari[],
    hizlar = (process.env.V || "12,16,20").split(",").map(Number),
    sureler = (process.env.SURE || "0.25,0.5").split(",").map(Number);
  for (const lv of (process.env.LV || "1").split(","))
    for (const a of araclar)
      for (const lk of seviyeler)
        for (const el of [false, true]) {
          const r = hizlar.flatMap((v) =>
            sureler.map((sn) => driftGirisi(a, lk, v, el, lv == "park" ? undefined : pistNo("dp", +lv), sn)),
          );
          const ort = (f: (x: (typeof r)[0]) => number) => r.reduce((t, x) => t + f(x), 0) / r.length;
          console.log(
            `${lv == "park" ? "otopark" : "drift " + lv} ${CARS[a].n.padEnd(14)} ${lk.padEnd(4)} ${el ? "el freni" : "frensiz "}: ortalama en büyük açı ${ort((x) => x.aci).toFixed(0)}°, drift modu ${r.filter((x) => x.drift).length}/${r.length}, drift ${ort((x) => x.driftSure).toFixed(2)} sn, spin ${r.filter((x) => x.spin > 0).length}/${r.length}`,
          );
        }
});
