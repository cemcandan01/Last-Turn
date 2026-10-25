# Yarışta reset

- Yeniden başlat: yarışta duraklat → Yeniden başlat; aynı araç/parça/pist, temiz sayaçlar ve geri sayım. İlk yarış öncesi kurulum EV.sv'de korunur.
- Pist dışı: malzeme değil aktif pistin merkez çizgisi ve yarı genişliği. Sabit adımlarla >5 sn; ilk çıkışın izdüşümü kilitlenir, doğal dönüş temizler. Pause/count/result süre eklemez.
- Otomatik ve elle Yola dön aynı kurtarmayı kullanır; süre/tamamlanan tur/puan korunur, açık kombo temizlenir. Pist dışından tur/bitiş/puan alınmaz.
- Test alanı `yarista-reset`; saf sınır/geometri + beş türün tarayıcı entegrasyonu + duraklat/restart. Görsel CI artifact: `yarista-reset-iphone13`.
- Ek istek: yarış lastiği otomatik gp Yarış/rx Karışık/rl Toprak/dp Drift/dg Drag. Geçici `kurulum.yarisLastik`, applyPreset sonrasında da korunur; leaveEvent özgün kurulumu geri yükler. Garaj parça kaydı değişmez.
- Lastik kısayolu yarışta gizli; seçim listesi ve değişim işlevi yalnız serbest drive/pause içinde. Birim kapsamı artık 23 test; tarayıcı senaryosu lastik kilidi/yardım/restart/çıkışı da içerir, Chromium olmadığından henüz koşulmadı.
- CI 40179845690 başarılı: 3/3 senaryo, beş türün tarayıcı kontrolleri ve iPhone 13 yatay ekran kanıtı (artifact 12593642067). Deneme hedefi 0.6.4; PR #12. Cem yalnız regresyon sonunda canlıya çıkış için push onayı ister; konu/deneme yetkili.
