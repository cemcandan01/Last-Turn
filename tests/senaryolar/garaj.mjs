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
    ad: "Garaj araç kilitleri: kilitli araç karartılmış gezilir, Seç devre dışı, öneri açık araca düşer",
    p: 1,
    tarayici: "garaj-kilit",
  },
  {
    id: "cihaz-uyum",
    ad: "Ekran uyumu: garaj paneli, yarış öncesi garaj ve vitrin ekranları sanal cihazlarda taşmıyor, kesilmiyor, üst üste binmiyor (alanda 3 cihaz; regresyonda iPhone 13 tam + 11 temsilci cihaz 4 ekran)",
    p: 2,
    tarayici: "cihaz-garaj",
  },
];
