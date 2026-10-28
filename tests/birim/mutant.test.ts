import { describe, expect, it } from "vitest";
import { CARS } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { Htest } from "../../src/dunya/corak";
import { DRIFT_TUR, yildizEsikleri } from "../../src/oyun/yildiz";
import { MUTANT_REFERANS, MUTANT_REFERANS_YAGMUR } from "../../src/oyun/mutant-denge";
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
  enerjiAdimi,
  nitroDurumu,
  EKLENTILER,
  LANETLER,
  SANDIK_SAYISI,
  sandikAc,
  sandikTeklifi,
  sandikReddet,
  pistReferansi,
  takiliMekanikler,
  type Kosu,
  type PistAdayi,
} from "../../src/oyun/mutant-kosu";
import { gucCarpani, kapasiteUygula } from "../../src/cekirdek/mekanikler";
import { BASLANGIC_ENERJI, NITRO } from "../../src/oyun/mutant-enerji";

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

/** sahte sürüş anı: düz giden araç (drift yok) */
const SURUS = {
  S: { vx: 0, vz: 20, air: false },
  DR: { on: false, dir: 0, cool: 0 },
  D: { beta: 0 },
} as unknown as Parameters<typeof enerjiAdimi>[1];
const perkli = (...pasifler: string[]) => {
  const k = basla();
  k.pasifler = pasifler;
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
  return k;
};
/** n sabit adım sür (nitro: hangi adımlarda basıldı); güç değişen adımları döndürür */
const sur = (k: Kosu, n: number, nitro: (i: number) => boolean = () => false) => {
  const degisen: number[] = [];
  for (let i = 0; i < n; i++) if (enerjiAdimi(k, SURUS, 1 / 60, nitro(i))) degisen.push(i);
  return degisen;
};

describe("MUTANT A2: nitro ve sistemik güçler", () => {
  it("nitro: başlangıç enerjisiyle bir kez çalışır, gücü 2,5 sn artırır, sonra söner ve soğur", () => {
    const k = perkli();
    expect(k.mek.enerji).toBe(BASLANGIC_ENERJI);
    expect(nitroDurumu(k).hazir).toBe(true);
    const taban = CARS[0],
      once = kosuAraci(taban, k).hp;
    const degisen = sur(k, 1, () => true);
    expect(degisen).toEqual([0]);
    expect(gucCarpani(k.mek)).toBeCloseTo(NITRO.etki!.guc!, 6);
    expect(kosuAraci(taban, k).hp).toBeCloseTo(once * NITRO.etki!.guc!, 6);
    expect(k.mek.enerji).toBe(BASLANGIC_ENERJI - NITRO.maliyet);
    expect(nitroDurumu(k).acik).toBe(true);
    // 2,5 sn sonra söner (tek değişim), basmak enerji olmadan bir şey yapmaz
    const sonra = sur(k, 200, () => true);
    expect(sonra.length).toBe(1);
    expect(sonra[0]).toBeGreaterThanOrEqual(147);
    expect(sonra[0]).toBeLessThanOrEqual(150);
    expect(gucCarpani(k.mek)).toBe(1);
    expect(kosuAraci(taban, k).hp).toBeCloseTo(once, 6);
    expect(nitroDurumu(k).hazir).toBe(false);
  });
  it("nitro soğuması: enerji olsa da etki bitince 4 sn yeniden çalışmaz", () => {
    const k = perkli("risk-kondansatoru");
    k.bekleyenRisk = 2;
    sur(k, 1);
    expect(k.mek.enerji).toBe(80);
    const degisen = sur(k, 60 * 8, () => true);
    // aç (0) → sön (~150) → soğuma 4 sn → yeniden aç (~390)
    expect(degisen.length).toBe(3);
    expect(degisen[2] - degisen[1]).toBeGreaterThanOrEqual(239);
    expect(degisen[2] - degisen[1]).toBeLessThanOrEqual(241);
  });
  it("Çarpışma Pili: her hasar +12 enerji; perk yoksa hasar enerji vermez", () => {
    for (const [pasif, beklenen] of [
      ["carpisma-pili", 12],
      ["zirh", 0],
    ] as const) {
      const k = perkli(pasif);
      k.mek = { ...k.mek, enerji: 0 };
      hasarAl(k, "carpma");
      sur(k, 1);
      expect(k.mek.enerji, pasif).toBe(beklenen);
      hasarAl(k, "spin");
      sur(k, 1);
      expect(k.mek.enerji, pasif).toBe(beklenen * 2);
    }
  });
  it("Risk Kondansatörü: yalnız riskli/ölümcül etkinlik başında +40, kapasiteyi aşmaz", () => {
    const k = perkli("risk-kondansatoru");
    k.mek = { ...k.mek, enerji: 0 };
    k.bekleyenRisk = 0;
    sur(k, 1);
    expect(k.mek.enerji).toBe(0);
    for (const r of [1, 2, 2]) {
      k.bekleyenRisk = r;
      sur(k, 1);
    }
    expect(k.mek.enerji).toBe(k.mek.kapasite);
    expect(k.bekleyenRisk).toBeNull();
  });
  it("Nitro kalkanı: nitro açıkken hasar yarıya iner, kapalıyken tam", () => {
    const k = perkli("nitro-kalkani");
    hasarAl(k, "carpma");
    expect(k.govde).toBe(GOVDE.tam - GOVDE.carpma);
    sur(k, 1, () => true);
    hasarAl(k, "carpma");
    expect(k.govde).toBe(GOVDE.tam - GOVDE.carpma * 1.5);
  });
  it("verimli/sert nitro maliyeti tuş durumuna yansır; aynı girdiler aynı sonucu verir (belirlenimci)", () => {
    expect(nitroDurumu(perkli("verimli-nitro")).maliyet).toBeCloseTo(28, 6);
    expect(nitroDurumu(perkli("sert-nitro")).maliyet).toBeCloseTo(52, 6);
    expect(nitroDurumu(perkli("sert-nitro")).hazir).toBe(false);
    const a = perkli("carpisma-pili", "uzun-nitro"),
      b = perkli("carpisma-pili", "uzun-nitro");
    for (const k of [a, b])
      for (let i = 0; i < 600; i++) {
        if (i % 97 == 0) hasarAl(k, "carpma");
        enerjiAdimi(k, SURUS, 1 / 60, i % 50 == 0);
      }
    expect(a.mek).toEqual(b.mek);
    expect(a.govde).toBe(b.govde);
  });
  it("kariyer/ölçüm yalıtımı: koşu durumu (mek) olmadan araç değerleri nitrodan etkilenmez", () => {
    const k = perkli();
    sur(k, 1, () => true);
    expect(gucCarpani(k.mek)).toBeGreaterThan(1);
    expect(kosuAraci(CARS[0], { pasifler: [] }).hp).toBe(CARS[0].hp);
  });
});

describe("MUTANT A2: eklenti sandıkları", () => {
  it("her bölgede 2 normal + 1 lanetli sandık, etkinliklerden ayrı düz yerde; tohumla aynı", () => {
    for (let t = 1; t <= 40; t++) {
      const k = basla(t);
      expect(k.sandiklar.length).toBe(SANDIK_SAYISI);
      const [a, b, c] = k.sandiklar;
      for (const q of [a, b]) {
        expect(q.lanetli).toBe(false);
        expect(q.lanet).toBeNull();
        expect(q.secenekler).toEqual([]);
        expect(q.incelendi).toBe(false);
      }
      expect(c.lanetli).toBe(true);
      expect(Object.keys(LANETLER)).toContain(c.lanet);
      expect(c.secenekler).toEqual([]);
      expect(c.incelendi).toBe(false);
      const yerler = [...k.etkinlikler, ...k.sandiklar].map((q) => q.x + "," + q.z);
      expect(new Set(yerler).size).toBe(yerler.length);
      for (const q of k.sandiklar) expect(YERLER.some(([x, z]) => x == q.x && z == q.z)).toBe(true);
      expect(basla(t).sandiklar).toEqual(k.sandiklar);
    }
  });
  it("normal sandık: seçilen eklenti koşuda kalır, sandık bir kez açılır; seviye seçiminde eklenti çıkmaz", () => {
    const k = basla(3),
      q = k.sandiklar[0],
      e = sandikTeklifi(k, q.id)!;
    expect(sandikAc(k, q.id, "olmayan")).toBe(false);
    const para = k.para,
      kalan = k.kalan,
      govde = k.govde;
    expect(sandikAc(k, q.id, e)).toBe(true);
    expect(k.pasifler).toContain(e);
    expect([k.para, k.kalan, k.govde]).toEqual([para, kalan, govde]);
    expect(sandikAc(k, q.id, e)).toBe(false);
    for (let t = 1; t <= 30; t++) expect(basla(t).secenekler.some((id) => id.startsWith("ek-"))).toBe(false);
    expect(PASIFLER.some((p) => p.id.startsWith("ek-"))).toBe(false);
  });
  it("lanetli sandık: nadir eklenti + bedel hemen (süre −45, gövde −25 pert etmez, para yarı)", () => {
    for (const lanet of ["sure", "govde", "para"] as const) {
      const k = basla(5),
        q = k.sandiklar[2];
      q.lanet = lanet;
      k.govde = 20;
      k.para = 301;
      const kalan = k.kalan;
      expect(sandikAc(k, q.id, sandikTeklifi(k, q.id)!)).toBe(true);
      if (lanet == "sure") expect(k.kalan).toBe(kalan - 45);
      if (lanet == "govde") expect([k.govde, k.pert]).toEqual([1, false]);
      if (lanet == "para") expect(k.para).toBe(150);
    }
  });
  it("eklentiler sözleşmeye katılır: yedek tüp kapasite/enerji, çift ateşleme maliyet, tampon yalnız çarpma", () => {
    const k = basla();
    sandikTeklifi(k, 0);
    k.sandiklar[0].secenekler = ["ek-yedek-tup"];
    sandikAc(k, 0, "ek-yedek-tup");
    expect([k.mek.kapasite, k.mek.enerji]).toEqual([130, BASLANGIC_ENERJI + 30]);
    sandikTeklifi(k, 2);
    k.sandiklar[2].secenekler = ["ek-cift-atesleme"];
    sandikAc(k, 2, "ek-cift-atesleme");
    expect(nitroDurumu(k).maliyet).toBeCloseTo(NITRO.maliyet * 0.6, 6);
    sandikTeklifi(k, 1);
    k.sandiklar[1].secenekler = ["ek-takviye-tampon"];
    const g = k.govde;
    sandikAc(k, 1, "ek-takviye-tampon");
    hasarAl(k, "carpma");
    expect(g - k.govde).toBeCloseTo(GOVDE.carpma * 0.6, 6);
    const g2 = k.govde;
    hasarAl(k, "spin");
    expect(g2 - k.govde).toBeCloseTo(GOVDE.spin, 6);
  });
  it("sandığı reddetmek ganimeti tüketir; ilk açılan ödül sayfa yeniden açılsa da değişmez", () => {
    const k = basla(23),
      q = k.sandiklar[0];
    const e = sandikTeklifi(k, q.id);
    expect(e).toBeTruthy();
    expect(sandikTeklifi(k, q.id)).toBe(e);
    expect(q.secenekler).toHaveLength(1);
    expect(sandikReddet(k, q.id)).toBe(true);
    expect(sandikTeklifi(k, q.id)).toBeNull();
    expect(sandikAc(k, q.id, e!)).toBe(false);
  });
  it("farklı sandıklarda alınmış eklenti tekrarlanmaz", () => {
    for (let tohum = 1; tohum <= 40; tohum++) {
      const k = basla(tohum);
      const bir = sandikTeklifi(k, 0)!;
      expect(sandikAc(k, 0, bir)).toBe(true);
      const iki = sandikTeklifi(k, 1);
      expect(iki).not.toBe(bir);
    }
  });
  it("iki sandığı ödül almadan önce açınca da çakışma olmaz (tohum matrisi)", () => {
    for (let tohum = 1; tohum <= 80; tohum++) {
      const k = basla(tohum);
      const bir = sandikTeklifi(k, 0)!;
      const iki = sandikTeklifi(k, 1)!;
      expect(iki, "tohum " + tohum).not.toBe(bir);
      expect(sandikTeklifi(k, 0)).toBe(bir);
      expect(sandikTeklifi(k, 1)).toBe(iki);
      expect(sandikAc(k, 1, iki)).toBe(true);
      expect(sandikAc(k, 0, bir)).toBe(true);
    }
  });
  it("eklenti havuzu bitse de sandık kaynak ödülü sunar ve gerçekten verir", () => {
    const k = basla(19);
    k.pasifler.push(...EKLENTILER.filter((e) => !e.nadir).map((e) => e.id));
    k.govde = 35;
    k.mek.enerji = 1;
    const eski = { para: k.para, govde: k.govde, enerji: k.mek.enerji };
    const teklif = sandikTeklifi(k, 0)!;
    expect(["sandik-para", "sandik-tamir", "sandik-enerji"]).toContain(teklif);
    expect(sandikAc(k, 0, teklif)).toBe(true);
    expect(k.sandiklar[0].acildi).toBe(true);
    expect(k.para > eski.para || k.govde > eski.govde || k.mek.enerji > eski.enerji).toBe(true);
  });
  it("boss sonrası yeni sandıklar; sahip olunan eklenti yeniden çıkmaz", () => {
    const k = basla(9),
      e = sandikTeklifi(k, 2)!;
    sandikAc(k, 2, e);
    bossaGir(k);
    bossBitti(k, true, PISTLER);
    expect(k.sandiklar.length).toBe(SANDIK_SAYISI);
    expect(k.sandiklar.every((q) => !q.acildi)).toBe(true);
    expect(k.sandiklar.map((q) => sandikTeklifi(k, q.id))).not.toContain(e);
  });
});

describe("MUTANT A2: yağmurlu boss referansı", () => {
  it("yağmurlu boss yağmur referansını, güneşli boss güneş referansını kullanır; yağmur ölçümü yoksa güneşe düşer", () => {
    const ref = { stok: 100, dengeli: 95, uzman: 94, nadir: 93, birlesik: 90 },
      refYagmur = { stok: 120, dengeli: 112, uzman: 110, nadir: 111, birlesik: 105 },
      p = { ty: "rx" as const, ys: [400, 350, 300], laps: 3, ref, refYagmur },
      camur = BOSSLAR.find((b) => b.hava == "rain")!,
      gunes = BOSSLAR.find((b) => !b.hava && b.ty != "dp")!;
    expect(pistReferansi(p, "rain")).toBe(refYagmur);
    expect(pistReferansi({ ref }, "rain")).toBe(ref);
    expect(bossHedefi({ bolge: 1, boss: camur }, p)).toBeCloseTo(120 * 3 * camur.hedef * BOSS_PAY[0], 6);
    expect(bossHedefi({ bolge: 1, boss: gunes }, p)).toBeCloseTo(100 * 3 * gunes.hedef * BOSS_PAY[0], 6);
  });
  it("yağmurlu boss yalnız yağmurda ölçülen pistlerden; ölçülmüş yağmur referansı bölge 3'e kadar geçilir", () => {
    const pistler = PISTLER.map((p) => ({
      ...p,
      ref: MUTANT_REFERANS[p.ty + "_" + TDEF[p.i].lv],
      refYagmur: MUTANT_REFERANS_YAGMUR[p.ty + "_" + TDEF[p.i].lv],
    }));
    for (const b of [1, 2, 3]) {
      const aday = bossAdaylari("rx", b, pistler, "rain");
      expect(aday.length).toBeGreaterThan(0);
      for (const p of aday) expect(p.refYagmur).toBeDefined();
    }
    // güneşli rallikros boss'u yağmur tablosundan etkilenmez
    expect(bossAdaylari("rx", 2, pistler).length).toBe(pistler.filter((p) => p.ty == "rx" && p.ref).length);
  });
});
