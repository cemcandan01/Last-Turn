// İlerleme: XP, seviye ve kilitler. Yarışı bitirince XP gelir; seviye atladıkça pistler ve araçlar açılır.
// Bütün veri tek, düz bir nesnede (lt_ilerleme): bulut eşitlemesi (Firebase) ilerlemeVerisi / ilerlemeYukle ile.
// Denge (gerekçe docs/notlar/altyapi.md):
// - Yarış XP'si = taban (5 × pist seviyesi) + yeni alınan her yıldız için yıldız XP'si (20 + 15 × (seviye − 1)).
//   Önceden alınmış yıldız yeniden XP vermez; yeni yıldız yoksa taban yarıya iner (aynı pisti tekrar oynamak az verir).
// - Seviye eğrisi: n'den n+1'e geçmek 40 + 30 × (n − 1) XP (ilk seviyeler birkaç yarış, sonrakiler giderek uzun).
// - Kilit tablosu (ACILMA): her türün Çaylak pisti ve Kızıl Ok + Kor RX başta açık; son içerik seviye 18'de açılır.
//   Benzetim (tests/birim/ilerleme.test.ts): her açık pistte yıldız toplayan oyuncu Efsane pistlere girmeden hepsini açar.
import type { YarisTuru } from "../arac/araclar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { best } from "./profil";
import { TUR_ANAHTARI, enIyiYildiz, yildizAnahtari, yildizEsikleri, yildizKaydet, yildizSay } from "./yildiz";

/** kayıt biçiminin sürümü (alan eklenirse okuJson varsayılanla birleştirir; biçim değişirse artar) */
export const ILERLEME_SURUM = 1;

export interface IlerlemeVerisi {
  surum: number;
  /** toplam XP (seviye bundan hesaplanır) */
  xp: number;
  /** son değişiklik (ms, Date.now); bulut eşitlemesinde hangisinin yeni olduğunu söyler */
  updatedAt: number;
  /** pist başına en iyi yıldız (lt_yildiz'in kopyası, buluta gider) */
  yildiz: Record<string, number>;
  /** seviyeden bağımsız açık öğeler (eski kayıttan geçişte oynanmış pist ve kullanılmış araç): "asphalt_3", "arac_2" */
  ekAcik: string[];
}

export type AcilanOge = { tur: "pist"; ty: YarisTuru; lv: number } | { tur: "arac"; no: number };

export interface SeviyeBilgisi {
  lv: number;
  /** bu seviyede toplanan XP ve sonraki seviyeye gereken (seviye içi) */
  xp: number;
  sonrakiXp: number;
  /** 0-1 */
  oran: number;
  toplamXp: number;
}

export interface SeviyeOlayi {
  eski: number;
  yeni: number;
  acilanlar: AcilanOge[];
  neden: string;
}

const TURLER: YarisTuru[] = ["gp", "rx", "dp", "rl", "dg"];

// --- XP ---

/** yarışın tabanı (her bitişte) */
export const tabanXp = (seviye: number) => 5 * seviye;
/** pistte alınan bir yıldızın XP'si (yalnız ilk alınışta) */
export const yildizXp = (seviye: number) => 20 + 15 * (seviye - 1);

/** yarış sonu XP'si: taban + yeni yıldızlar; yeni yıldız yoksa taban yarıya iner */
export function yarisSonuXp(tur: YarisTuru, seviye: number, yildiz: number, oncekiYildiz: number) {
  void tur;
  const yeni = Math.max(0, yildiz - oncekiYildiz);
  const taban = yeni > 0 ? tabanXp(seviye) : Math.ceil(tabanXp(seviye) / 2);
  return taban + yeni * yildizXp(seviye);
}

// --- seviye eğrisi ---

/** n. seviyeden n+1'e gereken XP */
export const adimXp = (n: number) => 40 + 30 * (n - 1);
/** n. seviyeye ulaşmak için gereken toplam XP (1. seviye 0) */
export const seviyeTabani = (n: number) => (n - 1) * 40 + 15 * (n - 1) * (n - 2);

/** toplam XP'nin seviyesi */
export function xpSeviyesi(xp: number) {
  let n = 1;
  while (xp >= seviyeTabani(n + 1)) n++;
  return n;
}

// --- kilit tablosu ---

/**
 * açılma seviyesi: pistler [tür][pist numarası - 1] (1-6 Çaylak … Efsane sırası, 7+ sonradan eklenen pistler; yeni pist
 * sona eklenir ve zorluk seviyesindeki komşusunun yakınında açılır), araçlar CARS sırasıyla
 * (Kızıl Ok asfalt, Kor RX rallycross, Beyaz Kurt drift, Mavi Yıldız ralli, Gece Mavisi drag; sonra Gri Atmaca,
 * Kum Fırtınası, Sarı Arı, Panda, Turuncu Ejder: geçici olarak ileri seviyede, ileride parayla alınacak).
 * Araç uyumu: her araç her yarışı bitirebilir; başta asfalt ve rallycross aracı açık, drift/ralli/drag araçları sonra.
 */
export const ACILMA = {
  pist: {
    gp: [1, 2, 5, 8, 12, 16, 3, 9],
    rx: [1, 2, 5, 8, 12, 16, 3, 9],
    dp: [1, 3, 6, 10, 14, 18, 4, 11],
    rl: [1, 3, 7, 10, 14, 18, 4, 11],
    dg: [1, 4, 7, 11, 15, 17, 2, 16],
  } as Record<YarisTuru, number[]>,
  arac: [1, 1, 4, 6, 7, 10, 11, 13, 9, 15],
};

export function acilmaSeviyesi(o: { ty: YarisTuru; lv: number } | { arac: number }) {
  return "arac" in o ? (ACILMA.arac[o.arac] ?? 1) : (ACILMA.pist[o.ty][o.lv - 1] ?? 1);
}

/** seviye seviye açılan öğeler (arayüzün kilit tablosu) */
export function kilitTablosu() {
  const t: { seviye: number; oge: AcilanOge }[] = [];
  for (const ty of TURLER)
    ACILMA.pist[ty].forEach((s, i) => t.push({ seviye: s, oge: { tur: "pist", ty, lv: i + 1 } }));
  ACILMA.arac.forEach((s, no) => t.push({ seviye: s, oge: { tur: "arac", no } }));
  return t.sort((a, b) => a.seviye - b.seviye);
}

/** eski seviyeden (hariç) yeni seviyeye (dahil) açılanlar */
const arasindaAcilan = (eski: number, yeni: number) =>
  kilitTablosu()
    .filter((k) => k.seviye > eski && k.seviye <= yeni)
    .map((k) => k.oge);

// --- kayıt ---

const ANAHTAR = "lt_ilerleme";
const bos = (): IlerlemeVerisi => ({ surum: ILERLEME_SURUM, xp: 0, updatedAt: 0, yildiz: {}, ekAcik: [] });

let V: IlerlemeVerisi | null = null;
const dinleyiciler: ((o: SeviyeOlayi) => void)[] = [];

function veri(): IlerlemeVerisi {
  if (V) return V;
  const k = okuJson(ANAHTAR, { ...bos(), surum: 0 });
  V = k.surum ? k : eskiKayittanGecis();
  return V;
}

function kaydet() {
  const v = veri();
  v.updatedAt = Date.now();
  yazJson(ANAHTAR, v);
}

/**
 * eski kayıttan geçiş (lt_ilerleme yokken bir kez): rekordan hesaplanan yıldız ile lt_yildiz'in büyüğü alınır, lt_yildiz'e
 * yazılır; oynanmış her pist için bir taban, her yıldız için yıldız XP'si verilir. Oynanmış pistler ve kullanılmış araçlar
 * seviyeden bağımsız açık kalır (kimse ilerlemesini kaybetmez). Yeni oyuncuda 0 XP.
 */
function eskiKayittanGecis(): IlerlemeVerisi {
  const v = bos(),
    prof = okuJson("lt_prof", { use: {} as Record<string, number> });
  for (const ty of TURLER)
    for (let lv = 1; lv <= ACILMA.pist[ty].length; lv++) {
      const esik = yildizEsikleri(ty, lv),
        r = best(TUR_ANAHTARI[ty] + "_" + lv),
        y = Math.max(enIyiYildiz(ty, lv), r > 0 && esik.length ? yildizSay(ty, r, esik) : 0);
      if (!(r > 0) && !y) continue;
      if (y) yildizKaydet(ty, lv, y);
      v.xp += tabanXp(lv) + y * yildizXp(lv);
      if (acilmaSeviyesi({ ty, lv }) > 1) v.ekAcik.push(yildizAnahtari(ty, lv));
    }
  for (const no in prof.use)
    if (prof.use[no] > 0 && acilmaSeviyesi({ arac: +no }) > 1) v.ekAcik.push("arac_" + no);
  v.surum = ILERLEME_SURUM;
  V = v;
  kaydet();
  return v;
}

// --- sorgular ---

export function seviye(): SeviyeBilgisi {
  const toplam = veri().xp,
    lv = xpSeviyesi(toplam),
    xp = toplam - seviyeTabani(lv),
    sonrakiXp = adimXp(lv);
  return { lv, xp, sonrakiXp, oran: xp / sonrakiXp, toplamXp: toplam };
}

export const pistAcikMi = (tur: YarisTuru, sv: number) =>
  seviye().lv >= acilmaSeviyesi({ ty: tur, lv: sv }) || veri().ekAcik.includes(yildizAnahtari(tur, sv));

export const aracAcikMi = (aracNo: number) =>
  seviye().lv >= acilmaSeviyesi({ arac: aracNo }) || veri().ekAcik.includes("arac_" + aracNo);

// --- değişiklik ---

/** seviye atlayınca açılan öğelerle çağrılır; dinlemeyi bırakan fonksiyon döner */
export function ilerlemeDinle(fn: (o: SeviyeOlayi) => void) {
  dinleyiciler.push(fn);
  return () => {
    const i = dinleyiciler.indexOf(fn);
    if (i >= 0) dinleyiciler.splice(i, 1);
  };
}

/** XP ekle (neden: "yaris", "gecis" gibi; olayla dinleyiciye gider); seviye atlandıysa olayı döndürür */
export function xpEkle(miktar: number, neden: string): SeviyeOlayi | null {
  const v = veri(),
    eski = seviye().lv;
  v.xp += Math.max(0, Math.round(miktar));
  kaydet();
  const yeni = seviye().lv;
  if (yeni <= eski) return null;
  const o = { eski, yeni, acilanlar: arasindaAcilan(eski, yeni), neden };
  for (const fn of dinleyiciler.slice()) fn(o);
  return o;
}

/** yarış bitişi: yıldızı kaydedip XP verir (önceki en iyi yıldızla karşılaştırarak); verilen XP'yi döndürür */
export function yarisBitti(tur: YarisTuru, sv: number, yildiz: number) {
  veri(); // eski kayıttan geçiş yıldız yazılmadan önce olmalı (yoksa yeni yıldız iki kez sayılır)
  const onceki = enIyiYildiz(tur, sv),
    m = yarisSonuXp(tur, sv, yildiz, onceki);
  yildizKaydet(tur, sv, yildiz);
  xpEkle(m, "yaris");
  return m;
}

// --- bulut eşitlemesi ---

/** buluta gidecek kopya (yıldızlar lt_yildiz'den tazelenir) */
export function ilerlemeVerisi(): IlerlemeVerisi {
  const v = veri();
  v.yildiz = okuJson("lt_yildiz", {} as Record<string, number>);
  return JSON.parse(JSON.stringify(v)) as IlerlemeVerisi;
}

/** buluttan gelen veriyi yerelle birleştir: XP ve yıldızın büyüğü, açık öğelerin birleşimi; kimse ilerleme kaybetmez */
export function ilerlemeYukle(d: Partial<IlerlemeVerisi>) {
  const v = veri(),
    eski = seviye().lv;
  v.xp = Math.max(v.xp, +(d.xp ?? 0) || 0);
  for (const a of d.ekAcik || []) if (!v.ekAcik.includes(a)) v.ekAcik.push(a);
  for (const ty of TURLER)
    for (let lv = 1; lv <= ACILMA.pist[ty].length; lv++) {
      const y = +(d.yildiz?.[yildizAnahtari(ty, lv)] ?? 0) || 0;
      if (y) yildizKaydet(ty, lv, y);
    }
  kaydet();
  v.updatedAt = Math.max(v.updatedAt, +(d.updatedAt ?? 0) || 0);
  yazJson(ANAHTAR, v);
  const yeni = seviye().lv;
  if (yeni > eski) {
    const o = { eski, yeni, acilanlar: arasindaAcilan(eski, yeni), neden: "bulut" };
    for (const fn of dinleyiciler.slice()) fn(o);
  }
}

/** testler için: bellekteki kaydı unut (yeniden localStorage'dan okunur) */
export const ilerlemeSifirla = () => {
  V = null;
};
