// İlerleme: XP, seviye, para ve kilitler. Yarışı bitirince XP ve para gelir; seviye atladıkça pistler açılır, araçlar
// satın alınabilir olur (seviye + para; fiyatlar ve ödül formülü oyun/ekonomi.ts).
// Bütün veri tek, düz bir nesnede (lt_ilerleme): bulut eşitlemesi (Firebase) ilerlemeVerisi / ilerlemeYukle ile.
// Denge (gerekçe docs/notlar/altyapi.md):
// - Yarış XP'si = taban (5 × pist seviyesi) + yeni alınan her yıldız için yıldız XP'si (20 + 15 × (seviye − 1)).
//   Önceden alınmış yıldız yeniden XP vermez; yeni yıldız yoksa taban yarıya iner (aynı pisti tekrar oynamak az verir).
// - Seviye eğrisi: n'den n+1'e geçmek 40 + 30 × (n − 1) XP (ilk seviyeler birkaç yarış, sonrakiler giderek uzun).
// - Kilit tablosu (ACILMA): her türün Çaylak pisti ve Kızıl Ok + Kor RX başta açık; son içerik seviye 18'de açılır.
//   Benzetim (tests/birim/ilerleme.test.ts): her açık pistte yıldız toplayan oyuncu Efsane pistlere girmeden hepsini açar.
// - Para: kazanilan (toplam kazanılan, hiç azalmaz) − alimlar toplamı = bakiye. Bulutta iki cihaz birleşince kazanılanın
//   büyüğü ve alımların birleşimi alınır (harcama kaybolmaz, para iki kez harcanmaz).
import type { YarisTuru } from "../arac/araclar";
import { okuJson, yazJson } from "../cekirdek/depo";
import { pistSev } from "../dunya/pist-tanimlari";
import { ARAC_FIYAT, aracFiyati, yarisSonuPara } from "./ekonomi";

export { aracFiyati, yarisSonuPara } from "./ekonomi";
import { best } from "./profil";
import { TUR_ANAHTARI, enIyiYildiz, yildizAnahtari, yildizEsikleri, yildizKaydet, yildizSay } from "./yildiz";

/** kayıt biçiminin sürümü (alan eklenirse okuJson varsayılanla birleştirir; biçim değişirse artar) */
export const ILERLEME_SURUM = 2;

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
  /** toplam kazanılan para (harcamayla azalmaz) */
  kazanilan: number;
  /** satın alınan öğeler ve ödenen bedel: "arac_8" → 2000 (ileride modifiye: "mod_<araç>_<tür>") */
  alimlar: Record<string, number>;
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

export type SatinAlmaEngeli = "seviye" | "para" | "sahip";

/** yarış bitişinin ödülleri */
export interface YarisOdulu {
  xp: number;
  para: number;
}

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
 * Kum Fırtınası, Sarı Arı, Panda, Turuncu Ejder). Araç seviyesi satın alınabilir olduğu seviyedir (ekonomi.ts ARAC_FIYAT).
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
  arac: ARAC_FIYAT.map((f) => f.seviye),
};

/** kayıt sürümü 1'deki araç açılma seviyeleri (o sürümde seviye gelince ücretsiz açılırdı; geçişte sahip sayılır) */
const ESKI_ARAC_ACILMA = [1, 1, 4, 6, 7, 10, 11, 13, 9, 15];

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
const bos = (): IlerlemeVerisi => ({
  surum: ILERLEME_SURUM,
  xp: 0,
  updatedAt: 0,
  yildiz: {},
  ekAcik: [],
  kazanilan: 0,
  alimlar: {},
});

let V: IlerlemeVerisi | null = null,
  /** admin kipi: her pist ve araç açık görünür, kayda yazılmaz (bulut/hesap.ts yalnız admin oturumunda açar) */
  adminKip = false;
const dinleyiciler: ((o: SeviyeOlayi) => void)[] = [];
const paraDinleyiciler: ((o: ParaOlayi) => void)[] = [];

export interface ParaOlayi {
  bakiye: number;
  /** değişim (harcamada eksi) */
  degisim: number;
  /** "yaris", "alim:arac_8", "bulut" gibi */
  neden: string;
}

function veri(): IlerlemeVerisi {
  if (V) return V;
  const k = okuJson(ANAHTAR, { ...bos(), surum: 0 });
  V = !k.surum ? eskiKayittanGecis() : k.surum < 2 ? paraGecisi(k) : k;
  return V;
}

const degisimDinleyiciler: (() => void)[] = [];

function kaydet() {
  const v = veri();
  v.updatedAt = Date.now();
  yazJson(ANAHTAR, v);
  for (const fn of degisimDinleyiciler.slice()) fn();
}

/** ilerleme kaydı her değişince (XP, yıldız, para, alım, bulut) çağrılır; bulut eşitlemesi için. Bırakan fonksiyon döner */
export function degisimDinle(fn: () => void) {
  degisimDinleyiciler.push(fn);
  return () => {
    const i = degisimDinleyiciler.indexOf(fn);
    if (i >= 0) degisimDinleyiciler.splice(i, 1);
  };
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
  return paraGecisi(v);
}

/**
 * kayıt sürümü 1'den 2'ye (para gelmeden önceki ilerleme): alınmış her yıldızın parası başlangıç bakiyesi olur (pist
 * pist, ilk kez alınmış gibi); eski kurala göre açık olan araçlar (seviyesi gelmiş ya da kullanılmış) sahip sayılır.
 */
function paraGecisi(v: IlerlemeVerisi): IlerlemeVerisi {
  const lv = xpSeviyesi(v.xp);
  for (const ty of TURLER)
    for (let sv = 1; sv <= ACILMA.pist[ty].length; sv++) {
      const y = enIyiYildiz(ty, sv);
      if (y) v.kazanilan += yarisSonuPara(ty, pistSev(ty, sv), y, 0);
    }
  ESKI_ARAC_ACILMA.forEach((s, no) => {
    if (aracFiyati(no).para > 0 && lv >= s && !v.ekAcik.includes("arac_" + no)) v.ekAcik.push("arac_" + no);
  });
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
  adminKip ||
  seviye().lv >= acilmaSeviyesi({ ty: tur, lv: sv }) ||
  veri().ekAcik.includes(yildizAnahtari(tur, sv));

/** para bakiyesi */
export const para = () => {
  const v = veri();
  return Math.max(0, v.kazanilan - Object.values(v.alimlar).reduce((a, b) => a + b, 0));
};

/** araç açık mı: ücretsiz ve seviyesi gelmiş, satın alınmış ya da eski kayıttan açık kalmış */
export const aracAcikMi = (aracNo: number) => {
  if (adminKip) return true;
  const v = veri(),
    f = aracFiyati(aracNo),
    a = "arac_" + aracNo;
  return (f.para <= 0 && seviye().lv >= f.seviye) || a in v.alimlar || v.ekAcik.includes(a);
};

/** araç şimdi satın alınabilir mi; değilse engeli (sahip: zaten açık, seviye: seviyesi gelmedi, para: bakiye yetmez) */
export function aracSatinAlinabilirMi(aracNo: number): { ok: boolean; neden: SatinAlmaEngeli | null } {
  const f = aracFiyati(aracNo);
  if (aracAcikMi(aracNo)) return { ok: false, neden: "sahip" };
  if (seviye().lv < f.seviye) return { ok: false, neden: "seviye" };
  if (para() < f.para) return { ok: false, neden: "para" };
  return { ok: true, neden: null };
}

// --- değişiklik ---

/** seviye atlayınca açılan öğelerle çağrılır; dinlemeyi bırakan fonksiyon döner */
export function ilerlemeDinle(fn: (o: SeviyeOlayi) => void) {
  dinleyiciler.push(fn);
  return () => {
    const i = dinleyiciler.indexOf(fn);
    if (i >= 0) dinleyiciler.splice(i, 1);
  };
}

/** para değişince (kazanç, harcama, bulut) çağrılır; dinlemeyi bırakan fonksiyon döner */
export function paraDinle(fn: (o: ParaOlayi) => void) {
  paraDinleyiciler.push(fn);
  return () => {
    const i = paraDinleyiciler.indexOf(fn);
    if (i >= 0) paraDinleyiciler.splice(i, 1);
  };
}

const paraOlayi = (degisim: number, neden: string) => {
  if (!degisim) return;
  const o = { bakiye: para(), degisim, neden };
  for (const fn of paraDinleyiciler.slice()) fn(o);
};

/** para ekle (neden: "yaris" gibi) */
export function paraEkle(miktar: number, neden: string) {
  const m = Math.max(0, Math.round(miktar));
  veri().kazanilan += m;
  kaydet();
  paraOlayi(m, neden);
  return m;
}

/** genel harcama (araç, ileride modifiye): öğe zaten alınmışsa ya da bakiye yetmezse false */
export function harca(oge: string, miktar: number) {
  const v = veri(),
    m = Math.max(0, Math.round(miktar));
  if (oge in v.alimlar || para() < m) return false;
  v.alimlar[oge] = m;
  kaydet();
  paraOlayi(-m, "alim:" + oge);
  return true;
}

/** aracı satın al (seviye ve bakiye yetiyorsa); başarılıysa true */
export function aracSatinAl(aracNo: number) {
  if (!aracSatinAlinabilirMi(aracNo).ok) return false;
  return harca("arac_" + aracNo, aracFiyati(aracNo).para);
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

/** yarış bitişi: yıldızı kaydedip XP ve para verir (önceki en iyi yıldızla karşılaştırarak; para pistin zorluğuyla) */
export function yarisBitti(tur: YarisTuru, sv: number, yildiz: number): YarisOdulu {
  veri(); // eski kayıttan geçiş yıldız yazılmadan önce olmalı (yoksa yeni yıldız iki kez sayılır)
  const onceki = enIyiYildiz(tur, sv),
    xp = yarisSonuXp(tur, sv, yildiz, onceki),
    p = yarisSonuPara(tur, pistSev(tur, sv), yildiz, onceki);
  yildizKaydet(tur, sv, yildiz);
  paraEkle(p, "yaris");
  xpEkle(xp, "yaris");
  return { xp, para: p };
}

// --- bulut eşitlemesi ---

/** buluta gidecek kopya (yıldızlar lt_yildiz'den tazelenir) */
export function ilerlemeVerisi(): IlerlemeVerisi {
  const v = veri();
  v.yildiz = okuJson("lt_yildiz", {} as Record<string, number>);
  return JSON.parse(JSON.stringify(v)) as IlerlemeVerisi;
}

/**
 * buluttan gelen veriyi yerelle birleştir: XP, yıldız ve kazanılan paranın büyüğü, açık öğelerin ve alımların birleşimi;
 * kimse ilerleme kaybetmez. sessiz: seviye atlama bildirilmez (hesap geçişi)
 */
export function ilerlemeYukle(d: Partial<IlerlemeVerisi>, sessiz = false) {
  const v = veri(),
    eski = seviye().lv,
    eskiPara = para();
  v.xp = Math.max(v.xp, +(d.xp ?? 0) || 0);
  v.kazanilan = Math.max(v.kazanilan, +(d.kazanilan ?? 0) || 0);
  for (const [a, m] of Object.entries(d.alimlar || {}))
    if (!(a in v.alimlar)) v.alimlar[a] = Math.max(0, +m || 0);
  for (const a of d.ekAcik || []) if (!v.ekAcik.includes(a)) v.ekAcik.push(a);
  for (const ty of TURLER)
    for (let lv = 1; lv <= ACILMA.pist[ty].length; lv++) {
      const y = +(d.yildiz?.[yildizAnahtari(ty, lv)] ?? 0) || 0;
      if (y) yildizKaydet(ty, lv, y);
    }
  kaydet();
  v.updatedAt = Math.max(v.updatedAt, +(d.updatedAt ?? 0) || 0);
  yazJson(ANAHTAR, v);
  paraOlayi(para() - eskiPara, "bulut");
  const yeni = seviye().lv;
  if (yeni > eski && !sessiz) {
    const o = { eski, yeni, acilanlar: arasindaAcilan(eski, yeni), neden: "bulut" };
    for (const fn of dinleyiciler.slice()) fn(o);
  }
}

// --- admin (yetki sunucuda: Firestore admins/{uid}; bulut/hesap.ts yalnız admin oturumunda çağırır) ---

/** admin kipini aç/kapat (kayda yazılmaz); argümansız: şimdiki durum */
export function adminKipi(acik?: boolean) {
  if (acik != null) adminKip = acik;
  return adminKip;
}

/** XP'yi seviyenin başına ayarla (azaltabilir; buluta yalnız admin yazabilir) */
export function adminSeviyeAyarla(lv: number) {
  veri().xp = seviyeTabani(Math.max(1, Math.round(lv)));
  kaydet();
}

/** öğenin kilidini aç ya da kapat ("arac_8", "asphalt_3"); kapatınca alımı da silinir. Seviyesi gelmiş öğe açık kalır */
export function adminKilit(oge: string, acik: boolean) {
  const v = veri();
  v.ekAcik = v.ekAcik.filter((a) => a != oge);
  if (acik) v.ekAcik.push(oge);
  else delete v.alimlar[oge];
  kaydet();
}

/** ilerlemeyi sıfırla (yeni oyuncu): XP, yıldız, para, alım ve açık öğeler; rekorlar profil.ts'te ayrı */
export function ilerlemeyiSifirla() {
  yazJson("lt_yildiz", {});
  V = bos();
  kaydet();
}

/**
 * başka hesaba geçişte: bu cihazdaki ilerleme o hesabın bulut kaydıyla değiştirilir (birleşmez; seviye kutlaması
 * yok). Belge yoksa (yeni hesap) sıfırdan başlar
 */
export function ilerlemeDegistir(d: Partial<IlerlemeVerisi> | null) {
  ilerlemeyiSifirla();
  if (d) ilerlemeYukle(d, true);
}

/** testler için: bellekteki kaydı unut (yeniden localStorage'dan okunur) */
export const ilerlemeSifirla = () => {
  V = null;
};
