# 2026-10-25-drift-bonus-geri-sayim

- Durum: 2/3 tamam, 1 madde Cem'in cevabını bekliyor. Sahip: Claude; dal: `drift-bonus-geri-sayim`.

## İstek

"drift yaparken çıkan ekstra puanlar alt alta birikince yolu göremiyorum. bir de ekstra puanların alımını 1 saniye daha uzat. 5 saniye sonra resetleme yaparken ekranın ortasında geri sayımı görelim"

## Kabul ölçütleri

1. [x] Drift bonusları alt alta birikmez: tek satırda en fazla 2 yan yana; aynı bonus tekrar gelince satırı çoğalmaz, puanı toplanır. Tüm HUD düzeni × kontrol türünde direksiyon tuşlarıyla çakışmaz (`hud-cakisma`).
2. [x] Pist dışında 0,5 sn'yi geçince ekranın ortasında (aracın biraz üstünde) 4…1 geri sayım ve "PİSTE DÖNÜLÜYOR"; kısa taşmada ve piste dönünce gizli. Beş türde çalışır (`piste-donus`).
3. [ ] "Ekstra puan alımını 1 sn uzat": bonus başlangıcı 1→2 sn denendi; ilk drift yarışında Bordo Tilki pilot puanı 5500 eşiğinden 2368'e düştü (yıldız alınamıyor). Geri alındı; Cem'e anlamı soruldu (başlangıç 2 sn + eşik ayarı mı, yazının ekranda 1 sn daha uzun kalması mı).

## Kanıt

`npm run kontrol` temiz; `npm test` 290/290; `alan yarista-reset,hud,pist` 13/13. Görüntü: `tests/cikti/geri-sayim.png` (drift, pist dışı 1,6 sn).
