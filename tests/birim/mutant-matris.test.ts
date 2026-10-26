// MUTANT kombinasyon matrisi: bütün 1'li, 2'li ve 3'lü perk kombinasyonları dört sürüş biçiminde, darbeyi her fırsatta
// kullanan (en kötü durum) oyuncuyla koşulur. Kırılma (sınır dışı enerji, kesilen olay, kalıcı tutuş, etkisiz perk)
// hatadır. Sinerji (kombinasyonun parçalarının toplamından iyi olması) hata değildir: rapora yazılır, oyuncu keşfeder.
// Rapor: tests/cikti/mutant-matris.json
import { mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  TUTUS_DARBESI,
  TUTUS_UST,
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
import { PERKLER } from "../../src/oyun/mutant-enerji";

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
};

interface Sonuc {
  kazanc: number;
  darbe: number;
  darbePayi: number;
  enerjiMax: number;
  kesilen: number;
  yanan: number;
}

function kos(perkler: MekanikTanim[], bicim: (i: number) => [boolean, number, number]): Sonuc {
  const takili = [TUTUS_DARBESI, ...perkler];
  let m = kapasiteUygula(mekanikBaslat(), takili),
    g = driftGozlemiBaslat(),
    enerjiMax = 0;
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
    // açgözlü oyuncu: enerji yettiği her an darbeye basar
    if (m.enerji >= TUTUS_DARBESI.maliyet * parametreler(takili).maliyet) {
      olaylar.push({ tur: "AbilityActivated", sira: g.sira, yetenek: TUTUS_DARBESI.id });
      g = { ...g, sira: g.sira + 1 };
    }
    m = mekanikAdimi(m, olaylar, takili, true, DT);
    expect(Number.isFinite(m.enerji)).toBe(true);
    expect(m.enerji).toBeGreaterThanOrEqual(0);
    expect(m.enerji).toBeLessThanOrEqual(m.kapasite + 1e-9);
    expect(tutusCarpani(m)).toBeLessThanOrEqual(TUTUS_UST + 1e-12);
    enerjiMax = Math.max(enerjiMax, m.enerji);
  }
  const kazanc = Object.entries(m.telemetri)
    .filter(([id]) => id != TUTUS_DARBESI.id)
    .reduce((a, [, t]) => a + t.kazanc, 0);
  return {
    kazanc,
    darbe: m.telemetri[TUTUS_DARBESI.id]?.tetik ?? 0,
    darbePayi: m.etkiAdim / m.adim,
    enerjiMax,
    kesilen: m.kesilen,
    yanan: m.yanan,
  };
}

function kombinasyonlar<T>(a: T[], n: number): T[][] {
  if (n == 0) return [[]];
  return a.flatMap((x, i) => kombinasyonlar(a.slice(i + 1), n - 1).map((r) => [x, ...r]));
}

/** kalıcı tutuşa izin yok: en kötü durumda darbe süresinin koşuya oranı */
const DARBE_PAYI_UST = 0.7;
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
          kombinasyon: satirlar.length / 4,
          sinirlar: { DARBE_PAYI_UST, KAZANC_HIZI_UST },
          sinerjiler,
          satirlar,
        },
        null,
        1,
      ),
    );
    expect(satirlar.length).toBe((9 + 36 + 84) * 4);
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
