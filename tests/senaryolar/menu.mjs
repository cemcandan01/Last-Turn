// Menü dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "acilis",
    ad: "Menü ekranları, ana ekran kartları, yarış türü görselleri, sürüm numarası",
    p: 1,
    duman: true,
    tarayici: "acilis",
  },
  {
    id: "garaj-ses",
    ad: "Garajda Motoru dinle butonu: olay, çalarken durum, bitince eski hâl",
    p: 2,
    tarayici: "garaj-ses",
  },
  {
    id: "dokunma",
    ad: "Dokunma: parmak düğmeden kayıp dışarıda kalkınca tıklama iptal, geri dönüp bırakınca tıklanır",
    p: 2,
    tarayici: "dokunma",
  },
  {
    id: "gecis",
    ad: "Menü arka planı: çekim geçişinde kararma yok, eski kare yakınlaşarak çözülüyor",
    p: 3,
    tarayici: "gecis",
  },
  {
    id: "arka-gorsel",
    ad: "Menü arka plan görselleri: menüde rastgele akıyor ve 3B çizim duruyor, sürüşte gizli",
    p: 2,
    tarayici: "arka-gorsel",
  },
  {
    id: "seviyeler",
    ad: "Pist listesi: 8 pist seviye sırasıyla, seviye rozeti ve kimin için ideal; drift hedef puanı",
    p: 2,
    tarayici: "seviyeler",
  },
  {
    id: "yildiz",
    ad: "Yıldız görselleri: pist kartında en iyi yıldız, ayrıntıda 1★/2★/3★ eşikleri, yarış sonunda alınan yıldızlar",
    p: 2,
    tarayici: "yildiz",
  },
  {
    id: "xp-gorsel",
    ad: "XP görselleri (temiz profil): pist kilitleri, türde açık pist sayısı, profil seviye çubuğu, yarış sonu XP çubuğu, seviye atlama kutlaması",
    p: 2,
    tarayici: "xp-gorsel",
  },
  {
    id: "kapak",
    ad: "Yarış türü kapak akışı: ok, kaydırma, yan kart; pistler türün rengiyle",
    p: 2,
    tarayici: "kapak",
  },
  {
    id: "cihaz-uyum",
    ad: "Ekran uyumu: menü, yarış, pist, profil, ayarlar, duraklatma ve yarış sonu ekranları sanal cihazlarda taşmıyor, kesilmiyor, üst üste binmiyor (alanda 3 cihaz; regresyonda iPhone 13 tam + 11 temsilci cihaz 4 ekran)",
    p: 2,
    tarayici: "cihaz-menu",
  },
];
