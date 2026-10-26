// MUTANT koşusu (A1, saf: DOM ve oyun durumu yok). Kötü bir araç ve başlangıç pasifi seçilir, açık dünyaya atılır;
// koşu başında rastgele seçilen boss'a geri sayım işler. Haritadaki etkinlikler (mevcut pistler) XP ve para verir;
// XP seviye atlatır (3 pasiften 1), para atölyede parça alır. Süre bitince ya da oyuncu isterse boss yarışı:
// kazanırsa sonraki bölge (daha zor boss), kaybederse koşu biter. Ekonomi kariyerden ayrıdır.
import type { Arac, YarisTuru } from "../arac/araclar";
import { mulberry32, type Rastgele } from "../cekirdek/rastgele";

/** etkinliğe aday pist: oyundaki EVENTS'in özeti (saf modül oyun verisine bağlanmasın diye) */
export interface PistAdayi {
  i: number;
  ty: YarisTuru;
  sev: number;
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
  /** boss yarışında hedef çarpanı: süre yarışında hedef süre × bu (küçük = zor), driftte hedef puan × bu */
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
    d: "Ralli etabında hedef süresi pistin %92'si",
    yetenekler: ["Toprakta çok hızlı", "Çamurda yavaşlamaz"],
    zayif: "Toprak tutuşu, dört çeker, süspansiyon kazandırır",
    hedef: 0.92,
  },
  {
    id: "drift-kralicesi",
    ad: "Drift Kraliçesi",
    ty: "dp",
    d: "Drift pistinde hedef puanın 1,3 katı",
    yetenekler: ["Uzun kombolar", "Çarpanı hiç düşmez"],
    zayif: "Açı kiti, güç, kombo pasifleri kazandırır",
    hedef: 1.3,
  },
  {
    id: "drag-canavari",
    ad: "Drag Canavarı",
    ty: "dg",
    d: "Drag pistinde hedef süresinin %94'ü",
    yetenekler: ["Kalkışta patinaj yapmaz", "Son metrede nitro"],
    zayif: "Motor, turbo, hafiflik kazandırır",
    hedef: 0.94,
  },
  {
    id: "gece-sahini",
    ad: "Gece Şahini",
    ty: "gp",
    d: "Gece asfalt yarışı, hedef sürenin %93'ü",
    yetenekler: ["Karanlıkta virajı ezbere bilir", "Frene geç basar"],
    zayif: "Fren, asfalt tutuşu kazandırır",
    hedef: 0.93,
    gece: true,
  },
  {
    id: "camur-baronu",
    ad: "Çamur Baronu",
    ty: "rx",
    d: "Yağmurda rallikros, hedef sürenin %94'ü",
    yetenekler: ["Islakta tutunur", "Su birikintisinde yavaşlamaz"],
    zayif: "Toprak tutuşu, fren, dört çeker kazandırır",
    hedef: 0.94,
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
];
export const pasifBul = (id: string) => PASIFLER.find((p) => p.id === id);

/** XP eşikleri: seviye n için toplam XP */
export const seviyeXp = (n: number) => 80 * n + 30 * n * (n - 1);
/** etkinlik ödülü (pist zorluğu sev 1-6): geçince tam, bitirip kaçırınca %40 */
export const ETKINLIK_ODULU = (sev: number) => ({ xp: 50 + 25 * sev, para: 90 + 45 * sev });
/** atölye fiyatı (parça seviyesi 0-3) */
export const PARCA_FIYAT = [60, 140, 260, 420];
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
  /** seçim ekranındaki pasifler */
  secenekler: string[];
  etkinlikler: Etkinlik[];
  /** biten etkinlik / boss sayısı (özet) */
  tamamlanan: number;
  yenilenBoss: number;
  /** koşu sürüşte geçen toplam süre */
  zaman: number;
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
    secenekler: [],
    etkinlikler: [],
    tamamlanan: 0,
    yenilenBoss: 0,
    zaman: 0,
  };
  k.secenekler = pasifCek(k, 3);
  etkinlikDiz(k, pistler);
  return k;
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

/** aracın koşu değerleri: (parçalı) araç kopyası + pasif kademeleri */
export function kosuAraci(taban: Arac, k: Pick<Kosu, "pasifler">): Arac {
  const c: Arac = { ...taban, gr: [taban.gr[0], taban.gr[1]] };
  for (const id of k.pasifler) pasifBul(id)?.arac?.(c);
  return c;
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
}

/** etkinlik bitti: geçti (hedef) ya da bitirdi ama kaçırdı; ödül ve seviye. Etkinlik bir kez ödül verir */
export function etkinlikBitti(k: Kosu, id: number, gecti: boolean): EtkinlikSonucu | null {
  const e = k.etkinlikler.find((q) => q.id == id);
  if (!e || e.yapildi) return null;
  e.yapildi = true;
  k.tamamlanan++;
  const o = ETKINLIK_ODULU(e.sev),
    pay = gecti ? 1 : 0.4,
    seviye0 = k.seviye;
  xpEkle(k, o.xp * pay);
  const para = Math.round(o.para * pay * (1 + 0.25 * pasifSayisi(k, "tuccar")));
  k.para += para;
  const ekSure = gecti ? 20 * pasifSayisi(k, "zaman") : 0;
  k.kalan += ekSure;
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = pasifCek(k, 3);
    if (!k.secenekler.length) {
      k.bekleyenSecim = 0;
      k.faz = "surus";
    }
  }
  return { xp: k.xp, para, gecti, seviyeAtladi: k.seviye > seviye0, ekSure };
}

export const parcaFiyati = (k: Pick<Kosu, "pasifler">, sv: number) =>
  Math.round(PARCA_FIYAT[sv] * (1 - 0.1 * pasifSayisi(k as Kosu, "tuccar")));

/** atölyede parça al (aynı kategorideki eski parçanın yerine geçme oyun tarafında parcalariDuzenle ile) */
export function parcaAl(k: Kosu, id: string, sv: number): boolean {
  const f = parcaFiyati(k, sv);
  if (k.para < f || k.parcalar.includes(id)) return false;
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
  if (k.bekleyenSecim > 0) {
    k.faz = "secim";
    k.secenekler = pasifCek(k, 3);
    if (k.secenekler.length) return;
    k.bekleyenSecim = 0;
  }
  k.faz = "surus";
}

/** boss yarışının pisti: boss türünde, bölgeye göre zorlaşan; aynı tohumla aynı */
export function bossPisti(k: Kosu, pistler: readonly PistAdayi[]): number {
  const aday = pistler.filter((p) => p.ty == k.boss.ty).sort((a, b) => a.sev - b.sev);
  const r = mulberry32(k.tohum + k.bolge * 977)();
  const ust = Math.min(aday.length, 2 + 2 * k.bolge);
  return aday[Math.min(aday.length - 1, Math.floor(r * ust))].i;
}

/** harita etkinliği tek tur (geri sayıma sığsın): turlu pistte hedef tur sayısına bölünür; boss tam turdur */
export const etkinlikAyari = (laps: number | undefined, limit: number) =>
  laps && laps > 1 ? { laps: 1, limit: limit / laps } : { laps, limit };

/** boss hedefi: drift (puan) yükselir, süre yarışında hedef süre kısalır */
export const bossHedefi = (k: Kosu, limit: number) => limit * k.boss.hedef;
