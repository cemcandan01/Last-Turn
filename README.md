# Last Turn

iPhone için 3D sürüş ve yarış oyunu. Ana ekrana kurulan bir uygulama (PWA) olarak çalışır: kendi simgesiyle tam ekran açılır, internetsiz de oynanır ve her yeni sürüm otomatik iner.

## İçerik

Açık dünya: merkezde test arazisi, yollarla bağlı asfalt pist, toprak pist, drift parkı ve ralli etabı. Yarışlar (asfalt, toprak, drift puanı, ralli), lastik ve araç ayarları, sürüş yardımı seviyeleri, üç kontrol modu (tuşlar, ekran direksiyonu, telefonu yatırma) ve dört kamera.

## iPhone'a kurulum

1. Oyunun adresini **Safari**'de aç.
2. Paylaş düğmesi → **Ana Ekrana Ekle**.
3. Ana ekrandaki **Last Turn** simgesinden aç.

## Güncellemeler

- Uygulama internet varken her açılışta en yeni sürümü yükler.
- Arka plandaysa ve yeni sürüm çıkmışsa üstte **"Yeni sürüm hazır · Güncelle"** düğmesi görünür.
- Yayınlarken `index.html` içindeki `APP_VERSION` değeri artırılır; sürüm menünün altında görünür.

## Yayınlama (tek seferlik)

Oyun derleme gerektirmeyen statik dosyalardan oluşur; repo kökü olduğu gibi yayınlanır. Repo private olduğu için seçenekler:

- **Cloudflare Pages** veya **Netlify** (ücretsiz, private repo destekler): GitHub reposunu bağla, build komutu boş, yayın klasörü `/`. Her `master` push'unda kendiliğinden yayınlanır.
- **GitHub Pages**: repo public yapılırsa (ya da GitHub Pro ile) Settings → Pages → Branch `master` / `/ (root)`.

## Dosyalar

- `index.html` oyunun tamamı
- `sw.js` çevrimdışı önbellek ve güncelleme (service worker)
- `manifest.webmanifest`, `icons/` uygulama adı ve simgeleri
- `vendor/three.min.js` Three.js r128 (MIT), çevrimdışı çalışsın diye repoda

## Sonraki adım: App Store / TestFlight

Oyun tamamlandığında aynı kod Capacitor ile native iOS uygulamasına sarılabilir (Mac + Xcode + Apple Developer hesabı gerekir).
