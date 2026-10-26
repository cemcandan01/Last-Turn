// MUTANT koşu kuralları (saf: DOM ve oyun durumu yok; oyun ve testler aynı kuralı kullanır). Bir koşu: başta 3
// perkten 1 seçilir, açık dünyada süreli görevler gelir, her başarıdan sonra yeni seçim; süre dolunca koşu biter.
// Perkler başka perklerin kimliğine bağlı değildir: ortak olaylara (drift, sürüş) ve ortak parametrelere işler.
// Sinerji oyuncunun keşfidir; sınırlar mekanikler.ts'te (değiştirici sınırı, tutuş üst sınırı, spin yakma).
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";
import {
  DRIFT_HARVESTER,
  TUTUS_DARBESI,
  driftGozlemcisi,
  driftGozlemiBaslat,
  kapasiteUygula,
  mekanikAdimi,
  mekanikBaslat,
  type DriftGozlemi,
  type GirisOlayi,
  type MekanikDurum,
  type MekanikTanim,
} from "../cekirdek/mekanikler";
import type { SimDurumu } from "../fizik/tipler";

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

export type GorevTuru = "drift" | "enerji" | "hiz" | "temiz";

export interface Gorev {
  tur: GorevTuru;
  hedef: number;
  /** süre sınırı ve kalan süre (sn) */
  sure: number;
  kalan: number;
  ilerleme: number;
}

/** görev türleri: ad, birim, hedef(n) ve süre; n: koşuda tamamlanan görev sayısı (zorluk artar) */
export const GOREVLER: Record<
  GorevTuru,
  { ad: string; birim: string; hedef: (n: number) => number; sure: number }
> = {
  drift: { ad: "Drift", birim: "sn", hedef: (n) => 4 + 1.5 * n, sure: 30 },
  enerji: { ad: "Enerji topla", birim: "", hedef: (n) => 12 + 4 * n, sure: 35 },
  hiz: { ad: "Hızlı yol", birim: "m", hedef: (n) => 500 + 150 * n, sure: 30 },
  temiz: { ad: "Temiz drift", birim: "", hedef: (n) => 2 + Math.floor(n / 2), sure: 35 },
};
/** hızlı yol görevinde sayılan en düşük hız (m/s, 90 km/sa) */
export const GOREV_HIZ = 25;
/** temiz drift görevinde sayılan en kısa drift (sn) */
export const GOREV_TEMIZ_SURE = 1;

export type KosuFazi = "secim" | "gorev" | "bitti";

export interface Kosu {
  tohum: number;
  rng: Rastgele;
  faz: KosuFazi;
  /** seçim ekranındaki perkler (kimlik) */
  secenekler: string[];
  /** takılı perkler (seçim sırasıyla) */
  perkler: string[];
  gorev: Gorev | null;
  /** tamamlanan görev sayısı (koşunun puanı) */
  tamamlanan: number;
  mek: MekanikDurum;
  gozlem: DriftGozlemi;
  /** koşunun sürüş süresi (sn) */
  zaman: number;
  /** enerji görevinin ölçüsü için önceki toplam kazanç */
  oncekiKazanc: number;
}

/** takılı perklerin mekanikleri + her koşuda takılı Tutuş Darbesi */
export const takiliMekanikler = (k: Kosu): MekanikTanim[] => [
  TUTUS_DARBESI,
  ...k.perkler.map((id) => perkBul(id)!.m),
];

const toplamKazanc = (m: MekanikDurum) => Object.values(m.telemetri).reduce((a, t) => a + t.kazanc, 0);

/** havuzdan sahip olunmayan n perk (tohumlu); kaynakZorunlu ise en az biri enerji kaynağı */
function secenekCek(k: Kosu, n: number, kaynakZorunlu: boolean): string[] {
  const aday = PERKLER.filter((p) => !k.perkler.includes(p.m.id));
  const r: Perk[] = [];
  if (kaynakZorunlu) {
    const ka = aday.filter((p) => p.kaynak);
    if (ka.length) r.push(ka[Math.floor(k.rng() * ka.length)]);
  }
  while (r.length < n) {
    const kalan = aday.filter((p) => !r.includes(p));
    if (!kalan.length) break;
    r.push(kalan[Math.floor(k.rng() * kalan.length)]);
  }
  return r.map((p) => p.m.id);
}

export function kosuBaslat(tohum: number): Kosu {
  const k: Kosu = {
    tohum,
    rng: mulberry32(tohum),
    faz: "secim",
    secenekler: [],
    perkler: [],
    gorev: null,
    tamamlanan: 0,
    mek: mekanikBaslat(),
    gozlem: driftGozlemiBaslat(),
    zaman: 0,
    oncekiKazanc: 0,
  };
  k.secenekler = secenekCek(k, 3, true);
  return k;
}

function yeniGorev(k: Kosu) {
  const kaynak = k.perkler.some((id) => perkBul(id)!.kaynak);
  let turler = (Object.keys(GOREVLER) as GorevTuru[]).filter((t) => t != "enerji" || kaynak);
  // aynı tür arka arkaya gelmez
  if (k.gorev && turler.length > 1) turler = turler.filter((t) => t != k.gorev!.tur);
  const tur = turler[Math.floor(k.rng() * turler.length)],
    G = GOREVLER[tur];
  k.gorev = { tur, hedef: G.hedef(k.tamamlanan), sure: G.sure, kalan: G.sure, ilerleme: 0 };
  k.oncekiKazanc = toplamKazanc(k.mek);
  k.faz = "gorev";
}

/** seçim ekranında perk seç (seçeneklerde yoksa yok sayılır); ardından görev başlar */
export function perkSec(k: Kosu, id: string): boolean {
  if (k.faz != "secim" || !k.secenekler.includes(id)) return false;
  k.perkler.push(id);
  k.secenekler = [];
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
  yeniGorev(k);
  return true;
}

/**
 * bir sabit adım (fizikten sonra): drift gözlemcisi, mekanikler (darbe: oyuncu Tutuş Darbesi'ne bastı), görev.
 * Yalnız görev fazında ilerler; seçim ve bitişte hiçbir şey değişmez. Dönen: "basari" | "bitti" | null.
 */
export function kosuAdimi(
  k: Kosu,
  d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">>,
  darbe: boolean,
  dt: number,
): "basari" | "bitti" | null {
  if (k.faz != "gorev" || !k.gorev) return null;
  const r = driftGozlemcisi(k.gozlem, d, dt, true);
  k.gozlem = r.g;
  const olaylar: GirisOlayi[] = r.olaylar;
  // yetenek olayı aynı artan sıra uzayında, adımın drift olaylarından sonra gelir
  if (darbe) {
    olaylar.push({ tur: "AbilityActivated", sira: k.gozlem.sira, yetenek: TUTUS_DARBESI.id });
    k.gozlem = { ...k.gozlem, sira: k.gozlem.sira + 1 };
  }
  k.mek = mekanikAdimi(k.mek, olaylar, takiliMekanikler(k), true, dt);
  k.zaman += dt;
  const g = k.gorev;
  for (const o of olaylar) {
    if (g.tur == "drift" && o.tur == "DriftTickQualified") g.ilerleme += o.dt;
    else if (g.tur == "hiz" && o.tur == "SurusTick" && !o.havada && o.hiz >= GOREV_HIZ)
      g.ilerleme += o.hiz * o.dt;
    else if (g.tur == "temiz" && o.tur == "DriftEnded" && !o.spin && o.sure >= GOREV_TEMIZ_SURE) g.ilerleme++;
  }
  if (g.tur == "enerji") g.ilerleme = toplamKazanc(k.mek) - k.oncekiKazanc;
  g.kalan -= dt;
  if (g.ilerleme >= g.hedef) {
    k.tamamlanan++;
    k.secenekler = secenekCek(k, 3, false);
    if (k.secenekler.length) {
      k.faz = "secim";
      k.gorev = null;
    } else yeniGorev(k);
    return "basari";
  }
  if (g.kalan <= 0) {
    k.faz = "bitti";
    return "bitti";
  }
  return null;
}

export interface KosuOzeti {
  tamamlanan: number;
  sure: number;
  perkler: { ad: string; kazanc: number }[];
  yanan: number;
  darbe: number;
  /** darbenin açık olduğu sürenin koşuya oranı (0-1) */
  darbePayi: number;
}

export function kosuOzeti(k: Kosu): KosuOzeti {
  const T = k.mek.telemetri;
  return {
    tamamlanan: k.tamamlanan,
    sure: k.zaman,
    perkler: k.perkler.map((id) => ({ ad: perkBul(id)!.ad, kazanc: T[id]?.kazanc ?? 0 })),
    yanan: k.mek.yanan,
    darbe: T[TUTUS_DARBESI.id]?.tetik ?? 0,
    darbePayi: k.mek.adim ? k.mek.etkiAdim / k.mek.adim : 0,
  };
}
