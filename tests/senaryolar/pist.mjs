// Pist dalının senaryoları (tests/senaryolar/BENIOKU.md)
const P = "tests/birim/pistler.test.ts";
export default [
  { id: "yarislar", ad: "30 yarış ve açık dünyalar kuruluyor", p: 1, duman: true, tarayici: "yarislar" },
  {
    id: "pist-duzeni",
    ad: "5 tür × 6 seviye: pistler kendini kesmez, virajlar yola sığar, bölgeler çakışmaz, hedefler ve yıldız eşikleri ölçülü",
    p: 2,
    birim: { dosya: P, grup: "pist düzeni" },
  },
  {
    id: "yildiz-kurallari",
    ad: "yıldız sayımı ve kaydı, ters sürüş bayrağı (histerezisli), ters giderken drift puanı yok",
    p: 2,
    birim: { dosya: "tests/birim/yildiz.test.ts", grup: "yıldız ve ters sürüş" },
  },
  {
    id: "yildiz-yaris",
    ad: "oyunda ters sürüşte EV.ters kalkar; drift yarışı tur sayısıyla biter, sonuçta yıldız ve eşikler",
    p: 2,
    tarayici: "yildiz",
  },
];
