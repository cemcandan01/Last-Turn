// Ölçüm: her zamanlı pistte türün aracıyla otomatik pilotun bütün cesaretlerdeki süreleri ve yıldız eşikleri.
// Yeni pist ya da yıldız eşiği ayarlarken: npm run olcum -- pistler (yalnız bir tür: TUR=gp npm run olcum -- pistler)
// Yalnız bir pist numarası: LV=7 (ör. LV=7 TUR=gp npm run olcum -- pistler)
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { yildizSay } from "../../src/oyun/yildiz";
import { CESARETLER, dragSur, turSur } from "../yardimci/uyum";

/**
 * Yıldız eşikleri pilotun hatasız en iyi süresinden (E: bütün cesaretlerin spinsiz, pistte kalan en hızlısı; kapalı
 * pistte 3 tur) çarpanla çıkar: 1★ rahat bitiriş, 2★ iyi sürüş, 3★ en iyi sürüşe yakın, küçük hatalara az pay.
 * Pilot pist çizgisini izler; zor pistte ancak düşük cesaretle hatasız biter, ustalar orada pilottan hızlıdır. Bu
 * yüzden üst seviyede pay daralır. Eşikler hedef süreye (tg = 1★) ve ys'e (2★, 3★) yazılır.
 */
export const YILDIZ_PAY = {
  zaman: [
    [1.4, 1.12, 1.035],
    [1.35, 1.1, 1.03],
    [1.3, 1.09, 1.025],
    [1.27, 1.08, 1.02],
    [1.24, 1.07, 1.015],
    [1.22, 1.06, 1.01],
  ],
  // drag: pilot ışıkta tam gaz; insan kalkışı ancak biraz daha iyi yapabilir
  drag: [
    [1.3, 1.08, 1.02],
    [1.27, 1.07, 1.018],
    [1.24, 1.06, 1.015],
    [1.22, 1.05, 1.012],
    [1.2, 1.045, 1.01],
    [1.18, 1.04, 1.008],
  ],
};

/** eşik yukarı yuvarlanır (pilotun süresi eşiğin altında kalsın): drag 0,1 sn, ralli 0,5 sn, turlu yarış 1 sn */
const yuvarla = (t: number, tur: string) => {
  const a = tur == "dg" ? 10 : tur == "rl" ? 2 : 1;
  return Math.ceil(t * a - 1e-9) / a;
};

it("pistler", () => {
  const satir: string[] = [];
  for (let yaris = 0; yaris < TDEF.length; yaris++) {
    const d = TDEF[yaris];
    if (
      d.t == "dp" ||
      (process.env.TUR && process.env.TUR != d.t) ||
      (process.env.LV && +process.env.LV != d.lv)
    )
      continue;
    const arac = CARS.findIndex((c) => c.ty == d.t),
      dg = d.t == "dg",
      tur = d.t == "gp" || d.t == "rx" ? 3 : 1;
    // cesarete göre hatasız süreler (drag: ışıkta kalkış gecikmesi, sn)
    const kosular: { c: number; t: number; temiz: boolean }[] = dg
      ? [0, 0.15, 0.3, 0.5].map((g) => ({ c: g, t: dragSur(yaris, arac, g), temiz: true }))
      : CESARETLER.map((c) => {
          const r = turSur(yaris, arac, c, "norm", tur);
          return { c, t: r.t, temiz: r.spin == 0 && r.disari < 3 * tur && isFinite(r.t) };
        });
    const temiz = kosular.filter((k) => k.temiz),
      E = Math.min(...temiz.map((k) => k.t)),
      pay = (dg ? YILDIZ_PAY.drag : YILDIZ_PAY.zaman)[(d.sev ?? d.lv) - 1],
      oneri = pay.map((p) => yuvarla(E * p, d.t)),
      esik = [d.tg ?? 0, ...(d.ys ?? [])];
    const dagilim = temiz
      .sort((a, b) => a.t - b.t)
      .map((k) => `${k.c}:${k.t.toFixed(1)}(${yildizSay("gp", k.t, esik)}★)`)
      .join(" ");
    satir.push(
      `${String(yaris).padStart(2)} ${d.t} ${d.lv} ${d.n.padEnd(18)} ${CARS[arac].n.padEnd(12)} E ${E.toFixed(2)} | eşik ${esik.join("/")} | önerilen ${oneri.join("/")} | ${dagilim}`,
    );
  }
  console.log("\n" + satir.join("\n"));
});
