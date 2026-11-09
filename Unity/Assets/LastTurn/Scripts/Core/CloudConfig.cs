namespace LastTurn.Core
{
  // TS src/bulut/ayar.ts FIREBASE_AYAR ile aynı proje (web oyunuyla aynı hesaplar ve users/{uid} belgesi). Bu değerler
  // gizli değildir; koruma firestore.rules'tadır. --cloud-sync doğrulaması ayar.ts ile eşitliği denetler.
  public static class CloudConfig
  {
    public const string ApiKey = "AIzaSyDgJKCI6UthGVz3q0Ps2HrymWCwi_M5uj0";
    public const string ProjectId = "last-turn-35ca0";
    // Masaüstü Google girişi: Google Cloud'da aynı projede "Masaüstü uygulaması" türünde OAuth istemcisi (docs/FIREBASE.md).
    // Boşsa Google düğmesi "ayarlanmadı" bildirir; e-posta girişi etkilenmez. Yüklü uygulama anahtarı gizli sayılmaz.
    public const string GoogleDesktopClientId = "";
    public const string GoogleDesktopClientSecret = "";
  }
}
