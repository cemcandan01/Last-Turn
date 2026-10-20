// Ses dalının senaryoları (tests/senaryolar/BENIOKU.md)
const F = "tests/birim/ses.test.ts";
export default [
  {
    id: "ses-tarayici",
    ad: "Dokununca ses açılıyor, motor sesi, menü müziği, garajda motoru dinle (5 sn), hatasız",
    p: 2,
    tarayici: "ses",
  },
  {
    id: "motor-sesi",
    ad: "Motor sesi katmanları dolu, taşmıyor, dikişsiz, dolgun; araçlar farklı",
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
