// Altyapı dalının senaryoları (tests/senaryolar/BENIOKU.md): çok araç, girdi kaydı, uzak araç, ilerleme (XP, kilitler)
const C = "tests/birim/cok-arac.test.ts",
  IL = "tests/birim/ilerleme.test.ts";
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
    id: "ilerleme-kilit",
    ad: "Yeni oyuncu kilitli pist/araçla yarış başlatamaz; eski kaydı olan pistini açık bulur",
    p: 1,
    tarayici: "ilerleme",
  },
];
