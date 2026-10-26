// MUTANT enerji perkleri (A2 nitrosu için saklanır; A1 koşusu kullanmaz). Perkler başka perklerin kimliğine bağlı
// değildir: ortak olaylara (drift, sürüş) ve ortak parametrelere işler. Sınırlar mekanikler.ts'te; kombinasyonları
// tests/birim/mutant-matris.test.ts denetler.
import { DRIFT_HARVESTER, type MekanikTanim } from "../cekirdek/mekanikler";

export interface Perk {
  /** oyuncunun gördüğü ad ve kısa açıklama */
  ad: string;
  d: string;
  /** enerji kaynağı mı (ilk seçimde en az bir kaynak sunulur; enerji görevi yalnız kaynak varken gelir) */
  kaynak: boolean;
  m: MekanikTanim;
}

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

/** perk havuzu. Sayılar ilk sürüm tahminidir, ölçülmüş denge değildir (matris testi kırılmayı denetler) */
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
    ad: "Geniş Batarya",
    d: "Enerji kapasitesi +50",
    kaynak: false,
    m: pasif("genis-batarya", { degistir: { kapasite: 50 } }),
  },
  {
    ad: "Verimli Darbe",
    d: "Tutuş Darbesi %30 daha az enerji harcar",
    kaynak: false,
    m: pasif("verimli-darbe", { degistir: { maliyet: 0.7 } }),
  },
  {
    ad: "Uzun Darbe",
    d: "Tutuş Darbesi %50 daha uzun sürer",
    kaynak: false,
    m: pasif("uzun-darbe", { degistir: { sure: 1.5 } }),
  },
  {
    ad: "Sert Darbe",
    d: "Darbede tutuş +%10, ama maliyet %30 fazla",
    kaynak: false,
    m: pasif("sert-darbe", { degistir: { tutus: 0.1, maliyet: 1.3 } }),
  },
  {
    ad: "Sigorta",
    d: "Spin atınca driftte kazanılan enerjinin yalnız %40'ı yanar",
    kaynak: false,
    m: pasif("sigorta", { degistir: { yakma: 0.4 } }),
  },
];

export const perkBul = (id: string) => PERKLER.find((p) => p.m.id === id);
