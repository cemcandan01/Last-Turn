// Bulut eşitlemesi: Firestore'daki users/{uid} belgesi ile yerel kayıt (lt_ilerleme, lt_yildiz, sv_*) arasında.
// Firebase'e doğrudan bağlı değildir: belgeyi okuyup yazan bir Saglayici alır (gerçeği bulut/firebase.ts, testte sahte).
// - Oturum açılınca: bulut belgesi okunur, yerelle birleştirilir (ilerlemeYukle: XP, yıldız, kazanılanın büyüğü,
//   alımların ve açık öğelerin birleşimi; rekorlarda iyisi), birleşmiş sonuç farklıysa geri yazılır.
// - Yerel kayıt hep tek bir hesabındır (lt_bulut → sahip). Başka bir hesaba girilince birleşmez: yerel ilerleme ve
//   rekorlar o hesabın bulut kaydıyla değiştirilir (belgesi yoksa sıfırdan). Birleşme yalnız aynı hesapta (aynı
//   hesabın iki cihazı) ve misafir yeni hesaba bağlanınca (uid aynı kalır) olur. Eski hesabın bekleyen yazması
//   geçişten önce gönderilir (bulut/hesap.ts).
// - Kayıt değişince: gecikmeli (debounce) yazılır. İnternet yoksa ya da yazma başarısızsa "bekleyen" işareti
//   localStorage'da kalır (lt_bulut); internet gelince ya da sonraki açılışta gönderilir. Kuyruk ayrıca veri tutmaz:
//   yerel kayıt zaten en güncel hâldir, gönderilen her zaman onun tamamıdır.
import { okuJson, yazJson } from "../cekirdek/depo";
import {
  ACILMA,
  degisimDinle,
  ilerlemeDegistir,
  ilerlemeVerisi,
  ilerlemeYukle,
  type IlerlemeVerisi,
} from "../oyun/ilerleme";
import { takiliVerisi, takiliYukle } from "../oyun/modifiye";
import { best, saveBest } from "../oyun/profil";
import { TUR_ANAHTARI } from "../oyun/yildiz";
import type { YarisTuru } from "../arac/araclar";

/** Firestore belgesi (users/{uid}); alanlar firestore.rules'ta denetlenir */
export interface BulutBelgesi extends IlerlemeVerisi {
  /** kişisel rekorlar (sv_<tür>_<pist>): süre (sn) ya da drift puanı */
  rekor: Record<string, number>;
  /** belgeyi yazan oyun sürümü (bilgi için) */
  oyunSurum: string;
  /**
   * takılı modifiye parçaları (araç no → parça listesi; oyun/modifiye.ts). Yalnız parça takılıysa yazılır. Eski
   * kurallar (firestore.rules hasOnly) bu alanı reddederse alan atılıp yeniden yazılır: parçalar yalnız cihazda kalır
   */
  parca?: Record<string, string[]>;
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
  /**
   * anonim hesabı Google'a bağlar (Google hesabı zaten varsa ona geçer); bağlı hesaptaysa hesap seçiciyle Google'a
   * girer. ipucu: seçicide önerilen e-posta. Yönlendirmede sayfa değişebilir
   */
  googleBagla(ipucu?: string): Promise<void>;
  /** e-posta + şifreyle yeni hesap: anonim hesaba bağlanır (ilerleme kalır); e-posta kullanılıyorsa email-already-in-use */
  epostaOlustur(eposta: string, sifre: string): Promise<void>;
  /** var olan e-posta hesabına giriş (o anki oturumun yerine geçer) */
  epostaGiris(eposta: string, sifre: string): Promise<void>;
  /** şifre sıfırlama e-postası gönderir */
  sifreSifirla(eposta: string): Promise<void>;
  /** admin mi: Firestore admins/{uid} belgesi var mı (yalnız konsoldan eklenir; istemci yazamaz) */
  adminMi(uid: string): Promise<boolean>;
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

/** buluta gidecek belge: ilerleme + rekorlar (+ takılı parçalar; parcasiz: alan hiç yazılmaz) */
export function belgeOlustur(parcasiz = false): BulutBelgesi {
  const rekor: Record<string, number> = {};
  for (const k of rekorAnahtarlari()) {
    const b = best(k);
    if (b > 0) rekor[k] = b;
  }
  const b: BulutBelgesi = { ...ilerlemeVerisi(), rekor, oyunSurum: surum() },
    parca = takiliVerisi();
  if (!parcasiz && Object.keys(parca).length) b.parca = parca;
  return b;
}

/** bu cihazdaki kişisel rekorları sil (yeni oyuncu) */
export const rekorlariSil = () => rekorAnahtarlari().forEach((k) => saveBest(k, ""));

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

interface BulutKaydi {
  bekleyen: boolean;
  /** yerel kaydın ait olduğu hesap (uid); yoksa eski kurulum ya da temiz cihaz */
  sahip?: string;
  /** sahip misafir (anonim) hesap mı */
  sahipAnonim?: boolean;
}
const bulutKaydi = () => okuJson<BulutKaydi>(BEKLEYEN, { bekleyen: false });
export const bekleyenVar = () => bulutKaydi().bekleyen;
const bekleyenYaz = (b: boolean) => yazJson(BEKLEYEN, { ...bulutKaydi(), bekleyen: b });

export interface Esitleyici {
  /** oturum açılınca (uid; anonim: misafir hesap) ya da kapanınca (null) */
  oturum(uid: string | null, anonim?: boolean): Promise<void>;
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
    anonim = false,
    /** bulut belgesi bu uid için okunup birleştirildi mi (okunmadan yazılmaz: başka cihazın ilerlemesi ezilmesin) */
    cekilen: string | null = null,
    zaman: ReturnType<typeof setTimeout> | null = null,
    yukleniyor = false,
    sonYazilan = "",
    /** bulut `parca` alanını reddetti (kurallar yayınlanmamış): bu açılışta parçasız yazılır */
    parcaRed = false,
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

  /**
   * buluttakini çek: yerel kayıt bu hesabınsa birleştir, başka hesabınsa onunla değiştir; başarılıysa true. Misafirden
   * misafire (cihazda oturum kaybolup yeni misafir açıldı) yerel kayıt yeni misafire geçer
   */
  async function cek(u: string) {
    const uzak = await s.oku(u);
    if (u != uid) return false;
    const k = bulutKaydi(),
      baska = !!k.sahip && k.sahip != u && !(k.sahipAnonim && anonim);
    sonYazilan = "";
    yukleniyor = true;
    try {
      if (baska) {
        ilerlemeDegistir(uzak);
        rekorlariSil();
        takiliYukle(uzak?.parca, true);
      } else if (uzak) {
        ilerlemeYukle(uzak);
        takiliYukle(uzak.parca);
      }
      if (uzak) rekorBirlestir(uzak.rekor);
      yazJson(BEKLEYEN, { bekleyen: baska ? false : k.bekleyen, sahip: u, sahipAnonim: anonim });
    } finally {
      yukleniyor = false;
    }
    if (uzak) sonYazilan = ozet({ ...uzak, rekor: uzak.rekor || {} });
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
      let b = belgeOlustur(parcaRed),
        oz = ozet(b);
      if (oz != sonYazilan) {
        try {
          await s.yaz(u, b);
        } catch (h) {
          // eski kurallar parca alanını tanımaz: alansız bir kez daha dene; geçerse bu açılışta parçalar yalnız cihazda
          if (!b.parca || u != uid) throw h;
          b = belgeOlustur(true);
          oz = ozet(b);
          await s.yaz(u, b);
          parcaRed = true;
        }
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
    oturum(yeni, a = false) {
      uid = yeni;
      anonim = a;
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
