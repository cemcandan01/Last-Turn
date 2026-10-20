// Ölçüm: otomatik pilotla tur süreleri, yarışın hedef süresiyle ve eski (klasik) motorun süresiyle karşılaştırma
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { ipucu, nearest } from "../../src/dunya/pist";
import { surucuKur } from "../yardimci/surucu";
import { egrilik, pilot } from "../yardimci/pilot";
import { EVENTS_HEDEF } from "../yardimci/hedefler";

const DT = 1 / 60;

/** eski klasik motorun (bisiklet modeli, 3.0'a kadar) aynı otomatik pilotla tur süreleri (sn) */
const KLASIK: Record<number, number> = { 0: 52.5, 1: 46.6, 2: 42.7, 3: 42.9, 4: 41.8, 10: 48.8 };

export function turSur(yaris: number, arac: number, cesaret: number, lk: "real" | "norm" | "arc" = "norm") {
  const s = surucuKur({ yaris, arac, lk });
  const TR = s.bolge!.TR!,
    i0 = TR.open ? 4 : TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const K = egrilik(TR),
    pl = pilot(TR, K, cesaret),
    S = s.sim.S;
  let t = 0,
    armed = 0,
    prev = ipucu.ti,
    disari = 0,
    spin = 0,
    sp = false;
  const sinir = TR.open ? 200 : 300;
  while (t < sinir) {
    s.adim(pl(S));
    t += DT;
    const ti = ipucu.ti,
      N = TR.N,
      dd = nearest(TR, S.x, S.z, ti)[1];
    if (dd > TR.hw + 2.5) disari += DT;
    const ab = Math.abs(s.sim.d.D.beta);
    if (ab > 1.3 && !sp) {
      spin++;
      sp = true;
    }
    if (ab < 0.4) sp = false;
    if (TR.open) {
      if (ti > N * 0.5) armed = 1;
      if (armed && ti >= N - 4) return { t, disari, spin };
    } else {
      if (ti > N * 0.4 && ti < N * 0.6) armed = 1;
      if (prev > N * 0.8 && ti < N * 0.2 && armed) return { t, disari, spin };
    }
    prev = ti;
  }
  return { t: Infinity, disari, spin };
}

it("tempo", () => {
  for (const [yaris, arac] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 1],
    [5, 1],
    [9, 3],
    [10, 3],
    [11, 3],
  ] as const) {
    let en = Infinity,
      enC = 0;
    for (const c of [0.45, 0.6, 0.75, 0.9, 1.05]) {
      const r = turSur(yaris, arac, c);
      if (r.spin == 0 && r.disari < 3 && r.t < en) {
        en = r.t;
        enC = c;
      }
    }
    const h = EVENTS_HEDEF(yaris),
      k = KLASIK[yaris];
    console.log(
      `${h.n.padEnd(14)} ${CARS[arac].n.padEnd(12)} hedef ${h.tur.toFixed(1)} sn/tur | ${en.toFixed(1)} sn (cesaret ${enC})` +
        (k ? ` | eski motor ${k.toFixed(1)} sn` : ""),
    );
  }
});
