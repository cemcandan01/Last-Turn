// Ölçüm: drift pistlerinde drift pilotunun yarış turlarındaki puanı ve yıldız eşikleri (npm run olcum -- drift-puan)
import { it } from "vitest";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { DRIFT_TUR, yildizEsikleri, yildizSay } from "../../src/oyun/yildiz";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";

/**
 * Eşik = pilotun x6'sız en iyi sürüşünün puanı (P0: aşağıdaki sürüş tarzlarının en iyisi, drift aracıyla, 2. tur x6 kapalı) × pay:
 * 3★ P0'ın biraz altı (x6'sız iyi sürüş 2★-3★ sınırında; x6 kazanan ~%7 fazla puanla rahat 3★), 2★ iyi sürüş, 1★ rahat.
 * 1★ payı (0.26-0.30) çekingen sürüşün de ulaşacağı kadar düşüktür (rahat bitiriş). Üst seviyede pay sıkılaşır. Eşikler hp (1★) ve ys'e (2★, 3★) yazılır.
 */
export const DRIFT_PAY = [
  [0.26, 0.65, 0.9],
  [0.27, 0.67, 0.91],
  [0.28, 0.69, 0.92],
  [0.28, 0.71, 0.93],
  [0.29, 0.73, 0.94],
  [0.3, 0.75, 0.95],
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
    if (d.t != "dp" || (process.env.LV && +process.env.LV != d.lv)) continue;
    const e = yildizEsikleri("dp", d.lv),
      kosu = Object.entries(TARZ).map(([ad, a]) => ({
        ad,
        ...driftTuru(i, "norm", a, 400, false, 2, DRIFT_TUR),
      })),
      kosu0 = Object.entries(TARZ).map(([ad, a]) => ({
        ad,
        ...driftTuru(i, "norm", a, 400, false, 2, DRIFT_TUR, false),
      })),
      P = Math.max(...kosu.map((k) => k.puan)),
      P0 = Math.max(...kosu0.map((k) => k.puan)),
      oneri = DRIFT_PAY[(d.sev ?? d.lv) - 1].map((p) => Math.round((P0 * p) / 50) * 50);
    console.log(
      `${d.lv} ${d.n.padEnd(14)} x6'sız en iyi ${P0} (x6 ile ${P}; x6 kazanan: ${
        kosu
          .filter((k) => k.x6)
          .map((k) => k.ad + " %" + (k.driftOran * 100).toFixed(0))
          .join(",") || "yok"
      }; oranlar ${kosu.map((k) => (k.driftOran * 100).toFixed(0)).join("/")}) |
      ${d.lv} ${d.n.padEnd(14)} ${DRIFT_TUR} tur ~${kosu[1].sure.toFixed(0)} sn (pist ${kosu[1].len.toFixed(0)} m) en iyi ${P} | eşik ${e.join("/") || "—"} | önerilen ${oneri.join("/")} | ` +
        kosu
          .map((k) => `${k.ad} ${k.puan}(${yildizSay("dp", k.puan, e)}★ ${k.tur}t y${k.yanma} s${k.spin})`)
          .join(" "),
    );
  }
});

/** 1★ kontrolü: türün aracı (Beyaz Kurt, 2) ve başlangıç aracı Panda (8), her sürüş tarzıyla, x6 dahil (npm run olcum -- drift-puan) */
it("drift 1★ erişilebilirliği", () => {
  for (let i = 0; i < TDEF.length; i++) {
    const d = TDEF[i];
    if (d.t != "dp" || (process.env.LV && +process.env.LV != d.lv)) continue;
    const e = yildizEsikleri("dp", d.lv);
    const satir = [2, 8].map((arac) => {
      const k = Object.entries(TARZ).map(([ad, a]) => ({
        ad,
        ...driftTuru(i, "norm", a, 400, false, arac, DRIFT_TUR),
      }));
      const en = Math.max(...k.map((x) => x.puan));
      return `${arac == 2 ? "Kurt" : "Panda"} en iyi ${en} (${yildizSay("dp", en, e)}★) [${k.map((x) => x.ad + " " + x.puan).join(" ")}]`;
    });
    console.log(`${d.lv} ${d.n.padEnd(14)} eşik ${e.join("/")} | ${satir.join(" | ")}`);
  }
});
