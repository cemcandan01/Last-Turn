export default [
  {
    id: "hayalet-yaris",
    ad: "Gerçek yarışta farklı araç, aynı rekor, bağımsız pist sorgusu ve yarım kayıt engeli",
    p: 1,
    tarayici: "hayalet",
  },
  {
    id: "hayalet-sinirlar",
    ad: "Hayalet kurulumu, tur başlangıcı, hava ve yarım/bozuk kayıt",
    p: 1,
    birim: { dosya: "tests/birim/hayalet.test.ts", grup: "hayalet kayıt sınırları" },
  },
  {
    id: "hayalet-dogruluk",
    ad: "Kayıtlı araç ve kurulumla belirlenimci hayalet",
    p: 1,
    birim: { dosya: "tests/birim/hayalet.test.ts", grup: "hayalet sürüş doğruluğu" },
  },
  {
    id: "hayalet-kayit",
    ad: "Hayalet tur kaydı ve oynatma",
    p: 1,
    birim: { dosya: "tests/birim/hayalet.test.ts", grup: "Hayalet tur kaydı ve oynatma" },
  },
];
