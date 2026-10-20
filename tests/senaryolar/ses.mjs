// Ses dalının senaryoları (tests/senaryolar/BENIOKU.md)
const F = "tests/birim/ses.test.ts";
export default [
  {
    id: "ses-tarayici",
    ad: "Dokununca ses açılıyor, motor sesi, menü müziği, hatasız",
    p: 2,
    tarayici: "ses",
  },
  {
    id: "motor-sesi",
    ad: "Motor sesi katmanları dolu, taşmıyor, dikişsiz; araçlar farklı",
    p: 2,
    birim: { dosya: F, grup: "motor sesi" },
  },
  {
    id: "efektler",
    ad: "Çakıl, patlama, valf, çarpma örnekleri",
    p: 3,
    birim: { dosya: F, grup: "efekt örnekleri" },
  },
];
