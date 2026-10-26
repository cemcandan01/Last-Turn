// MUTANT dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "mutant-akis",
    ad: "MUTANT A1: menü, boss kartı, araç/pasif seçimi, etkinlik işareti → kariyer dışı yarış → koşu parası, atölye, zorunlu boss, özet; normal yarış etkilenmez",
    p: 1,
    tarayici: "mutant",
  },
  {
    id: "mekanik-yurutucu",
    ad: "Mekanik yürütücü: tekrar engeli, yığınlama yok, sonlu döngü, enerji sınırı",
    p: 1,
    birim: { dosya: "tests/birim/mekanikler.test.ts", grup: "LT-SYS-001 mekanik yürütücü" },
  },
  {
    id: "drift-gozlemcisi",
    ad: "Drift gözlemcisi gerçek fizikte durumu değiştirmez, savrulmadan enerji yok",
    p: 1,
    birim: {
      dosya: "tests/birim/mekanikler.test.ts",
      grup: "LT-SYS-001 drift gözlemcisi (gerçek fizik, Boş Otopark, Beyaz Kurt)",
    },
  },
  {
    id: "ortak-kurallar",
    ad: "Spin yakma, Tutuş Darbesi süresi/beklemesi, değiştirici sınırları",
    p: 1,
    birim: {
      dosya: "tests/birim/mekanikler.test.ts",
      grup: "LT-SYS-001 ortak kurallar: spin yakma, Tutuş Darbesi, değiştiriciler",
    },
  },
  {
    id: "kosu-kurallari",
    ad: "MUTANT koşu: boss/geri sayım, etkinlik ödülü, XP/seviye/pasif, atölye, boss sonrası bölge, belirlenimcilik",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT koşu (A1)" },
  },
  {
    id: "kombinasyon-matrisi",
    ad: "Enerji perkleri (A2 için): 1-3'lü bütün kombinasyonlar kırılmaz; etkisiz perk yok; sinerji raporu",
    p: 2,
    birim: { dosya: "tests/birim/mutant-matris.test.ts", grup: "MUTANT kombinasyon matrisi" },
  },
];
