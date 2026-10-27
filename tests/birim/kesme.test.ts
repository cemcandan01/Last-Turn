// LT-SYS-006 pist kesme: gerçek pistlerde YZ sürücü (pistten taşsa da) tur boyunca kesme cezası yemez; pistin
// içinden (merkezden) kısa yola dalınca kesme algılanır.
import { describe, expect, it } from "vitest";
import { tp } from "../../src/dunya/pist";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";
import { bosKesme, kesmeAdimi } from "../../src/oyun/piste-donus";
import { rakipKurulumu, yarisciAdimi, yarisciYap } from "../../src/yz/yarisci";
import { surucuKur } from "../yardimci/surucu";

const ARAC = BASLANGIC_ARACLARI[0];

describe("LT-SYS-006 pist kesme gerçek pistte", () => {
  it("YZ tur atarken (taşmalar dahil) yanlış kesme yok", { timeout: 120000 }, () => {
    const pistler = TDEF.map((d, i) => ({ d, i })).filter(({ d }) => d.t != "dg");
    let tasma = 0;
    for (const { d, i } of pistler) {
      const s = surucuKur({ yaris: i, arac: ARAC, lk: "norm" }),
        TR = s.bolge!.TR!,
        g = tp(TR, "", TR.N, 6),
        y = yarisciYap(s.cx.dunya, rakipKurulumu(ARAC, d.t, "norm"), TR, 1, "deneyimli", 5, {
          x: g[1],
          z: g[2],
          h: g[3],
        }),
        k = bosKesme();
      let kesme = 0;
      for (let n = 0; n < 60 * 90 && y.bitis == null; n++) {
        yarisciAdimi(y, true);
        const S = y.ornek.sim.S;
        if (k.cikis != null) tasma++;
        kesme += kesmeAdimi(k, TR, S.x, S.z, y.ti);
      }
      expect(kesme, d.n).toBe(0);
    }
    expect(tasma).toBeGreaterThan(0);
  });

  it("gerçek pistte iç sahadan kısa yol kesme sayılır; ceza atlanan mesafeye göre", () => {
    let bulunan = 0;
    for (const [i, d] of TDEF.entries()) {
      if (d.t != "gp") continue;
      const TR = surucuKur({ yaris: i, arac: ARAC, lk: "norm" }).bolge!.TR!;
      // pist boyunca 150 m ama kuş uçuşu 60 m'den kısa iki nokta (iç sahadan kestirme)
      for (let a = 0; a < TR.N && !bulunan; a += 5)
        for (let b = a + 1; b < TR.N; b++) {
          const ds = TR.S[b] - TR.S[a];
          if (ds < 150) continue;
          if (ds > 260) break;
          const [ax, az] = TR.P[a],
            [bx, bz] = TR.P[b],
            L = Math.hypot(bx - ax, bz - az);
          if (L > 60) continue;
          const k = bosKesme();
          let kesme = 0;
          for (let t = 0; t <= L; t += 0.5)
            kesme += kesmeAdimi(k, TR, ax + ((bx - ax) * t) / L, az + ((bz - az) * t) / L, a);
          expect(kesme, d.n).toBeGreaterThan(ds - 40);
          expect(kesme).toBeLessThan(ds + 10);
          bulunan++;
          break;
        }
    }
    expect(bulunan).toBeGreaterThan(0);
  });
});
