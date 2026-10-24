// Çevrimiçi hesap: arayüzün kullandığı tek giriş noktası (Profil ekranı). Firebase kodu (bulut/firebase.ts) yalnız
// yapılandırma girilmişse ve oyun açıldıktan sonra tembel yüklenir; girilmemişse bu modül hiçbir şey yapmaz.
// İlk açılışta sessizce anonim hesap açılır; Profil'den Google ya da e-posta ile bağlanınca aynı ilerleme başka
// cihazda da açılır. Eşitleme kuralları bulut/esitleme.ts'te.
// Hesap değiştirme: bu cihazda girilmiş hesaplar listelenir (lt_hesaplar: yalnız uid, tür, e-posta/ad ve gösterim için
// seviye/admin; şifre ya da belirteç saklanmaz). Geçişte önce bekleyen yazma gönderilir, sonra seçilen hesaba girilir;
// yerel ilerleme o hesabın bulut kaydıyla değiştirilir (birleşmez). Giriş olmazsa önceki hesapta kalınır.
import { okuJson, yaz, yazJson } from "../cekirdek/depo";
import {
  adminKilit,
  adminKipi,
  adminSeviyeAyarla,
  ilerlemeyiSifirla,
  paraEkle,
  seviye,
  xpEkle,
} from "../oyun/ilerleme";
import { PROF, saveProf } from "../oyun/profil";
import { FIREBASE_AYAR, bulutAcik, type FirebaseAyari } from "./ayar";
import {
  bekleyenVar,
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
  /** son işlemin hatası (kullanıcıya gösterilecek Türkçe metin, sonda kod) */
  hata: string | null;
  /** son işlemin başarı bildirimi ("Bağlandı: …") */
  bilgi: string | null;
  /** bağlama ya da çıkış sürüyor */
  mesgul: boolean;
  /** admin oturumu (sunucuda admins/{uid} var); admin paneli ve "her şey açık" kipi */
  admin: boolean;
}

const D: HesapDurumu = {
  etkin: false,
  kullanici: null,
  esitleme: "yok",
  hata: null,
  bilgi: null,
  mesgul: false,
  admin: false,
};
let S: Saglayici | null = null,
  E: Esitleyici | null = null,
  hazir: Promise<Saglayici | null> | null = null;
const dinleyiciler: (() => void)[] = [];
const bildir = () => dinleyiciler.slice().forEach((f) => f());

export const hesapDurumu = (): Readonly<HesapDurumu> => D;

/** bu cihazda daha önce girilmiş hesap (Profil → Hesap değiştir) */
export interface BilinenHesap {
  uid: string;
  yol: "google" | "eposta";
  /** e-posta (yoksa Google adı) */
  etiket: string;
  /** son görülen seviye (yalnız gösterim) */
  lv: number;
  admin: boolean;
}
const HESAPLAR = "lt_hesaplar";
const hesaplarOku = () => okuJson<{ liste: BilinenHesap[] }>(HESAPLAR, { liste: [] }).liste;

/** listeye ekle ya da güncelle (en son kullanılan başa) */
function hesapHatirla(k: Kullanici, ek: Partial<BilinenHesap> = {}) {
  if (k.anonim) return;
  const eski = hesaplarOku(),
    o = eski.find((h) => h.uid == k.uid),
    h: BilinenHesap = {
      uid: k.uid,
      yol: k.yol == "google" ? "google" : "eposta",
      etiket: k.eposta || k.ad || o?.etiket || "Google",
      lv: o?.lv ?? 1,
      admin: o?.admin ?? false,
      ...ek,
    };
  yazJson(HESAPLAR, { liste: [h, ...eski.filter((x) => x.uid != k.uid)] });
}

/** bu cihazda girilmiş hesaplar (şu anki hesabın seviyesi canlı) */
export const bilinenHesaplar = (): BilinenHesap[] =>
  hesaplarOku().map((h) => (h.uid == D.kullanici?.uid ? { ...h, lv: seviye().lv, admin: D.admin } : h));

/** hesabı listeden kaldır (yalnız bu cihazın listesi; hesap ve bulut kaydı kalır). Şu anki hesap kaldırılmaz */
export function hesapKaldir(uid: string) {
  if (uid == D.kullanici?.uid) return false;
  yazJson(HESAPLAR, { liste: hesaplarOku().filter((h) => h.uid != uid) });
  bildir();
  return true;
}

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
      if (d == "tamam" && D.kullanici) hesapHatirla(D.kullanici, { lv: seviye().lv });
      bildir();
    },
  });
  let ilk = true;
  s.oturumDinle((k) => {
    D.kullanici = k;
    D.admin = false;
    adminKipi(false);
    if (k) hesapHatirla(k);
    bildir();
    // admin yetkisi sunucuda (Firestore admins/{uid}); anonim hesap admin olamaz
    if (k && !k.anonim)
      void s.adminMi(k.uid).then((a) => {
        if (D.kullanici?.uid != k.uid) return;
        hesapHatirla(k, { admin: a });
        if (!a) return;
        D.admin = true;
        adminKipi(true);
        bildir();
      });
    if (!k && ilk) void s.anonimGir().catch(() => {});
    ilk = false;
    void E!.oturum(k ? k.uid : null, !!k?.anonim);
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
    return "E-posta ya da şifre yanlış (hesabın yoksa yeni hesap oluştur)" + kod;
  if (k.includes("invalid-email")) return "E-posta geçersiz" + kod;
  if (k.includes("email-already-in-use") || k.includes("credential-already-in-use"))
    return "Bu e-postayla zaten hesap var; şifrenle giriş yap" + kod;
  if (k.includes("user-not-found")) return "Bu e-postayla hesap yok; yeni hesap oluştur" + kod;
  if (k.includes("missing-password")) return "Şifre yaz" + kod;
  if (k.includes("weak-password")) return "Şifre en az 6 karakter olmalı" + kod;
  if (k.includes("operation-not-allowed")) return "Bu giriş yolu henüz açılmadı (Firebase ayarı)" + kod;
  if (k.includes("unauthorized-domain")) return "Bu adres Firebase'de yetkili değil" + kod;
  if (k.includes("too-many-requests")) return "Çok deneme yapıldı; biraz sonra yeniden dene" + kod;
  if (k.includes("gonderilemedi"))
    return "Bu hesabın son ilerlemesi buluta gönderilemedi; internet gelince yeniden dene" + kod;
  return "Bağlanılamadı" + kod;
}

/** kullanıcı satırı: "E-posta · ad@…", "Google · ad@…" ya da "Misafir" */
const kimMetni = (k: Kullanici | null) =>
  !k || k.anonim
    ? "Misafir"
    : (k.yol == "google" ? "Google" : "E-posta") + (k.eposta ? " · " + k.eposta : "");

/** işlemi yürütür; başarılıysa true (bilgi: başarı bildirimi). gecis: başarısızsa hangi hesapta kalındığı da yazılır */
async function islem(f: (s: Saglayici) => Promise<void>, bilgi?: () => string, gecis = false) {
  const s = S || (hazir && (await hazir));
  if (!s || D.mesgul) return false;
  D.mesgul = true;
  D.hata = null;
  D.bilgi = gecis ? "Hesap değiştiriliyor…" : null;
  bildir();
  try {
    await f(s);
    D.bilgi = bilgi ? bilgi() : null;
    return true;
  } catch (e) {
    D.bilgi = null;
    const h = hataMetni(e);
    D.hata = h && gecis ? h + " · Hesap değişmedi: " + kimMetni(D.kullanici) : h;
    return false;
  } finally {
    D.mesgul = false;
    bildir();
  }
}

/**
 * hesap değiştirmeden önce: şu anki hesabın bekleyen yazması gönderilir (gönderilemezse geçilmez; yoksa o ilerleme
 * yeni hesabın kaydıyla değiştirilirken kaybolurdu). Misafirin kaydı yeni hesaba bağlanırken birleşir, beklenmez
 */
async function onceGonder() {
  await E?.simdiGonder();
  if (D.kullanici && !D.kullanici.anonim && bekleyenVar()) throw { code: "gonderilemedi" };
}

/** giriş sonrası: yeni hesabın bulut kaydı yüklenene kadar bekle */
const sonraYukle = () => E?.simdiGonder();

const baglandi = () =>
  "Bağlandı: " + (D.kullanici?.eposta || "Google") + " · Seviye " + seviye().lv + " · İlerlemen bulutta";

/**
 * Google ile: misafirse hesaba bağlar (yeni Google hesabıysa misafirin ilerlemesi ona geçer; var olan hesapsa o hesabın
 * ilerlemesi yüklenir); bağlı hesaptaysa hesap seçiciyle başka Google hesabına geçer. ipucu: seçicide önerilen e-posta
 */
export const googleBagla = (ipucu?: string) =>
  islem(
    async (s) => {
      await onceGonder();
      await s.googleBagla(ipucu);
      await sonraYukle();
    },
    () => (D.kullanici && !D.kullanici.anonim ? baglandi() : ""),
    true,
  );

/** e-posta + şifreyle yeni hesap aç (misafirse ilerlemesi o hesaba geçer; bağlı hesaptan açılırsa sıfırdan başlar) */
export const epostaOlustur = (eposta: string, sifre: string) =>
  islem(
    async (s) => {
      await onceGonder();
      await s.epostaOlustur(eposta.trim(), sifre);
      await sonraYukle();
    },
    baglandi,
    true,
  );

/** var olan e-posta hesabına giriş yap (bu cihazdaki ilerleme o hesabınkiyle değiştirilir) */
export const epostaGiris = (eposta: string, sifre: string) =>
  islem(
    async (s) => {
      await onceGonder();
      await s.epostaGiris(eposta.trim(), sifre);
      await sonraYukle();
    },
    baglandi,
    true,
  );

/** şifre sıfırlama e-postası gönder */
export const sifreSifirla = (eposta: string) =>
  islem(
    (s) => s.sifreSifirla(eposta.trim()),
    () => "Şifre sıfırlama e-postası gönderildi: " + eposta.trim() + " (gelmezse gereksiz klasörüne bak)",
  );

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
    kim = !k ? "Bağlanıyor…" : k.anonim ? "Misafir (yalnız bu cihaz)" : kimMetni(k),
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

// --- admin (yalnız admin oturumunda; buluta yazma kuralları firestore.rules'ta) ---

/** admin işlemi: yalnız admin oturumunda çalışır, sonra hemen buluta yazılır */
function adminIslem(f: () => void, bilgi: string) {
  if (!D.admin) return false;
  f();
  D.hata = null;
  D.bilgi = bilgi;
  bildir();
  void E?.simdiGonder();
  return true;
}

export const adminParaEkle = (m: number) => adminIslem(() => paraEkle(m, "admin"), "+" + m + " para");
export const adminXpEkle = (m: number) => adminIslem(() => xpEkle(m, "admin"), "+" + m + " XP");
export const adminSeviye = (lv: number) => adminIslem(() => adminSeviyeAyarla(lv), "Seviye " + lv);
export const adminKilitAyarla = (oge: string, acik: boolean) =>
  adminIslem(() => adminKilit(oge, acik), oge + (acik ? " açıldı" : " kilitlendi"));
/** "her şey açık" kipini aç/kapat (normal oyuncu görünümünü denemek için) */
export const adminHerSeyAcik = (acik: boolean) =>
  adminIslem(() => adminKipi(acik), acik ? "Her şey açık" : "Normal oyuncu görünümü");
/** ilerlemeyi sıfırla: XP, yıldız, para, alım, açık öğeler ve rekorlar (hesap aynı kalır) */
export const adminSifirla = () =>
  adminIslem(() => {
    ilerlemeyiSifirla();
    rekorlariSil();
  }, "İlerleme sıfırlandı");
