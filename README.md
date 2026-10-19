# Last Turn

iPhone için 3D sürüş ve yarış oyunu. Ana ekrana kurulan bir uygulama (PWA) olarak çalışır: kendi simgesiyle tam ekran açılır, internetsiz de oynanır ve her yeni sürüm otomatik iner.

## İçerik

- **Açık dünya** (serbest sürüş): *Çorak Topraklar* (oval, uzun düz yol, zıplama rampası, tırmanış yolu) ve *Boş Otopark* (AVM önünde geniş açık otopark, asfalt testleri için).
- **15 yarış**, her pistin kendi teması var: Grand Prix (tribünler, tepeli), Kıyı Pisti (gün batımı, deniz), Şehir Pisti (gece, gökdelenler, beton duvarlar), Çamur Vadisi, Taş Ocağı (asfalt-toprak karışık), Orman Kros (sisli), Drift Parkı, Liman (konteynerler, vinçler), Dağ Yolu (büyük iniş-çıkışlar, bariyerler), Orman Etabı, Tepe Etabı (karlı), Vadi Etabı (çöl) ve 3 drag pisti.
- **Garaj**: araçları dönen platformda incele, azami hız, hızlanma, güç, yol tutuşu, arazi, fren ve çeviklik değerlerini karşılaştır. Her yarıştan önce araç seçilir.
- **5 araç**, her yarış türü için bir tane: *Kızıl Ok* (ortadan motorlu pist arabası), *Kor RX* (dört çeker rallikros), *Beyaz Kurt* (geniş gövdeli drift arabası), *Mavi Yıldız* (dört çeker ralli sedanı), *Gece Mavisi* (kompresörlü drag arabası). Yarışa varsayılan olarak türüne uygun araçla girilir.
- **Ana menü**: Yarış, Serbest sürüş, Garaj, Profil, Ayarlar; arkada canlı yarış. Yarış türü → pist listesi (şekil, uzunluk, ortalama süre, kişisel rekor) → günün saati ve hava → araç seçimi.
- **Koşullar**: sabah, öğlen, akşam; güneşli, yağmurlu, karlı (yağışta zemin kayganlaşır). Gölgeler.
- Lastik ve araç ayarları, sürüş yardımı seviyeleri, üç direksiyon modu (tuşlar, ekran direksiyonu, telefonu çevirme), üç gaz modu (tuş, analog pedal, otomatik) dört kamera. Oyun yatay ekranda oynanır.

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

- `index.html` iskelet, `js/` oyun kodu (konulara bölünmüş), `css/stil.css` görünüm
- `sw.js` çevrimdışı önbellek ve güncelleme (service worker)
- `manifest.webmanifest`, `icons/` uygulama adı ve simgeleri, `img/` menü görselleri
- `vendor/three.min.js` Three.js r128 (MIT), çevrimdışı çalışsın diye repoda

## Sonraki adım: App Store / TestFlight

Oyun tamamlandığında aynı kod Capacitor ile native iOS uygulamasına sarılabilir (Mac + Xcode + Apple Developer hesabı gerekir).

## Geliştirme

- Kod `js/` altında konulara göre bölünmüş durumda. Dosya haritası, kurallar ve testler için: `CLAUDE.md`.
- Testler: `cd tools && npm install && node test.mjs` (fizik için `--tam`, ekran görüntüleri için `--goruntu`).
- Her geliştirme alanı için yeni sohbete yapıştırılacak istemler: `docs/GELISTIRME.md`.
