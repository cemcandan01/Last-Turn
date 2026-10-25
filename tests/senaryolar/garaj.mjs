// Garaj dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "garaj",
    ad: "Garaj, serbest sürüş öncesi araç seçimi, önayar kuralı",
    p: 1,
    duman: true,
    tarayici: "garaj",
  },
  {
    id: "garaj-kilit",
    ad: "Garajda yalnız sahip olunan araçlar: kilit, fiyat ve satın alma düğmesi yok; uygun araç alınmamışsa mağaza ipucu",
    p: 1,
    tarayici: "garaj-kilit",
  },
  {
    id: "magaza",
    ad: "Mağaza: sahip olunmayan araçlar, seviye yok / para yok / satın alınabilir kartları, iki dokunuşla onay, kutlama, araç mağazadan düşer, Garaja git, tür süzgeci, Geri",
    p: 1,
    tarayici: "magaza",
  },
  {
    id: "cihaz-uyum",
    ad: "Ekran uyumu: garaj paneli, yarış öncesi garaj ve vitrin ekranları sanal cihazlarda taşmıyor, kesilmiyor, üst üste binmiyor (alanda 3 cihaz; regresyonda iPhone 13 tam + 11 temsilci cihaz 4 ekran)",
    p: 2,
    tarayici: "cihaz-garaj",
  },
];
