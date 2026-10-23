// Sanal cihaz listesi: ekran uyum denetimi (npm run cihaz, tests/yardimci/cihaz-denetim.mjs) bu cihazlarla koşar.
// Oyun yalnız yatay oynanır; w × h yatay CSS pikseli (genişlik büyük), dpr ekran yoğunluğu.
//   guvenli: yatayda env(safe-area-inset-*) payları (CSS px). Playwright'ta CDP Emulation.setSafeAreaInsetsOverride ile uygulanır.
//   centik:  ekran kenarının ortasındaki fiziksel çentik / ada / delik (derinlik = kenardan içeri, uzunluk = kenar boyunca).
//            İki yatay yönde (sol ve sağ kenar) da sayılır, çünkü telefon iki yöne de çevrilebilir. null = çentik yok.
//   kose:    ekran köşesinin yuvarlaklık yarıçapı (CSS px); bilinmiyorsa 0.
//   tarayici: true ise ana ekran uygulaması değil, tarayıcı sekmesi (adres çubuğu görünür alanı kısaltır).
//   hizli:   hızlı alt kümede (npm run alan, 7 cihaz); tam liste regresyonda.
//   kesin:   false ise ölçü Chrome DevTools / üretici belgesi değerinden yaklaşıktır (aşağıdaki kaynak notuna bak).
// Kaynaklar: Apple iPhone/iPad ekran ölçüleri (developer.apple.com Human Interface Guidelines → Layout, "Screen sizes"),
// yatay güvenli alan payları ve ada/çentik ölçüleri (WWDC güvenli alan belgeleri, ioscodesnippet / useyourloaf.com "iPhone
// Screen Sizes" tablosu); Samsung / Xiaomi / Huawei / Google için Chrome DevTools cihaz listesi, üretici teknik özellikleri
// (çözünürlük ÷ yoğunluk) ve ekran-boyutları veritabanı (yesviz.io/devices). Android'de çentik payı Chrome'un
// viewport-fit=cover ile bildirdiği yaklaşık değerdir; gerçek cihazda değişebilir (kesin:false).

const IP_CENTIK = { derinlik: 33, uzunluk: 162 }; // iPhone 12-14 çentiği (docs/HUD.md: yatayda 114-276 px, derinlik 33)
const ADA = { derinlik: 37, uzunluk: 125 }; // Dynamic Island 125 × 37 pt
const DELIK = { derinlik: 30, uzunluk: 40 }; // Android delik kamera (yaklaşık)

const guvenli = (ust, sag, alt, sol) => ({ ust, sag, alt, sol });
const yok = guvenli(0, 0, 0, 0);

export const CIHAZLAR = [
  // --- Apple telefon
  {
    id: "iphone-se",
    ad: "iPhone SE (2./3. nesil)",
    marka: "Apple",
    w: 667,
    h: 375,
    dpr: 2,
    guvenli: yok,
    centik: null,
    kose: 0,
    hizli: true,
  },
  {
    id: "iphone-13-mini",
    ad: "iPhone 13 mini",
    marka: "Apple",
    w: 812,
    h: 375,
    dpr: 3,
    guvenli: guvenli(0, 50, 21, 50),
    centik: IP_CENTIK,
    kose: 44,
  },
  {
    id: "iphone-13",
    ad: "iPhone 13 (kullanıcının telefonu, referans)",
    marka: "Apple",
    w: 844,
    h: 390,
    dpr: 3,
    guvenli: guvenli(0, 47, 21, 47),
    centik: IP_CENTIK,
    kose: 47,
    hizli: true,
  },
  {
    id: "iphone-13-safari",
    ad: "iPhone 13, Safari sekmesi (adres çubuğu açık)",
    marka: "Apple",
    w: 844,
    h: 340, // adres çubuğu ≈ 50 px görünür yüksekliği kısaltır (yaklaşık)
    dpr: 3,
    guvenli: guvenli(0, 47, 0, 47),
    centik: IP_CENTIK,
    kose: 47,
    tarayici: true,
    hizli: true,
    kesin: false,
  },
  {
    id: "iphone-15-pro",
    ad: "iPhone 15 Pro",
    marka: "Apple",
    w: 852,
    h: 393,
    dpr: 3,
    guvenli: guvenli(0, 59, 21, 59),
    centik: ADA,
    kose: 55,
  },
  {
    id: "iphone-16-pro",
    ad: "iPhone 16 Pro",
    marka: "Apple",
    w: 874,
    h: 402,
    dpr: 3,
    guvenli: guvenli(0, 62, 20, 62),
    centik: ADA,
    kose: 62,
  },
  {
    id: "iphone-15-pro-max",
    ad: "iPhone 15 Pro Max",
    marka: "Apple",
    w: 932,
    h: 430,
    dpr: 3,
    guvenli: guvenli(0, 59, 21, 59),
    centik: ADA,
    kose: 55,
    hizli: true,
  },
  // --- Samsung
  {
    id: "galaxy-s8",
    ad: "Samsung Galaxy S8",
    marka: "Samsung",
    w: 740,
    h: 360,
    dpr: 4,
    guvenli: yok,
    centik: null,
    kose: 0,
    hizli: true,
  },
  {
    id: "galaxy-a14",
    ad: "Samsung Galaxy A14 / A15",
    marka: "Samsung",
    w: 800,
    h: 360,
    dpr: 3, // 1080 × 2408
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "galaxy-a54",
    ad: "Samsung Galaxy A54",
    marka: "Samsung",
    w: 915,
    h: 412,
    dpr: 2.625, // 1080 × 2340 (DevTools "Galaxy A51/71" ile aynı sınıf)
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "galaxy-s23",
    ad: "Samsung Galaxy S23",
    marka: "Samsung",
    w: 780,
    h: 360,
    dpr: 3, // 1080 × 2340
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "galaxy-s24-ultra",
    ad: "Samsung Galaxy S24 Ultra",
    marka: "Samsung",
    w: 915,
    h: 412,
    dpr: 3.5, // 1440 × 3120, Chrome 412 × 915 bildirir
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "galaxy-z-fold-kapali",
    ad: "Samsung Galaxy Z Fold5, kapalı (dış ekran)",
    marka: "Samsung",
    w: 882,
    h: 344,
    dpr: 2.625, // 904 × 2316
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    hizli: true,
    kesin: false,
  },
  {
    id: "galaxy-z-fold-acik",
    ad: "Samsung Galaxy Z Fold5, açık (iç ekran)",
    marka: "Samsung",
    w: 841,
    h: 673,
    dpr: 2.625, // 1812 × 2176
    guvenli: yok,
    centik: null,
    kose: 0,
    kesin: false,
  },
  // --- Xiaomi
  {
    id: "redmi-9a",
    ad: "Xiaomi Redmi 9A (küçük, düşük ekran)",
    marka: "Xiaomi",
    w: 800,
    h: 360,
    dpr: 2, // 720 × 1600
    guvenli: yok,
    centik: null,
    kose: 0,
    kesin: false,
  },
  {
    id: "redmi-note-12",
    ad: "Xiaomi Redmi Note 12",
    marka: "Xiaomi",
    w: 851,
    h: 393,
    dpr: 2.75, // 1080 × 2400
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "xiaomi-14",
    ad: "Xiaomi 14",
    marka: "Xiaomi",
    w: 873,
    h: 393,
    dpr: 3, // 1200 × 2670
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  // --- Huawei
  {
    id: "huawei-p30",
    ad: "Huawei P30",
    marka: "Huawei",
    w: 780,
    h: 360,
    dpr: 3, // 1080 × 2340, damla çentik
    guvenli: guvenli(0, 0, 0, 30),
    centik: { derinlik: 24, uzunluk: 70 },
    kose: 0,
    kesin: false,
  },
  {
    id: "huawei-nova-9",
    ad: "Huawei Nova 9",
    marka: "Huawei",
    w: 851,
    h: 393,
    dpr: 2.75, // 1080 × 2340
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  // --- Google Pixel
  {
    id: "pixel-7",
    ad: "Google Pixel 7",
    marka: "Google",
    w: 915,
    h: 412,
    dpr: 2.625, // 1080 × 2400
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  {
    id: "pixel-7-chrome",
    ad: "Google Pixel 7, Chrome sekmesi (adres çubuğu açık)",
    marka: "Google",
    w: 915,
    h: 356, // adres çubuğu ≈ 56 dp
    dpr: 2.625,
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    tarayici: true,
    kesin: false,
  },
  {
    id: "pixel-4a",
    ad: "Google Pixel 4a / 5 (küçük)",
    marka: "Google",
    w: 851,
    h: 393,
    dpr: 2.75,
    guvenli: guvenli(0, 0, 0, 30),
    centik: DELIK,
    kose: 0,
    kesin: false,
  },
  // --- Tablet
  {
    id: "ipad-mini",
    ad: "iPad mini (6. nesil)",
    marka: "Apple",
    w: 1133,
    h: 744,
    dpr: 2,
    guvenli: guvenli(0, 0, 20, 0),
    centik: null,
    kose: 21,
    hizli: true,
  },
  {
    id: "ipad",
    ad: "iPad (10. nesil)",
    marka: "Apple",
    w: 1180,
    h: 820,
    dpr: 2,
    guvenli: guvenli(0, 0, 20, 0),
    centik: null,
    kose: 21,
  },
  {
    id: "galaxy-tab-a8",
    ad: "Samsung Galaxy Tab A8 (Android tablet)",
    marka: "Samsung",
    w: 1280,
    h: 800,
    dpr: 1.5, // 1920 × 1200
    guvenli: yok,
    centik: null,
    kose: 0,
    kesin: false,
  },
];

export const HIZLI = CIHAZLAR.filter((c) => c.hizli).map((c) => c.id);
export const cihazBul = (ad) => CIHAZLAR.find((c) => c.id == ad);
