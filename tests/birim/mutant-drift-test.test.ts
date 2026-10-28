import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { driftPenceresi, driftSiniri, driftSkoru, driftYarisProfili } from "../../src/fizik/ortak";
import type { FizikBaglami, FizikGirdisi, SimDurumu, SurusKurulumu } from "../../src/fizik/tipler";
import { BOSS_SURESI, kosuBaslat, pasifSec, testKurulumu, testBolgeyeGec } from "../../src/oyun/mutant-kosu";

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
    expect(stok.giris).toBeCloseTo(guclu.giris);
    expect(stok.azami).toBeLessThan(guclu.azami);
    expect((guclu.azami * 180) / Math.PI).toBeGreaterThan(40);
    expect((stok.azami * 180) / Math.PI).toBeLessThan(40);
  });

  it("düşük stok arabada da kayma açısıyla drift açılır; yarış dışındaki davranış aynı kalır", () => {
    const d = sim();
    let spin = 0;
    const cx = { kurulum: kurulum(), olay: { spin: () => spin++ }, driftYarisi: true } as FizikBaglami;
    driftPenceresi(d, gi, cx, 14, 0.25, 0.25, driftSiniri(14), 0.14);
    expect(d.DR.on).toBe(1);
    const dis = sim();
    driftPenceresi(dis, gi, { ...cx, driftYarisi: false }, 14, 0.25, 0.25, driftSiniri(14), 0.14);
    expect(dis.DR.on).toBe(0);
    driftPenceresi(d, gi, cx, 14, 0.95, 0.95, driftSiniri(14), 0.05);
    expect(d.DR.on).toBe(0);
    expect(spin).toBe(1);
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
    expect(BOSS_SURESI(1, true)).toBe(180);
    expect(BOSS_SURESI(3, true)).toBe(240);
  });

  it("üretim koşusunda serbest parça ve skill eklenemez", () => {
    const k = kosuBaslat(7, []);
    pasifSec(k, k.secenekler[0]);
    expect(testKurulumu(k, "parca", "aci-kiti")).toBe(false);
    expect(testKurulumu(k, "beceri", "b:grappling-hook")).toBe(false);
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
    expect(k.kalan).toBe(240);
  });
});
