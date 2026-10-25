import { describe, expect, it } from "vitest";
import { performansPuani } from "../../src/arac/performans";
import { CARS } from "../../src/arac/araclar";
import { STAT } from "../../src/arac/istatistik";
import { duzPerformans } from "../yardimci/duz-performans";
import { enIyiTur, driftPuani, dragSur } from "../yardimci/uyum";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { yildizEsikleri } from "../../src/oyun/yildiz";

describe("garaj ve gerçek sürüş", () => {
  it("Serçe ve üst sınıf: garaj ölçümü gerçek motorla tutarlı, sınıf farkı hissedilir", () => {
    const olc = (a: number) => {
      const gercek = duzPerformans(a),
        garaj = performansPuani(a);
      expect(Math.abs(garaj.hiz / gercek.hiz - 1)).toBeLessThan(0.03);
      expect(Math.abs(garaj.ivme / gercek.ivme - 1)).toBeLessThan(0.05);
      expect(Math.abs(garaj.fren / gercek.fren - 1)).toBeLessThan(0.08);
      expect(STAT(CARS[a])[0][2]).toContain(String(Math.round(garaj.hiz)));
      return gercek;
    };
    const serce = olc(10),
      ust = olc(0);
    expect(serce.hiz).toBeGreaterThan(160);
    expect(serce.hiz).toBeLessThan(175);
    expect(serce.ivme).toBeGreaterThan(6);
    expect(ust.hiz).toBeGreaterThan(serce.hiz * 1.4);
    expect(ust.ivme).toBeLessThan(serce.ivme * 0.65);
  });
  it("Serçe motor modifiyesi ve sökme: gösterge ve gerçek ivme birlikte değişir", () => {
    const parca = ["motor-yaris"],
      stok = performansPuani(10),
      mod = performansPuani(10, parca),
      gercek = duzPerformans(10, parca);
    expect(mod.ivme).toBeLessThan(stok.ivme);
    expect(gercek.ivme).toBeLessThan(stok.ivme);
    expect(Math.abs(mod.ivme / gercek.ivme - 1)).toBeLessThan(0.15);
    expect(Math.abs(mod.hiz / gercek.hiz - 1)).toBeLessThan(0.06);
    expect(performansPuani(10)).toEqual(stok);
  });
  it("Serçe ile ilk asfalt yarışında yıldız kazanılabilir", { timeout: 30000 }, () => {
    const pist = pistNo("gp", 1),
      r = enIyiTur(pist, 10, [0.8, 1], {}, 3);
    expect(Number.isFinite(r.t)).toBe(true);
    expect(r.t).toBeLessThan(yildizEsikleri("gp", 1)[0]);
  });
  it("diğer başlangıç araçları ilk yarışlarında yıldız kazanabilir", { timeout: 30000 }, () => {
    for (const [t, a] of [
      ["rx", 11],
      ["rl", 12],
      ["dp", 13],
      ["dg", 14],
    ] as const) {
      const y = pistNo(t, 1),
        esik = yildizEsikleri(t, 1)[0],
        sonuc =
          t == "dp"
            ? driftPuani(y, a)
            : t == "dg"
              ? dragSur(y, a)
              : enIyiTur(y, a, [0.8, 1], {}, t == "rx" ? 3 : 1).t;
      expect(t == "dp" ? sonuc >= esik : sonuc < esik, `${CARS[a].n}: ${sonuc}, yıldız eşiği ${esik}`).toBe(
        true,
      );
    }
  });
});
