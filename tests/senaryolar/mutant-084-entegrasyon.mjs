// MUTANT 0.8.4 görsel entegrasyonunun alan denetimi.
export default [
  {
    id: "mutant-gorsel-akis",
    ad: "Mutant ekran akışı: boss, risk seçimi, atölye, tamir, sonuç ve araç geçişi",
    p: 1,
    tarayici: "mutant",
  },
  {
    id: "mutant-gorsel-kurallar",
    ad: "Mutant ekonomi, risk, hasar ve boss kuralları önceki sürümle uyumlu",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT koşu (A1)" },
  },
];
