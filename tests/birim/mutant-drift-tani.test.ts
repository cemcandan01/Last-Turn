import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { driftTanisi } from "../../src/fizik/drift-tani";
import { driftYarisProfili } from "../../src/fizik/ortak";
import type { SimDurumu, SurusKurulumu } from "../../src/fizik/tipler";

const kurulum = (guclu = false) =>
  ({
    car: { ...CARS[0], dmax: guclu ? 1.06 : 0.6, awd: guclu ? 0 : 1 },
    tu: { lock: guclu ? 1 : 0.4, diff: guclu ? 1.2 : 0.2 },
    as: { dft: guclu ? 1 : 0.2, ini: guclu ? 1 : 0 },
  }) as SurusKurulumu;

const sim = () =>
  ({
    S: { air: false, gas: 0.8, vx: 12, vz: 0 },
    DR: { on: 0, dir: 1, hold: 0, bt: 0, t: 0, k: 0, cool: 0, nc: 0 },
    D: { act: 0, t: 0, score: 0, gap: 0, beta: 0.1 },
    st: 0.5,
  }) as SimDurumu;

describe("MUTANT DEV drift tanısı", () => {
  it("stok ve güçlü araç eşiğini aynı fizik profilinden okur; fiziğe dokunmaz", () => {
    const s = sim(),
      once = JSON.stringify(s),
      stok = driftTanisi(s, kurulum(false)),
      guclu = driftTanisi(s, kurulum(true));
    expect(stok.giris).toBe(Math.round((driftYarisProfili(kurulum(false)).giris * 180) / Math.PI));
    expect(guclu.giris).toBeLessThan(stok.giris);
    expect(guclu.azami).toBeGreaterThan(stok.azami);
    expect(stok.aci).toBe(6);
    expect(stok.durum).toBe("aci");
    expect(JSON.stringify(s)).toBe(once);
  });

  it("hazırlık, zorlama, hız, gaz ve havada farklı okunabilir geri bildirim verir", () => {
    const s = sim(),
      k = kurulum();
    s.S.vx = 2;
    expect(driftTanisi(s, k).durum).toBe("yavas");
    s.S.vx = 12;
    s.S.gas = 0;
    expect(driftTanisi(s, k).durum).toBe("gaz");
    s.S.gas = 0.8;
    s.DR.nc = driftYarisProfili(k).hazirlik / 2;
    expect(driftTanisi(s, k)).toMatchObject({ durum: "hazirlik", ilerleme: 50 });
    s.DR.nc = 0;
    s.DR.hold = driftYarisProfili(k).zorlama * 0.6;
    expect(driftTanisi(s, k)).toMatchObject({ durum: "zorlama", ilerleme: 60 });
    s.S.air = true;
    expect(driftTanisi(s, k).durum).toBe("havada");
  });

  it("aktif driftte karşı direksiyonu açıklar, sınır ve spin sonrası soğumayı ayırır", () => {
    const s = sim(),
      k = kurulum(true),
      p = driftYarisProfili(k);
    s.DR.on = 1;
    s.D.beta = p.azami * 0.5;
    expect(driftTanisi(s, k)).toMatchObject({
      durum: "drift",
      ilerleme: 50,
      ipucu: "Direksiyon açıyı büyütüyor",
    });
    s.st = -0.8;
    expect(driftTanisi(s, k).ipucu).toContain("Karşı direksiyon");
    s.D.beta = p.azami * 0.93;
    expect(driftTanisi(s, k).durum).toBe("sinir");
    s.DR.on = 0;
    s.DR.cool = 0.9;
    expect(driftTanisi(s, k)).toMatchObject({ durum: "toparlan", mesaj: "SPİN SONRASI" });
    expect(driftTanisi(s, k).spin).toBe(Math.round(((p.azami + 0.12) * 180) / Math.PI));
  });
});
