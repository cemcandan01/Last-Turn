import { kariyerSozlesmesi } from "../yardimci/kariyer-senaryosu.mjs";
const birim = (id, dosya, grup) => ({
  id,
  ad: grup,
  p: 1,
  birim: { dosya: `tests/birim/${dosya}.test.ts`, grup },
});
const ekran = (bolum) => ({ id: bolum, ad: bolum, p: 2, tarayici: bolum });
export default [
  kariyerSozlesmesi,
  ...["yarış parası", "araç fiyatları ve satın alma", "eski kayıttan para geçişi ve bulut"].map((g, i) =>
    birim("ekonomi-" + i, "ekonomi", g),
  ),
  ...["XP ve seviye eğrisi", "kilit tablosu", "eski kayıttan geçiş ve bulut verisi"].map((g, i) =>
    birim("ilerleme-" + i, "ilerleme", g),
  ),
  ...["modifiye: fiyat ve satın alma", "modifiye: takılı parçalar ve sürüş", "modifiye: bulut"].map((g, i) =>
    birim("modifiye-" + i, "modifiye", g),
  ),
  birim("lastik", "yaris-lastigi", "yarış lastiği"),
  ...["parçalar", "performans puanı", "hissiyat: parçalar hissedilir, kurallar korunur"].map((g, i) =>
    birim("parca-" + i, "parcalar", g),
  ),
  birim("sinif", "denge", "ortak özellik toplamı ve modifiye alanı"),
  birim("kurallar", "calisma", "ortak çalışma araçları"),
  ...["Hayalet tur kaydı ve oynatma", "hayalet sürüş doğruluğu", "hayalet kayıt sınırları"].map((g, i) =>
    birim("hayalet-" + i, "hayalet", g),
  ),
  ...[
    "kariyer",
    "ilerleme",
    "garaj-kilit",
    "modifiye",
    "hayalet",
    "yildiz",
    "xp-gorsel",
    "garaj-duzen",
    "yarislar",
    "hud-cakisma",
    "piste-donus",
  ].map(ekran),
];
