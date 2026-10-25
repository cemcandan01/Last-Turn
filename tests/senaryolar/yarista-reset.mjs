export default [
  {
    id: "yaris-lastigi",
    ad: "Beş yarış türünde uygun lastik; yardım/parça üzerine kilit ve çıkışta geri yükleme",
    p: 1,
    birim: { dosya: "tests/birim/yaris-lastigi.test.ts", grup: "yarış lastiği" },
  },
  {
    id: "pist-disi-sinir",
    ad: "İlk çıkış izdüşümü, kesintisiz 5 sn sınırı, erken dönüş ve pist uçları",
    p: 1,
    birim: { dosya: "tests/birim/piste-donus.test.ts", grup: "pist dışından dönüş" },
  },
  {
    id: "yarista-reset",
    ad: "Beş yarış türünde otomatik dönüş ve duraklatma menüsünden yeniden başlatma",
    p: 1,
    tarayici: "piste-donus",
  },
];
