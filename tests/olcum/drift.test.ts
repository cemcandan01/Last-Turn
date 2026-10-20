// Ölçüm: drift pistlerinde drift pilotuyla bir turun ne kadarı tek komboda geçer
//   IZ=6: 6. yarışı adım adım yazdır; AYAR='{"aci":0.55}' YARIS=6 LK=real: pilot ayarı ve seçim
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import type { SeviyeAnahtari } from "../../src/fizik/veriler";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";

it("drift pistleri", () => {
  if (process.env.IZ) {
    console.log(driftTuru(+process.env.IZ, "real", DRIFT_PILOT, 60, true));
    return;
  }
  const ay = process.env.AYAR ? { ...DRIFT_PILOT, ...JSON.parse(process.env.AYAR) } : DRIFT_PILOT;
  for (const yaris of (process.env.YARIS || "6,7,8").split(",").map(Number))
    for (const lk of (process.env.LK || "real,norm,arc").split(",") as SeviyeAnahtari[]) {
      const r = driftTuru(yaris, lk, ay);
      console.log(
        `${yaris} ${lk.padEnd(4)} ${CARS[2].n}: en uzun kombo ${r.enUzun.toFixed(0)} m (turun %${(100 * r.oran).toFixed(0)}), yanma ${r.yanma}, spin ${r.spin}, çimde ${r.cim.toFixed(1)} sn, toplam yol ${r.yol.toFixed(0)} m`,
      );
    }
});
