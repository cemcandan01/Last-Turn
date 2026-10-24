// Modifiye dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "modifiye-birim",
    ad: "Modifiye: parça fiyatları, araç başına satın alma, takılı parçaların kaydı ve sürüşe uygulanması",
    p: 1,
    birim: { dosya: "tests/birim/modifiye.test.ts", grup: "modifiye: takılı parçalar ve sürüş" },
  },
  {
    id: "modifiye-fiyat",
    ad: "Modifiye: zayıf parça ücretsiz, seviyeyle artan fiyat, para yetmezse alınmaz, iki kez ödenmez",
    p: 2,
    birim: { dosya: "tests/birim/modifiye.test.ts", grup: "modifiye: fiyat ve satın alma" },
  },
  {
    id: "modifiye-his",
    ad: "Modifiye hissiyatı: her parça kategorisi stoktan anlamlı fark verir (0-100, tepe hız, turbo gecikmesi, yalpa, patinaj, fren, tutuş, teker açısı)",
    p: 2,
    birim: { dosya: "tests/birim/modifiye-his.test.ts", grup: "modifiye: her kategori hissedilir" },
  },
  {
    id: "modifiye-garaj",
    ad: "Garajda Modifiye: sınıf + puan rozeti, kategoriler ve parçalar araca binmiyor, puan farkı önizlemesi, iki dokunuşla satın alma, paket, kayıt, yarışta parçalı araç",
    p: 1,
    tarayici: "modifiye",
  },
];
