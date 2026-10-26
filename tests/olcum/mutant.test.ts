// MUTANT ölçümü (issue #16): her türün kolay/orta/zor pistinde (tek tur) başlangıç aracıyla beş build gerçek fizikle
// sürülür; sonuç pistin yıldız eşikleriyle (tur başına) karşılaştırılır. Amaç: etkinlik/boss hedeflerini ve atölye
// ekonomisini ölçüme dayandırmak; "tek motor her şeyi çözer" durumunu görünür kılmak. Pilot insan değildir:
// sonuçlar oran olarak okunur. Rapor: tests/cikti/mutant-olcum[-<hava>][-nitro-<biçim>].json
// HAVA=rain: yağmurda (Çamur Baronu boss'u). NITRO=tek|periyodik|surekli (A2): tek = başlangıç enerjisiyle ilk 2,5 sn;
// periyodik = sonsuz enerjiyle her fırsatta (2,5 sn açık + 4 sn soğuma, en çok %38); surekli = hep açık (ulaşılamaz üst
// sınır). Nitro güç çarpanı NITRO.etki.guc.
import { it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import type { YarisTuru } from "../../src/arac/araclar";
import { TDEF } from "../../src/dunya/pist-tanimlari";
import { BASLANGIC } from "../../src/oyun/kariyer";
import { DRIFT_TUR, yildizEsikleri } from "../../src/oyun/yildiz";
import { dragSur, enIyiTur } from "../yardimci/uyum";
import { DRIFT_PILOT, driftTuru } from "../yardimci/drift-pilot";
import { NITRO } from "../../src/oyun/mutant-enerji";

const HAVA = process.env.HAVA,
  NG = NITRO.etki!.guc!,
  ACIK = NITRO.etki!.sure!,
  DONGU = ACIK + NITRO.etki!.sonraBekleme!;
const NITRO_BICIMI: Record<string, (t: number) => number> = {
  tek: (t) => (t < ACIK ? NG : 1),
  periyodik: (t) => (t % DONGU < ACIK ? NG : 1),
  surekli: () => NG,
};
const nitro = process.env.NITRO ? NITRO_BICIMI[process.env.NITRO] : undefined;

const LASTIK: Record<YarisTuru, string> = {
  gp: "lastik-spor",
  rx: "lastik-karisik",
  rl: "lastik-toprak",
  dp: "lastik-drift",
  dg: "lastik-drag",
};
const UZMAN: Record<YarisTuru, string[]> = {
  gp: ["suspansiyon-spor", "diferansiyel-lsd"],
  rx: ["suspansiyon-rallikros", "diferansiyel-ralli"],
  rl: ["suspansiyon-ralli", "diferansiyel-ralli"],
  dp: ["diferansiyel-kilitli", "aci-kiti"],
  dg: ["suspansiyon-drag", "sanziman-uzun"],
};
const UZMAN_PASIF: Record<YarisTuru, string[]> = {
  gp: ["asfalt", "fren"],
  rx: ["toprak", "fren"],
  rl: ["toprak", "toprak"],
  dp: ["aci", "guc"],
  dg: ["guc", "hafif"],
};
const CESARET = [0.5, 0.8, 1.1, 1.4];

it("MUTANT build ölçümü", () => {
  const satirlar = [];
  const turler = (process.env.TUR ? [process.env.TUR] : ["gp", "rx", "rl", "dp", "dg"]) as YarisTuru[];
  for (const ty of turler) {
    // yarislar.ts DOM ister: pistler TDEF'ten (indeks = bölge), tur sayısı TYP ile aynı (gp/rx 3, drift DRIFT_TUR)
    const TUR: Record<YarisTuru, number> = { gp: 3, rx: 3, dp: DRIFT_TUR, rl: 1, dg: 1 };
    const pistler = TDEF.map((d, i) => ({
      e: { n: d.n, sev: d.sev ?? d.lv, laps: TUR[ty], ys: yildizEsikleri(ty, d.lv) },
      i,
      t: d.t,
    }))
      .filter((p) => p.t == ty)
      .sort((a, b) => a.e.sev - b.e.sev);
    // TAM=1: türün bütün pistleri (boss referans tablosu); yoksa kolay/orta/zor
    const secilen = process.env.TAM
      ? pistler
      : [pistler[0], pistler[Math.floor(pistler.length / 2)], pistler[pistler.length - 1]];
    const arac = BASLANGIC[ty];
    const buildler = [
      { ad: "stok", parca: [] as string[], pasif: [] as string[] },
      { ad: "motor", parca: ["motor-degisim"], pasif: [] },
      // MUTANT atölyesinin en güçlü motor yolu (motor değişimi satılmaz): nadir motor + büyük turbo, uzmanlık yok
      { ad: "nadir-motor", parca: ["motor-yaris", "turbo-buyuk", LASTIK[ty]], pasif: ["guc"] },
      { ad: "dengeli", parca: ["motor-sokak", LASTIK[ty], "fren-spor"], pasif: ["guc"] },
      { ad: "uzman", parca: ["motor-spor", LASTIK[ty], ...UZMAN[ty]], pasif: UZMAN_PASIF[ty] },
      { ad: "motor+uzman", parca: ["motor-degisim", LASTIK[ty], ...UZMAN[ty]], pasif: UZMAN_PASIF[ty] },
      // bölge 3 boss'unun ulaşılabilirlik kanıtı: atölyede alınabilir motor yolu + uzmanlık birleşik
      {
        ad: "nadir+uzman",
        parca: ["motor-yaris", "turbo-buyuk", LASTIK[ty], ...UZMAN[ty]],
        pasif: [...UZMAN_PASIF[ty], "guc"],
      },
    ].filter((b) => !process.env.BUILD || b.ad == process.env.BUILD);
    for (const { e, i } of secilen) {
      const tur = e.laps || 1,
        yildiz = e.ys.map((y) => (ty == "dp" ? Math.round(y / tur) : +(y / tur).toFixed(2)));
      for (const b of buildler) {
        let sonuc: number;
        if (ty == "dp")
          sonuc = Math.max(
            ...[0.3, 0.45].map(
              (aci) =>
                driftTuru(i, "norm", { ...DRIFT_PILOT, aci }, 400, false, arac, 1, false, b.parca).puan,
            ),
          );
        else if (ty == "dg") sonuc = dragSur(i, arac, 0, { parca: b.parca, pasif: b.pasif, wx: HAVA, nitro });
        else sonuc = enIyiTur(i, arac, CESARET, { parca: b.parca, pasif: b.pasif, wx: HAVA, nitro }, 1).t;
        // kaç yıldız: süre yarışında eşikten kısa, driftte eşikten yüksek
        const kac = yildiz.filter((y) => (ty == "dp" ? sonuc >= y : sonuc <= y)).length;
        satirlar.push({
          ty,
          i,
          pist: e.n,
          sev: e.sev,
          tur,
          yildizTurBasi: yildiz,
          build: b.ad,
          parca: b.parca,
          pasif: b.pasif,
          sonuc: Number.isFinite(sonuc) ? +sonuc.toFixed(2) : null,
          yildizSayisi: Number.isFinite(sonuc) ? kac : null,
        });
      }
    }
  }
  mkdirSync("tests/cikti", { recursive: true });
  writeFileSync(
    "tests/cikti/mutant-olcum" +
      (HAVA ? "-" + HAVA : "") +
      (process.env.NITRO ? "-nitro-" + process.env.NITRO : "") +
      ".json",
    JSON.stringify(
      {
        yontem:
          "Gerçek fizik, dengeli yardım, türün başlangıç aracı, tek tur (MUTANT etkinliği). Süre: pilotun spinsiz ve pist dışı < 3 sn en iyi turu; drift: iki açıyla en iyi tek tur puanı; drag: ışıkta tam gaz. null: pilot temiz bitiremedi. Yıldızlar pistin kariyer eşiklerinin tur başına payı.",
        hava: HAVA ?? "sun",
        nitro: process.env.NITRO ?? "yok",
        pistSayisi: TDEF.length,
        satirlar,
      },
      null,
      1,
    ) + "\n",
  );
}, 3600000);
