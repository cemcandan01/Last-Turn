// Ölçüm: drift pistlerinde drift pilotunun yarış turlarındaki puanı ve yıldız eşikleri (npm run olcum -- drift-puan)
import { it } from "vitest";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { DRIFT_TUR, yildizEsikleri, yildizSay } from "../../src/oyun/yildiz";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";

/**
 * Eşik = pilotun en iyi sürüşünün puanı (P: aşağıdaki sürüş tarzlarının en iyisi, drift aracıyla) × pay: 1★ rahat
 * (turları drift ederek bitiren), 2★ iyi sürüş, 3★ en iyiye yakın (küçük kayba pay). Üst seviyede pay sıkılaşır.
 * Eşikler hp (1★) ve ys'e (2★, 3★) yazılır.
 */
export const DRIFT_PAY = [
  [0.35, 0.65, 0.86],
  [0.38, 0.67, 0.87],
  [0.4, 0.69, 0.88],
  [0.42, 0.71, 0.89],
  [0.44, 0.73, 0.9],
  [0.46, 0.75, 0.91],
];

/** pilotun sürüş tarzları: çekingen (az açı), olağan, açılı, abartan (çok açı), gazı az */
const TARZ = {
  cekingen: { ...DRIFT_PILOT, aci: 0.3 },
  olagan: DRIFT_PILOT,
  acili: { ...DRIFT_PILOT, aci: 0.6 },
  abartan: { ...DRIFT_PILOT, aci: 0.75 },
  azGaz: { ...DRIFT_PILOT, gaz: 0.6 },
};

it("drift puanı", () => {
  for (let i = 0; i < TDEF.length; i++) {
    const d = TDEF[i];
    if (d.t != "dp") continue;
    const e = yildizEsikleri("dp", d.lv),
      kosu = Object.entries(TARZ).map(([ad, a]) => ({
        ad,
        ...driftTuru(i, "norm", a, 400, false, 2, DRIFT_TUR),
      })),
      P = Math.max(...kosu.map((k) => k.puan)),
      oneri = DRIFT_PAY[d.lv - 1].map((p) => Math.round((P * p) / 50) * 50);
    console.log(
      `${d.lv} ${d.n.padEnd(14)} ${DRIFT_TUR} tur ~${kosu[1].sure.toFixed(0)} sn (pist ${kosu[1].len.toFixed(0)} m) en iyi ${P} | eşik ${e.join("/") || "—"} | önerilen ${oneri.join("/")} | ` +
        kosu
          .map((k) => `${k.ad} ${k.puan}(${yildizSay("dp", k.puan, e)}★ ${k.tur}t y${k.yanma} s${k.spin})`)
          .join(" "),
    );
  }
});
