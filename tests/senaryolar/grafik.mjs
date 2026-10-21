// Grafik dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "govde",
    ad: "Araç gövdesi: tekerler kemerlerin içinde, gövdeden taşmıyor, kemerli profil düzgün",
    p: 2,
    birim: { dosya: "tests/birim/govde.test.ts", grup: "gövde ve teker kemerleri" },
  },
  {
    id: "kokpit",
    ad: "Kokpit: araca özgü iç tasarım, kapı panelleri görüşü kapatmıyor, yan aynalar ve dikiz aynası arkayı gösteriyor",
    p: 2,
    tarayici: "kokpit",
  },
];
