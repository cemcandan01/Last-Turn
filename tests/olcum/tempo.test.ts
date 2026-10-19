// Ölçüm: otomatik pilotla tur süreleri (klasik ve yeni fizik), yarışın hedef süresiyle karşılaştırma
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { ipucu, nearest } from "../../src/dunya/pist";
import { surucuKur } from "../yardimci/surucu";
import { egrilik, pilot } from "../yardimci/pilot";
import { EVENTS_HEDEF } from "../yardimci/hedefler";

const DT = 1 / 60;

export function turSur(
  motor: "klasik" | "yeni",
  yaris: number,
  arac: number,
  cesaret: number,
  lk: "real" | "norm" | "arc" = "norm",
) {
  const s = surucuKur({ yaris, arac, lk, motor });
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
    [9, 3],
    [10, 3],
  ] as const) {
    const sat: string[] = [];
    for (const motor of ["klasik", "yeni"] as const) {
      let en = Infinity,
        enC = 0;
      for (const c of [0.45, 0.6, 0.75, 0.9, 1.05]) {
        const r = turSur(motor, yaris, arac, c);
        if (r.spin == 0 && r.disari < 3 && r.t < en) {
          en = r.t;
          enC = c;
        }
      }
      sat.push(`${motor} ${en.toFixed(1)} sn (cesaret ${enC})`);
    }
    const h = EVENTS_HEDEF(yaris);
    console.log(
      `${h.n.padEnd(14)} ${CARS[arac].n.padEnd(12)} hedef ${h.tur.toFixed(1)} sn/tur | ${sat.join(" | ")}`,
    );
  }
});
