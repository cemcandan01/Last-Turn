# Yön C — Neon hologram

İkonların tek tek kullanılan istemleri: [ikon-istemleri.json](ikon-istemleri.json). Sayfadaki büyütme düğmeleri her yönü tam genişlikte incelemeyi sağlar.

Camgöbeği + pembe/mor; düz geometrik neon çizgiler, tarama ve glitch ayrıntıları.

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
