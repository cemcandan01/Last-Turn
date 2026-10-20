// Ölçüm (test değil): araçların temel değerleri (duruş, 0-100, azami hız, fren). npm run olcum
import { it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { surucuKur } from "../yardimci/surucu";

const DT = 1 / 60;
it("duruş, hızlanma, azami hız, fren", () => {
  for (let ci = 0; ci < 5; ci++) {
    const s = surucuKur({ dunya: 0, arac: ci, lk: "norm" });
    // Çorak Topraklar uzun düz yol (asfalt), güneye bakarak başla
    s.reset(210, -780, 0);
    const S = s.sim.S;
    let ymin = 1e9,
      ymax = -1e9;
    for (let k = 0; k < 120; k++) {
      s.adim({ tg: 0, g: 0, b: 0, analogDireksiyon: false, analogGaz: false });
      if (k > 60) {
        ymin = Math.min(ymin, S.y);
        ymax = Math.max(ymax, S.y);
      }
    }
    const kayma = Math.hypot(S.x - 210, S.z + 780);
    let t100 = -1,
      vmax = 0,
      t = 0;
    for (let k = 0; k < 40 / DT; k++) {
      s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
      t += DT;
      const v = Math.hypot(S.vx, S.vz) * 3.6;
      if (t100 < 0 && v >= 100) t100 = t;
      vmax = Math.max(vmax, v);
      if (S.z > 760) break;
    }
    // fren: 100 km/sa'dan
    s.reset(210, -780, 0);
    for (let k = 0; k < 600 && Math.hypot(S.vx, S.vz) < 27.78; k++)
      s.adim({ tg: 0, g: 1, b: 0, analogDireksiyon: false, analogGaz: false });
    const z0 = S.z;
    let tb = 0;
    while (Math.hypot(S.vx, S.vz) > 0.3 && tb < 10) {
      s.adim({ tg: 0, g: 0, b: 1, analogDireksiyon: false, analogGaz: false });
      tb += DT;
    }
    const Y = s.sim.yeni!;
    console.log(
      `${CARS[ci].n.padEnd(12)} duruş kayması ${kayma.toFixed(3)} m, salınım ${(ymax - ymin).toFixed(4)} m | 0-100 ${t100.toFixed(2)} sn (garaj ${CARS[ci].a100}) | azami ${vmax.toFixed(0)} km/sa | 100-0 ${(S.z - z0).toFixed(1)} m (garaj ${CARS[ci].b100}) | vites ${Y.vites} devir ${Y.rpm.toFixed(0)}`,
    );
  }
});
