// Ölçüm: bir fizik adımının işlemci süresi
import { it } from "vitest";
import { surucuKur } from "../yardimci/surucu";
import { egrilik, pilot } from "../yardimci/pilot";
it("maliyet", () => {
  const s = surucuKur({ yaris: 0, arac: 0, lk: "norm" });
  const TR = s.bolge!.TR!,
    i0 = TR.N - 6,
    P = TR.P[i0];
  s.reset(P[0], P[1], Math.atan2(TR.T[i0][0], TR.T[i0][1]));
  const pl = pilot(TR, egrilik(TR), 0.9);
  for (let k = 0; k < 600; k++) s.adim(pl(s.sim.S));
  const t0 = performance.now();
  for (let k = 0; k < 3600; k++) s.adim(pl(s.sim.S));
  const ms = (performance.now() - t0) / 3600;
  console.log(
    `adım başına ${ms.toFixed(3)} ms (60 Hz'de karenin %${((ms / 16.7) * 100).toFixed(1)}'i, bu bilgisayarda)`,
  );
});
