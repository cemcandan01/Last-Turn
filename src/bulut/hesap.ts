// Çevrimiçi hesap: arayüzün kullandığı tek giriş noktası (Profil ekranı). Firebase kodu (bulut/firebase.ts) yalnız
// yapılandırma girilmişse ve oyun açıldıktan sonra tembel yüklenir; girilmemişse bu modül hiçbir şey yapmaz.
// İlk açılışta sessizce anonim hesap açılır; Profil'den Google ya da e-posta ile bağlanınca aynı ilerleme başka
// cihazda da açılır. Eşitleme kuralları bulut/esitleme.ts'te.
import { yaz, yazJson } from "../cekirdek/depo";
import { ilerlemeyiSifirla } from "../oyun/ilerleme";
import { PROF, saveProf } from "../oyun/profil";
import { FIREBASE_AYAR, bulutAcik, type FirebaseAyari } from "./ayar";
import {
  esitleyiciKur,
  rekorlariSil,
  type EsitlemeDurumu,
  type Esitleyici,
  type Kullanici,
  type Saglayici,
} from "./esitleme";

export interface HesapDurumu {
  /** yapılandırma var mı (yoksa hesap satırı gösterilmez) */
  etkin: boolean;
  kullanici: Kullanici | null;
  esitleme: EsitlemeDurumu;
  /** son işlemin hatası (kullanıcıya gösterilecek Türkçe metin) */
  hata: string | null;
  /** bağlama ya da çıkış sürüyor */
  mesgul: boolean;
}

const D: HesapDurumu = { etkin: false, kullanici: null, esitleme: "yok", hata: null, mesgul: false };
let S: Saglayici | null = null,
  E: Esitleyici | null = null,
  hazir: Promise<Saglayici | null> | null = null;
const dinleyiciler: (() => void)[] = [];
const bildir = () => dinleyiciler.slice().forEach((f) => f());

export const hesapDurumu = (): Readonly<HesapDurumu> => D;

/** hesap durumu değişince çağrılır; bırakan fonksiyon döner */
export function hesapDinle(fn: () => void) {
  dinleyiciler.push(fn);
  return () => {
    const i = dinleyiciler.indexOf(fn);
    if (i >= 0) dinleyiciler.splice(i, 1);
  };
}

/** sağlayıcıyı bağlar (gerçekte firebase.ts, testte sahte): oturumu dinler, yoksa anonim açar */
export function hesapBaslat(s: Saglayici, o: { gecikme?: number } = {}) {
  S = s;
  D.etkin = true;
  if (s.baslangicHatasi) D.hata = hataMetni(s.baslangicHatasi);
  E = esitleyiciKur(s, {
    gecikme: o.gecikme,
    degisti: (d) => {
      D.esitleme = d;
      bildir();
    },
  });
  let ilk = true;
  s.oturumDinle((k) => {
    D.kullanici = k;
    bildir();
    if (!k && ilk) void s.anonimGir().catch(() => {});
    ilk = false;
    void E!.oturum(k ? k.uid : null);
  });
  return E;
}

/**
 * oyun açılışında çağrılır: yapılandırma yoksa (ya da otomatik testte) hiçbir şey yapmaz. Varsa Firebase'i ilk kareyi bekletmeden (boşta)
 * yükler.
 */
export function bulutKur(a: FirebaseAyari = FIREBASE_AYAR) {
  // otomatik tarayıcı testleri (Playwright: navigator.webdriver) gerçek buluta bağlanmaz
  if (!bulutAcik(a) || hazir || (typeof navigator != "undefined" && navigator.webdriver)) return;
  D.etkin = true;
  hazir = new Promise((coz) => {
    const yukle = () =>
      import("./firebase")
        .then((m) => m.firebaseSaglayici(a))
        .then((s) => {
          hesapBaslat(s);
          coz(s);
        })
        .catch(() => {
          D.hata = "Hesap sunucusuna bağlanılamadı";
          bildir();
          hazir = null;
          coz(null);
        });
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(yukle, { timeout: 3000 });
    else setTimeout(yukle, 1500);
  });
}

/** Firebase hata kodunu Türkçe metne çevirir */
function hataMetni(e: unknown) {
  const k = String((e as { code?: string })?.code || (e as Error)?.message || e),
    // kod her zaman görünür: kullanıcı bildirirken neden anlaşılsın
    kod = " (" + k.replace(/^auth\//, "") + ")";
  if (k.includes("popup-closed") || k.includes("cancelled-popup")) return null;
  if (k.includes("network")) return "İnternet yok; bağlanınca yeniden dene" + kod;
  if (k.includes("popup-blocked")) return "Pencere açılamadı; yeniden dene" + kod;
  if (k.includes("wrong-password") || k.includes("invalid-credential") || k.includes("invalid-login"))
    return "E-posta ya da şifre yanlış" + kod;
  if (k.includes("invalid-email")) return "E-posta geçersiz" + kod;
  if (k.includes("weak-password")) return "Şifre en az 6 karakter olmalı" + kod;
  if (k.includes("operation-not-allowed")) return "Bu giriş yolu henüz açılmadı (Firebase ayarı)" + kod;
  if (k.includes("unauthorized-domain")) return "Bu adres Firebase'de yetkili değil" + kod;
  if (k.includes("too-many-requests")) return "Çok deneme yapıldı; biraz sonra yeniden dene" + kod;
  return "Bağlanılamadı" + kod;
}

async function islem(f: (s: Saglayici) => Promise<void>) {
  const s = S || (hazir && (await hazir));
  if (!s || D.mesgul) return;
  D.mesgul = true;
  D.hata = null;
  bildir();
  try {
    await f(s);
  } catch (e) {
    D.hata = hataMetni(e);
  } finally {
    D.mesgul = false;
    bildir();
  }
}

/** anonim hesabı Google'a bağla (o Google hesabı başka cihazda varsa ona geç; ilerlemeler birleşir) */
export const googleBagla = () => islem((s) => s.googleBagla());

/** e-posta + şifre ile bağlan ya da giriş yap */
export const epostaBagla = (eposta: string, sifre: string) =>
  islem((s) => s.epostaBagla(eposta.trim(), sifre));

/** hesaptan çık: bu cihazdaki ilerleme kalır, yeni anonim hesapla sürer */
export const cikis = () =>
  islem(async (s) => {
    await E?.simdiGonder();
    await s.cikis();
    await s.anonimGir();
  });

/**
 * yeni oyuncu olarak başla: bekleyen kayıt gönderilir, hesaptan çıkılır, bu cihazdaki ilerleme, rekorlar ve profil
 * sayaçları silinir (ayarlar kalır), oyun yeniden açılır ve yeni bir misafir hesapla sıfırdan başlar. Google/e-posta
 * hesabındaki ilerleme bulutta kalır; misafir hesabınki kaybolur. Sonra başka bir Google hesabıyla da bağlanılabilir.
 */
export async function yeniOyuncu(yenidenAc = () => location.reload()) {
  if (D.mesgul) return;
  D.mesgul = true;
  bildir();
  try {
    await E?.simdiGonder();
    await E?.oturum(null);
    await S?.cikis();
  } catch {}
  ilerlemeyiSifirla();
  rekorlariSil();
  Object.assign(PROF, { name: "Sürücü", races: 0, wins: 0, km: 0, use: {} });
  saveProf();
  yaz("lt_car", 1);
  yazJson("lt_bulut", { bekleyen: false });
  D.mesgul = false;
  yenidenAc();
}

/** hesap satırı metni: "Google ile bağlı · ad@… · Eşitlendi" gibi */
export function hesapOzeti(d: Readonly<HesapDurumu> = D) {
  const k = d.kullanici,
    kim = !k
      ? "Bağlanıyor…"
      : k.anonim
        ? "Misafir (yalnız bu cihaz)"
        : (k.yol == "google" ? "Google" : "E-posta") + (k.eposta ? " · " + k.eposta : ""),
    es =
      d.esitleme == "tamam"
        ? "Bulutta"
        : d.esitleme == "esitleniyor"
          ? "Eşitleniyor…"
          : d.esitleme == "bekliyor"
            ? "İnternet gelince gönderilecek"
            : d.esitleme == "hata"
              ? "Eşitlenemedi"
              : "";
  return es && k ? kim + " · " + es : kim;
}
