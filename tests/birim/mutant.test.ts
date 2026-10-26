import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { Htest } from "../../src/dunya/corak";
import { DRIFT_TUR, yildizEsikleri } from "../../src/oyun/yildiz";
import {
  BOSSLAR,
  YERLER,
  ATOLYE,
  BOSS_SURESI,
  ETKINLIK_ODULU,
  HARITA_ETKINLIK,
  PASIFLER,
  bossBitti,
  bossPisti,
  bossaGir,
  BOSS_PAY,
  GOVDE,
  hasarAl,
  tamirBedeli,
  tamirEt,
  SATILMAZ,
  bossAdaylari,
  NADIR_PARCALAR,
  RISKLER,
  bossHedefi,
  etkinlikHedefi,
  stokDiz,
  stokYenile,
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

const TUR = { gp: 3, rx: 3, dp: DRIFT_TUR, rl: undefined, dg: undefined } as const;
const PISTLER: PistAdayi[] = TDEF.map((t, i) => ({
  i,
  ty: t.t,
  sev: t.sev ?? t.lv,
  ys: yildizEsikleri(t.t, t.lv),
  laps: TUR[t.t],
}));
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
  it("risk kademesi: güvenli geçince ×1, kaçırınca %30; riskli/ölümcül ×2/×3,5, kaçırınca ödülsüz ve süre cezası", () => {
    const k = basla(),
      [e1, e2, e3, e4] = k.etkinlikler,
      O = (e: typeof e1) => ETKINLIK_ODULU(e.sev).para;
    let p = k.para;
    etkinlikBitti(k, e1.id, true, 0);
    expect(k.para - p).toBe(O(e1));
    p = k.para;
    etkinlikBitti(k, e2.id, false, 0);
    expect(k.para - p).toBe(Math.round(O(e2) * 0.3));
    p = k.para;
    etkinlikBitti(k, e3.id, true, 2);
    expect(k.para - p).toBe(Math.round(O(e3) * 3.5));
    p = k.para;
    const t = k.kalan,
      r = etkinlikBitti(k, e4.id, false, 1)!;
    expect(k.para).toBe(p);
    expect(t - k.kalan).toBe(RISKLER[1].ceza);
    expect(r.ceza).toBe(RISKLER[1].ceza);
    expect(etkinlikBitti(k, e1.id, true)).toBeNull();
  });
  it("etkinlik hedefi: seçilen kademenin yıldızı, tek tur (tur başına); tursuz pistte tam", () => {
    for (const p of PISTLER) {
      const tur = p.laps ?? 1;
      for (const r of [0, 1, 2] as const) {
        const h = etkinlikHedefi(p, r);
        expect(h.limit).toBeCloseTo(p.ys[r] / tur, p.ty == "dp" ? -1 : 6);
        if (p.laps) expect(h.laps).toBe(1);
      }
      // kademe zorlaşır: süre kısalır, drift puanı artar
      const [a, b, c] = [0, 1, 2].map((r) => etkinlikHedefi(p, r as 0 | 1 | 2).limit);
      if (p.ty == "dp") expect(a <= b && b <= c).toBe(true);
      else expect(a >= b && b >= c).toBe(true);
    }
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
  it("atölye: yalnız stoktaki parça, para yetmezse alınmaz, aynı parça iki kez alınmaz, pazarlıkçı ucuzlatır", () => {
    const k = basla(),
      id = k.stok[0];
    k.para = 10;
    expect(parcaAl(k, id, 1)).toBe(false);
    k.para = 2000;
    expect(parcaAl(k, "stokta-yok", 1)).toBe(false);
    expect(parcaAl(k, id, 1)).toBe(true);
    expect(k.stok).not.toContain(id);
    expect(parcaAl(k, id, 1)).toBe(false);
    expect(parcaFiyati({ pasifler: ["tuccar"] }, 2)).toBeLessThan(parcaFiyati({ pasifler: [] }, 2));
    expect(parcaFiyati({ pasifler: [] }, 3, "turbo-buyuk")).toBeGreaterThan(parcaFiyati({ pasifler: [] }, 3));
  });
  it("atölye stoğu: bölge 1'de nadir parça yok, sonra en çok bir; yenileme para ister", () => {
    for (let t = 1; t <= 60; t++) {
      const k = basla(t);
      expect(k.stok.length).toBe(5);
      expect(k.stok.some((id) => NADIR_PARCALAR.includes(id))).toBe(false);
      k.bolge = 2;
      stokDiz(k);
      expect(k.stok.filter((id) => NADIR_PARCALAR.includes(id)).length).toBeLessThanOrEqual(1);
      k.para = 0;
      expect(stokYenile(k)).toBe(false);
    }
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
  it("boss pisti yalnız ölçülmüş pistlerden (bölge 1'de kolay yarı), tohumla sabit; hedef bölgenin referans kademesi", () => {
    // her türün ilk 4 pisti ölçülmüş say: stok > dengeli > uzman (süre), driftte tersi
    const say: Record<string, number> = {};
    const olculen = PISTLER.map((p) => {
      say[p.ty] = (say[p.ty] ?? 0) + 1;
      if (say[p.ty] > 4) return p;
      const d = p.ty == "dp";
      return {
        ...p,
        ref: d ? { stok: 1000, dengeli: 1500, uzman: 2000 } : { stok: 100, dengeli: 90, uzman: 80 },
      };
    });
    for (let t = 1; t <= 30; t++)
      for (const bolge of [1, 2, 3]) {
        const k = basla(t);
        k.bolge = bolge;
        const i = bossPisti(k, olculen),
          p = olculen[i],
          aday = bossAdaylari(k.boss.ty, bolge, olculen);
        expect(p.ty).toBe(k.boss.ty);
        expect(p.ref).toBeTruthy();
        expect(aday.map((q) => q.i)).toContain(i);
        if (bolge == 1) expect(aday.length).toBeLessThanOrEqual(2);
        expect(bossPisti(k, olculen)).toBe(i);
        const kademe = bolge == 1 ? "stok" : bolge == 2 ? "dengeli" : "uzman",
          pay = BOSS_PAY[bolge - 1],
          h = bossHedefi(k, p);
        if (p.ty == "dp") expect(h).toBe(Math.round(p.ref![kademe] / pay));
        else expect(h).toBeCloseTo(p.ref![kademe] * pay, 6);
      }
  });
  it("motor değişimi MUTANT atölyesinde hiç satılmaz", () => {
    expect(SATILMAZ).toContain("motor-degisim");
    for (let t = 1; t <= 40; t++) {
      const k = basla(t);
      for (const b of [1, 2, 3]) {
        k.bolge = b;
        stokDiz(k);
        expect(k.stok).not.toContain("motor-degisim");
      }
    }
  });
  it("etkinlik ve atölye yerleri düz: 12 m çevrede eğim %8'den az (araç kaymadan durabilir)", () => {
    for (const [x, z] of [...YERLER, ATOLYE])
      for (const [dx, dz] of [
        [12, 0],
        [0, 12],
        [-12, 0],
        [0, -12],
      ])
        expect(Math.abs(Htest(x + dx, z + dz) - Htest(x, z)) / 12, x + "," + z).toBeLessThan(0.08);
  });
  it("gövde: çarpma/spin düşürür, zırh azaltır, düşük gövde gücü en çok %30 düşürür, 0'da pert ve koşu biter", () => {
    const k = basla();
    hasarAl(k, "carpma");
    hasarAl(k, "spin");
    expect(k.govde).toBe(GOVDE.tam - GOVDE.carpma - GOVDE.spin);
    expect([k.carpma, k.spin]).toEqual([1, 1]);
    const z = basla();
    z.pasifler.push("zirh");
    hasarAl(z, "carpma");
    expect(z.govde).toBeCloseTo(GOVDE.tam - GOVDE.carpma * 0.65, 6);
    const c = CARS[0];
    expect(kosuAraci(c, { pasifler: [], govde: 100 }).hp).toBeCloseTo(c.hp, 6);
    expect(kosuAraci(c, { pasifler: [], govde: 0 }).hp).toBeCloseTo(c.hp * 0.7, 6);
    let pert = false;
    for (let i = 0; i < 20 && !pert; i++) pert = hasarAl(k, "carpma");
    expect(pert).toBe(true);
    expect(k.faz).toBe("bitti");
    expect(hasarAl(k, "carpma")).toBe(false);
  });
  it("tamir: bedel kayıp gövdeyle orantılı, para yettiği kadar", () => {
    const k = basla();
    k.govde = 40;
    expect(tamirBedeli(k)).toBe(60 * GOVDE.tamirFiyati);
    k.para = 30;
    expect(tamirEt(k)).toBe(true);
    expect(k.govde).toBe(50);
    expect(k.para).toBe(0);
    k.para = 10000;
    tamirEt(k);
    expect(k.govde).toBe(GOVDE.tam);
    expect(tamirEt(k)).toBe(false);
  });
  it("seyyar tamirci her etkinlik sonunda gövdeyi onarır", () => {
    const k = basla();
    k.pasifler.push("tamirci");
    k.govde = 50;
    etkinlikBitti(k, k.etkinlikler[0].id, true, 0);
    expect(k.govde).toBe(62);
  });
});
