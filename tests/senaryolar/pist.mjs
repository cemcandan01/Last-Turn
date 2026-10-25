import { kariyerSozlesmesi } from "../yardimci/kariyer-senaryosu.mjs";
// Pist dalının senaryoları (tests/senaryolar/BENIOKU.md)
const P = "tests/birim/pistler.test.ts";
export default [
  { id: "yarislar", ad: "40 yarış ve açık dünyalar kuruluyor", p: 1, duman: true, tarayici: "yarislar" },
  {
    id: "pist-duzeni",
    ad: "5 tür × 8 pist (6 seviye): pistler kendini kesmez, virajlar yola sığar, bölgeler çakışmaz, hedefler ve yıldız eşikleri ölçülü",
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
  {
    id: "drift-puan-formulu",
    ad: "drift puanı açı × hız (iç birim m/s, birimden bağımsız), puan açısı en çok 60°, düşük hızda küçük",
    p: 2,
    birim: { dosya: "tests/birim/yildiz.test.ts", grup: "drift puan hızı (açı × hız)" },
  },
  {
    id: "drift-bonuslari",
    ad: "drift bonusları: uzun drift, direksiyonsuz, tek yön; koşul 1 sn sürünce başlar",
    p: 2,
    birim: { dosya: "tests/birim/yildiz.test.ts", grup: "drift bonusları" },
  },
  kariyerSozlesmesi,
];
