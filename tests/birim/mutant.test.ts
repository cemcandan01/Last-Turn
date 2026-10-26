import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { Htest } from "../../src/dunya/corak";
import { DRIFT_TUR, yildizEsikleri } from "../../src/oyun/yildiz";
import { MUTANT_REFERANS } from "../../src/oyun/mutant-denge";
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
  GUC_UST,
  GOVDE,
  hasarAl,
  tamirBedeli,
  tamirEt,
  SATILMAZ,
  bossAdaylari,
  tekYolYetmez,
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
        ref: d
          ? { stok: 1000, dengeli: 1500, uzman: 2000, nadir: 2500, birlesik: 3000 }
          : { stok: 100, dengeli: 90, uzman: 80, nadir: 75, birlesik: 70 },
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
        const r = p.ref!,
          d = p.ty == "dp",
          ref =
            bolge == 1
              ? r.stok
              : bolge == 2
                ? d
                  ? Math.max(r.dengeli, r.uzman)
                  : Math.min(r.dengeli, r.uzman)
                : r.birlesik,
          tam = ref * (p.laps ?? 1),
          pay = BOSS_PAY[bolge - 1],
          h = bossHedefi(k, p);
        if (d) expect(h).toBe(Math.round(tam / pay));
        else expect(h).toBeCloseTo(tam * pay, 6);
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

describe("MUTANT Mutasyon V2: kural pasifleri ve kombinasyon sınırları", () => {
  /** 1-3 pasiflik bütün çoklu kümeler (kademe sınırıyla) */
  function kumeler(): string[][] {
    const r: string[][] = [];
    const ids = PASIFLER.flatMap((p) => Array.from({ length: p.en }, () => p.id));
    const yol = (bas: number, acc: string[]) => {
      if (acc.length) r.push(acc);
      if (acc.length == 3) return;
      for (let i = bas; i < ids.length; i++)
        if (i == bas || ids[i] != ids[i - 1]) yol(i + 1, [...acc, ids[i]]);
    };
    yol(0, []);
    return r;
  }
  const KUMELER = kumeler();
  it("kombinasyon sayısı makul ve her küme kademe sınırına uyar", () => {
    expect(KUMELER.length).toBeGreaterThan(400);
    for (const k of KUMELER)
      for (const p of PASIFLER) expect(k.filter((q) => q == p.id).length).toBeLessThanOrEqual(p.en);
  });
  it("güç: hiçbir kombinasyon ve gövde düzeyinde pasif gücü GUC_UST'ü aşmaz", () => {
    const c = CARS[0];
    for (const pasifler of KUMELER)
      for (const govde of [100, 49, 1]) {
        const hp = kosuAraci(c, { pasifler, govde }).hp;
        expect(hp / c.hp, pasifler.join("+")).toBeLessThanOrEqual(GUC_UST + 1e-9);
        expect(hp).toBeGreaterThan(0);
      }
  });
  it("hurdacı: bilerek çarpıp tamir etmek hiçbir kombinasyonda para kazandırmaz", () => {
    for (const pasifler of KUMELER.filter((k) => k.includes("hurdaci"))) {
      const k = basla();
      k.pasifler = [...pasifler];
      k.para = 1000;
      for (let i = 0; i < 30 && k.faz != "bitti"; i++) {
        hasarAl(k, "carpma");
        tamirEt(k);
      }
      expect(k.para, pasifler.join("+")).toBeLessThanOrEqual(1000);
    }
  });
  it("son nefes: her bölgede bir kez +90 sn ve boss hedefi %3 sıkı; sonsuz süre yok", () => {
    const k = basla();
    k.pasifler.push("sonnefes");
    let toplam = 0;
    for (let i = 0; i < 60 * 1200; i++) {
      toplam += 1 / 60;
      if (zamanAkis(k, 1 / 60) == "boss") break;
    }
    expect(toplam).toBeCloseTo(BOSS_SURESI(1) + 90, 0);
    const p = {
      ty: "gp" as const,
      ys: [100, 90, 80],
      ref: { stok: 100, dengeli: 90, uzman: 80, nadir: 75, birlesik: 70 },
    };
    expect(bossHedefi(k, p)).toBeCloseTo(100 * BOSS_PAY[0] * 0.97, 6);
  });
  it("kumarbaz: ölümcülde ×5 ödül, kaçırınca iki kat süre cezası", () => {
    const k = basla();
    k.pasifler.push("kumarbaz");
    const [e1, e2] = k.etkinlikler,
      p0 = k.para;
    etkinlikBitti(k, e1.id, true, 2);
    expect(k.para - p0).toBe(Math.round(ETKINLIK_ODULU(e1.sev).para * 5));
    const t = k.kalan;
    etkinlikBitti(k, e2.id, false, 2);
    expect(t - k.kalan).toBe(RISKLER[2].ceza * 2);
  });
  it("etkisiz kural pasifi yok: her biri en az bir durumda sonucu değiştirir", () => {
    const c = CARS[0];
    expect(kosuAraci(c, { pasifler: ["camtop"] }).hp).toBeGreaterThan(c.hp);
    expect(kosuAraci(c, { pasifler: ["adrenalin"], govde: 40 }).hp).toBeGreaterThan(
      kosuAraci(c, { pasifler: [], govde: 40 }).hp,
    );
    const h = basla();
    h.pasifler.push("hurdaci");
    const p = h.para;
    hasarAl(h, "carpma");
    expect(h.para).toBeGreaterThan(p);
    const ct = basla();
    ct.pasifler.push("camtop");
    hasarAl(ct, "carpma");
    expect(ct.govde).toBe(GOVDE.tam - 2 * GOVDE.carpma);
  });
  it("ölçülmüş tablo: bölge 1'i stok, bölge 3'ü birleşik build geçer; bölge 3 adaylarında tek yol yetmez", () => {
    const olculen = PISTLER.map((p) => ({ ...p, ref: MUTANT_REFERANS[p.ty + "_" + TDEF[p.i].lv] }));
    expect(olculen.filter((p) => p.ref).length).toBeGreaterThanOrEqual(25);
    const k = basla();
    for (const p of olculen.filter((q) => q.ref)) {
      const r = p.ref!,
        tur = p.laps ?? 1,
        d = p.ty == "dp",
        ad = p.ty + "_" + TDEF[p.i].lv,
        gecer = (sonuc: number, hedef: number) => (d ? sonuc * tur >= hedef : sonuc * tur <= hedef);
      k.bolge = 1;
      expect(gecer(r.stok, bossHedefi(k, p)), ad + " bölge 1 stok").toBe(true);
      k.bolge = 3;
      expect(gecer(r.birlesik, bossHedefi(k, p)), ad + " bölge 3 birleşik").toBe(true);
    }
    // bölge 3 adayları: tek yolun yetmediği pistler; rallikrosta böylesi yok (açık risk, kartta)
    for (const ty of ["gp", "dp", "dg", "rl"] as const) {
      const aday = bossAdaylari(ty, 3, olculen);
      expect(aday.length, ty).toBeGreaterThan(0);
      for (const p of aday) expect(tekYolYetmez(ty, p.ref!), ty + "_" + TDEF[p.i].lv).toBe(true);
    }
    expect(bossAdaylari("rx", 3, olculen).length).toBeGreaterThan(0);
  });
});
