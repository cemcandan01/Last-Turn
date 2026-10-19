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
- Sürüm numarası `package.json` içindeki `version`; menünün altında görünür.

## Yayın

Oyun TypeScript ile yazılır ve Vite ile derlenir. Derleme ve yayın GitHub Actions'ta yapılır; bilgisayar gerekmez.

- `master` dalı → https://cemcandan01.github.io/Last-Turn/
- `gelistirme` dalı → https://cemcandan01.github.io/Last-Turn/dev/ (deneme sürümü, ayrı ad ve önbellekle ana ekrana da eklenebilir)
- Testler geçmezse yayın yapılmaz.
- Tek seferlik ayar: GitHub → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Sonraki adım: App Store / TestFlight

Oyun tamamlandığında aynı kod Capacitor ile native iOS uygulamasına sarılabilir. Derleme GitHub Actions'ın macOS makinelerinde yapılabilir (Mac gerekmez); Apple Developer hesabı gerekir.

## Geliştirme

- Kod `src/` altında katmanlara ayrılmış TypeScript modülleri: `fizik` (saf, test edilebilir), `dunya`, `cizim` (three.js), `arayuz` (DOM), `oyun` (akış). Ayrıntı: `docs/MIMARI.md`, kurallar ve dosya haritası: `CLAUDE.md`.
- Bilgisayarda: `npm ci`, `npm run dev` (anında yenilenen geliştirme sunucusu), `npm run kontrol` (tüm denetimler).
- Testler: `npm test` (fizik, ~2 sn), `npm run test:e2e` (başsız tarayıcı), `npm run test:goruntu` (ekran görüntüleri).
- Her geliştirme alanı için yeni sohbete yapıştırılacak istemler: `docs/GELISTIRME.md`.
