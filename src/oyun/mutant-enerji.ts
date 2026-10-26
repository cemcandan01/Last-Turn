// MUTANT enerjisi ve nitro (A2, issue #19). Enerji yalnız oyun tarzından (drift, hız, temiz çıkış, hasar, risk) gelir;
// tek harcama yolu NITRO: kısa süre güç verir, sonra soğur. Perkler başka perklerin kimliğine bağlı değildir: ortak
// olaylara ve ortak parametrelere işler. Sınırlar mekanikler.ts'te; kombinasyonları tests/birim/mutant-matris.test.ts
// denetler (sonlu tetik, enerji sınırı, nitro süre payı ≤ %70, etkisiz perk yok).
import { DRIFT_HARVESTER, type MekanikTanim } from "../cekirdek/mekanikler";

export interface Perk {
  /** oyuncunun gördüğü ad ve kısa açıklama */
  ad: string;
  d: string;
  /** enerji kaynağı mı */
  kaynak: boolean;
  m: MekanikTanim;
}

/** NITRO: her koşuda takılı etkin yetenek. Güç ×1,6, 2,5 sn; bitince 4 sn soğuma; 40 enerji. Süre payı en kötü
 *  durumda (sonsuz enerji) %38; Uzun Nitro ile %47 (matris sınırı %50) */
export const NITRO: MekanikTanim = {
  id: "nitro",
  versiyon: 1,
  kategori: "active",
  tetik: "AbilityActivated",
  maliyet: 40,
  beklemeAdimi: 0,
  kazanc: 0,
  kazancBirimi: "olay",
  etki: { tutus: 1, guc: 1.6, sure: 2.5, sonraBekleme: 4 },
};
/** koşu başında enerji: bir nitroluk (kaynak perki olmadan tekrar dolmaz) */
export const BASLANGIC_ENERJI = 40;

const pasif = (id: string, ek: Partial<MekanikTanim>): MekanikTanim => ({
  id,
  versiyon: 1,
  kategori: "passive",
  maliyet: 0,
  beklemeAdimi: 0,
  kazanc: 0,
  kazancBirimi: "olay",
  ...ek,
});

/** enerji perkleri. Sayılar tahmindir, ölçülmüş denge değildir (matris testi kırılmayı denetler) */
export const PERKLER: Perk[] = [
  { ad: "Drift Hasadı", d: "Bilinçli driftte saniyede 6 enerji", kaynak: true, m: DRIFT_HARVESTER },
  {
    ad: "Temiz Çıkış",
    d: "En az 1,5 sn süren drifti spinsiz bitirince +10 enerji",
    kaynak: true,
    m: pasif("temiz-cikis", { tetik: "DriftEnded", kosul: { spinsiz: true, enAzSure: 1.5 }, kazanc: 10 }),
  },
  {
    ad: "Kayma Hafızası",
    d: "Temiz bir driftten sonra 3 sn içinde yeni drifte girince +8 enerji",
    kaynak: true,
    m: pasif("kayma-hafizasi", { tetik: "DriftStarted", kosul: { zincirAdim: 180 }, kazanc: 8 }),
  },
  {
    ad: "Hız Dinamosu",
    d: "Yerde 100 km/sa üstünde saniyede 3 enerji",
    kaynak: true,
    m: pasif("hiz-dinamosu", {
      tetik: "SurusTick",
      kosul: { yerde: true, enAzHiz: 28 },
      kazanc: 3,
      kazancBirimi: "saniye",
    }),
  },
  {
    ad: "Çarpışma Pili",
    d: "Her hasarda +12 enerji: çarpmak nitro doldurur",
    kaynak: true,
    m: pasif("carpisma-pili", { tetik: "HasarAlindi", kazanc: 12 }),
  },
  {
    ad: "Risk Kondansatörü",
    d: "Riskli ya da ölümcül etkinlik başlarken +40 enerji",
    kaynak: true,
    m: pasif("risk-kondansatoru", { tetik: "RiskBasladi", kosul: { enAzRisk: 1 }, kazanc: 40 }),
  },
  {
    ad: "Geniş Tüp",
    d: "Enerji kapasitesi +50",
    kaynak: false,
    m: pasif("genis-tup", { degistir: { kapasite: 50 } }),
  },
  {
    ad: "Verimli Nitro",
    d: "Nitro %30 daha az enerji harcar",
    kaynak: false,
    m: pasif("verimli-nitro", { degistir: { maliyet: 0.7 } }),
  },
  {
    ad: "Uzun Nitro",
    d: "Nitro %40 daha uzun sürer",
    kaynak: false,
    m: pasif("uzun-nitro", { degistir: { sure: 1.4 } }),
  },
  {
    ad: "Sert Nitro",
    d: "Nitro gücü +%15, ama maliyet %30 fazla",
    kaynak: false,
    m: pasif("sert-nitro", { degistir: { guc: 0.15, maliyet: 1.3 } }),
  },
  {
    ad: "Sigorta",
    d: "Spin atınca driftte kazanılan enerjinin yalnız %40'ı yanar",
    kaynak: false,
    m: pasif("sigorta", { degistir: { yakma: 0.4 } }),
  },
];

export const perkBul = (id: string) => PERKLER.find((p) => p.m.id === id);
