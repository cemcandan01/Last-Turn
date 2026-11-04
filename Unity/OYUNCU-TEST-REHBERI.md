# Unity elle oyuncu test rehberi (P1–P5)

Otomatik testler kural, fizik ve akışı doğrular; ekrandaki görünümü, dokunmatik hissi ve eğlenceyi doğrulamaz. Bu rehber insanın yapacağı kısa kabul turudur. Her adımda **beklenen** davranış yazılıdır; farklıysa ekran görüntüsüyle not al.

Hazırlık: Unity 6000.3.9f1 → `Last Turn/Ana Menüyü Aç` → Play. Kayıtlar: `%USERPROFILE%/AppData/LocalLow/<şirket>/<ürün>/` altında `LastTurnGarage` (kariyer), `LastTurnMutant` (Mutant rekoru), `LastTurnSettings` (tercihler). Denemeden önce bu klasörlerin yedeğini al.

## 1. Kariyer (P1)
1. Ana menü → Profil: adı değiştir, kaydet. **Beklenen:** ad kalıcı; "Bulut hesabı: bu sürümde bağlı değil" yazısı (sahte giriş yok).
2. Garaj → araç satın al, bir parça tak/sök. **Beklenen:** para düşer, araç değerleri değişir; yeniden açılışta aynı.
3. Yarış seç (her türden bir pist: gp, rx, dp, rl, dg). Günün saati/hava çiplerinden **Yağmurlu** seç. **Beklenen:** HUD'da "Yağmurlu"; araç belirgin kayar, fren mesafesi uzar.
4. Yarışı bitir. **Beklenen:** sonuç ekranı, ödül/XP, rekor; rekor hayaleti (Ayarlar → Mekanikler → Rekor hayaleti açıkken) sonraki denemede görünür, kapalıyken görünmez.

## 2. Kontroller ve ayarlar (P5-A)
1. Klavye: W/↑ gaz, S/↓ fren, A/D direksiyon, Boşluk veya C el freni, R baştan, E/Q drag vites. **Beklenen:** hepsi çalışır.
2. Ekrandaki AYAR → Direksiyon: **Direksiyon** seç → ekrandaki direksiyonu fareyle/parmakla çevir; **Telefonu çevir** seç → "Ortala". Gaz: **Analog pedal** (yukarı gaz, aşağı fren), **Otomatik gaz**.
3. Pencere odağını değiştir (alt-tab) tuşa basılıyken. **Beklenen:** araç gaz/direksiyonda takılı kalmaz.
4. Ayarları kapat → Play'i durdur/başlat. **Beklenen:** seçimler aynı.
5. **Telefonda (yalnız cihaz derlemesiyle):** iki parmakla gaz + direksiyon, eğim yönü (sağa yatırınca sağa dönmeli), Ortala. *Bu adımlar otomatik doğrulanmadı.*

## 3. Kamera ve HUD (P5-B/C)
1. KAMERA düğmesi: Takip → Uzak takip → Kaput → Kokpit. **Beklenen:** her kip farklı bakış; kokpitte görüş daralır (iç mekân modeli henüz yok).
2. iPhone boyutunda (Game görünümü 844×390 ve 390×844) sürüş ve Mutant yarışı. **Beklenen:** tuşlar, paneller, miniharita ve drag çubuğu birbirine binmez; yazılar okunur.
3. Miniharita: yarışta pist çizgisi ve rakip noktası; Mutant'ta işaretler, uzak işaret kenarda yön gösterir. Ayarlar → HUD → Harita: Kapalı. **Beklenen:** harita kaybolur.

## 4. Mutant (P3–P5)
1. Ana menü → Mutant → araç + pasif seç (Son Nefes önerilir).
2. Atölye, sandık, etkinlik işaretinin içinde dur. **Beklenen:** ilgili panel; sandık bir kez açılır.
3. N nitro, 1/2/3 skill. Volt Kanat basılı tut → uç, havada fareyle sürükle → burun döner; bırak → süzül. Flying Dutchman → ağacın içinden geç. Kanca → rakibe/şehirde köşeye. **Beklenen:** reddedilen skill yuvası kısa süre "REDDEDİLDİ"/"HEDEF YOK".
4. Süre dolunca: Son Nefes bir kez +90 sn, sonra boss. Boss'u kazan → bölge 2 Kule Şehri; kaybet → koşu özeti, rekor.
5. Koşudan çık → kariyere dön. **Beklenen:** kariyer parası/ilerlemesi değişmemiş.

## 5. Ses (P5-E)
- Ayarlar → Ses kaydırıcıları. **Beklenen:** şu an **ses duyulmaz** (TS sesleri sentezdi; Unity'de ses dosyası yok). Ses dosyaları `Assets/LastTurn/Resources/Audio/<ad>` olarak eklenince çalar: `motor, lastik-asfalt, lastik-gevsek, muzik, carpma, inis, sayim, basla, kombo, kasa, yandi, nitro, nitroBitti, kanca, hayaletAc, hayaletKapa, donusumAc, donusumKapa, ruzgar, red, bitis, tik`.
