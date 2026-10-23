// Altyapı dalının senaryoları (tests/senaryolar/BENIOKU.md): çok araç, girdi kaydı, uzak araç
const C = "tests/birim/cok-arac.test.ts";
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
];
