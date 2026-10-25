// Modifiye parçaları (saf veri + uygulama): her parça aracın fizik değerlerini (güç, kütle, tutuş, aero, fren,
// çekiş, turbo) ve sürüş kurulumunun parça alanlarını (lastik, süspansiyon, diferansiyel, direksiyon açısı)
// değiştirir. Takılı parça yoksa araç stoktur: aracKur aynı araç nesnesini ve aracın kendi önayarını verir, fizik
// bugünküyle birebir aynıdır.
// Kurallar: her kategoride tek parça (son takılan geçer); sökülen parçanın yerine stok değer döner. Paketler
// (asfalt, rallikros, ralli, drift, drag) üç çekirdek parçanın birleşimidir: çekirdek parçalar takıldıkça araç o
// türe uyum kazanır (tür uyumu: o türün pistinde tutuş ve güç çarpanı, stok tür aracının uzmanlığına kadar).
// Performans puanı parçalarla birlikte src/arac/performans.ts'te hesaplanır.
import type { SurusKurulumu } from "../fizik/tipler";
import { LEVELS, PRESETS, type Ayarlar, type OnayarAnahtari, type SeviyeAnahtari } from "../fizik/veriler";
import { CARS, type Arac, type YarisTuru } from "./araclar";

export type ParcaKategori =
  | "motor"
  | "turbo"
  | "sanziman"
  | "lastik"
  | "suspansiyon"
  | "diferansiyel"
  | "fren"
  | "agirlik"
  | "aero"
  | "cekis"
  | "direksiyon"
  | "koruma";

/** kategori adları (arayüz sırası) */
export const KATEGORILER: [ParcaKategori, string][] = [
  ["motor", "Motor"],
  ["turbo", "Turbo / kompresör"],
  ["sanziman", "Şanzıman"],
  ["lastik", "Lastik"],
  ["suspansiyon", "Süspansiyon"],
  ["diferansiyel", "Diferansiyel"],
  ["fren", "Fren"],
  ["agirlik", "Ağırlık"],
  ["aero", "Aerodinamik"],
  ["cekis", "Çekiş"],
  ["direksiyon", "Direksiyon"],
  ["koruma", "Koruma"],
];

export interface ParcaEtkisi {
  /** Komple atmosferik motor değişimi: önceki motor/turbo yerine bu güç gelir. */
  motorHp?: number;
  /** araç değerlerine çarpan: güç, kütle, tepe hız (vites ve sürükleme), fren, bastırma */
  carp?: Partial<Record<"hp" | "kg" | "top" | "brk" | "ae", number>>;
  /** araç değerlerine ekleme: yerden yükseklik (m), ağırlık merkezi yüksekliği (m) */
  ekle?: Partial<Record<"lift" | "hcg", number>>;
  /** zemin tutuşu çarpanı [toprak, asfalt] (süspansiyonun zemine uyumu) */
  gr?: [number, number];
  /** turbo / kompresör: dolu basınçta güç çarpanı; turbo için dolma süresi (sn) ve tam basınç devri oranı */
  turbo?: { guc: number; tbs?: number; tbu?: number };
  /** dört çeker payı (0 arkadan itiş) */
  awd?: number;
  /** ön teker açısı sınırı (rad) */
  dmax?: number;
  /** arka diferansiyelin kenetleme katsayısı (1/s; stok 220) */
  dk?: number;
  /** süspansiyonun doğal frekansı (Hz, ayar yumuşaklığından önce): yay sertliği */
  fq?: number;
  /** lastik (TIRES indeksi) */
  lastik?: number;
  /** sürüş kurulumunun parça alanları (aracın önayarının üstüne yazılır) */
  ayar?: Partial<Ayarlar>;
}

export interface Parca {
  id: string;
  kat: ParcaKategori;
  /** seviye: 0 stoktan zayıf (puan düşürür), 1 sokak, 2 spor, 3 yarış; tür parçaları 2 */
  sv: 0 | 1 | 2 | 3;
  n: string;
  d: string;
  e: ParcaEtkisi;
}

export const PARCALAR: Parca[] = [
  // motor: dolu basınçtaki güç
  {
    id: "motor-kisitli",
    kat: "motor",
    sv: 0,
    n: "Kısıtlayıcı",
    d: "Hava kısıtlayıcı: güç %15 az",
    e: { carp: { hp: 0.85 } },
  },
  {
    id: "motor-sokak",
    kat: "motor",
    sv: 1,
    n: "Sokak motoru",
    d: "Hava filtresi ve egzoz: güç %8 fazla",
    e: { carp: { hp: 1.08 } },
  },
  {
    id: "motor-spor",
    kat: "motor",
    sv: 2,
    n: "Spor motoru",
    d: "Eksantrik ve beyin: güç %16 fazla",
    e: { carp: { hp: 1.16 } },
  },
  {
    id: "motor-yaris",
    kat: "motor",
    sv: 3,
    n: "Yarış motoru",
    d: "Tam yarış motoru: güç %28 fazla",
    e: { carp: { hp: 1.28 } },
  },
  {
    id: "motor-degisim",
    kat: "motor",
    sv: 3,
    n: "Motor değişimi",
    d: "350 HP atmosferik yarış motoru; kütle %5 artar. Sonradan turbo takılabilir.",
    e: { motorHp: 350, carp: { kg: 1.05 } },
  },
  // turbo: turbo gecikir (dolma süresi), kompresör gecikmesiz ama daha az güç verir
  {
    id: "turbo-kucuk",
    kat: "turbo",
    sv: 2,
    n: "Küçük turbo",
    d: "Çabuk dolar: güç %12 fazla, az gecikme",
    e: { turbo: { guc: 1.12, tbs: 0.45, tbu: 0.5 } },
  },
  {
    id: "turbo-buyuk",
    kat: "turbo",
    sv: 3,
    n: "Büyük turbo",
    d: "Geç dolar, tepede sert: güç %70 fazla, belirgin gecikme",
    e: { turbo: { guc: 1.7, tbs: 1.1, tbu: 0.72 } },
  },
  {
    id: "kompresor",
    kat: "turbo",
    sv: 2,
    n: "Kompresör",
    d: "Gecikmesiz: güç %10 fazla",
    e: { turbo: { guc: 1.1 } },
  },
  // şanzıman: kısa oran ivme, uzun oran tepe hız
  {
    id: "sanziman-kisa",
    kat: "sanziman",
    sv: 2,
    n: "Kısa şanzıman",
    d: "Kısa oranlar: çıkış güçlü, tepe hız %7 az",
    e: { carp: { top: 0.93 } },
  },
  {
    id: "sanziman-uzun",
    kat: "sanziman",
    sv: 2,
    n: "Uzun şanzıman",
    d: "Uzun oranlar: tepe hız %7 fazla, çıkış yavaş",
    e: { carp: { top: 1.07 } },
  },
  // lastik: bileşen kayma eğrisini ve zemine göre tutuşu belirler
  {
    id: "lastik-sokak",
    kat: "lastik",
    sv: 1,
    n: "Sokak lastiği",
    d: "Asfaltta orta tutuş, sınırda affedici",
    e: { lastik: 4 },
  },
  {
    id: "lastik-spor",
    kat: "lastik",
    sv: 2,
    n: "Spor lastik",
    d: "Asfaltta iyi tutuş, toprakta zayıf",
    e: { lastik: 5 },
  },
  {
    id: "lastik-yaris",
    kat: "lastik",
    sv: 3,
    n: "Yarış lastiği",
    d: "Asfaltta en yüksek tutuş, toprakta kayar",
    e: { lastik: 0 },
  },
  {
    id: "lastik-toprak",
    kat: "lastik",
    sv: 2,
    n: "Toprak lastiği",
    d: "Toprakta tam tutuş, asfaltta yavaş",
    e: { lastik: 1 },
  },
  {
    id: "lastik-karisik",
    kat: "lastik",
    sv: 2,
    n: "Karışık lastik",
    d: "Asfalt ve toprak arası, uçlarda zayıf",
    e: { lastik: 2 },
  },
  {
    id: "lastik-drift",
    kat: "lastik",
    sv: 2,
    n: "Drift lastiği",
    d: "Yanlamasına uzun ve yumuşak kayar, ileri çekişi iyi",
    e: { lastik: 3 },
  },
  {
    id: "lastik-drag",
    kat: "lastik",
    sv: 2,
    n: "Drag lastiği",
    d: "Kalkışta çok güçlü çekiş, virajda zayıf",
    e: { lastik: 6 },
  },
  // süspansiyon: yay sertliği (susp yüksek = yumuşak), yükseklik, zemine uyum
  {
    id: "suspansiyon-sokak",
    kat: "suspansiyon",
    sv: 0,
    n: "Sokak süspansiyonu",
    d: "Yumuşak ve yüksek: virajda yatar",
    e: { fq: 1.8, ayar: { susp: 1.15 }, ekle: { hcg: 0.03 }, gr: [1, 0.95] },
  },
  {
    id: "suspansiyon-spor",
    kat: "suspansiyon",
    sv: 2,
    n: "Spor süspansiyon",
    d: "Sert ve alçak: asfaltta az yatar",
    e: { fq: 2.2, ayar: { susp: 0.85 }, ekle: { lift: -0.02, hcg: -0.02 }, gr: [0.97, 1.02] },
  },
  {
    id: "suspansiyon-yaris",
    kat: "suspansiyon",
    sv: 3,
    n: "Yarış süspansiyonu",
    d: "Çok sert ve alçak: asfaltta keskin, kerbde ve toprakta zıplar",
    e: { fq: 2.4, ayar: { susp: 0.7 }, ekle: { lift: -0.04, hcg: -0.04 }, gr: [0.9, 1.04] },
  },
  {
    id: "suspansiyon-ralli",
    kat: "suspansiyon",
    sv: 2,
    n: "Ralli süspansiyonu",
    d: "Uzun ve yumuşak: tümsekte ve toprakta tutunur, asfaltta yatar",
    e: { fq: 1.6, ayar: { susp: 1.4 }, ekle: { lift: 0.06, hcg: 0.03 }, gr: [1.06, 0.95] },
  },
  {
    id: "suspansiyon-rallikros",
    kat: "suspansiyon",
    sv: 2,
    n: "Rallikros süspansiyonu",
    d: "Orta uzun, sıkı: atlamada ve karışık zeminde dengeli",
    e: { fq: 1.9, ayar: { susp: 1.15 }, ekle: { lift: 0.03 }, gr: [1.04, 0.98] },
  },
  {
    id: "suspansiyon-drift",
    kat: "suspansiyon",
    sv: 2,
    n: "Drift süspansiyonu",
    d: "Sert arka, yüksek arka basınç: arka kolay kayar",
    e: { fq: 2.1, ayar: { susp: 1.2, tpr: 1.18, bal: 0.92 } },
  },
  {
    id: "suspansiyon-drag",
    kat: "suspansiyon",
    sv: 2,
    n: "Drag süspansiyonu",
    d: "Sert yay, düşük arka lastik basıncı: kalkışta arka tekerler yere basar; virajda ağır",
    e: { fq: 2.2, ayar: { susp: 1, tpf: 1.1, tpr: 0.9, bal: 1.1 }, ekle: { lift: 0.02 } },
  },
  // diferansiyel: kilit arttıkça gaz arkayı kolay kaydırır (drift başlatma), açık diferansiyel kararlı
  {
    id: "diferansiyel-acik",
    kat: "diferansiyel",
    sv: 0,
    n: "Açık diferansiyel",
    d: "Kararlı, gazla zor kayar; çıkışta iç teker boşa döner",
    e: { ayar: { diff: 0.2 }, dk: 8 },
  },
  {
    id: "diferansiyel-lsd",
    kat: "diferansiyel",
    sv: 2,
    n: "Yol LSD",
    d: "Sınırlı kaymalı: virajdan çıkışta dengeli çekiş",
    e: { ayar: { diff: 0.5 }, dk: 35 },
  },
  {
    id: "diferansiyel-ralli",
    kat: "diferansiyel",
    sv: 2,
    n: "Ralli diferansiyeli",
    d: "Sıkı kilit: gevşek zeminde iki teker birlikte çeker",
    e: { ayar: { diff: 0.75 }, dk: 90 },
  },
  {
    id: "diferansiyel-kilitli",
    kat: "diferansiyel",
    sv: 2,
    n: "Kilitli diferansiyel",
    d: "Kaynaklı: gaz arkayı hemen kaydırır (drift)",
    e: { ayar: { diff: 1.15 }, dk: 260 },
  },
  // fren
  {
    id: "fren-sokak",
    kat: "fren",
    sv: 0,
    n: "Sokak freni",
    d: "Fren gücü %15 az",
    e: { carp: { brk: 0.85 } },
  },
  {
    id: "fren-spor",
    kat: "fren",
    sv: 2,
    n: "Spor fren",
    d: "Fren gücü %12 fazla",
    e: { carp: { brk: 1.12 } },
  },
  {
    id: "fren-yaris",
    kat: "fren",
    sv: 3,
    n: "Yarış freni",
    d: "Karbon diskler: fren gücü %25 fazla",
    e: { carp: { brk: 1.25 } },
  },
  // ağırlık
  {
    id: "agirlik-balast",
    kat: "agirlik",
    sv: 0,
    n: "Balast",
    d: "%8 ağır: her şey biraz yavaşlar",
    e: { carp: { kg: 1.08 } },
  },
  {
    id: "agirlik-1",
    kat: "agirlik",
    sv: 1,
    n: "Hafifletme 1",
    d: "Gereksiz parçalar sökülür: %5 hafif",
    e: { carp: { kg: 0.95 } },
  },
  {
    id: "agirlik-2",
    kat: "agirlik",
    sv: 2,
    n: "Hafifletme 2",
    d: "Hafif koltuk ve camlar: %10 hafif",
    e: { carp: { kg: 0.9 } },
  },
  {
    id: "agirlik-3",
    kat: "agirlik",
    sv: 3,
    n: "Karbon gövde",
    d: "%15 hafif, ağırlık merkezi alçak",
    e: { carp: { kg: 0.85 }, ekle: { hcg: -0.02 } },
  },
  // aerodinamik: bastırma yüksek hızda tutuş verir, sürükleme tepe hızı düşürür
  {
    id: "aero-dusuk",
    kat: "aero",
    sv: 1,
    n: "Düşük sürükleme",
    d: "Az bastırma: tepe hız %2 fazla, hızlı virajda az tutuş",
    e: { carp: { ae: 0.5, top: 1.02 } },
  },
  {
    id: "aero-yaris",
    kat: "aero",
    sv: 2,
    n: "Yarış kanadı",
    d: "Bastırma %40 fazla, tepe hız %2 az",
    e: { carp: { ae: 1.4, top: 0.98 } },
  },
  {
    id: "aero-buyuk",
    kat: "aero",
    sv: 3,
    n: "Büyük kanat",
    d: "Bastırma neredeyse iki kat, tepe hız %5 az",
    e: { carp: { ae: 1.9, top: 0.95 } },
  },
  // çekiş dönüşümü
  {
    id: "cekis-arka",
    kat: "cekis",
    sv: 2,
    n: "Arkadan itiş",
    d: "Güç yalnız arkaya: drift kolay, kalkış zayıf",
    e: { awd: 0 },
  },
  {
    id: "cekis-dort",
    kat: "cekis",
    sv: 2,
    n: "Dört çeker",
    d: "Gücün yarısı öne: kalkış ve toprakta güçlü, 60 kg ağır",
    e: { awd: 0.45 },
  },
  // direksiyon
  {
    id: "aci-kiti",
    kat: "direksiyon",
    sv: 2,
    n: "Açı kiti",
    d: "Teker açısı 57°: büyük drift açısından karşı direksiyonla kurtarır",
    e: { ayar: { lock: 0.95 }, dmax: 1.0 },
  },
  // koruma
  {
    id: "koruma",
    kat: "koruma",
    sv: 2,
    n: "Alt koruma",
    d: "Karter ve şasi koruması: 30 kg, gövde yüksek",
    e: { carp: { kg: 1.025 }, ekle: { lift: 0.02 } },
  },
];

export const parcaBul = (id: string) => PARCALAR.find((p) => p.id == id);

export interface Paket {
  id: string;
  /** uyum kazandırdığı yarış türü */
  tur: YarisTuru;
  n: string;
  d: string;
  /** çekirdek parçalar (her biri tür uyumunun üçte biri) */
  parcalar: string[];
  /** önerilen ek parçalar (uyuma girmez): toprakta dört çeker, driftte arkadan itiş */
  oneri: string[];
}

export const PAKETLER: Paket[] = [
  {
    id: "asfalt",
    tur: "gp",
    n: "Asfalt paketi",
    d: "Yarış lastiği, yarış süspansiyonu, yarış kanadı",
    parcalar: ["lastik-yaris", "suspansiyon-yaris", "aero-yaris"],
    oneri: [],
  },
  {
    id: "rallikros",
    tur: "rx",
    n: "Rallikros paketi",
    d: "Toprak lastiği, rallikros süspansiyonu, ralli diferansiyeli",
    parcalar: ["lastik-toprak", "suspansiyon-rallikros", "diferansiyel-ralli"],
    oneri: ["cekis-dort"],
  },
  {
    id: "ralli",
    tur: "rl",
    n: "Ralli paketi",
    d: "Toprak lastiği, uzun ralli süspansiyonu, alt koruma",
    parcalar: ["lastik-toprak", "suspansiyon-ralli", "koruma"],
    oneri: ["cekis-dort"],
  },
  {
    id: "drift",
    tur: "dp",
    n: "Drift paketi",
    d: "Drift lastiği, kilitli diferansiyel, açı kiti",
    parcalar: ["lastik-drift", "diferansiyel-kilitli", "aci-kiti"],
    oneri: ["cekis-arka"],
  },
  {
    id: "drag",
    tur: "dg",
    n: "Drag paketi",
    d: "Drag lastiği, kısa şanzıman, drag süspansiyonu",
    parcalar: ["lastik-drag", "sanziman-kisa", "suspansiyon-drag"],
    oneri: [],
  },
];

/** türün önayar ailesi: paket ağır basınca yardım sınırları ve drift eşiği bu önayardan */
const TUR_ONAYAR: Record<YarisTuru, OnayarAnahtari> = { gp: "ar", rx: "tr", rl: "rl", dp: "dr", dg: "dg" };

/** parça listesini düzenle: bilinmeyenler atılır, her kategoride son takılan kalır (sıra kategori sırası) */
export function parcalariDuzenle(ids: readonly string[]): string[] {
  const kat = new Map<ParcaKategori, string>();
  for (const id of ids) {
    const p = parcaBul(id);
    if (p) kat.set(p.kat, id);
  }
  return KATEGORILER.map(([k]) => kat.get(k)).filter((x): x is string => !!x);
}

/** iki parça birlikte takılabilir mi (aynı kategoride tek parça) */
export const birlikteOlur = (a: string, b: string) => parcaBul(a)?.kat != parcaBul(b)?.kat;

/** paketin araca takılmış hâli: aynı kategorideki eski parçaların yerine paketin parçaları */
export const paketTak = (ids: readonly string[], paket: string) =>
  parcalariDuzenle([...ids, ...(PAKETLER.find((p) => p.id == paket)?.parcalar ?? [])]);

export interface SurusParametreleri {
  /** parçaları uygulanmış araç (stokta CARS'taki nesnenin kendisi) */
  car: Arac;
  /**
   * önayar: ayar tabanı (parçalar üstüne yazar), yardım sınırları ve drift eşiği. Aracın kendi önayarı; bir paketin
   * çekirdek parçalarının en az üçte ikisi takılıysa o türün önayarı
   */
  pk: OnayarAnahtari;
  /** lastik (TIRES indeksi) */
  tire: number;
  /** parçaların yazdığı ayar alanları */
  ayar: Partial<Ayarlar>;
  /** her yarış türüne uyum (0-1: paketin çekirdek parçalarından takılı olanların payı) */
  uyum: Partial<Record<YarisTuru, number>>;
  /** düzenlenmiş parça listesi */
  parcalar: string[];
}

/** aracı parçalarıyla kur: fizik değerleri, lastik, ayar alanları, tür uyumu. Parça yoksa stok (aynı nesne) */
export function aracKur(aracNo: number, parcaIdleri: readonly string[] = []): SurusParametreleri {
  const c0 = CARS[aracNo],
    parcalar = parcalariDuzenle(parcaIdleri),
    taban = c0.pk;
  if (!parcalar.length)
    return { car: c0, pk: taban, tire: PRESETS[taban].tire, ayar: {}, uyum: {}, parcalar };
  const c: Arac = { ...c0, gr: [c0.gr[0], c0.gr[1]] },
    ayar: Partial<Ayarlar> = {};
  let tire = PRESETS[taban].tire;
  for (const id of parcalar) {
    const e = parcaBul(id)!.e;
    if (e.motorHp != null) {
      c.hp = e.motorHp;
      c.tb = 0;
      delete c.tbs;
      delete c.tbu;
    }
    if (e.carp) for (const k in e.carp) c[k as "hp"] *= e.carp[k as "hp"]!;
    if (e.ekle) {
      // yükseltme: yerden yükseklik parçanın değerine çıkar, zaten yüksek araç yükselmez ve ağırlık merkezi de o oranda
      // yükselir (ralli aracına ralli süspansiyonu / alt koruma takınca devrilmeye yatkın olmasın); alçaltma her araçta işler
      let hcgPay = 1;
      if (e.ekle.lift) {
        const once = c.lift || 0;
        c.lift = e.ekle.lift > 0 ? Math.max(once, e.ekle.lift) : once + e.ekle.lift;
        if (e.ekle.lift > 0) hcgPay = (c.lift - once) / e.ekle.lift;
      }
      if (e.ekle.hcg) c.hcg = (c.hcg ?? 0.48) + e.ekle.hcg * (e.ekle.hcg > 0 ? hcgPay : 1);
    }
    if (e.gr) c.gr = [c.gr[0] * e.gr[0], c.gr[1] * e.gr[1]];
    if (e.awd != null) {
      // arkadan itişten dört çekere geçişte ön aktarma organları eklenir
      if (e.awd > 0 && c0.awd == 0) c.kg *= 1.05;
      c.awd = e.awd;
    }
    if (e.dmax != null) c.dmax = e.dmax;
    if (e.dk != null) c.dk = e.dk;
    if (e.fq != null) c.fq = e.fq;
    if (e.lastik != null) tire = e.lastik;
    if (e.ayar) Object.assign(ayar, e.ayar);
  }
  // turbo / kompresör en son: güç çarpanı motor parçasının üstüne gelir
  const tp = parcalar.map((id) => parcaBul(id)!.e.turbo).find((t) => t);
  if (tp) {
    c.hp *= tp.guc;
    if (tp.tbs != null) {
      // turbo: basınçsız güç aynı kalır, eklenen güç basınçtan gelir
      c.tb = 1 - (1 - (c.tb ?? 0)) / tp.guc;
      c.tbs = tp.tbs;
      c.tbu = tp.tbu ?? c0.tbu;
    }
  }
  // paketin çekirdek parçalarından takılı olanların payı (yalnız önayar ailesini seçer; pist türüne göre tutuş/güç çarpanı yok)
  const uyum: Partial<Record<YarisTuru, number>> = {};
  let agir: YarisTuru | null = null;
  for (const p of PAKETLER) {
    const f = p.parcalar.filter((id) => parcalar.includes(id)).length / p.parcalar.length;
    if (f > 0) uyum[p.tur] = f;
    if (f >= 2 / 3 && (!agir || f > uyum[agir]!)) agir = p.tur;
  }
  // paket ağır basınca (çekirdek parçaların en az üçte ikisi) ayar tabanı da o türün önayarı olur: drift aracına asfalt
  // paketi takılınca kilitli diferansiyel ve yüksek arka basınç kalmaz
  const pk = agir ? TUR_ONAYAR[agir] : taban;
  return { car: c, pk, tire, ayar, uyum, parcalar };
}

/** parçalı aracın sürüş kurulumu (oyundaki applyPreset gibi): taban önayar + parça ayarları, yardım seviyesi */
export function parcaliKurulum(
  aracNo: number,
  parcaIdleri: readonly string[],
  lk: SeviyeAnahtari,
  ss = 1,
  sm = 1,
): SurusKurulumu {
  const P = aracKur(aracNo, parcaIdleri),
    p = PRESETS[P.pk],
    as = { ...LEVELS[lk].v };
  if (p.ast) for (const k in p.ast) as[k] = Math.max(as[k], p.ast[k]!);
  if (p.cap) for (const k in p.cap) as[k] = Math.min(as[k], p.cap[k]!);
  return {
    car: P.car,
    pk: P.pk,
    tire: P.tire,
    tu: { ...p.v, ...P.ayar } as Ayarlar,
    as,
    ss,
    sm,
  };
}
