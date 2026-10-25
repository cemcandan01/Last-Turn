import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { performansPuani, SINIFLAR, sinifHarfi } from "../../src/arac/performans";
import { paketTak, aracKur, PARCALAR } from "../../src/arac/parcalar";
import { STOK_TAVAN, ozellikPuani } from "../../src/arac/ozellikler";
import { BASLANGIC_ARACLARI } from "../../src/oyun/ekonomi";

describe("ortak özellik toplamı ve modifiye alanı", () => {
  it("15 stok aracın tamamı sınıfının alt yarısında; bütün D araçları en fazla 200", () => {
    CARS.forEach((c, a) => {
      const p = performansPuani(a);
      expect(p.ozellikler).toHaveLength(6);
      expect(
        p.ozellikler.reduce((s, o) => s + o.puan, 0),
        c.n,
      ).toBe(p.puan);
      expect(p.puan, c.n).toBeLessThanOrEqual(STOK_TAVAN[p.sinif]);
      expect(p.sinif).toBe(sinifHarfi(p.puan));
    });
    BASLANGIC_ARACLARI.forEach((a) => {
      expect(performansPuani(a).puan).toBeLessThanOrEqual(200);
      expect(CARS[a].hp).toBeLessThanOrEqual(200);
    });
  });
  it("aynı özellik her araçta aynı ölçekte; araç kimliğine veya yarış türüne göre puan değişmez", () => {
    const g = { gucAgirlik: 0.1, ivme: 9, hiz: 150, tutus: 25, fren: 20, arazi: 12 };
    expect(ozellikPuani({ ...g })).toEqual(ozellikPuani(g));
    CARS.forEach((_, a) => {
      const p = performansPuani(a);
      for (const t of ["gp", "rx", "rl", "dp", "dg"] as const)
        expect(performansPuani(a, [], t).ozellikler).toEqual(p.ozellikler);
    });
  });
  it("puan takılı lastikten bağımsız: lastik parçası puanı değiştirmez", () => {
    const lastikler = PARCALAR.filter((x) => x.kat == "lastik");
    CARS.forEach((c, a) => {
      const s = performansPuani(a).puan;
      for (const p of lastikler) expect(performansPuani(a, [p.id]).puan, c.n + " " + p.id).toBe(s);
    });
  });
  it("parça tak/sök toplamı değiştirir; sürücü yardımı puan değildir", () => {
    CARS.forEach((c, a) => {
      const stok = performansPuani(a),
        mod = performansPuani(a, ["motor-yaris", "turbo-buyuk", "agirlik-3"]);
      expect(mod.puan, c.n).toBeGreaterThan(stok.puan);
      expect(mod.ozellikler.reduce((s, o) => s + o.puan, 0)).toBe(mod.puan);
      expect(performansPuani(a)).toEqual(stok);
    });
  });
  it("bütün sınıf sınırları ve stok modifiye boşluğu açık", () => {
    for (const s of SINIFLAR) {
      expect(sinifHarfi(s.max)).toBe(s.h);
      expect(sinifHarfi(s.min)).toBe(s.h);
      expect(STOK_TAVAN[s.h]).toBeLessThan(s.max);
    }
    expect(sinifHarfi(400)).toBe("D");
    expect(sinifHarfi(401)).toBe("C");
  });
  it("beş başlangıcın tamamında modifiye alanı gerçekten kullanılabilir", () => {
    const guc = ["motor-degisim", "turbo-buyuk", "agirlik-3", "fren-yaris"];
    const enIyi = BASLANGIC_ARACLARI.map((a) =>
      Math.max(
        ...["asfalt", "ralli", "rallikros", "drift", "drag"]
          .map((p) => performansPuani(a, paketTak(guc, p)).puan)
          .filter((p) => p <= 400),
      ),
    );
    enIyi.forEach((p) => expect(p).toBeGreaterThanOrEqual(300));
    // lastik puan vermez (puan lastikten bağımsız): en iyi yapı ~375
    expect(Math.max(...enIyi)).toBeGreaterThanOrEqual(370);
    const swap = aracKur(10, ["motor-degisim", "turbo-buyuk"]);
    expect(swap.car.hp).toBeCloseTo(350 * 1.7);
    expect(aracKur(10, []).car).toBe(CARS[10]);
  });
});
