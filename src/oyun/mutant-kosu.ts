// MUTANT koşusu (A1, saf: DOM ve oyun durumu yok). Kötü bir araç ve başlangıç pasifi seçilir, açık dünyaya atılır;
// koşu başında rastgele seçilen boss'a geri sayım işler. Haritadaki etkinlikler (mevcut pistler) XP ve para verir;
// XP seviye atlatır (3 pasiften 1), para atölyede parça alır. Süre bitince ya da oyuncu isterse boss yarışı:
// kazanırsa sonraki bölge (daha zor boss), kaybederse koşu biter. Ekonomi kariyerden ayrıdır.
import type { Arac, YarisTuru } from "../arac/araclar";
import { PARCALAR } from "../arac/parcalar";
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";
import {
  BECERI_EKLENTILERI,
  BECERILER,
  SEVIYE_UST,
  SKILL_EKLENTI_UST,
  SKILL_YUVASI,
  bayraklar,
  beceriAdimi,
  beceriBul,
  beceriDurumuBaslat,
  beceriEngeli,
  beceriEklentisiBul,
  beceriIstekleri,
  beceriMekanigi,
  eklentiUyar,
  parametre,
  yakinlikGozlemi,
  type BeceriCiktisi,
  type BeceriDunyasi,
  type BeceriDurumu,
  type BeceriEngeli,
  type BeceriOlayi,
  type BeceriOrnegi,
  type Engel,
} from "../cekirdek/beceri";
import {
  GUC_ETKI_UST,
  driftGozlemcisi,
  driftGozlemiBaslat,
  gucCarpani,
  kapasiteUygula,
  mekanikAdimi,
  mekanikBaslat,
  parametreler,
  type DriftGozlemi,
  type GirisOlayi,
  type MekanikDurum,
  type MekanikTanim,
} from "../cekirdek/mekanikler";
import type { SimDurumu } from "../fizik/tipler";
import { BASLANGIC_ENERJI, EKLENTI_PERKLERI, NITRO, PERKLER, SURUS_ENERJISI } from "./mutant-enerji";

/** etkinliğe aday pist: oyundaki EVENTS'in özeti (saf modül oyun verisine bağlanmasın diye) */
export interface PistAdayi {
  i: number;
  ty: YarisTuru;
  sev: number;
  /** türdeki pist numarası (düello pisti bununla seçilir) */
  lv?: number;
  /** yıldız eşikleri [1★, 2★, 3★] (bütün turlar için; süre ya da drift puanı) ve tur sayısı */
  ys: number[];
  laps?: number;
  /** ölçülmüş referans (tests/olcum/mutant.test.ts, tek tur): stok / dengeli / uzman / nadir motor build sonucu.
   *  Yoksa pist boss olamaz (pilot temiz bitiremedi ya da ölçülmedi) */
  ref?: Referans;
  /** yağmurda ölçülmüş referans (yağmurlu boss: Çamur Baronu); yoksa güneşli referans kullanılır */
  refYagmur?: Referans;
}

/** boss'un havasına göre pistin referansı */
export const pistReferansi = (p: Pick<PistAdayi, "ref" | "refYagmur">, hava?: string) =>
  hava == "rain" && p.refYagmur ? p.refYagmur : p.ref;

/** referans sonuç: süre yarışında saniye, driftte puan */
export interface Referans {
  stok: number;
  dengeli: number;
  uzman: number;
  /** atölyenin en güçlü motor yolu (yarış motoru + büyük turbo), uzmanlık yok */
  nadir: number;
  /** nadir motor + türe uzmanlık birleşik (bölge 3 hedefinin ulaşılabilirlik kanıtı) */
  birlesik: number;
}

export interface Boss {
  id: string;
  ad: string;
  ty: YarisTuru;
  /** oynanış tarzı ve kuralları (oyuncuya gösterilir) */
  d: string;
  yetenekler: string[];
  /** zayıf yanı: build ipucu */
  zayif: string;
  /** boss hedefine ek çarpan (bölgenin yıldız eşiğinin üstüne; 1 = eşiğin kendisi) */
  hedef: number;
  hava?: "rain" | "snow";
  gece?: boolean;
}

/** boss havuzu: her koşuda biri rastgele. Kurallar A1'de hava/gece ve sıkı hedefle; rakip YZ gelince düello olur */
export const BOSSLAR: Boss[] = [
  {
    id: "toprak-kurdu",
    ad: "Toprak Kurdu",
    ty: "rl",
    d: "Ralli etabı; toprakta çok hızlı",
    yetenekler: ["Toprakta çok hızlı", "Çamurda yavaşlamaz"],
    zayif: "Toprak tutuşu, dört çeker, süspansiyon kazandırır",
    hedef: 1,
  },
  {
    id: "drift-kralicesi",
    ad: "Drift Kraliçesi",
    ty: "dp",
    d: "Drift düellosu; uzun kombolar ister",
    yetenekler: ["Uzun kombolar", "Çarpanı hiç düşmez"],
    zayif: "Açı kiti, güç, kombo pasifleri kazandırır",
    hedef: 1,
  },
  {
    id: "drag-canavari",
    ad: "Drag Canavarı",
    ty: "dg",
    d: "Drag; kalkış ve son hız ister",
    yetenekler: ["Kalkışta patinaj yapmaz", "Son metrede nitro"],
    zayif: "Motor, turbo, hafiflik kazandırır",
    hedef: 1,
  },
  {
    id: "gece-sahini",
    ad: "Gece Şahini",
    ty: "gp",
    d: "Gece asfalt yarışı; fren ve viraj ister",
    yetenekler: ["Karanlıkta virajı ezbere bilir", "Frene geç basar"],
    zayif: "Fren, asfalt tutuşu kazandırır",
    hedef: 1,
    gece: true,
  },
  {
    id: "camur-baronu",
    ad: "Çamur Baronu",
    ty: "rx",
    d: "Yağmurda rallikros; ıslak toprak ister",
    yetenekler: ["Islakta tutunur", "Su birikintisinde yavaşlamaz"],
    zayif: "Toprak tutuşu, fren, dört çeker kazandırır",
    hedef: 1,
    hava: "rain",
  },
];

/** pasif: aracın değerlerini çarpar ya da koşu ekonomisini değiştirir; en çok `en` kez alınır */
export interface Pasif {
  id: string;
  ad: string;
  d: string;
  en: number;
  /** araç değerlerine etkisi (her kademe) */
  arac?: (c: Arac) => void;
  /** enerji mekaniği (kaynak perki ya da nitro değiştiricisi; mekanikler.ts yürütücüsünde çalışır) */
  m?: MekanikTanim;
}

/**
 * gövde (issue #16 risk bedeli): sürüş hatası aracı gerçekten yıpratır. Sert çarpma ve spin gövdeden düşer; düşük gövde
 * motor gücünü azaltır (en çok %30), 0 olunca araç pert ve koşu biter. Atölyede parayla tamir.
 */
export const GOVDE = { tam: 100, carpma: 12, spin: 8, gucKaybi: 0.3, tamirFiyati: 3 };
/** pasiflerin toplam güç çarpanı üst sınırı (OP koruması; parçalar ayrıca) */
export const GUC_UST = 1.9;
/** hurdacının hasar başına parası tamir bedelinin bu payı: bilerek çarpmak hiç kâr etmez */
export const HURDACI_PAY = 0.8;

export const PASIFLER: Pasif[] = [
  { id: "guc", ad: "Motor ayarı", d: "Güç +%10", en: 3, arac: (c) => void (c.hp *= 1.1) },
  { id: "hafif", ad: "Hafifletme", d: "Ağırlık −%6", en: 3, arac: (c) => void (c.kg *= 0.94) },
  { id: "asfalt", ad: "Asfalt tutuşu", d: "Asfaltta tutuş +%7", en: 3, arac: (c) => void (c.gr[1] *= 1.07) },
  { id: "toprak", ad: "Toprak tutuşu", d: "Toprakta tutuş +%10", en: 3, arac: (c) => void (c.gr[0] *= 1.1) },
  { id: "fren", ad: "Sert fren", d: "Fren gücü +%15", en: 2, arac: (c) => void (c.brk *= 1.15) },
  {
    id: "aci",
    ad: "Açı kiti",
    d: "Direksiyon açısı +0,08 rad (drift)",
    en: 2,
    arac: (c) => void (c.dmax = (c.dmax ?? 0.8) + 0.08),
  },
  { id: "ogrenci", ad: "Hızlı öğrenen", d: "XP +%25", en: 2 },
  { id: "tuccar", ad: "Pazarlıkçı", d: "Para +%25, atölye %10 ucuz", en: 2 },
  { id: "zaman", ad: "Zaman bükücü", d: "Hedefi geçtiğin her etkinlik boss'a +20 sn", en: 2 },
  { id: "zirh", ad: "Zırh", d: "Çarpma ve spin hasarı −%35", en: 2 },
  { id: "tamirci", ad: "Seyyar tamirci", d: "Her etkinlik sonunda gövde +12", en: 2 },
  // Mutasyon V2: kuralı değiştiren pasifler (issue #16). Ortak durumlara (gövde, hasar, risk, süre) bağlanır, başka
  // pasifin kimliğine bağlanmaz; sınırlar GUC_UST, hurdacı ≤ tamir bedeli, son nefes bir kez.
  { id: "adrenalin", ad: "Adrenalin", d: "Gövde %50'nin altındayken güç +%15", en: 2 },
  { id: "camtop", ad: "Cam top", d: "Güç +%25, ama her hasar iki kat", en: 1 },
  { id: "hurdaci", ad: "Hurdacı", d: "Her hasarda para; tamirinden fazlası değil", en: 1 },
  { id: "kumarbaz", ad: "Kumarbaz", d: "Ölümcül ödül ×5, ama kaçırınca süre cezası iki kat", en: 1 },
  {
    id: "sonnefes",
    ad: "Son nefes",
    d: "Her bölgede süre bitince bir kez +90 sn; boss hedefi %3 sıkılaşır",
    en: 1,
  },
  { id: "nitro-kalkani", ad: "Nitro kalkanı", d: "Nitro açıkken hasar yarıya iner", en: 1 },
  // enerji perkleri (A2): nitro enerjisi oyun tarzından gelir
  ...PERKLER.map((p) => ({ id: p.m.id, ad: p.ad, d: p.d, en: 1, m: p.m })),
];
/**
 * eklenti (A2): haritadaki sandıktan çıkan, koşu boyunca kalan parça. Pasifle aynı sözleşme (k.pasifler'e eklenir,
 * araç/mekanik/kural etkisi aynı yoldan); seviye seçiminde çıkmaz. nadir: yalnız lanetli sandıkta
 */
export interface Eklenti extends Pasif {
  nadir: boolean;
  /** alındığı an bir kez */
  al?: (k: Kosu) => void;
}

export const EKLENTILER: Eklenti[] = [
  ...EKLENTI_PERKLERI.map((p) => ({
    id: p.m.id,
    ad: p.ad,
    d: p.d,
    en: 1,
    m: p.m,
    nadir: p.nadir,
    al:
      p.m.id == "ek-yedek-tup"
        ? (k: Kosu) => void (k.mek = { ...k.mek, enerji: Math.min(k.mek.kapasite, k.mek.enerji + 30) })
        : undefined,
  })),
  {
    id: "ek-takviye-tampon",
    ad: "Takviye tampon",
    d: "Çarpma hasarı −%40 (spin değil)",
    en: 1,
    nadir: false,
  },
];

/** lanetli sandığın bedeli: nadir eklenti karşılığı hemen ödenir */
export type Lanet = "sure" | "govde" | "para";
export const LANETLER: Record<Lanet, { ad: string; d: string }> = {
  sure: { ad: "Zaman laneti", d: "Boss'a −45 sn" },
  govde: { ad: "Pas laneti", d: "Gövde −25 (pert etmez)" },
  para: { ad: "Açgözlülük laneti", d: "Paranın yarısı gider" },
};
/** bölge başına sandık: 2 normal (2 sıradan eklentiden biri, bedava), 1 lanetli (nadir eklenti + lanet) */
export const SANDIK_SAYISI = 3;

export const pasifBul = (id: string): Pasif | undefined =>
  PASIFLER.find((p) => p.id === id) ?? EKLENTILER.find((p) => p.id === id);

/** XP eşikleri: seviye n için toplam XP */
export const seviyeXp = (n: number) => 80 * n + 30 * n * (n - 1);
/** etkinlik temel ödülü (pist zorluğu sev 1-6); risk kademesi çarpar */
export const ETKINLIK_ODULU = (sev: number) => ({ xp: 40 + 20 * sev, para: 60 + 30 * sev });

/**
 * risk kademesi (issue #16: yüksek risk / yüksek ödül): hedef pistin 1★/2★/3★ eşiği (tur başına). Güvenli kaçırınca
 * küçük teselli; riskli ve ölümcülde kaçırmak ödülsüz ve boss geri sayımından süre götürür (fırsat kaybı).
 */
export const RISKLER = [
  { ad: "Güvenli", odul: 1, kacirma: 0.3, ceza: 0 },
  { ad: "Riskli", odul: 2, kacirma: 0, ceza: 45 },
  { ad: "Ölümcül", odul: 3.5, kacirma: 0, ceza: 90 },
] as const;
export type Risk = 0 | 1 | 2;

/** atölye fiyatı (parça seviyesi 0-3); nadir parçalar ayrıca pahalı */
export const PARCA_FIYAT = [40, 80, 170, 380];
/** MUTANT atölyesinde hiç satılmaz: ölçümde tek başına bütün türlerde en iyi build'i geçti (issue #16) */
export const SATILMAZ = ["motor-degisim"];
/** güçlü parçalar: ilk bölgede satılmaz, stokta en çok bir tane */
export const NADIR_PARCALAR = ["motor-yaris", "turbo-buyuk", "lastik-yaris"];
export const NADIR_EK = 1.4;
export const ATOLYE_STOK = 5;
export const STOK_YENILE = 40;
/** boss'a geri sayım (sn) bölgeye göre */
export const BOSS_SURESI = (bolge: number) => (bolge == 1 ? 900 : 780);
export const HARITA_ETKINLIK = 8;

export interface Etkinlik {
  id: number;
  /** EVENTS indeksi */
  i: number;
  ty: YarisTuru;
  sev: number;
  /** haritadaki yeri (açık dünya) */
  x: number;
  z: number;
  yapildi: boolean;
  /** düello (A3): hedef süre yerine YZ rakipten önce bitirmek */
  rakip?: boolean;
  /** drift skill kaporası (LT-SYS-004): kart ilk açılınca kilitlenir */
  kapora?: Kapora;
}

/**
 * drift etkinliğinin kaporası: sahip olunan skill'lerden biri, koşu tohumu + etkinlik + deneme sayısıyla belirlenimci
 * seçilir ve etkinliğe kilitlenir (kartı aç/kapa yeniden zar atmaz). Kilitli skill bir sebeple elden çıktıysa deneme
 * bir artar (oyuncu kaporayı seçemez). beceri null: skill yok, kapora gövdedir (KAPORA.govde)
 */
export interface Kapora {
  beceri: string | null;
  deneme: number;
}
/** skill yokken kapora: kaybedince gövde; kazanınca yeni skill. Skill tavandaysa kazanç para */
export const KAPORA = { govde: 15, tavanPara: 100 };

/** A3 düellosu: bölge 1'in asfalt etkinliği kısa asfalt pistte (Yeşil Vadi) tek YZ rakibe karşı, 2 tur. Risk kademesi
 *  rakibin kişiliğidir: Güvenli → Çaylak, Riskli → Deneyimli (ödül/ceza RISKLER'den) */
export const DUELLO = {
  bolge: 1,
  pist: { ty: "gp" as YarisTuru, lv: 1 },
  tur: 2,
  kisilikler: ["caylak", "deneyimli"] as const,
};

export interface Sandik {
  id: number;
  x: number;
  z: number;
  lanetli: boolean;
  /** sunulan eklentiler (normal: 2 sıradan; lanetli: 1 nadir) ve lanetli sandığın bedeli */
  secenekler: string[];
  lanet: Lanet | null;
  acildi: boolean;
}

export type KosuFazi = "basla" | "surus" | "secim" | "boss" | "bitti";

export interface Kosu {
  tohum: number;
  rng: Rastgele;
  faz: KosuFazi;
  bolge: number;
  boss: Boss;
  /** boss'a kalan süre (sn) */
  kalan: number;
  xp: number;
  seviye: number;
  /** atlanan ama seçimi yapılmamış seviye sayısı */
  bekleyenSecim: number;
  para: number;
  pasifler: string[];
  /** atölyede alınan parçalar */
  parcalar: string[];
  /** atölyede satıştaki parçalar (bölgede bir kez dizilir; parayla yenilenebilir) */
  stok: string[];
  /** seçim ekranındaki pasifler */
  secenekler: string[];
  etkinlikler: Etkinlik[];
  sandiklar: Sandik[];
  /** biten etkinlik / boss sayısı (özet) */
  tamamlanan: number;
  yenilenBoss: number;
  /** koşu sürüşte geçen toplam süre */
  zaman: number;
  /** gövde (0-100) ve hasar dökümü (özet: koşu neden kaybedildi) */
  govde: number;
  carpma: number;
  spin: number;
  /** pist kesme sayısı */
  kesme?: number;
  /** pert olduysa true (koşu bitti) */
  pert: boolean;
  /** son nefes kullanıldı mı (bir kez) */
  sonNefes: boolean;
  /** nitro enerjisi: mekanik yürütücü durumu ve drift gözlemcisi */
  mek: MekanikDurum;
  gozlem: DriftGozlemi;
  /** sonraki enerji adımında yayılacak ortak olaylar (hasar puanı, başlayan risk kademesi) */
  bekleyenHasar: { tur: "carpma" | "spin"; miktar: number } | null;
  bekleyenRisk: number | null;
  /** skill'ler (en çok SKILL_YUVASI; etkin + tetiklenen). Seviye, skill eklentisi ve evrim skill'in içinde durur */
  beceriler: BeceriOrnegi[];
  /** skill yürütücüsünün durumu, son çıktısı ve sonraki enerji adımına giden skill olayları */
  bec: BeceriDurumu;
  becCikti: BeceriCiktisi | null;
  bekleyenBeceri: BeceriOlayi[];
  /** son adımda skill'in kullanılamama/dolmama nedeni (HUD; enerji ayrıca beceriGorunumu'nde) */
  becEngel: Record<string, BeceriEngeli | null>;
  /** yapılan seçim sayısı (skill teklifinin tohumu; ana rastgelelik sırası değişmesin diye ayrı) */
  secimNo: number;
}

const sec = <T>(r: Rastgele, a: readonly T[]) => a[Math.floor(r() * a.length)];

/** etkinliklerin konabileceği yerler: açık dünyada düz zemin (oval, düz yol, rampa önü, tırmanış başı, düzlük).
 *  Tepe ve yokuş yok: orada duran araç kayar, işarete giremez */
export const YERLER: [number, number][] = [
  [140, 0],
  [70, 78],
  [-70, 78],
  [-140, 0],
  [-70, -78],
  [70, -78],
  [210, -600],
  [210, -300],
  [210, 300],
  [210, 600],
  [-250, -175],
  [-40, 60],
  [-150, -500],
  [450, 450],
  [-450, -450],
  [-550, 350],
];
/** atölye sabit: merkez yakını */
export const ATOLYE: [number, number] = [0, -90];
/** boss işareti: tırmanış yolunun tepesi */
export const BOSS_YERI: [number, number] = [-40, 440];

export const pasifSayisi = (k: Kosu, id: string) => k.pasifler.filter((p) => p == id).length;

/** sahip olunmayan ya da kademesi dolmamış n pasif (tohumlu) */
function pasifCek(k: Kosu, n: number): string[] {
  const aday = PASIFLER.filter((p) => pasifSayisi(k, p.id) < p.en).map((p) => p.id),
    r: string[] = [];
  while (r.length < n && aday.length) r.push(aday.splice(Math.floor(k.rng() * aday.length), 1)[0]);
  return r;
}

/** bölgeye göre harita etkinlikleri: her türden en az bir, zorluk bölgeyle artar; boss türü de var */
function etkinlikDiz(k: Kosu, pistler: readonly PistAdayi[]) {
  const enCok = Math.min(6, 1 + 2 * k.bolge),
    uygun = pistler.filter((p) => p.sev <= enCok && p.sev >= enCok - 3),
    turler: YarisTuru[] = ["gp", "rx", "rl", "dp", "dg"],
    yerler = [...YERLER];
  k.etkinlikler = [];
  for (let n = 0; n < HARITA_ETKINLIK && yerler.length; n++) {
    const ty = n < turler.length ? turler[n] : sec(k.rng, turler),
      aday = uygun.filter((p) => p.ty == ty);
    if (!aday.length) continue;
    const p = sec(k.rng, aday),
      [x, z] = yerler.splice(Math.floor(k.rng() * yerler.length), 1)[0];
    k.etkinlikler.push({ id: n, i: p.i, ty, sev: p.sev, x, z, yapildi: false });
  }
  // düello: türün etkinliği sabit pistte (rastgelelik aynı sırayla tüketilir: diğer etkinlikler değişmez)
  const dp = pistler.find((p) => p.ty == DUELLO.pist.ty && p.lv == DUELLO.pist.lv),
    de = k.etkinlikler.find((e) => e.ty == DUELLO.pist.ty);
  if (k.bolge == DUELLO.bolge && dp && de) Object.assign(de, { i: dp.i, sev: dp.sev, rakip: true });
}

/** bölgenin sandıkları: etkinliklerin kullanmadığı düz yerlere (tohumlu); sahip olunan eklenti yeniden çıkmaz */
function sandikDiz(k: Kosu) {
  const yerler = YERLER.filter(([x, z]) => !k.etkinlikler.some((e) => e.x == x && e.z == z)),
    sahip = (id: string) => k.pasifler.includes(id);
  k.sandiklar = [];
  for (let n = 0; n < SANDIK_SAYISI && yerler.length; n++) {
    const lanetli = n == SANDIK_SAYISI - 1,
      aday = EKLENTILER.filter((e) => e.nadir == lanetli && !sahip(e.id)).map((e) => e.id),
      secenekler: string[] = [];
    while (secenekler.length < (lanetli ? 1 : 2) && aday.length)
      secenekler.push(aday.splice(Math.floor(k.rng() * aday.length), 1)[0]);
    if (!secenekler.length) continue;
    const [x, z] = yerler.splice(Math.floor(k.rng() * yerler.length), 1)[0],
      lanet = lanetli ? sec(k.rng, Object.keys(LANETLER) as Lanet[]) : null;
    k.sandiklar.push({ id: n, x, z, lanetli, secenekler, lanet, acildi: false });
  }
}

/**
 * sandığı aç: seçilen eklenti koşuya eklenir (lanetliyse bedel hemen ödenir). Bırakılan sandık kapalı kalır, sonra
 * dönülebilir. Dönen: alındı mı
 */
export function sandikAc(k: Kosu, id: number, eklenti: string): boolean {
  const s = k.sandiklar.find((q) => q.id == id);
  if (!s || s.acildi || k.faz != "surus" || !s.secenekler.includes(eklenti) || k.pasifler.includes(eklenti))
    return false;
  s.acildi = true;
  k.pasifler.push(eklenti);
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
  EKLENTILER.find((e) => e.id == eklenti)?.al?.(k);
  if (s.lanet == "sure") k.kalan = Math.max(1, k.kalan - 45);
  else if (s.lanet == "govde") k.govde = Math.max(1, k.govde - 25);
  else if (s.lanet == "para") k.para = Math.floor(k.para / 2);
  return true;
}

/** yeni koşu: 3 aday araç ve 3 başlangıç pasifi sunulur (faz "basla") */
export function kosuBaslat(tohum: number, pistler: readonly PistAdayi[]): Kosu {
  const rng = mulberry32(tohum);
  const k: Kosu = {
    tohum,
    rng,
    faz: "basla",
    bolge: 1,
    boss: sec(rng, BOSSLAR),
    kalan: BOSS_SURESI(1),
    xp: 0,
    seviye: 0,
    bekleyenSecim: 0,
    para: 150,
    pasifler: [],
    parcalar: [],
    stok: [],
    secenekler: [],
    etkinlikler: [],
    sandiklar: [],
    tamamlanan: 0,
    yenilenBoss: 0,
    zaman: 0,
    govde: GOVDE.tam,
    carpma: 0,
    spin: 0,
    pert: false,
    sonNefes: false,
    mek: mekanikBaslat(100, BASLANGIC_ENERJI),
    gozlem: driftGozlemiBaslat(),
    bekleyenHasar: null,
    bekleyenRisk: null,
    beceriler: [],
    bec: beceriDurumuBaslat(),
    becCikti: null,
    bekleyenBeceri: [],
    becEngel: {},
    secimNo: 0,
  };
  k.secenekler = secenekCek(k);
  etkinlikDiz(k, pistler);
  sandikDiz(k);
  stokDiz(k);
  return k;
}

/** atölye stoğu: zayıf (sv0) parçalar yok; nadirler bölge 2'den itibaren ve en çok bir tane */
export function stokDiz(k: Kosu) {
  const aday = PARCALAR.filter((p) => p.sv > 0 && !k.parcalar.includes(p.id) && !SATILMAZ.includes(p.id)).map(
      (p) => p.id,
    ),
    r: string[] = [];
  let nadir = 0;
  while (r.length < ATOLYE_STOK && aday.length) {
    const id = aday.splice(Math.floor(k.rng() * aday.length), 1)[0];
    if (NADIR_PARCALAR.includes(id) && (k.bolge < 2 || nadir++ >= 1)) continue;
    r.push(id);
  }
  k.stok = r;
}

/** atölyede stoğu parayla yenile */
export function stokYenile(k: Kosu): boolean {
  if (k.para < STOK_YENILE) return false;
  k.para -= STOK_YENILE;
  stokDiz(k);
  return true;
}

/**
 * başlangıç ya da seviye seçimi: pasifi ya da skill teklifini al; bekleyen seçim varsa yeni seçenekler, yoksa sürüşe
 * dön. Yeni skill yuvalar doluyken ancak bırakılacak skill (birak) verilirse alınır: bırakılanın seviyesi,
 * eklentileri ve evrimi onunla gider
 */
export function pasifSec(k: Kosu, id: string, birak?: string): boolean {
  if ((k.faz != "basla" && k.faz != "secim") || !k.secenekler.includes(id)) return false;
  if (secenekTuru(id) == "pasif") k.pasifler.push(id);
  else if (!beceriTeklifiUygula(k, id, birak)) return false;
  if (k.faz == "secim") k.bekleyenSecim = Math.max(0, k.bekleyenSecim - 1);
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = secenekCek(k);
    if (k.secenekler.length) return true;
  }
  k.faz = "surus";
  k.secenekler = [];
  return true;
}

/** takılı enerji mekanikleri: her koşuda NITRO + temel sürüş enerjisi + pasiflerin mekanikleri + etkin skill'lerin enerji tanımı */
export const takiliMekanikler = (
  k: Pick<Kosu, "pasifler"> & { beceriler?: BeceriOrnegi[] },
): MekanikTanim[] => [
  NITRO,
  SURUS_ENERJISI,
  ...k.pasifler.flatMap((id) => {
    const m = pasifBul(id)?.m;
    return m ? [m] : [];
  }),
  ...(k.beceriler ?? []).flatMap((o) => {
    const m = beceriMekanigi(o);
    return m ? [m] : [];
  }),
];

// ---------------------------------------------------------------- skill seçimi, kapora (LT-SYS-004)

export type SecenekTuru = "pasif" | "beceri" | "seviye" | "evrim" | "eklenti";
/** seçenek kimliği: pasif id'si ya da "b:<skill>", "y:<skill>", "v:<skill>:<evrim>", "e:<eklenti>:<skill>" */
export const secenekTuru = (id: string): SecenekTuru =>
  id.startsWith("b:")
    ? "beceri"
    : id.startsWith("y:")
      ? "seviye"
      : id.startsWith("v:")
        ? "evrim"
        : id.startsWith("e:")
          ? "eklenti"
          : "pasif";

export const beceriSahip = (k: Pick<Kosu, "beceriler">, id: string) => k.beceriler.find((o) => o.id == id);

/** şu an alınabilecek skill teklifleri: yeni skill, seviye, evrim (tavanda), uyumlu skill eklentisi */
export function beceriTeklifleri(k: Pick<Kosu, "beceriler">): string[] {
  const r: string[] = [];
  for (const t of BECERILER) {
    const o = beceriSahip(k, t.id);
    if (!o) {
      r.push("b:" + t.id);
      continue;
    }
    if (o.seviye < SEVIYE_UST) r.push("y:" + t.id);
    else if (!o.evrim) for (const v of t.evrimler) r.push("v:" + t.id + ":" + v.id);
    if (o.eklentiler.length < SKILL_EKLENTI_UST)
      for (const e of BECERI_EKLENTILERI)
        if (eklentiUyar(t, e) && !o.eklentiler.includes(e.id)) r.push("e:" + e.id + ":" + t.id);
  }
  return r;
}

const turet = (k: Pick<Kosu, "tohum">, tuz: number, n: number) =>
  mulberry32((Math.imul(k.tohum ^ tuz, 31) + n * 7919) >>> 0 || 1);

/** seçim ekranı: 3 pasif (eski sıra korunur); skill teklifi varsa üçüncünün yerine bir skill teklifi (ayrı tohum) */
function secenekCek(k: Kosu): string[] {
  const r = pasifCek(k, 3),
    t = beceriTeklifleri(k);
  k.secimNo++;
  if (t.length) {
    const s = t[Math.floor(turet(k, 0x51ed27, k.secimNo)() * t.length)];
    if (r.length >= 3) r[2] = s;
    else r.push(s);
  }
  return r;
}

/** skill teklifini uygula (seçim geçerliyse); bırakılan skill tamamen silinir */
function beceriTeklifiUygula(k: Kosu, id: string, birak?: string): boolean {
  const [tur, a, b] = id.split(":");
  if (tur == "b") {
    if (!beceriBul(a) || beceriSahip(k, a)) return false;
    if (k.beceriler.length >= SKILL_YUVASI) {
      if (!birak || !beceriSahip(k, birak)) return false;
      beceriSil(k, birak);
    }
    k.beceriler.push({ id: a, seviye: 1, eklentiler: [], evrim: null });
    return true;
  }
  if (tur == "y") {
    const o = beceriSahip(k, a);
    if (!o || o.seviye >= SEVIYE_UST) return false;
    o.seviye++;
    return true;
  }
  if (tur == "v") {
    const o = beceriSahip(k, a);
    if (!o || o.seviye < SEVIYE_UST || o.evrim || !beceriBul(a)!.evrimler.some((v) => v.id == b))
      return false;
    o.evrim = b;
    return true;
  }
  if (tur == "e") {
    const o = beceriSahip(k, b),
      e = beceriEklentisiBul(a);
    if (!o || !e || !eklentiUyar(beceriBul(b)!, e) || o.eklentiler.includes(a)) return false;
    if (o.eklentiler.length >= SKILL_EKLENTI_UST) return false;
    o.eklentiler.push(a);
    return true;
  }
  return false;
}

/** skill'i (seviyesi, eklentileri, evrimiyle) envanterden sil; yürütücü durumu sonraki adımda temizlenir */
export function beceriSil(k: Kosu, id: string) {
  k.beceriler = k.beceriler.filter((o) => o.id != id);
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
}

/** drift etkinliğinin kaporasını belirle/kilitle (kart açılınca ve girişte). Drift değilse ya da yapıldıysa null */
export function kaporaBelirle(k: Kosu, id: number): Kapora | null {
  const e = k.etkinlikler.find((q) => q.id == id);
  if (!e || e.ty != "dp" || e.yapildi) return null;
  const sec = (deneme: number): Kapora => {
    if (!k.beceriler.length) return { beceri: null, deneme };
    const r = turet(k, 0x27d4eb2d, e.id * 131 + deneme * 977)();
    return { beceri: k.beceriler[Math.floor(r * k.beceriler.length)].id, deneme };
  };
  const q = e.kapora;
  if (!q) e.kapora = sec(0);
  else if (q.beceri && !beceriSahip(k, q.beceri)) e.kapora = sec(q.deneme + 1);
  else if (!q.beceri && k.beceriler.length) e.kapora = sec(q.deneme);
  return e.kapora!;
}

export interface KaporaSonucu {
  beceri: string | null;
  sonuc: "seviye" | "para" | "kayip" | "yeni" | "govde";
}

/** drift sonucu kaporaya işler (bir kez, etkinlikBitti içinde): kazan → +1 seviye (tavanda para) ya da yeni skill,
 *  kaybet → skill tamamen silinir ya da gövde gider */
function kaporaUygula(k: Kosu, e: Etkinlik, gecti: boolean): KaporaSonucu | null {
  const q = e.kapora;
  if (e.ty != "dp" || !q) return null;
  if (q.beceri) {
    const o = beceriSahip(k, q.beceri);
    if (!o) return null;
    if (!gecti) {
      beceriSil(k, o.id);
      return { beceri: o.id, sonuc: "kayip" };
    }
    if (o.seviye < SEVIYE_UST) {
      o.seviye++;
      return { beceri: o.id, sonuc: "seviye" };
    }
    k.para += KAPORA.tavanPara;
    return { beceri: o.id, sonuc: "para" };
  }
  if (!gecti) {
    k.govde = Math.max(1, k.govde - KAPORA.govde);
    return { beceri: null, sonuc: "govde" };
  }
  const aday = BECERILER.filter((t) => !beceriSahip(k, t.id));
  if (!aday.length || k.beceriler.length >= SKILL_YUVASI) {
    k.para += KAPORA.tavanPara;
    return { beceri: null, sonuc: "para" };
  }
  const t = aday[Math.floor(turet(k, 0x165667b1, e.id)() * aday.length)];
  k.beceriler.push({ id: t.id, seviye: 1, eklentiler: [], evrim: null });
  k.mek = kapasiteUygula(k.mek, takiliMekanikler(k));
  return { beceri: t.id, sonuc: "yeni" };
}

/** yarış başında skill yürütücüsünün hedef kayıtları sıfırlanır (rakip gövdesi, takip kredisi, near-miss) */
export function beceriYarisBasi(k: Kosu) {
  k.bec = { ...k.bec, hedefler: {}, sonVurus: {}, takipKredi: {}, yakin: {}, sonNearMiss: {} };
}

/** enerji adımının dünya bilgisi (oyun verir; yoksa yalnız oyuncu, rakipsiz, yarış dışı) */
export interface EnerjiDunyasi {
  dunya: BeceriDunyasi;
  /** basılan skill tuşları (skill kimliği) */
  istekler: readonly string[];
  engeller: readonly Engel[];
  /** bu adımda sert çarpma oldu mu */
  carpti: boolean;
}

/**
 * enerji adımı (fizikten sonra): drift/sürüş gözlemcisi + bekleyen ortak olaylar (risk, hasar) + nitro isteği tek
 * artan sıra uzayında yürütücüye gider. Saf ve belirlenimci; dönen: nitro güç çarpanı değişti mi
 */
export function enerjiAdimi(
  k: Kosu,
  d: Readonly<Pick<SimDurumu, "S" | "DR" | "D">>,
  dt: number,
  nitro: boolean,
  ed?: EnerjiDunyasi,
): boolean {
  const g0 = gucCarpani(k.mek),
    c0 = k.becCikti,
    r = driftGozlemcisi(k.gozlem, d, dt, true),
    olaylar: GirisOlayi[] = r.olaylar,
    S = d.S,
    dunya: BeceriDunyasi = ed?.dunya ?? {
      oyuncu: { x: S.x, z: S.z, h: S.h, vx: S.vx, vz: S.vz },
      hedefler: [],
      baglanti: () => null,
      yarista: false,
    };
  k.gozlem = r.g;
  const ekle = (o: GirisOlayi) => {
    olaylar.push({ ...o, sira: k.gozlem.sira });
    k.gozlem = { ...k.gozlem, sira: k.gozlem.sira + 1 };
  };
  if (k.bekleyenRisk != null) ekle({ tur: "RiskBasladi", sira: 0, risk: k.bekleyenRisk });
  if (k.bekleyenHasar)
    ekle({ tur: "HasarAlindi", sira: 0, hasar: k.bekleyenHasar.tur, miktar: k.bekleyenHasar.miktar });
  if (nitro) ekle({ tur: "AbilityActivated", sira: 0, yetenek: NITRO.id });
  // skill katmanı: önceki adımın skill olayları, yakınlık olayları, hazır skill tuşları aynı sıra uzayına girer
  const yg = yakinlikGozlemi(k.bec, dunya, ed?.engeller ?? [], dt, ed?.carpti ?? false);
  k.bec = yg.d;
  for (const o of [...k.bekleyenBeceri, ...yg.olaylar]) ekle({ ...o, sira: 0 } as GirisOlayi);
  for (const y of beceriIstekleri(k.bec, k.beceriler, dunya, ed?.istekler ?? []))
    ekle({ tur: "AbilityActivated", sira: 0, yetenek: y });
  k.bekleyenRisk = null;
  k.bekleyenHasar = null;
  k.bekleyenBeceri = [];
  const once = k.mek;
  k.mek = mekanikAdimi(k.mek, olaylar, takiliMekanikler(k), true, dt);
  // enerjisi bu adımda harcanan etkin skill'ler başlar
  const tetiklenen = Object.keys(k.mek.sonTetik).filter(
    (id) => id.startsWith("beceri:") && k.mek.sonTetik[id] == k.mek.adim && once.sonTetik[id] != k.mek.adim,
  );
  const b = beceriAdimi(k.bec, k.beceriler, dunya, tetiklenen, olaylar, dt);
  k.bec = b.d;
  k.becCikti = b.cikti;
  k.bekleyenBeceri = b.cikti.olaylar;
  k.becEngel = Object.fromEntries(
    k.beceriler.map((o) => [o.id, beceriEngeli(k.bec, k.beceriler, dunya, o.id)]),
  );
  return gucCarpani(k.mek) != g0 || (c0?.guc ?? 1) != b.cikti.guc || (c0?.tutus ?? 1) != b.cikti.tutus;
}

/** skill'in HUD'da gösterilen kullanılamama nedeni: skill'in kendi engeli ya da enerji */
export type BeceriHudEngeli = BeceriEngeli | "enerji";

/** skill tuşunun ve barının durumu (HUD ve efektler için salt okunur) */
export function beceriGorunumu(k: Kosu) {
  const mekP = parametreler(takiliMekanikler(k)).maliyet;
  return k.beceriler.map((o) => {
    const t = beceriBul(o.id)!,
      y = k.bec.yerel[o.id],
      p = parametre(t, o),
      maliyet = (t.maliyet ?? 0) * mekP,
      engel0 = k.becEngel[o.id] ?? null,
      engel: BeceriHudEngeli | null =
        engel0 ?? (t.tur == "aktif" && k.mek.enerji < maliyet ? "enerji" : null);
    return {
      id: o.id,
      ad: t.ad,
      tur: t.tur,
      seviye: o.seviye,
      evrim: o.evrim,
      eklentiler: o.eklentiler,
      acik: (y?.kalan ?? 0) > 0,
      kalan: y?.kalan ?? 0,
      bekleme: y?.bekleme ?? 0,
      /** bu seviyede etki süresi ve bekleme (sn): dolgu oranı için */
      sure: p.sure ?? 0,
      beklemeTam: p.bekleme ?? 0,
      bar: t.bar ? Math.round(100 * Math.max(0, Math.min(1, y ? t.bar(y, p) : 0))) : null,
      maliyet,
      engel,
      /** etki sürerken bağlantı (kanca): rakibin kimliği ya da yol noktası */
      hedef: (y?.kalan ?? 0) > 0 ? (y?.hedef ?? null) : null,
      nokta: (y?.kalan ?? 0) > 0 ? (y?.nokta ?? null) : null,
      hazir: t.tur == "aktif" && engel == null,
    };
  });
}

/** nitro tuşunun durumu (HUD ve tuş için salt okunur): enerji, maliyet, açık mı, basılınca çalışır mı */
export function nitroDurumu(k: Kosu) {
  const m = k.mek,
    maliyet = NITRO.maliyet * parametreler(takiliMekanikler(k)).maliyet;
  return {
    enerji: m.enerji,
    kapasite: m.kapasite,
    maliyet,
    acik: m.etkiKalan > 0,
    kalan: Math.max(0, m.etkiKalan),
    hazir: m.etkiKalan <= 0 && m.etkiBekleme <= 0 && m.enerji >= maliyet,
  };
}

/** aracın koşu değerleri: (parçalı) araç kopyası + pasif kademeleri + gövde hasarının güç kaybı + nitro */
export function kosuAraci(
  taban: Arac,
  k: Pick<Kosu, "pasifler"> & {
    govde?: number;
    mek?: Pick<MekanikDurum, "etkiKalan" | "etkiGuc">;
    becCikti?: Pick<BeceriCiktisi, "guc" | "tutus"> | null;
  },
): Arac {
  const c: Arac = { ...taban, gr: [taban.gr[0], taban.gr[1]] };
  for (const id of k.pasifler) pasifBul(id)?.arac?.(c);
  const govde = Math.max(0, Math.min(GOVDE.tam, k.govde ?? GOVDE.tam)),
    n = (id: string) => k.pasifler.filter((p) => p == id).length;
  // kural pasifleri: cam top sabit, adrenalin yarı gövdenin altında; pasiflerin toplam gücü GUC_UST'ü aşmaz
  const kural = (1 + 0.25 * n("camtop")) * (govde < GOVDE.tam / 2 ? 1 + 0.15 * n("adrenalin") : 1);
  c.hp = Math.min(c.hp * kural, taban.hp * GUC_UST);
  c.hp *= 1 - GOVDE.gucKaybi * (1 - govde / GOVDE.tam);
  // nitro ve skill dönüşümü: süreli güç; ikisi birlikte de GUC_ETKI_UST'ü aşmaz (nitro süre payı matriste ≤ %50)
  const etki = Math.min(GUC_ETKI_UST, (k.mek ? gucCarpani(k.mek) : 1) * (k.becCikti?.guc ?? 1));
  c.hp *= etki;
  const tutus = Math.min(BECERI_TUTUS_UST, k.becCikti?.tutus ?? 1);
  c.gr = [c.gr[0] * tutus, c.gr[1] * tutus];
  return c;
}

/** skill'lerin birleşik tutuş çarpanı üst sınırı */
export const BECERI_TUTUS_UST = 1.3;

/** pist kesme cezası (LT-SYS-006): atlanan pist mesafesinin onda biri kadar gövde. Hayalet fazı ve zırh korumaz,
 *  enerji/para pasifleri tepki vermez (kesmek hiçbir şey kazandırmaz). Gövde 0'da pert. Dönen: düşen gövde */
export const KESME_CEZASI = 0.1;
export function kesmeCezasi(k: Kosu, metre: number): number {
  if (k.faz == "bitti" || k.pert || !(metre > 0)) return 0;
  const h = Math.min(k.govde, metre * KESME_CEZASI);
  k.govde = Math.max(0, k.govde - metre * KESME_CEZASI);
  k.kesme = (k.kesme ?? 0) + 1;
  if (k.govde <= 0) {
    k.pert = true;
    k.faz = "bitti";
  }
  return h;
}

/** hasar: sert çarpma ya da spin; zırh azaltır. Gövde 0 olunca pert (koşu biter). Dönen: pert oldu mu */
export function hasarAl(k: Kosu, tur: "carpma" | "spin"): boolean {
  if (k.faz == "bitti" || k.pert) return false;
  // hayalet fazı: hasar işlemez; ortak olay KorumaEngelledi (pasifler tepki verebilir)
  if (bayraklar(k.bec, k.beceriler).hayalet) {
    k.bekleyenBeceri = [
      ...k.bekleyenBeceri,
      { tur: "KorumaEngelledi", miktar: Math.min(k.govde, GOVDE[tur]), kaynak: tur },
    ];
    return false;
  }
  const kalkan = gucCarpani(k.mek) > 1 ? 1 - 0.5 * pasifSayisi(k, "nitro-kalkani") : 1,
    tampon = tur == "carpma" ? 1 - 0.4 * pasifSayisi(k, "ek-takviye-tampon") : 1,
    h = GOVDE[tur] * (1 - 0.35 * pasifSayisi(k, "zirh")) * (1 + pasifSayisi(k, "camtop")) * kalkan * tampon,
    alinan = Math.min(k.govde, h);
  // ortak olay: enerji perkleri (Çarpışma Pili) sonraki enerji adımında tepki verir
  if (alinan > 0) k.bekleyenHasar = { tur, miktar: alinan };
  k[tur]++;
  k.govde = Math.max(0, k.govde - h);
  // hurdacı: hasarın tamir bedelinden az para (bilerek çarpmak kâr etmez)
  if (pasifSayisi(k, "hurdaci")) k.para += Math.floor(alinan * GOVDE.tamirFiyati * HURDACI_PAY);
  if (k.govde <= 0) {
    k.pert = true;
    k.faz = "bitti";
    return true;
  }
  return false;
}

export const tamirBedeli = (k: Pick<Kosu, "govde">) => Math.ceil((GOVDE.tam - k.govde) * GOVDE.tamirFiyati);

/** atölyede tam tamir (para yetmezse yettiği kadar) */
export function tamirEt(k: Kosu): boolean {
  if (k.govde >= GOVDE.tam || k.para <= 0) return false;
  const puan = Math.min(GOVDE.tam - k.govde, Math.floor(k.para / GOVDE.tamirFiyati));
  if (puan <= 0) return false;
  k.govde += puan;
  k.para -= puan * GOVDE.tamirFiyati;
  return true;
}

/** sürüş süresi akar (etkinlik içinde de); boss süresi dolunca "boss" döner */
export function zamanAkis(k: Kosu, dt: number): "boss" | null {
  if (k.faz == "bitti" || k.faz == "boss") return null;
  k.zaman += dt;
  k.kalan = Math.max(0, k.kalan - dt);
  if (k.kalan <= 0 && !k.sonNefes && pasifSayisi(k, "sonnefes")) {
    // bir kez: +90 sn, bedeli boss hedefinin %3 sıkılaşması (bossHedefi)
    k.sonNefes = true;
    k.kalan = 90;
  }
  return k.kalan <= 0 ? "boss" : null;
}

/** XP ekle; atlanan her seviye bir seçim hakkı verir */
function xpEkle(k: Kosu, xp: number) {
  k.xp += Math.round(xp * (1 + 0.25 * pasifSayisi(k, "ogrenci")));
  while (k.xp >= seviyeXp(k.seviye + 1)) {
    k.seviye++;
    k.bekleyenSecim++;
  }
}

export interface EtkinlikSonucu {
  xp: number;
  para: number;
  gecti: boolean;
  seviyeAtladi: boolean;
  ekSure: number;
  /** kaçırınca boss süresinden düşen (sn) */
  ceza: number;
  /** drift kaporasının sonucu (drift değilse null) */
  kapora: KaporaSonucu | null;
}

/** etkinlik bitti: seçilen risk kademesinde geçti ya da kaçırdı; ödül, ceza ve seviye. Etkinlik bir kez oynanır */
export function etkinlikBitti(k: Kosu, id: number, gecti: boolean, risk: Risk = 0): EtkinlikSonucu | null {
  const e = k.etkinlikler.find((q) => q.id == id);
  if (!e || e.yapildi) return null;
  e.yapildi = true;
  k.tamamlanan++;
  const R = RISKLER[risk],
    o = ETKINLIK_ODULU(e.sev),
    kumar = risk == 2 && pasifSayisi(k, "kumarbaz") > 0,
    pay = gecti ? (kumar ? 5 : R.odul) : R.kacirma,
    ceza = gecti ? 0 : R.ceza * (kumar ? 2 : 1),
    seviye0 = k.seviye;
  k.kalan = Math.max(0, k.kalan - ceza);
  xpEkle(k, o.xp * pay);
  const para = Math.round(o.para * pay * (1 + 0.25 * pasifSayisi(k, "tuccar")));
  k.para += para;
  const ekSure = gecti ? 20 * pasifSayisi(k, "zaman") : 0;
  k.govde = Math.min(GOVDE.tam, k.govde + 12 * pasifSayisi(k, "tamirci"));
  k.kalan += ekSure;
  const kapora = kaporaUygula(k, e, gecti);
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = secenekCek(k);
    if (!k.secenekler.length) {
      k.bekleyenSecim = 0;
      k.faz = "surus";
    }
  }
  return { xp: k.xp, para, gecti, seviyeAtladi: k.seviye > seviye0, ekSure, ceza, kapora };
}

export const parcaFiyati = (k: Pick<Kosu, "pasifler">, sv: number, id = "") =>
  Math.round(
    PARCA_FIYAT[sv] *
      (NADIR_PARCALAR.includes(id) ? NADIR_EK : 1) *
      (1 - 0.1 * pasifSayisi(k as Kosu, "tuccar")),
  );

/** atölyede stoktaki parçayı al (aynı kategorideki eski parçanın yerine geçme oyun tarafında parcalariDuzenle ile) */
export function parcaAl(k: Kosu, id: string, sv: number): boolean {
  const f = parcaFiyati(k, sv, id);
  if (k.para < f || k.parcalar.includes(id) || !k.stok.includes(id)) return false;
  k.stok = k.stok.filter((q) => q != id);
  k.para -= f;
  k.parcalar.push(id);
  return true;
}

/** boss yarışına giriş (süre doldu ya da oyuncu erken meydan okudu) */
export function bossaGir(k: Kosu) {
  if (k.faz == "bitti") return;
  k.faz = "boss";
}

/** boss yarışı bitti: kazanırsa sonraki bölge (yeni boss, süre, etkinlikler), kaybederse koşu biter */
export function bossBitti(k: Kosu, kazandi: boolean, pistler: readonly PistAdayi[]) {
  if (k.faz != "boss") return;
  if (!kazandi) {
    k.faz = "bitti";
    return;
  }
  k.yenilenBoss++;
  k.bolge++;
  const kalanlar = BOSSLAR.filter((b) => b.id != k.boss.id);
  k.boss = sec(k.rng, kalanlar);
  k.kalan = BOSS_SURESI(k.bolge);
  k.sonNefes = false;
  k.para += 200;
  xpEkle(k, 150);
  etkinlikDiz(k, pistler);
  sandikDiz(k);
  stokDiz(k);
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = secenekCek(k);
    if (k.secenekler.length) return;
    k.bekleyenSecim = 0;
  }
  k.faz = "surus";
}

/**
 * boss hedefi ölçülmüş referanstan (issue #16, docs/denge/2026-10-26-mutant-olcum.json): bölge 1 stok aracın sonucu
 * (+%5 pay: başlangıç aracıyla geçilir); bölge 2 dengeli ya da uzman build'in iyisi (+%2: yatırım ister); bölge 3+
 * nadir motor + uzmanlık birleşik build'in sonucu (+%2: ölçümle ulaşılabilir). Bölge 3 boss'u yalnız tek yolun (nadir
 * motor ya da uzman tek başına) hedefi geçemediği pistlerden seçilir. Referans tek tur; boss tur sayısıyla çarpılır.
 */
export const BOSS_PAY = [1.05, 1.02, 1.02];
function bossReferansi(bolge: number, r: Referans, drift: boolean) {
  const iyi = (a: number, b: number) => (drift ? Math.max(a, b) : Math.min(a, b));
  return bolge <= 1 ? r.stok : bolge == 2 ? iyi(r.dengeli, r.uzman) : r.birlesik;
}

/** bölge 3 hedefini nadir motor da uzman da tek başına geçemiyor mu (tek tur, pay dahil) */
export function tekYolYetmez(ty: YarisTuru, r: Referans) {
  const d = ty == "dp",
    h = d ? r.birlesik / BOSS_PAY[2] : r.birlesik * BOSS_PAY[2],
    gecer = (v: number) => (d ? v >= h : v <= h);
  return !gecer(r.nadir) && !gecer(r.uzman);
}

/** boss olabilen pistler: türde, referansı ölçülmüş; bölge 1'de türün kolay yarısı */
export function bossAdaylari(ty: YarisTuru, bolge: number, pistler: readonly PistAdayi[], hava?: string) {
  const tur = pistler.filter((p) => p.ty == ty).sort((a, b) => a.sev - b.sev || a.i - b.i),
    // yağmurlu boss: yağmurda ölçülmüş pist varsa yalnız onlar (güneş referansı yağmurda geçilemeyebilir)
    yagmurlu = hava == "rain" ? tur.filter((p) => p.refYagmur) : [],
    olculen = yagmurlu.length ? yagmurlu : tur.filter((p) => pistReferansi(p, hava)),
    // ölçülmüş pist yoksa (yeni tür) türün bütün pistleri; hedef yıldızdan gelir
    l = olculen.length ? olculen : tur;
  if (bolge <= 1) return l.slice(0, Math.max(1, Math.ceil(l.length / 2)));
  if (bolge == 2) return l;
  // bölge 3+: tek yolun yetmediği pistler (yoksa bütün ölçülenler: açık risk, ölçüm raporu)
  const zor = l.filter((p) => {
    const r = pistReferansi(p, hava);
    return r && tekYolYetmez(ty, r);
  });
  return zor.length ? zor : l;
}

/** boss yarışının pisti: aday listesinden tohumla; aynı tohum ve bölgeyle aynı */
export function bossPisti(k: Kosu, pistler: readonly PistAdayi[]): number {
  const aday = bossAdaylari(k.boss.ty, k.bolge, pistler, k.boss.hava);
  return aday[Math.floor(mulberry32(k.tohum + k.bolge * 977)() * aday.length)].i;
}

/** boss hedefi (bütün turlar): referansın bölge kademesi; süre yarışında pay kadar uzun, driftte o kadar düşük */
export function bossHedefi(
  k: Pick<Kosu, "bolge" | "boss"> & { sonNefes?: boolean },
  p: Pick<PistAdayi, "ty" | "ref" | "refYagmur" | "ys" | "laps">,
) {
  // son nefes kullanıldıysa hedef %3 sıkı (süre yarışında kısa, driftte yüksek)
  const nefes = k.sonNefes ? 0.97 : 1,
    pay = BOSS_PAY[Math.min(2, k.bolge - 1)] * nefes,
    drift = p.ty == "dp";
  const ref = pistReferansi(p, k.boss.hava);
  if (!ref) {
    const y = p.ys[Math.min(2, k.bolge - 1)];
    return drift ? y / nefes : y * nefes;
  }
  const r = bossReferansi(k.bolge, ref, drift) * (p.laps ?? 1) * k.boss.hedef;
  return drift ? Math.round(r / pay) : r * pay;
}

/** harita etkinliği tek tur (geri sayıma sığsın): hedef seçilen risk kademesinin yıldızı, tur başına */
export function etkinlikHedefi(p: Pick<PistAdayi, "ty" | "ys" | "laps">, risk: Risk) {
  const tur = p.laps && p.laps > 1 ? p.laps : 1,
    y = p.ys[risk] / tur;
  return { laps: p.laps ? 1 : p.laps, limit: p.ty == "dp" ? Math.round(y) : y };
}
