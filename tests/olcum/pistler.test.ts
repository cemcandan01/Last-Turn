// Ölçüm: her pistte türün araçıyla otomatik pilotun en iyi süresi ve hedef süre (seviyeye göre ne kadar sıkı).
// Yeni pist ya da hedef ayarlarken: npm run olcum -- pistler
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { EVENTS_HEDEF } from "../yardimci/hedefler";
import { dragSur, enIyiTur } from "../yardimci/uyum";

/**
 * hedef süre = pilot süresi × pay (seviyeye göre). Pilot pist çizgisini izler ve zor pistte ancak düşük cesaretle
 * hatasız biter; ustalar orada pilottan çok daha hızlıdır, bu yüzden üst seviyelerde pay 1'in altında. Amatör'den
 * itibaren yanlış türün aracı (önerilenden en az ~%10 yavaş) hedefi tutturamaz.
 */
const PAY = [1.3, 1.1, 1.05, 1, 0.95, 0.9],
  DRAG_PAY = [1.25, 1.15, 1.08, 1.04, 1.02, 1];

it("pistler", () => {
  const satir: string[] = [];
  for (let yaris = 0; yaris < TDEF.length; yaris++) {
    const d = TDEF[yaris];
    if (d.t == "dp" || (process.env.TUR && process.env.TUR != d.t)) continue;
    const arac = CARS.findIndex((c) => c.ty == d.t),
      h = EVENTS_HEDEF(yaris);
    const { t: en, cesaret: enC } =
      d.t == "dg" ? { t: dragSur(yaris, arac), cesaret: 0 } : enIyiTur(yaris, arac);
    const tur = d.t == "gp" || d.t == "rx" ? 3 : 1,
      oneri =
        d.t == "dg" ? Math.round(en * DRAG_PAY[d.lv - 1] * 10) / 10 : Math.round(en * tur * PAY[d.lv - 1]);
    satir.push(
      `${String(yaris).padStart(2)} ${d.t} ${d.lv} ${d.n.padEnd(18)} ${CARS[arac].n.padEnd(12)} pilot ${en.toFixed(2)} sn (cesaret ${enC}) × ${tur} tur | hedef ${h.limit} sn → oran ${(h.limit / (en * tur)).toFixed(2)} | önerilen ${oneri}`,
    );
  }
  console.log("\n" + satir.join("\n"));
});
