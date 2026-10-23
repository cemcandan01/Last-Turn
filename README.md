# Last Turn

iPhone için 3D sürüş ve yarış oyunu. Ana ekrana kurulan bir uygulama (PWA) olarak çalışır: kendi simgesiyle tam ekran açılır, internetsiz de oynanır ve her yeni sürüm otomatik iner.

## İçerik

- **Açık dünya** (serbest sürüş): *Çorak Topraklar* (oval, uzun düz yol, zıplama rampası, tırmanış yolu) ve *Boş Otopark* (AVM önünde geniş açık otopark, asfalt testleri için).
- **30 pist**, 5 yarış türü (Asfalt, Rallycross, Ralli, Drift, Drag) × 6 seviye; her seviyenin hedefi var, drift pistlerinde hedef puan. Türe uygun araç kendi yarışında daha başarılıdır, ama her araç her yarışı bitirebilir.
- **Garaj**: araçları ışıklı vitrinde incele (sürükleyerek döndür, iki parmakla yakınlaştır, tam ekranda ◀ ▶ ile araç değiştir), azami hız, hızlanma, güç, yol tutuşu, arazi, fren ve çeviklik değerlerini karşılaştır, **Motoru dinle** ile motor sesini duy. Her yarıştan önce araç seçilir.
- **5 araç**, her yarış türü için bir tane: *Kızıl Ok* (ortadan motorlu pist arabası), *Kor RX* (dört çeker rallikros), *Beyaz Kurt* (geniş gövdeli drift arabası), *Mavi Yıldız* (dört çeker ralli sedanı), *Gece Mavisi* (kompresörlü drag arabası). Yarışa varsayılan olarak türüne uygun araçla girilir.
- **Ana menü**: ekranın altında soldan sağa ikonlu eğik paneller (Yarış, Serbest sürüş, Garaj, Profil, Ayarlar); arkada oyunun kendi sahnelerinden hafif görseller yavaş kayarak akar. Yarış türü seçimi parmağı izleyen kapak akışı, her türün kendi rengi ve ikonu → pist listesi → günün saati ve hava → araç seçimi.
- **Araçlar ve kokpit**: teker kemerli, yuvarlak hatlı gövdeler ve yeni jantlar; her aracın kendi kokpit tasarımı, gösterge kadranları, yan aynalar ve dikiz aynası, yarış araçlarında koruma kafesi.
- **Koşullar**: sabah, öğlen, akşam; güneşli, yağmurlu, karlı (yağışta zemin kayganlaşır). Gölgeler.
- **Fizik motoru:** 4 teker, süspansiyon, gerçek vites ve patinaj; gövde frende öne, virajda yana yatar. Toprakta lastik sınırı aşılınca araç kayar.
- **Göstergeler (HUD)** (Ayarlar → Göstergeler): hız, sayaç, tuşlar ve harita ayrı ayrı seçilir, önizlemede anında görünür; hazır düzenler Köşe, Kadran, Bant, Sade. Göstergeler aracı kapatmaz; gaz ve fren pedal biçiminde.
- **Sesler**: oyunun içinde üretilir; her aracın kendi motor sesi (gerçek motor seslerinin ölçümüne göre ayarlı; turbo, valf, tok egzoz patlamaları), lastik ötmesi, toprak, çim, rüzgâr, kerb ve çarpma sesleri, yarış ve arayüz sesleri. Menüde rock müzik çalar, sürüşte müzik yok (Ayarlar'da ses ve müzik seviyesi).
- **Performans göstergesi** (Ayarlar → Mekanikler): kare hızı, fizik ve çizim süresi.
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
