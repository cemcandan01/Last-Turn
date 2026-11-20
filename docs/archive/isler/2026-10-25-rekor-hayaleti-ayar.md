# 2026-10-25-rekor-hayaleti-ayar

- Durum: tamamlandı. Sahip: Claude; dal: `rekor-hayaleti` (temel `origin/gelistirme` 658d137).

## İstek

"hayalet araç eklendi mi anlamadım oyunda kendi hayalet pr ımı görmedim. eklenmediyse ekle ama açılır kapanır olsun"

## Tespit

Rekor hayaleti 0.6.8'de vardı ama ayarı yoktu. Kayıt yalnız güncellemeden sonra bitirilen yarış/serbest turda oluşur; eski rekorların girdi kaydı yok, bu yüzden pist ilk kez yeniden koşulmadan hayalet görünmez.

## Kabul ölçütleri

1. [x] Ayarlar → Mekanikler'de herkese görünen "Rekor hayaleti" aç/kapat; varsayılan açık, `lt_ayar` içinde kalıcı (`set.rh`).
2. [x] Kapalıyken hayalet çizilmez; oynatma arkada sürer, yarış ortasında açılınca doğru konumdan görünür.
3. [x] Kayıt/oynatma davranışı ve geliştirici hayaleti değişmez.
4. [x] `hayalet` tarayıcı bölümüne kapalı/açık kontrolü eklendi.
