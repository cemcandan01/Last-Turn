// Firebase sağlayıcısı (yalnız Auth + Firestore Lite): bulut/hesap.ts bu modülü yapılandırma varsa tembel yükler.
// Firestore Lite: çevrimdışı önbellek ve canlı dinleme yok (paket küçük); yerel kayıt zaten localStorage'da,
// bekleyen yazma bulut/esitleme.ts'te.
// Google girişi: iPhone'da ana ekrana kurulu uygulamada (standalone) açılır pencere (popup) güvenilir dönmez; orada
// yönlendirme (redirect) kullanılır. Safari üçüncü taraf depolamayı engellediği için yönlendirme ancak giriş yardımcısı
// oyunun kendi adresinde barınınca çalışır (__/auth/, derlemede indirilir: vite.config.ts → firebaseYardimci).
// Yardımcı yoksa popup denenir; olmazsa e-posta ile bağlanma her yerde çalışır (docs/FIREBASE.md).
import { initializeApp } from "firebase/app";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  browserPopupRedirectResolver,
  getRedirectResult,
  indexedDBLocalPersistence,
  initializeAuth,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore/lite";
import type { FirebaseAyari } from "./ayar";
import type { BulutBelgesi, Kullanici, Saglayici } from "./esitleme";

const YONLENDIRME = "lt_yonlendirme";

const kod = (e: unknown) => String((e as { code?: string })?.code || "");

/** iPhone/iPad ana ekran uygulaması mı */
const standalone = () =>
  !!(navigator as Navigator & { standalone?: boolean }).standalone ||
  (/iPhone|iPad|iPod/.test(navigator.userAgent) && matchMedia("(display-mode: fullscreen)").matches);

/** giriş yardımcısı oyunun adresinde var mı (https'te; varsa authDomain oyunun kendi adresi olur) */
async function yardimciVar() {
  if (location.protocol != "https:") return false;
  try {
    const r = await fetch("__/auth/handler.js", { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

function kullanici(u: User): Kullanici {
  const p = u.providerData.map((d) => d.providerId),
    yol = p.includes("google.com") ? "google" : p.includes("password") ? "eposta" : "anonim";
  return { uid: u.uid, anonim: u.isAnonymous, yol, eposta: u.email, ad: u.displayName };
}

/** bağlanmak istenen Google/e-posta hesabı zaten varsa (başka cihazda açılmış) ona geç */
async function varsaGec(auth: Auth, e: unknown) {
  const k = kod(e);
  if (k != "auth/credential-already-in-use" && k != "auth/email-already-in-use") throw e;
  const c = GoogleAuthProvider.credentialFromError(e as never);
  if (!c) throw e;
  await signInWithCredential(auth, c);
}

export async function firebaseSaglayici(a: FirebaseAyari): Promise<Saglayici> {
  const yardimci = await yardimciVar(),
    authDomain = yardimci ? location.host + location.pathname.replace(/\/[^/]*$/, "") : a.authDomain,
    app = initializeApp({ ...a, authDomain }),
    // çözücü başlangıçta verilmeli: linkWithRedirect kullanıcıya yönlendirme işareti koyar, dönüşte çözücü yoksa
    // Auth "argument-error" ile başlayamaz (iPhone ana ekran uygulamasında Google ile bağlanınca görülen hata)
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    }),
    db = getFirestore(app),
    google = new GoogleAuthProvider(),
    yonlendir = yardimci && standalone();
  auth.languageCode = "tr";
  google.setCustomParameters({ prompt: "select_account" });

  // yönlendirmeden dönülüyorsa sonucu al: hata ya da Google hesabı başka cihazda varsa ona geçiş
  let yonlendirmeHatasi: unknown = null;
  if (localStorage.getItem(YONLENDIRME)) {
    localStorage.removeItem(YONLENDIRME);
    try {
      await getRedirectResult(auth, browserPopupRedirectResolver);
    } catch (e) {
      try {
        await varsaGec(auth, e);
      } catch (e2) {
        yonlendirmeHatasi = e2;
      }
    }
  }

  return {
    baslangicHatasi: yonlendirmeHatasi,
    oturumDinle: (fn) => onAuthStateChanged(auth, (u) => fn(u ? kullanici(u) : null)),
    async anonimGir() {
      if (!auth.currentUser) await signInAnonymously(auth);
    },
    async googleBagla() {
      const u = auth.currentUser;
      if (yonlendir) {
        localStorage.setItem(YONLENDIRME, "1");
        if (u?.isAnonymous) await linkWithRedirect(u, google, browserPopupRedirectResolver);
        else await signInWithRedirect(auth, google, browserPopupRedirectResolver);
        return;
      }
      if (u?.isAnonymous)
        await linkWithPopup(u, google, browserPopupRedirectResolver).catch((e) => varsaGec(auth, e));
      else await signInWithPopup(auth, google, browserPopupRedirectResolver);
    },
    async epostaOlustur(eposta, sifre) {
      const u = auth.currentUser,
        c = EmailAuthProvider.credential(eposta, sifre);
      if (u?.isAnonymous) await linkWithCredential(u, c);
      else await createUserWithEmailAndPassword(auth, eposta, sifre);
    },
    epostaGiris: async (eposta, sifre) => void (await signInWithEmailAndPassword(auth, eposta, sifre)),
    sifreSifirla: (eposta) => sendPasswordResetEmail(auth, eposta),
    adminMi: (uid) =>
      getDoc(doc(db, "admins", uid)).then(
        (s) => s.exists(),
        () => false,
      ),
    cikis: () => signOut(auth),
    async oku(uid) {
      const s = await getDoc(doc(db, "users", uid));
      return s.exists() ? (s.data() as Partial<BulutBelgesi>) : null;
    },
    yaz: (uid, belge) => setDoc(doc(db, "users", uid), belge),
  };
}
