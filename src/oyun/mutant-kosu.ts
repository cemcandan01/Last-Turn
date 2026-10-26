// MUTANT koşusu (A1, saf: DOM ve oyun durumu yok). Kötü bir araç ve başlangıç pasifi seçilir, açık dünyaya atılır;
// koşu başında rastgele seçilen boss'a geri sayım işler. Haritadaki etkinlikler (mevcut pistler) XP ve para verir;
// XP seviye atlatır (3 pasiften 1), para atölyede parça alır. Süre bitince ya da oyuncu isterse boss yarışı:
// kazanırsa sonraki bölge (daha zor boss), kaybederse koşu biter. Ekonomi kariyerden ayrıdır.
import type { Arac, YarisTuru } from "../arac/araclar";
import { PARCALAR } from "../arac/parcalar";
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";

/** etkinliğe aday pist: oyundaki EVENTS'in özeti (saf modül oyun verisine bağlanmasın diye) */
export interface PistAdayi {
  i: number;
  ty: YarisTuru;
  sev: number;
  /** yıldız eşikleri [1★, 2★, 3★] (bütün turlar için; süre ya da drift puanı) ve tur sayısı */
  ys: number[];
  laps?: number;
  /** ölçülmüş referans (tests/olcum/mutant.test.ts, bütün turlar): stok / dengeli / uzman build sonucu. Yoksa pist
   *  boss olamaz (pilot temiz bitiremedi ya da ölçülmedi) */
  ref?: Referans;
}

/** referans sonuç: süre yarışında saniye, driftte puan */
export interface Referans {
  stok: number;
  dengeli: number;
  uzman: number;
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
}

/**
 * gövde (issue #16 risk bedeli): sürüş hatası aracı gerçekten yıpratır. Sert çarpma ve spin gövdeden düşer; düşük gövde
 * motor gücünü azaltır (en çok %30), 0 olunca araç pert ve koşu biter. Atölyede parayla tamir.
 */
export const GOVDE = { tam: 100, carpma: 12, spin: 8, gucKaybi: 0.3, tamirFiyati: 3 };

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
];
export const pasifBul = (id: string) => PASIFLER.find((p) => p.id === id);

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
  /** biten etkinlik / boss sayısı (özet) */
  tamamlanan: number;
  yenilenBoss: number;
  /** koşu sürüşte geçen toplam süre */
  zaman: number;
  /** gövde (0-100) ve hasar dökümü (özet: koşu neden kaybedildi) */
  govde: number;
  carpma: number;
  spin: number;
  /** pert olduysa true (koşu bitti) */
  pert: boolean;
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
    tamamlanan: 0,
    yenilenBoss: 0,
    zaman: 0,
    govde: GOVDE.tam,
    carpma: 0,
    spin: 0,
    pert: false,
  };
  k.secenekler = pasifCek(k, 3);
  etkinlikDiz(k, pistler);
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

/** başlangıç ya da seviye seçimi: pasifi al; bekleyen seçim varsa yeni seçenekler, yoksa sürüşe dön */
export function pasifSec(k: Kosu, id: string): boolean {
  if ((k.faz != "basla" && k.faz != "secim") || !k.secenekler.includes(id)) return false;
  k.pasifler.push(id);
  if (k.faz == "secim") k.bekleyenSecim = Math.max(0, k.bekleyenSecim - 1);
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = pasifCek(k, 3);
    if (k.secenekler.length) return true;
  }
  k.faz = "surus";
  k.secenekler = [];
  return true;
}

/** aracın koşu değerleri: (parçalı) araç kopyası + pasif kademeleri + gövde hasarının güç kaybı */
export function kosuAraci(taban: Arac, k: Pick<Kosu, "pasifler"> & { govde?: number }): Arac {
  const c: Arac = { ...taban, gr: [taban.gr[0], taban.gr[1]] };
  for (const id of k.pasifler) pasifBul(id)?.arac?.(c);
  const g = Math.max(0, Math.min(GOVDE.tam, k.govde ?? GOVDE.tam)) / GOVDE.tam;
  c.hp *= 1 - GOVDE.gucKaybi * (1 - g);
  return c;
}

/** hasar: sert çarpma ya da spin; zırh azaltır. Gövde 0 olunca pert (koşu biter). Dönen: pert oldu mu */
export function hasarAl(k: Kosu, tur: "carpma" | "spin"): boolean {
  if (k.faz == "bitti" || k.pert) return false;
  const h = GOVDE[tur] * (1 - 0.35 * pasifSayisi(k, "zirh"));
  k[tur]++;
  k.govde = Math.max(0, k.govde - h);
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
}

/** etkinlik bitti: seçilen risk kademesinde geçti ya da kaçırdı; ödül, ceza ve seviye. Etkinlik bir kez oynanır */
export function etkinlikBitti(k: Kosu, id: number, gecti: boolean, risk: Risk = 0): EtkinlikSonucu | null {
  const e = k.etkinlikler.find((q) => q.id == id);
  if (!e || e.yapildi) return null;
  e.yapildi = true;
  k.tamamlanan++;
  const R = RISKLER[risk],
    o = ETKINLIK_ODULU(e.sev),
    pay = gecti ? R.odul : R.kacirma,
    seviye0 = k.seviye;
  if (!gecti) k.kalan = Math.max(0, k.kalan - R.ceza);
  xpEkle(k, o.xp * pay);
  const para = Math.round(o.para * pay * (1 + 0.25 * pasifSayisi(k, "tuccar")));
  k.para += para;
  const ekSure = gecti ? 20 * pasifSayisi(k, "zaman") : 0;
  k.govde = Math.min(GOVDE.tam, k.govde + 12 * pasifSayisi(k, "tamirci"));
  k.kalan += ekSure;
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = pasifCek(k, 3);
    if (!k.secenekler.length) {
      k.bekleyenSecim = 0;
      k.faz = "surus";
    }
  }
  return { xp: k.xp, para, gecti, seviyeAtladi: k.seviye > seviye0, ekSure, ceza: gecti ? 0 : R.ceza };
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
  k.para += 200;
  xpEkle(k, 150);
  etkinlikDiz(k, pistler);
  stokDiz(k);
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = pasifCek(k, 3);
    if (k.secenekler.length) return;
    k.bekleyenSecim = 0;
  }
  k.faz = "surus";
}

/**
 * boss hedefi ölçülmüş referanstan (issue #16): bölge 1 stok aracın, bölge 2 dengeli build'in, bölge 3+ türe uzman
 * build'in sonucu; pay insanın pisti ilk kez sürmesi için. İlk boss başlangıç aracıyla geçilir, sonrakiler yatırım ve
 * boss'a uygun parça ister; tek motor parçası uzman hedefini geçemez (ölçüm raporu).
 */
export const BOSS_PAY = [1.05, 1.02, 1];
const bossKademe = (bolge: number) => (bolge <= 1 ? "stok" : bolge == 2 ? "dengeli" : "uzman");

/** boss olabilen pistler: türde, referansı ölçülmüş; bölge 1'de türün kolay yarısı */
export function bossAdaylari(ty: YarisTuru, bolge: number, pistler: readonly PistAdayi[]) {
  const tur = pistler.filter((p) => p.ty == ty).sort((a, b) => a.sev - b.sev || a.i - b.i),
    olculen = tur.filter((p) => p.ref),
    // ölçülmüş pist yoksa (yeni tür) türün bütün pistleri; hedef yıldızdan gelir
    l = olculen.length ? olculen : tur;
  return bolge <= 1 ? l.slice(0, Math.max(1, Math.ceil(l.length / 2))) : l;
}

/** boss yarışının pisti: aday listesinden tohumla; aynı tohum ve bölgeyle aynı */
export function bossPisti(k: Kosu, pistler: readonly PistAdayi[]): number {
  const aday = bossAdaylari(k.boss.ty, k.bolge, pistler);
  return aday[Math.floor(mulberry32(k.tohum + k.bolge * 977)() * aday.length)].i;
}

/** boss hedefi (bütün turlar): referansın bölge kademesi; süre yarışında pay kadar uzun, driftte o kadar düşük */
export function bossHedefi(k: Pick<Kosu, "bolge" | "boss">, p: Pick<PistAdayi, "ty" | "ref" | "ys">) {
  const pay = BOSS_PAY[Math.min(2, k.bolge - 1)];
  if (!p.ref) return p.ys[Math.min(2, k.bolge - 1)];
  const r = p.ref[bossKademe(k.bolge)] * k.boss.hedef;
  return p.ty == "dp" ? Math.round(r / pay) : r * pay;
}

/** harita etkinliği tek tur (geri sayıma sığsın): hedef seçilen risk kademesinin yıldızı, tur başına */
export function etkinlikHedefi(p: Pick<PistAdayi, "ty" | "ys" | "laps">, risk: Risk) {
  const tur = p.laps && p.laps > 1 ? p.laps : 1,
    y = p.ys[risk] / tur;
  return { laps: p.laps ? 1 : p.laps, limit: p.ty == "dp" ? Math.round(y) : y };
}
