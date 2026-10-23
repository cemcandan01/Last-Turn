// Bulut eşitlemesi: Firestore'daki users/{uid} belgesi ile yerel kayıt (lt_ilerleme, lt_yildiz, sv_*) arasında.
// Firebase'e doğrudan bağlı değildir: belgeyi okuyup yazan bir Saglayici alır (gerçeği bulut/firebase.ts, testte sahte).
// - Oturum açılınca: bulut belgesi okunur, yerelle birleştirilir (ilerlemeYukle: XP, yıldız, kazanılanın büyüğü,
//   alımların ve açık öğelerin birleşimi; rekorlarda iyisi), birleşmiş sonuç farklıysa geri yazılır.
// - Kayıt değişince: gecikmeli (debounce) yazılır. İnternet yoksa ya da yazma başarısızsa "bekleyen" işareti
//   localStorage'da kalır (lt_bulut); internet gelince ya da sonraki açılışta gönderilir. Kuyruk ayrıca veri tutmaz:
//   yerel kayıt zaten en güncel hâldir, gönderilen her zaman onun tamamıdır.
import { okuJson, yazJson } from "../cekirdek/depo";
import { ACILMA, degisimDinle, ilerlemeVerisi, ilerlemeYukle, type IlerlemeVerisi } from "../oyun/ilerleme";
import { best, saveBest } from "../oyun/profil";
import { TUR_ANAHTARI } from "../oyun/yildiz";
import type { YarisTuru } from "../arac/araclar";

/** Firestore belgesi (users/{uid}); alanlar firestore.rules'ta denetlenir */
export interface BulutBelgesi extends IlerlemeVerisi {
  /** kişisel rekorlar (sv_<tür>_<pist>): süre (sn) ya da drift puanı */
  rekor: Record<string, number>;
  /** belgeyi yazan oyun sürümü (bilgi için) */
  oyunSurum: string;
}

export interface Kullanici {
  uid: string;
  anonim: boolean;
  /** "anonim", "google" ya da "eposta" */
  yol: "anonim" | "google" | "eposta";
  eposta: string | null;
  ad: string | null;
}

/** kimlik ve belge işlemleri (Firebase ya da testte sahte) */
export interface Saglayici {
  /** oturum değişince çağrılır (null: oturum yok); ilk durum da bildirilir */
  oturumDinle(fn: (k: Kullanici | null) => void): void;
  anonimGir(): Promise<void>;
  /** anonim hesabı Google'a bağlar; Google hesabı başka cihazda zaten varsa ona geçer. Yönlendirmede sayfa değişebilir */
  googleBagla(): Promise<void>;
  /** e-posta + şifre: yeni ise anonim hesaba bağlar, varsa o hesaba girer */
  epostaBagla(eposta: string, sifre: string): Promise<void>;
  cikis(): Promise<void>;
  /** açılışta Google yönlendirmesinden dönülürken oluşan hata (varsa kullanıcıya gösterilir) */
  baslangicHatasi?: unknown;
  oku(uid: string): Promise<Partial<BulutBelgesi> | null>;
  yaz(uid: string, belge: BulutBelgesi): Promise<void>;
}

export type EsitlemeDurumu = "yok" | "esitleniyor" | "tamam" | "bekliyor" | "hata";

const TURLER: YarisTuru[] = ["gp", "rx", "dp", "rl", "dg"];
const BEKLEYEN = "lt_bulut";

/** bütün pistlerin rekor anahtarları (tür_pist) */
const rekorAnahtarlari = () =>
  TURLER.flatMap((ty) => ACILMA.pist[ty].map((_, i) => TUR_ANAHTARI[ty] + "_" + (i + 1)));

const driftMi = (k: string) => k.startsWith(TUR_ANAHTARI.dp + "_");

const surum = () => (typeof __APP_VERSION__ == "string" ? __APP_VERSION__ : "");

/** buluta gidecek belge: ilerleme + rekorlar */
export function belgeOlustur(): BulutBelgesi {
  const rekor: Record<string, number> = {};
  for (const k of rekorAnahtarlari()) {
    const b = best(k);
    if (b > 0) rekor[k] = b;
  }
  return { ...ilerlemeVerisi(), rekor, oyunSurum: surum() };
}

/** buluttaki rekorları yerele kat: drift puanında büyüğü, sürede küçüğü (bilinmeyen anahtar alınmaz) */
export function rekorBirlestir(r: Record<string, unknown> | undefined) {
  if (!r) return;
  for (const k of rekorAnahtarlari()) {
    const v = +(r[k] ?? 0) || 0,
      b = best(k);
    if (v > 0 && (driftMi(k) ? v > b : !b || v < b)) saveBest(k, String(v));
  }
}

/** karşılaştırma için sıralı JSON (zaman ve sürüm alanları dışarıda) */
function ozet(b: Partial<BulutBelgesi>) {
  const sirala = (o: unknown): unknown =>
    Array.isArray(o)
      ? o.map(sirala).sort()
      : o && typeof o == "object"
        ? Object.fromEntries(
            Object.entries(o)
              .filter(([k]) => k != "updatedAt" && k != "oyunSurum")
              .sort(([a], [c]) => (a < c ? -1 : 1))
              .map(([k, v]) => [k, sirala(v)]),
          )
        : o;
  return JSON.stringify(sirala(b));
}

export const bekleyenVar = () => okuJson(BEKLEYEN, { bekleyen: false }).bekleyen;
const bekleyenYaz = (b: boolean) => yazJson(BEKLEYEN, { bekleyen: b });

export interface Esitleyici {
  /** oturum açılınca (uid) ya da kapanınca (null) */
  oturum(uid: string | null): Promise<void>;
  /** bekleyen yazmayı hemen gönder (internet gelince) */
  simdiGonder(): Promise<void>;
  durum(): EsitlemeDurumu;
  /** dinlemeyi bırak (testler) */
  kapat(): void;
}

/**
 * eşitleyici kurar: kayıt değişimini dinler, oturum açılınca çekip birleştirir, değişince `gecikme` ms sonra yazar.
 * `degisti` durum değişince çağrılır (arayüz satırı için).
 */
export function esitleyiciKur(
  s: Saglayici,
  o: { gecikme?: number; degisti?: (d: EsitlemeDurumu) => void } = {},
) {
  const gecikme = o.gecikme ?? 4000;
  let uid: string | null = null,
    /** bulut belgesi bu uid için okunup birleştirildi mi (okunmadan yazılmaz: başka cihazın ilerlemesi ezilmesin) */
    cekilen: string | null = null,
    zaman: ReturnType<typeof setTimeout> | null = null,
    yukleniyor = false,
    sonYazilan = "",
    d: EsitlemeDurumu = "yok",
    calisan: Promise<void> = Promise.resolve();
  const durumYaz = (y: EsitlemeDurumu) => {
    if (y == d) return;
    d = y;
    o.degisti?.(y);
  };
  const cevrimdisi = () => typeof navigator != "undefined" && navigator.onLine === false;
  const basarisiz = () => {
    bekleyenYaz(true);
    durumYaz(cevrimdisi() ? "bekliyor" : "hata");
  };

  /** buluttakini çek, yerelle birleştir; başarılıysa true */
  async function cek(u: string) {
    const uzak = await s.oku(u);
    if (u != uid) return false;
    sonYazilan = "";
    if (uzak) {
      yukleniyor = true;
      try {
        ilerlemeYukle(uzak);
        rekorBirlestir(uzak.rekor);
      } finally {
        yukleniyor = false;
      }
      sonYazilan = ozet({ ...uzak, rekor: uzak.rekor || {} });
    }
    cekilen = u;
    return true;
  }

  /** gerekirse önce çeker, sonra yerel kaydın tamamını yazar (değişmediyse yazmaz) */
  async function esitle() {
    if (zaman) clearTimeout(zaman);
    zaman = null;
    const u = uid;
    if (!u) return;
    if (cevrimdisi()) {
      if (cekilen != u || bekleyenVar()) basarisiz();
      return;
    }
    try {
      if (cekilen != u) {
        durumYaz("esitleniyor");
        if (!(await cek(u))) return;
      }
      const b = belgeOlustur(),
        oz = ozet(b);
      if (oz != sonYazilan) {
        await s.yaz(u, b);
        if (u != uid) return;
        sonYazilan = oz;
      }
      bekleyenYaz(false);
      durumYaz("tamam");
    } catch {
      // yazma reddedildiyse (ör. başka cihaz araya girdi) bir sonraki denemede önce yeniden çekilir
      if (u == uid) cekilen = null;
      basarisiz();
    }
  }
  // aynı anda tek eşitleme: sürerken gelen istek ondan sonra çalışır
  const sirayla = () => (calisan = calisan.then(esitle, esitle));

  const birak = degisimDinle(() => {
    if (yukleniyor) return;
    bekleyenYaz(true);
    if (!uid) return;
    if (zaman) clearTimeout(zaman);
    zaman = setTimeout(() => void sirayla(), gecikme);
  });
  const internetGeldi = () => {
    if (uid && (bekleyenVar() || cekilen != uid)) void sirayla();
  };
  if (typeof window != "undefined") window.addEventListener("online", internetGeldi);

  const e: Esitleyici = {
    oturum(yeni) {
      uid = yeni;
      cekilen = null;
      if (zaman) clearTimeout(zaman);
      zaman = null;
      if (!yeni) {
        durumYaz("yok");
        return calisan;
      }
      return sirayla();
    },
    simdiGonder: () => sirayla(),
    durum: () => d,
    kapat() {
      birak();
      if (zaman) clearTimeout(zaman);
      if (typeof window != "undefined") window.removeEventListener("online", internetGeldi);
    },
  };
  return e;
}
