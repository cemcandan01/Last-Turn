// Ölçüm: her pistte türün araçıyla otomatik pilotun en iyi süresi ve hedef süre (seviyeye göre ne kadar sıkı).
// Yeni pist ya da hedef ayarlarken: npm run olcum -- pistler
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { EVENTS_HEDEF } from "../yardimci/hedefler";
import { surucuKur } from "../yardimci/surucu";
import { turSur } from "./tempo.test";

const DT = 1 / 60;
/**
 * hedef süre = pilot süresi × pay (seviyeye göre). Pilot pist çizgisini izler ve zor pistte ancak düşük cesaretle
 * hatasız biter; ustalar orada pilottan çok daha hızlıdır, bu yüzden üst seviyelerde pay 1'in altında.
 */
const PAY = [1.3, 1.18, 1.08, 1, 0.95, 0.9],
  DRAG_PAY = [1.25, 1.15, 1.08, 1.04, 1.02, 1];

/** drag: tam gaz, bitiş süresi */
function dragSur(yaris: number, arac: number) {
  const s = surucuKur({ yaris, arac, lk: "norm" });
  const TR = s.bolge!.TR!,
    S = s.sim.S,
    z1 = TR.P[TR.N - 1][1];
  s.reset(TR.P[0][0], TR.P[0][1], 0);
  for (let k = 0; k < 60 / DT; k++) {
    s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
    if (S.z >= z1) return k * DT;
  }
  return Infinity;
}

it("pistler", () => {
  const satir: string[] = [];
  for (let yaris = 0; yaris < TDEF.length; yaris++) {
    const d = TDEF[yaris];
    if (d.t == "dp") continue;
    const arac = CARS.findIndex((c) => c.ty == d.t),
      h = EVENTS_HEDEF(yaris);
    let en = Infinity,
      enC = 0;
    if (d.t == "dg") en = dragSur(yaris, arac);
    else
      for (const c of [0.45, 0.6, 0.75, 0.9, 1.05]) {
        const r = turSur(yaris, arac, c);
        if (r.spin == 0 && r.disari < 3 && r.t < en) {
          en = r.t;
          enC = c;
        }
      }
    const tur = d.t == "gp" || d.t == "rx" ? 3 : 1,
      oneri =
        d.t == "dg" ? Math.round(en * DRAG_PAY[d.lv - 1] * 10) / 10 : Math.round(en * tur * PAY[d.lv - 1]);
    satir.push(
      `${String(yaris).padStart(2)} ${d.t} ${d.lv} ${d.n.padEnd(18)} ${CARS[arac].n.padEnd(12)} pilot ${en.toFixed(2)} sn (cesaret ${enC}) × ${tur} tur | hedef ${h.limit} sn → oran ${(h.limit / (en * tur)).toFixed(2)} | önerilen ${oneri}`,
    );
  }
  console.log("\n" + satir.join("\n"));
});
