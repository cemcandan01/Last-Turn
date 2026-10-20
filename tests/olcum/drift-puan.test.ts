// Ölçüm: drift pistlerinde drift pilotunun 90 sn'lik puanı ve seviyeye göre hedef puan (npm run olcum -- drift-puan)
import { it } from "vitest";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";

/** hedef puan = pilot puanı × pay: üst seviyede pilot kadar iyi sürmek gerekir */
const PAY = [0.45, 0.55, 0.65, 0.75, 0.85, 0.95];

it("drift puanı", () => {
  for (let i = 0; i < TDEF.length; i++) {
    const d = TDEF[i];
    if (d.t != "dp") continue;
    const r = driftTuru(i, "norm", DRIFT_PILOT, 90);
    console.log(
      `${d.lv} ${d.n.padEnd(14)} puan ${r.puan} | en uzun kombo turun %${(100 * r.oran).toFixed(0)}, yanma ${r.yanma}, spin ${r.spin} | hedef ${d.hp ?? "—"} | önerilen ${Math.round((r.puan * PAY[d.lv - 1]) / 50) * 50}`,
    );
  }
});
