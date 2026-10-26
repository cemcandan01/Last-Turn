import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import {
  BOSSLAR,
  BOSS_SURESI,
  ETKINLIK_ODULU,
  HARITA_ETKINLIK,
  PASIFLER,
  bossBitti,
  bossPisti,
  bossaGir,
  etkinlikAyari,
  etkinlikBitti,
  kosuAraci,
  kosuBaslat,
  parcaAl,
  parcaFiyati,
  pasifSec,
  seviyeXp,
  zamanAkis,
  type PistAdayi,
} from "../../src/oyun/mutant-kosu";

const PISTLER: PistAdayi[] = TDEF.map((t, i) => ({ i, ty: t.t, sev: t.sev ?? t.lv }));
const basla = (t = 1) => {
  const k = kosuBaslat(t, PISTLER);
  pasifSec(k, k.secenekler[0]);
  return k;
};

describe("MUTANT koşu (A1)", () => {
  it("başlangıç: boss havuzdan, geri sayım, 3 farklı pasif, her türden etkinlik", () => {
    for (let t = 1; t <= 40; t++) {
      const k = kosuBaslat(t, PISTLER);
      expect(BOSSLAR).toContain(k.boss);
      expect(k.kalan).toBe(BOSS_SURESI(1));
      expect(k.faz).toBe("basla");
      expect(new Set(k.secenekler).size).toBe(3);
      expect(k.etkinlikler.length).toBe(HARITA_ETKINLIK);
      expect(new Set(k.etkinlikler.map((e) => e.ty))).toEqual(new Set(["gp", "rx", "rl", "dp", "dg"]));
      // aynı yere iki etkinlik konmaz
      expect(new Set(k.etkinlikler.map((e) => e.x + "," + e.z)).size).toBe(k.etkinlikler.length);
      for (const e of k.etkinlikler) expect(PISTLER[e.i].ty).toBe(e.ty);
    }
  });
  it("aynı tohum aynı boss, seçenek ve harita", () => {
    const a = kosuBaslat(42, PISTLER),
      b = kosuBaslat(42, PISTLER);
    expect(a.boss).toBe(b.boss);
    expect(a.secenekler).toEqual(b.secenekler);
    expect(a.etkinlikler).toEqual(b.etkinlikler);
  });
  it("başlangıç pasifi seçilince sürüş; seçenekte olmayan seçilemez", () => {
    const k = kosuBaslat(3, PISTLER);
    expect(pasifSec(k, "yok")).toBe(false);
    expect(pasifSec(k, k.secenekler[1])).toBe(true);
    expect(k.faz).toBe("surus");
    expect(k.pasifler.length).toBe(1);
  });
  it("geri sayım biter, boss gelir; bitmiş/boss fazında süre akmaz", () => {
    const k = basla();
    let r = null;
    for (let i = 0; i < 60 * 1000 && !r; i++) r = zamanAkis(k, 1 / 60);
    expect(r).toBe("boss");
    expect(k.kalan).toBe(0);
    bossaGir(k);
    const z = k.zaman;
    zamanAkis(k, 1);
    expect(k.zaman).toBe(z);
  });
  it("etkinlik ödülü: geçince tam, kaçırınca %40, ikinci kez ödül yok", () => {
    const k = basla(),
      [e1, e2] = k.etkinlikler,
      p0 = k.para;
    etkinlikBitti(k, e1.id, true);
    expect(k.para - p0).toBe(ETKINLIK_ODULU(e1.sev).para);
    const p1 = k.para;
    etkinlikBitti(k, e2.id, false);
    expect(k.para - p1).toBe(Math.round(ETKINLIK_ODULU(e2.sev).para * 0.4));
    expect(etkinlikBitti(k, e1.id, true)).toBeNull();
  });
  it("XP seviye atlatır, seçim gelir; birden çok seviye sırayla seçilir", () => {
    const k = basla();
    k.xp = seviyeXp(2) - 1;
    etkinlikBitti(k, k.etkinlikler[0].id, true);
    expect(k.seviye).toBeGreaterThanOrEqual(2);
    expect(k.faz).toBe("secim");
    const n = k.bekleyenSecim;
    for (let i = 0; i < n; i++) expect(pasifSec(k, k.secenekler[0])).toBe(true);
    expect(k.faz).toBe("surus");
  });
  it("pasif kademe sınırı aşılmaz", () => {
    const k = basla();
    for (let i = 0; i < 40; i++) {
      k.faz = "secim";
      k.bekleyenSecim = 1;
      k.secenekler = PASIFLER.filter((p) => k.pasifler.filter((q) => q == p.id).length < p.en).map(
        (p) => p.id,
      );
      if (!k.secenekler.length) break;
      pasifSec(k, k.secenekler[0]);
    }
    for (const p of PASIFLER) expect(k.pasifler.filter((q) => q == p.id).length).toBeLessThanOrEqual(p.en);
  });
  it("pasifler araç kopyasına işler, taban araç değişmez", () => {
    const taban = CARS[0],
      hp0 = taban.hp,
      gr0 = [...taban.gr];
    const c = kosuAraci(taban, { pasifler: ["guc", "guc", "toprak"] });
    expect(c.hp).toBeCloseTo(hp0 * 1.21, 6);
    expect(c.gr[0]).toBeCloseTo(gr0[0] * 1.1, 6);
    expect(taban.hp).toBe(hp0);
    expect(taban.gr).toEqual(gr0);
  });
  it("atölye: para yetmezse alınmaz, aynı parça iki kez alınmaz, pazarlıkçı ucuzlatır", () => {
    const k = basla();
    k.para = 100;
    expect(parcaAl(k, "x", 1)).toBe(false);
    k.para = 1000;
    expect(parcaAl(k, "x", 1)).toBe(true);
    expect(parcaAl(k, "x", 1)).toBe(false);
    expect(parcaFiyati({ pasifler: ["tuccar"] }, 2)).toBeLessThan(parcaFiyati({ pasifler: [] }, 2));
  });
  it("boss: kazanınca sonraki bölge, farklı boss, yeni süre ve harita; kaybedince koşu biter", () => {
    const k = basla(7),
      b0 = k.boss;
    bossaGir(k);
    bossBitti(k, true, PISTLER);
    expect(k.bolge).toBe(2);
    expect(k.boss).not.toBe(b0);
    expect(k.kalan).toBe(BOSS_SURESI(2));
    expect(k.etkinlikler.every((e) => !e.yapildi)).toBe(true);
    if (k.faz == "secim") while (k.faz == "secim") pasifSec(k, k.secenekler[0]);
    bossaGir(k);
    bossBitti(k, false, PISTLER);
    expect(k.faz).toBe("bitti");
  });
  it("boss pisti boss türünde ve tohumla sabit", () => {
    for (let t = 1; t <= 20; t++) {
      const k = basla(t);
      expect(PISTLER[bossPisti(k, PISTLER)].ty).toBe(k.boss.ty);
      expect(bossPisti(k, PISTLER)).toBe(bossPisti(basla(t), PISTLER));
    }
  });
  it("harita etkinliği tek tur, hedef orantılı; tursuz pist değişmez", () => {
    expect(etkinlikAyari(3, 240)).toEqual({ laps: 1, limit: 80 });
    expect(etkinlikAyari(undefined, 95)).toEqual({ laps: undefined, limit: 95 });
    expect(etkinlikAyari(1, 60)).toEqual({ laps: 1, limit: 60 });
  });
});
