# Yön B — Biyomekanik mutasyon

## Unity ödül ikonları — 8 Kasım 2026

Cem B yönünü seçti. Koşu içi ödül ekranının ikonları `Unity/Assets/LastTurn/Resources/UI/MutantB/` altında tamamlandı:94 ödül tanımı,64 ayrı sembol.42 parça12 kategori ikonunu paylaşır; kalan52 tanımın her birinin ayrı sembolü vardır. Mevcut11 pasif/skill ikonu ve12 kategori görseli korunur;41 yeni sembol4 gerçek alfalı atlas içindedir. PNG kesme/boyama yapılmadı; Unity Sprite rect'leri alfa sınırlarına göre eşlenir.

- [Eşleme ve SHA256 manifestosu](../../../Unity/Assets/LastTurn/Resources/UI/MutantB/reward-icons.json)
- [Yerleşik image_gen istemleri ve iki boşluk revizyonu](odul-ikon-uretimi.json); API/CLI/ek kredi kullanılmadı.
- [Yol/pasif atlası](../../../Unity/Assets/LastTurn/Resources/UI/MutantB/atlas/passive-road.png), [enerji pasifleri](../../../Unity/Assets/LastTurn/Resources/UI/MutantB/atlas/passive-energy.png), [ekler/kaynaklar](../../../Unity/Assets/LastTurn/Resources/UI/MutantB/atlas/addons-resources.png), [evrimler](../../../Unity/Assets/LastTurn/Resources/UI/MutantB/atlas/evolution.png).

`node Unity/Validation/check-mutant-icon-assets.mjs`94 kimlik,64 ayrı rect, RGBA/hash, alfa gövdesinin kesilmemesi, atlas hücre sınırları ve parça kategorisini denetler. `MutantChoicePlayValidation.StartGameView` gerçek Unity Sprite yükleme/ikon kimliği ve seçim akışını sınar. Aşağıdaki31 görsellik HTML karşılaştırması önceki tasarım örneğidir; ürün ikon kapsamını temsil etmez. Diğer ekranlar bu ikon teslimiyle aktarılmaz.

İkonların tek tek kullanılan istemleri: [ikon-istemleri.json](ikon-istemleri.json). Sayfadaki büyütme düğmeleri her yönü tam genişlikte incelemeyi sağlar.

Asit yeşili + magenta; petrol renkli kabuk, organik damar ve makine parçaları.

- Karşılaştırma: [mutant-yonler.html](../mutant-yonler.html). Dosyadan doğrudan açılır; ağ gerekmez.
- Yerleşimler: 1B HUD, 5A ödül seçimi, 6A boss. F ailesi ve katalog metinleri korunur; sayılar örnek koşu anıdır.
- Yerleşik image_gen kullanıldı. Ayrı API/CLI çağrısı, anahtar veya alt ajan kullanılmadı. Üretici model adı araç tarafından açıklanmadı.
- Her yönde 31 görsel: arka plan + iki 9 dilimli doku + 28 örnek ikon. Gerçek alfa kanalı korunur; parlama PNG içindedir.
- İkon yolları: `ikonlar/boss/{id}.png` (5), `ikonlar/skill/{id}.png` (5), `ikonlar/parca/{kat}.png` (12), `ikonlar/pasif/{id}.png` (6).
- Dosya/kimlik listesi: [manifest.json](manifest.json). Renkler: [palet.json](palet.json). Tam üretim istemleri: [uretim-istemleri.json](uretim-istemleri.json).
- 9 dilim: dört kenardan kaynak boyutunun %25'i. Tarayıcı önizlemesinde PNG border-image ile köşeler korunur; Unity uygulaması bu işin kapsamında değildir.
- [Kanıt klasörü](kanit/): iki genişlikte ekran görüntüleri, açık ve kareli zeminde ikon galerileri.

Depo kökünde sayfayı yeniden hazırlamak: `node docs/tasarim/mutant-b/hazirla.cjs`. Kontrol: `node docs/tasarim/mutant-b/dogrula.cjs` (Playwright + kurulu Edge). Denetim raporu: [dogrulama.json](../mutant-b/kanit/dogrulama.json).

Nadirlik renkleri tasarım önerisidir; yeni bir oyun kuralı eklenmez. Tam katalog, Cem'in yön seçiminin ardından ele alınacaktır.
