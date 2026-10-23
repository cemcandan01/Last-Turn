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
    id: "cihaz-uyum",
    ad: "Ekran uyumu: garaj paneli, yarış öncesi garaj ve vitrin ekranları sanal cihazlarda taşmıyor, kesilmiyor, üst üste binmiyor (hızlı alt küme; regresyonda 25 cihaz)",
    p: 2,
    tarayici: "cihaz-garaj",
  },
];
