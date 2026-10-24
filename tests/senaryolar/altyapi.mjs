// Altyapı dalının senaryoları (tests/senaryolar/BENIOKU.md): çok araç, girdi kaydı, uzak araç, ilerleme (XP, kilitler)
const C = "tests/birim/cok-arac.test.ts",
  IL = "tests/birim/ilerleme.test.ts",
  EK = "tests/birim/ekonomi.test.ts",
  BU = "tests/birim/bulut.test.ts";
export default [
  {
    id: "girdi-kaydi",
    ad: "Girdi kaydı iki kez oynatılınca aynı son durum (belirlenimcilik)",
    p: 1,
    birim: { dosya: C, grup: "girdi kaydı ve yeniden oynatma" },
  },
  {
    id: "arac-bagimsiz",
    ad: "Araç örnekleri birbirinin fiziğini etkilemez",
    p: 2,
    birim: { dosya: C, grup: "araç örnekleri birbirinden bağımsız" },
  },
  {
    id: "uzak-arac",
    ad: "Anlık görüntü düz sayı; uzak araç yumuşak ilerler",
    p: 2,
    birim: { dosya: C, grup: "anlık görüntü ve uzak araç" },
  },
  {
    id: "hayalet",
    ad: "Yarışta hayalet uzak araç çiziliyor, girdi kaydı tutuluyor",
    p: 2,
    tarayici: "cok-arac",
  },
  {
    id: "ekran-yon",
    ad: "Yatay ve dikey açılışta #app ekranı tam kaplar; yön değişiminde düzen bozulmaz",
    p: 1,
    tarayici: "ekran-yon",
  },
  {
    id: "cihaz-denetim",
    ad: "Ekran uyum denetimi bilerek bozulmuş sayfalarda her hata türünü yakalıyor, temiz sayfada yanlış alarm vermiyor",
    p: 2,
    tarayici: "cihaz-dogrulama",
  },
  {
    id: "xp-egrisi",
    ad: "XP ve seviye eğrisi: yıldız başına XP, eski yıldız yeniden XP vermez, Efsane'ye girmeden her şey açılır",
    p: 1,
    birim: { dosya: IL, grup: "XP ve seviye eğrisi" },
  },
  {
    id: "kilit-tablosu",
    ad: "Başta her türün Çaylak pisti ve 2 araç açık; seviye atlayınca açılanlar dinleyiciye gider",
    p: 1,
    birim: { dosya: IL, grup: "kilit tablosu" },
  },
  {
    id: "ilerleme-gecis",
    ad: "Eski rekor ve yıldızlardan XP; oynanmış pist/araç açık kalır; bulut verisi büyüğü alır",
    p: 1,
    birim: { dosya: IL, grup: "eski kayıttan geçiş ve bulut verisi" },
  },
  {
    id: "yaris-parasi",
    ad: "Yarış parası pist zorluğuyla ve yeni yıldızla artar; tekrar az verir ama sıfır değil; belirlenimci",
    p: 1,
    birim: { dosya: EK, grup: "yarış parası" },
  },
  {
    id: "arac-satin-alma",
    ad: "Araçlar seviye + para ile açılır: seviyesi gelmeyen ya da parası yetmeyen araç alınamaz; benzetimde ilk alım ~7-12 yarış",
    p: 1,
    birim: { dosya: EK, grup: "araç fiyatları ve satın alma" },
  },
  {
    id: "para-gecisi",
    ad: "Eski kayıttan başlangıç parası, o sürümde açık araçlar sahip; bulutta kazanılanın büyüğü ve alımların birleşimi",
    p: 1,
    birim: { dosya: EK, grup: "eski kayıttan para geçişi ve bulut" },
  },
  {
    id: "ilerleme-kilit",
    ad: "Yeni oyuncu kilitli pist/araçla yarış başlatamaz; alınmamış/parası yetmeyen araç seçilmez; eski kaydı olan pistini açık bulur",
    p: 1,
    tarayici: "ilerleme",
  },
  {
    id: "bulut-kapali",
    ad: "Firebase yapılandırması yokken bulut kapalı: Firebase yüklenmez, hesap satırı çizilmez, kayıt değişmez",
    p: 1,
    birim: { dosya: BU, grup: "yapılandırma yokken" },
  },
  {
    id: "bulut-rekor",
    ad: "Bulut belgesi ilerleme + rekorlar; rekor birleşmesinde drift puanının büyüğü, sürenin küçüğü",
    p: 2,
    birim: { dosya: BU, grup: "rekor ve belge" },
  },
  {
    id: "bulut-esitleme",
    ad: "Sahte Firebase: ilerleme bir cihazda yazılıp başka cihazda aynı hesapla okunur, birleşir; çevrimdışı kuyruk; reddedilen yazma yeniden çekilir; yeni oyuncu bu cihazı sıfırlar, bulut kalır; admin (sunucuda admins/{uid}) her şeyi açık görür ve panelle XP/para/seviye/kilit/sıfırlama yapar, normal oyuncu yapamaz",
    p: 1,
    birim: { dosya: BU, grup: "sahte Firebase ile eşitleme" },
  },
  {
    id: "hesap-formu",
    ad: "E-posta formu iPhone yatayda klavye açıkken (170 px görünür) şeride sığar, alanlar tek tek, İleri ile geçer, uyarı görünür",
    p: 1,
    tarayici: "hesap-formu",
  },
];
