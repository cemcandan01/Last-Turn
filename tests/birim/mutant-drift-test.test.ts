import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { driftPenceresi, driftSiniri, driftSkoru, driftYarisProfili } from "../../src/fizik/ortak";
import type { FizikBaglami, FizikGirdisi, SimDurumu, SurusKurulumu } from "../../src/fizik/tipler";
import {
  BOSS_SURESI,
  kosuBaslat,
  pasifSec,
  testBolgeyeGec,
  testKurulumu,
  testKurulumunuSifirla,
} from "../../src/oyun/mutant-kosu";
import { pistNo } from "../../src/dunya/pist-tanimlari";
import { surucuKur } from "../yardimci/surucu";

const kurulum = (tuned = false) =>
  ({
    car: { ...CARS[0], dmax: tuned ? 1.04 : 0.67, awd: tuned ? 0 : 0.8 },
    tu: { lock: tuned ? 0.98 : 0.45, diff: tuned ? 1.15 : 0.25 },
    as: { dft: tuned ? 0.95 : 0.4 },
  }) as SurusKurulumu;

const sim = () =>
  ({
    S: { air: false },
    DR: { on: 0, dir: 0, hold: 0, bt: 0, t: 0, k: 0, cool: 0, nc: 0 },
    D: { act: 0, t: 0, score: 0, gap: 0, beta: 0 },
    st: 0.4,
  }) as SimDurumu;

const gi = { g: 0.8, b: 0, tg: 0.4, analogDireksiyon: true, analogGaz: true } as FizikGirdisi;

describe("MUTANT drift yarışı için ayrı çekirdek", () => {
  it("stok ve güçlendirilmiş araçların kontrol açısı gerçekten farklıdır", () => {
    const stok = driftYarisProfili(kurulum());
    const guclu = driftYarisProfili(kurulum(true));
    expect(stok.giris).toBeGreaterThan(guclu.giris);
    expect(stok.hazirlik).toBeGreaterThan(guclu.hazirlik);
    expect(stok.azami).toBeLessThan(guclu.azami);
    expect((guclu.azami * 180) / Math.PI).toBeGreaterThan(40);
    expect((stok.azami * 180) / Math.PI).toBeLessThan(40);
  });

  it("düşük stok arabada da kayma açısıyla drift açılır; yarış dışındaki davranış aynı kalır", () => {
    const d = sim();
    let spin = 0;
    const cx = {
      kurulum: kurulum(),
      olay: { spin: () => spin++ },
      driftYarisi: true,
    } as unknown as FizikBaglami;
    driftPenceresi(d, gi, cx, 14, 0.35, 0.35, driftSiniri(14), 0.22);
    expect(d.DR.on).toBe(1);
    const dis = sim();
    driftPenceresi(dis, gi, { ...cx, driftYarisi: false }, 14, 0.35, 0.35, driftSiniri(14), 0.22);
    expect(dis.DR.on).toBe(0);
    driftPenceresi(d, gi, cx, 14, 0.95, 0.95, driftSiniri(14), 0.05);
    expect(d.DR.on).toBe(0);
    expect(spin).toBe(1);
  });

  it("drifte girdikten sonra karşı direksiyonla açı düşer, kıç öbür yana geçer; yön kilitlenmez", () => {
    // Cem 0.8.10: drift yarışında kıç bir yana kaydıktan sonra direksiyon ne olursa olsun araç o açıda kalıyordu.
    const s = surucuKur({ yaris: pistNo("dp", 1), arac: 0, lk: "norm" });
    s.cx.driftYarisi = true;
    const TR = s.bolge!.TR!,
      P = TR.P[5];
    s.reset(P[0], P[1], Math.atan2(TR.T[5][0], TR.T[5][1]));
    const surus = (tg: number, sn: number) => {
      for (let k = 0; k < sn * 60; k++) s.adim({ tg, g: 1, b: 0, analogDireksiyon: true, analogGaz: true });
    };
    surus(0, 2.5);
    surus(-1, 2);
    const ilk = s.sim.d.D.beta;
    expect(s.sim.d.DR.on).toBe(1);
    expect(Math.abs(ilk)).toBeGreaterThan(0.4);
    surus(1, 2.5);
    // Ters yöne tam kırınca kayma açısının işareti döner: araç ilk açıda sabit kalmaz.
    expect(Math.sign(s.sim.d.D.beta)).toBe(-Math.sign(ilk));
    expect(Math.abs(s.sim.d.D.beta)).toBeGreaterThan(0.3);
    // Yeni drift öbür yönde açılmıştır (dir = -işaret(beta)).
    expect(s.sim.d.DR.on).toBe(1);
    expect(s.sim.d.DR.dir).toBe(Math.sign(ilk));
  });

  it("yarış skoru, yardımcı drift kapandıktan sonra yüksek açıyla bedavaya sürmez", () => {
    const d = sim();
    const etkin = driftSkoru(d, 15, 13, 8, 1 / 60, true);
    expect(etkin).toBe(false);
    expect(d.D.act).toBe(0);
    const normal = driftSkoru(d, 15, 13, 8, 1 / 60);
    expect(normal).toBe(true);
  });

  it("test süresi kısadır ve normal koşu süresini değiştirmez", () => {
    expect(BOSS_SURESI(1)).toBe(900);
    expect(BOSS_SURESI(2)).toBe(780);
    expect(BOSS_SURESI(1, true)).toBe(90);
    expect(BOSS_SURESI(3, true)).toBe(90);
  });

  it("üretim koşusunda serbest parça ve skill eklenemez", () => {
    const k = kosuBaslat(7, []);
    pasifSec(k, k.secenekler[0]);
    expect(testKurulumu(k, "parca", "aci-kiti")).toBe(false);
    expect(testKurulumu(k, "beceri", "b:grappling-hook")).toBe(false);
  });

  it("laboratuvarda kurulum tek hamlede sıfırlanır, normal koşuda sıfırlanamaz", () => {
    const k = kosuBaslat(31, [], true);
    pasifSec(k, k.secenekler[0]);
    expect(testKurulumu(k, "parca", "aci-kiti")).toBe(true);
    expect(testKurulumu(k, "beceri", "b:grappling-hook")).toBe(true);
    expect(testKurulumunuSifirla(k)).toBe(true);
    expect(k.pasifler).toHaveLength(0);
    expect(k.parcalar).toHaveLength(0);
    expect(k.beceriler).toHaveLength(0);
    expect(k.govde).toBe(100);
    const normal = kosuBaslat(31, []);
    pasifSec(normal, normal.secenekler[0]);
    expect(testKurulumunuSifirla(normal)).toBe(false);
    expect(normal.pasifler).toHaveLength(1);
  });
  it("laboratuvarda uzmanlık parçası ve skill seçilir, koşu 3. bölgeye geçirilebilir", () => {
    const k = kosuBaslat(9, [], true);
    pasifSec(k, k.secenekler[0]);
    expect(testKurulumu(k, "parca", "aci-kiti")).toBe(true);
    expect(k.parcalar).toContain("aci-kiti");
    expect(testKurulumu(k, "beceri", "b:grappling-hook")).toBe(true);
    expect(k.beceriler.some((b) => b.id == "grappling-hook")).toBe(true);
    expect(testBolgeyeGec(k, 3, [])).toBe(true);
    expect(k.bolge).toBe(3);
    expect(k.kalan).toBe(90);
  });
});
