// Ölçüm: başlangıç araçlarıyla asfaltta el freniyla drifte giriş (aracın kendi önayarı).
//   Hızlan, 1 sn tam gaz + tam direksiyonla dön, sonra gaz ve direksiyon basılıyken el frenine 0,3 sn bas ve
//   bırak; karşılaştırma aynısı el frensiz. Kayma açısı, arka patinaj, drift modu ve drift süresi yazılır.
//   npm run olcum -- elFreni   (ARAC=0,8 LK=real,norm V=12,16 LV=1,3: drift pisti; LV=park: otopark)
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { driftGirisi } from "../yardimci/debriyaj";

it("el freniyle drifte giriş", () => {
  const araclar = (process.env.ARAC || "0,1,8").split(",").map(Number),
    seviyeler = (process.env.LK || "real,norm").split(",") as SeviyeAnahtari[],
    hizlar = (process.env.V || "12,16").split(",").map(Number);
  for (const lv of (process.env.LV || "1,3").split(","))
    for (const a of araclar)
      for (const lk of seviyeler)
        for (const hiz of hizlar)
          for (const elFreni of [false, true]) {
            const r = driftGirisi(a, lk, hiz, elFreni, lv == "park" ? undefined : pistNo("dp", +lv));
            console.log(
              `${lv == "park" ? "otopark" : "drift " + lv} ${CARS[a].n.padEnd(8)} ${lk.padEnd(4)} ${hiz * 3.6} km/s ${elFreni ? "elFreni" : "güçle   "}: en büyük açı ${r.aci.toFixed(0)}°, arka patinaj ${r.patinaj.toFixed(2)}, drift modu ${r.drift ? "açıldı" : "yok   "}, drift ${r.driftSure.toFixed(2)} sn, spin ${r.spin}`,
            );
          }
});
