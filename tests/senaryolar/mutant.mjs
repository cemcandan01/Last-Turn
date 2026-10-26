// MUTANT dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "mutant-akis",
    ad: "MUTANT: menü girişi, garaj, perk seçimi, görev, Tutuş Darbesi, koşu özeti; yarışta çarpan 1; tuş çakışmasız",
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
    ad: "MUTANT koşu: seçim, görevler, bitiş, belirlenimcilik",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT koşu kuralları" },
  },
  {
    id: "kombinasyon-matrisi",
    ad: "1-3'lü bütün perk kombinasyonları kırılmaz; etkisiz perk yok; sinerji raporu",
    p: 2,
    birim: { dosya: "tests/birim/mutant-matris.test.ts", grup: "MUTANT kombinasyon matrisi" },
  },
  {
    id: "yardim-olcumu",
    ad: "Yardım seviyesinin Drift Hasadı'na etkisi (gerçek fizik ölçümü)",
    p: 3,
    birim: {
      dosya: "tests/birim/mutant.test.ts",
      grup: "MUTANT ölçüm: sürüş yardımının Drift Hasadı'na etkisi (gerçek fizik)",
    },
  },
];
