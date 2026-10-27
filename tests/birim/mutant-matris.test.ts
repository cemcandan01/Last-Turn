// MUTANT kombinasyon matrisi: bütün 1'li, 2'li ve 3'lü perk + eklenti kombinasyonları altı sürüş/oyuncu biçiminde, nitroyu her fırsatta
// kullanan (en kötü durum) oyuncuyla koşulur. Kırılma (sınır dışı enerji, kesilen olay, kalıcı tutuş, etkisiz perk)
// hatadır. Sinerji (kombinasyonun parçalarının toplamından iyi olması) hata değildir: rapora yazılır, oyuncu keşfeder.
// Rapor: tests/cikti/mutant-matris.json
import { mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  GUC_ETKI_UST,
  TUTUS_UST,
  gucCarpani,
  driftGozlemcisi,
  driftGozlemiBaslat,
  kapasiteUygula,
  mekanikAdimi,
  mekanikBaslat,
  parametreler,
  tutusCarpani,
  type GirisOlayi,
  type MekanikTanim,
} from "../../src/cekirdek/mekanikler";
import { EKLENTI_PERKLERI, NITRO, PERKLER as YALNIZ_PERKLER } from "../../src/oyun/mutant-enerji";

/** sözleşme: seviye perkleri ve sandık eklentileri aynı kurallarla birlikte denenir */
const PERKLER = [...YALNIZ_PERKLER, ...EKLENTI_PERKLERI];

const DT = 1 / 60,
  SURE = 40;
type Durum = Parameters<typeof driftGozlemcisi>[1];

/** sürüş biçimi: adım → (drift açık mı, hız, spin soğuması) */
const BICIMLER: Record<string, (i: number) => [boolean, number, number]> = {
  // 1,8 sn temiz drift + 0,6 sn ara
  usta: (i) => [i % 144 < 108, 20, 0],
  // 1,2 sn drift, hep spinle biter
  abartan: (i) => [i % 120 < 72, 20, i % 120 >= 72 ? 1.2 : 0],
  // düzlükte 108 km/sa
  hizci: () => [false, 30, 0],
  // 4 sn hız, 4 sn temiz drift
  karisik: (i) => (i % 480 < 240 ? [false, 30, 0] : [i % 120 < 90, 22, 0]),
  // çarpışmacı: 3 sn'de bir sert çarpma (HasarAlindi), arada hız
  carpisan: () => [false, 26, 0],
  // biriktiren oyuncu: karışık sürüş, nitroyu yalnız depo neredeyse doluyken kullanır (düzlüğe saklar)
  biriktiren: (i) => (i % 480 < 240 ? [false, 30, 0] : [i % 120 < 90, 22, 0]),
  // savaşçı (LT-SYS-004 skill olayları): 0,5 sn'de bir 4 hasar verir, 4 sn takip / 6 sn serbest, 3 sn'de bir
  // hayalet fazı 12 hasarı engeller
  savasci: () => [false, 26, 0],
};

interface Sonuc {
  kazanc: number;
  darbe: number;
  darbePayi: number;
  enerjiMax: number;
  kesilen: number;
  yanan: number;
  /** koşu boyunca ortalama nitro güç çarpanı (güç perkleri bununla görünür) */
  gucOrt: number;
  /** sınır ihlali (sonlu değil, negatif, kapasite üstü enerji ya da tutuş üst sınırı aşıldı) */
  bozuk: string;
}

function kos(perkler: MekanikTanim[], bicim: (i: number) => [boolean, number, number]): Sonuc {
  const takili = [NITRO, ...perkler];
  let m = kapasiteUygula(mekanikBaslat(), takili),
    g = driftGozlemiBaslat(),
    enerjiMax = 0,
    bozuk = "",
    gucToplam = 0;
  const d = { S: { vx: 0, vz: 0, air: false }, DR: { on: 0, dir: 1, cool: 0 }, D: { act: 0, beta: 0 } };
  for (let i = 0; i < SURE / DT; i++) {
    const [on, hiz, cool] = bicim(i);
    d.S.vz = hiz;
    d.DR.on = on ? 1 : 0;
    d.DR.cool = cool;
    d.D.beta = on ? 0.5 : 0;
    const r = driftGozlemcisi(g, d as unknown as Durum, DT, true);
    g = r.g;
    const olaylar: GirisOlayi[] = r.olaylar;
    // ortak olaylar: koşu riskli etkinlikle başlar; çarpışmacı biçimde 3 sn'de bir hasar
    if (i == 0) {
      olaylar.push({ tur: "RiskBasladi", sira: g.sira, risk: 1 });
      g = { ...g, sira: g.sira + 1 };
    }
    if (bicim === BICIMLER.savasci) {
      const ekle = (o: GirisOlayi) => {
        olaylar.push({ ...o, sira: g.sira });
        g = { ...g, sira: g.sira + 1 };
      };
      if (i % 30 == 0)
        ekle({
          tur: "HasarVerildi",
          sira: 0,
          hedef: "rakip",
          miktar: 4,
          hasar: "ates",
          kaynak: "risk-taker",
        });
      if (i % 600 < 240) ekle({ tur: "YakinTakip", sira: 0, hedef: "rakip", dt: DT, mesafe: 8 });
      if (i % 180 == 45) ekle({ tur: "KorumaEngelledi", sira: 0, miktar: 12, kaynak: "carpma" });
    }
    if (bicim === BICIMLER.carpisan && i % 180 == 90) {
      olaylar.push({ tur: "HasarAlindi", sira: g.sira, hasar: "carpma", miktar: 12 });
      g = { ...g, sira: g.sira + 1 };
    }
    // açgözlü oyuncu enerji yettiği her an nitroya basar; biriktiren depo dolunca
    if (
      m.enerji >= NITRO.maliyet * parametreler(takili).maliyet &&
      (bicim !== BICIMLER.biriktiren || m.enerji >= m.kapasite * 0.95)
    ) {
      olaylar.push({ tur: "AbilityActivated", sira: g.sira, yetenek: NITRO.id });
      g = { ...g, sira: g.sira + 1 };
    }
    m = mekanikAdimi(m, olaylar, takili, true, DT);
    // adım başına expect yavaş: ilk ihlal kaydedilir, testte bir kez denetlenir
    if (
      !bozuk &&
      (!Number.isFinite(m.enerji) ||
        m.enerji < 0 ||
        m.enerji > m.kapasite + 1e-9 ||
        tutusCarpani(m) > TUTUS_UST + 1e-12 ||
        gucCarpani(m) > GUC_ETKI_UST + 1e-12)
    )
      bozuk = "adım " + i + " enerji " + m.enerji + "/" + m.kapasite;
    enerjiMax = Math.max(enerjiMax, m.enerji);
    gucToplam += gucCarpani(m);
  }
  const kazanc = Object.entries(m.telemetri)
    .filter(([id]) => id != NITRO.id)
    .reduce((a, [, t]) => a + t.kazanc, 0);
  return {
    kazanc,
    darbe: m.telemetri[NITRO.id]?.tetik ?? 0,
    darbePayi: m.etkiAdim / m.adim,
    enerjiMax,
    kesilen: m.kesilen,
    yanan: m.yanan,
    gucOrt: +(gucToplam / (SURE / DT)).toFixed(6),
    bozuk,
  };
}

function kombinasyonlar<T>(a: T[], n: number): T[][] {
  if (n == 0) return [[]];
  return a.flatMap((x, i) => kombinasyonlar(a.slice(i + 1), n - 1).map((r) => [x, ...r]));
}

/** kalıcı tutuşa izin yok: en kötü durumda darbe süresinin koşuya oranı */
const DARBE_PAYI_UST = 0.5;
/** enerji üretimi üst sınırı (enerji/sn, dört biçimin en iyisinde): kaynak yığınının kaçak sinyali */
const KAZANC_HIZI_UST = 15;

/** bütün kombinasyonların sonucu (anahtar: sıralı kimlikler + biçim); bir kez hesaplanır */
const SONUC = new Map<string, Sonuc>();
const anahtar = (ids: string[], bicim: string) => [...ids].sort().join("+") + "|" + bicim;

describe("MUTANT kombinasyon matrisi", () => {
  beforeAll(() => {
    for (const n of [0, 1, 2, 3])
      for (const kombo of kombinasyonlar(PERKLER, n))
        for (const [ad, bicim] of Object.entries(BICIMLER))
          SONUC.set(
            anahtar(
              kombo.map((p) => p.m.id),
              ad,
            ),
            kos(
              kombo.map((p) => p.m),
              bicim,
            ),
          );
  }, 120000);

  it("1-3'lü bütün kombinasyonlar kırılmaz; sinerji raporu yazılır", () => {
    const satirlar: {
      perkler: string[];
      bicim: string;
      kazancHizi: number;
      darbePayi: number;
      sinerji: number;
    }[] = [];
    for (const n of [1, 2, 3])
      for (const kombo of kombinasyonlar(PERKLER, n))
        for (const ad of Object.keys(BICIMLER)) {
          const ids = kombo.map((p) => p.m.id),
            r = SONUC.get(anahtar(ids, ad))!,
            ad2 = ids.join("+") + " " + ad;
          expect(r.bozuk, ad2).toBe("");
          expect(r.kesilen, ad2).toBe(0);
          expect(r.darbePayi, ad2).toBeLessThanOrEqual(DARBE_PAYI_UST);
          expect(r.kazanc / SURE, ad2).toBeLessThanOrEqual(KAZANC_HIZI_UST);
          // sinerji: darbe payının, parçaların tek tek verdiği en iyi paydan fazlası
          const enIyiTek = Math.max(...ids.map((id) => SONUC.get(anahtar([id], ad))!.darbePayi));
          satirlar.push({
            perkler: ids,
            bicim: ad,
            kazancHizi: +(r.kazanc / SURE).toFixed(3),
            darbePayi: +r.darbePayi.toFixed(3),
            sinerji: +(r.darbePayi - enIyiTek).toFixed(3),
          });
        }
    const sinerjiler = satirlar
      .filter((s) => s.perkler.length > 1)
      .sort((a, b) => b.sinerji - a.sinerji)
      .slice(0, 15);
    mkdirSync("tests/cikti", { recursive: true });
    writeFileSync(
      "tests/cikti/mutant-matris.json",
      JSON.stringify(
        {
          kombinasyon: satirlar.length / Object.keys(BICIMLER).length,
          sinirlar: { DARBE_PAYI_UST, KAZANC_HIZI_UST },
          sinerjiler,
          satirlar,
        },
        null,
        1,
      ),
    );
    const n = PERKLER.length;
    expect(satirlar.length).toBe(
      (n + (n * (n - 1)) / 2 + (n * (n - 1) * (n - 2)) / 6) * Object.keys(BICIMLER).length,
    );
  });

  it("etkisiz perk yok: her perk en az bir kombinasyonda (yanında en çok 2 perk) sonucu değiştirir", () => {
    const durumsal: Record<string, number> = {};
    for (const p of PERKLER) {
      let etkili = 0;
      for (const n of [0, 1, 2])
        for (const C of kombinasyonlar(
          PERKLER.filter((q) => q !== p),
          n,
        ))
          for (const ad of Object.keys(BICIMLER)) {
            const ids = C.map((q) => q.m.id);
            if (
              JSON.stringify(SONUC.get(anahtar(ids, ad))) !==
              JSON.stringify(SONUC.get(anahtar([...ids, p.m.id], ad)))
            )
              etkili++;
          }
      durumsal[p.m.id] = etkili;
      expect(etkili, p.m.id).toBeGreaterThan(0);
    }
  });
});
