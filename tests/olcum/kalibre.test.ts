// Ölçüm: performans puanının kalibrasyonu ve doğrulaması. npm run olcum -- kalibre
// 1) Model ↔ pilot: her yapılandırmada (stok ve modifiyeli araçlar) otomatik pilotun en iyi turu (tür uyumu kapalı,
//    puana girmediği için) ile puan modelinin (nokta kütle) aynı pistteki süresi; oran ve sapma.
// 2) Puan ↔ tur süresi: puan farkı ile pilot süresi farkının ilişkisi (aynı puan ≈ aynı süre).
// Paralel koşmak için GRUP=0/4 … GRUP=3/4 (yapılandırmalar bölünür).
import { it } from "vitest";
import { CARS, type YarisTuru } from "../../src/arac/araclar";
import { noktaKutleTuru, performansPuani, turPuanTuru } from "../../src/arac/performans";
import { parcaliKurulum } from "../../src/arac/parcalar";
import { REG } from "../../src/dunya/bolgeler";
import { ensureBuilt, loadWorld } from "../../src/dunya/dunya";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { egrilik } from "../yardimci/pilot";
import { YAPILAR } from "../yardimci/kalibre";
import { enIyiTur } from "../yardimci/uyum";

const ad = (a: number, p: string[]) => CARS[a].n + (p.length ? " +" + p.join(",") : "");

function pistEgriligi(yaris: number) {
  loadWorld();
  ensureBuilt(REG[yaris]);
  const TR = REG[yaris].TR!,
    K = egrilik(TR),
    i0 = TR.open ? 4 : TR.N - 6,
    son = TR.open ? TR.N - 4 : i0 + TR.N,
    k: number[] = [],
    dx: number[] = [];
  for (let j = i0; j < son; j++) {
    const i = j % TR.N,
      s = (i + 1) % TR.N;
    k.push(K[i]);
    dx.push(Math.max(0.05, Math.hypot(TR.P[s][0] - TR.P[i][0], TR.P[s][1] - TR.P[i][1])));
  }
  return { k, dx, kapali: !TR.open };
}

it("puan modeli ↔ otomatik pilot, puan ↔ tur süresi", { timeout: 7200000 }, () => {
  const [g, n] = (process.env.GRUP || "0/1").split("/").map(Number);
  const PISTLER: [YarisTuru, number][] = [
    ["gp", 2],
    ["gp", 4],
    ["rl", 2],
    ["rx", 2],
  ];
  // pist başına [puan (türün zemininde), pilot süresi]
  const nokta: [number, number][][] = PISTLER.map(() => []);
  YAPILAR.forEach(([a, p], yi) => {
    if (yi % n != g) return;
    const K = parcaliKurulum(a, p, "norm"),
      puan = PISTLER.map(([t]) => performansPuani(a, p, t).puan);
    const ol = PISTLER.map(([t, lv], j) => {
      const y = pistNo(t, lv),
        e = pistEgriligi(y),
        pt = turPuanTuru(t),
        pilot = enIyiTur(y, a, undefined, { parca: p, uzmanliksiz: true }).t,
        model = noktaKutleTuru(K, e.k, e.dx, e.kapali, pt == "drag" ? "asfalt" : pt);
      if (isFinite(pilot)) nokta[j].push([puan[j], pilot]);
      return `${t}${lv} ${pilot.toFixed(2)}/${model.toFixed(2)}=${(pilot / model).toFixed(3)}`;
    });
    console.log(
      `${String(yi).padStart(2)} ${ad(a, p).padEnd(60)} puan ${PISTLER.map(([t], j) => t + " " + puan[j]).join(" ")}  ${ol.join("  ")}`,
    );
  });
  // puan ↔ süre: ln(süre) = c − puan / PUAN_OLCEK beklenir; sapma yüzde ve puan olarak
  PISTLER.forEach(([t, lv], j) => {
    const v = nokta[j];
    if (v.length < 2) return;
    const c = v.reduce((s, [p, x]) => s + Math.log(x) + p / 1500, 0) / v.length,
      r = v.map(([p, x]) => Math.log(x) - (c - p / 1500)),
      sd = Math.sqrt(r.reduce((s, x) => s + x * x, 0) / r.length);
    console.log(
      `${t}${lv}: ${v.length} yapı, puan ↔ süre sapması %${(100 * sd).toFixed(1)} (≈ ${(1500 * sd).toFixed(0)} puan), en büyük %${(100 * Math.max(...r.map(Math.abs))).toFixed(1)}`,
    );
  });
});
