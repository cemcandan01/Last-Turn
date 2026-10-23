// Firebase yapılandırması (çevrimiçi hesap ve bulut kaydı). Firebase konsolundaki "firebaseConfig" değerleri buraya
// yapıştırılır (docs/FIREBASE.md). Bu değerler gizli değildir; koruma firestore.rules'tadır.
// Boşken oyun bütünüyle çevrimdışı çalışır: Firebase kodu hiç yüklenmez, ağ isteği yapılmaz, hesap satırı görünmez.

// authDomain konsoldaki adrestir; giriş yardımcısı oyunun adresine indirildiyse çalışırken oyunun adresi kullanılır
// (bulut/firebase.ts).
export const FIREBASE_AYAR = {
  apiKey: "AIzaSyDgJKCI6UthGVz3q0Ps2HrymWCwi_M5uj0",
  authDomain: "last-turn-35ca0.firebaseapp.com",
  projectId: "last-turn-35ca0",
  storageBucket: "last-turn-35ca0.firebasestorage.app",
  messagingSenderId: "299242902732",
  appId: "1:299242902732:web:1dcef8a4d905c720795e69",
};

export type FirebaseAyari = typeof FIREBASE_AYAR;

/** yapılandırma girildi mi (girilmediyse bulut kapalı) */
export const bulutAcik = (a: Pick<FirebaseAyari, "apiKey" | "projectId" | "appId"> = FIREBASE_AYAR) =>
  !!(a.apiKey && a.projectId && a.appId);
