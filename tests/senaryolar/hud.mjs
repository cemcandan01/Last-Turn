// HUD dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "hud-cakisma",
    ad: "HUD düzenleri: çakışma ve taşma yok, tek drift sayacı, açı yok",
    p: 2,
    tarayici: "hud-cakisma",
  },
  {
    id: "hud-duzenleyici",
    ad: "HUD düzenleyici açılıyor, uygulanıyor, kalıcı",
    p: 2,
    tarayici: "hud-duzenleyici",
  },
  {
    id: "cihaz-uyum",
    ad: "Ekran uyumu: HUD düzenleyici ve yarış HUD'ları (asfalt, drift, drag) sanal cihazlarda taşmıyor, kesilmiyor, üst üste binmiyor (alanda 3 cihaz; regresyonda iPhone 13 tam + 11 temsilci cihaz 4 ekran)",
    p: 2,
    tarayici: "cihaz-hud",
  },
];
