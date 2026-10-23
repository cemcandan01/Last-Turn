// Firebase yapılandırması (çevrimiçi hesap ve bulut kaydı). Firebase konsolundaki "firebaseConfig" değerleri buraya
// yapıştırılır (docs/FIREBASE.md). Bu değerler gizli değildir; koruma firestore.rules'tadır.
// Boşken oyun bütünüyle çevrimdışı çalışır: Firebase kodu hiç yüklenmez, ağ isteği yapılmaz, hesap satırı görünmez.

export const FIREBASE_AYAR = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

export type FirebaseAyari = typeof FIREBASE_AYAR;

/** yapılandırma girildi mi (girilmediyse bulut kapalı) */
export const bulutAcik = (a: FirebaseAyari = FIREBASE_AYAR) => !!(a.apiKey && a.projectId && a.appId);
