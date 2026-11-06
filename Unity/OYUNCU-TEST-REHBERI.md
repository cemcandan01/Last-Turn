# Unity elle oyuncu test rehberi (P1–P5)

Otomatik testler kural, fizik ve akışı doğrular; ekrandaki görünümü, dokunmatik hissi ve eğlenceyi doğrulamaz. Bu rehber insanın yapacağı kısa kabul turudur. Her adımda **beklenen** davranış yazılıdır; farklıysa ekran görüntüsüyle not al.

Hazırlık: Unity 6000.3.9f1 → `Last Turn/Ana Menüyü Aç` → Play. Kayıtlar: `%USERPROFILE%/AppData/LocalLow/<şirket>/<ürün>/` altında `LastTurnGarage` (kariyer), `LastTurnMutant` (Mutant rekoru), `LastTurnSettings` (tercihler). Denemeden önce bu klasörlerin yedeğini al.

## 0. Windows F arayüzü (P7-1)
1. Play → ana menü. **Beklenen:** büyük LAST TURN logosu, sağ üstte profil (seviye, XP, para), altta yalnız dört eğik seçenek: YARIŞ, MUTANT, PROFİL, AYARLAR; pist kartı yok. ←/→ ya da 1–4 seçer, Enter açar, fareyle üzerine gelmek de seçer. Arka plan şimdilik koyu düz (3B vitrin görsel fazında).
2. YARIŞ → yarış menüsü: KARİYER, GARAJ, MAĞAZA sekmeleri (Q/E). Kariyerde ↑/↓ tür, ←/→ pist, Enter seçili pist için kariyer ekranını açar. Garaj/Mağaza bugünkü ekranlar; "Yarış menüsü" düğmesi geri getirir. Esc ana menüye döner.
3. MUTANT → kırmızı tonlu Mutant menüsü (en iyi koşu, ilk boss'a 15:00). KOŞUYA BAŞLA (Enter) → "Yeni koşu başlasın mı?"; Vazgeç (Esc) kapatır, Başla koşu başına (araç, sonra yetenek) gider. Koşudan çıkınca Mutant menüsüne dönülür.
4. Yarışa gir. **Beklenen:** ekranda hiç dokunmatik tuş yok; sol üst pist adı, üst ortada süre ve "Tur · Hedef", sağ altta büyük hız ve turuncu vites, sağ üstte miniharita; ilk saniyelerde sol altta tuş ipucu. Aracın arkası ve önündeki yol boş.
5. V kamera değiştirir, T piste döndürür, R yarışı baştan başlatır, Esc duraklatır; duraklatmada "Ayarlar" ayarlar ekranını açar.
6. Pencereyi farklı boyutlara getir (1280×720, 1920×1080, geniş ekran). **Beklenen:** yazılar ölçeklenir, birbirine binmez.

## 1. Kariyer (P1)
1. Ana menü → Profil: adı değiştir, kaydet. **Beklenen:** ad kalıcı.
   - **Bulut (internet açık):** "BULUT HESABI" satırı birkaç saniyede "Misafir (yalnız bu cihaz) · Bulutta" olur. Bir yarış bitir veya para harca; ~4 sn sonra yine "Bulutta".
   - **E-posta bağlama:** e-posta + şifre (+ tekrar) → "Hesap oluştur". **Beklenen:** "Bağlandı: … · Seviye N · İlerlemen bulutta"; web oyununda (deneme adresi → Profil → E-posta ile giriş) aynı hesapla girince aynı seviye/para/yıldız/rekor görünür. Web'de ilerleyip Unity'yi yeniden açınca birleşmiş ilerleme gelir.
   - **Var olan hesaba giriş:** Unity'deki misafir ilerlemesi o hesabınkiyle değişir (web kuralıyla aynı). Yanlış şifrede "E-posta ya da şifre yanlış … · Hesap değişmedi". "Şifremi unuttum" Türkçe e-posta gönderir.
   - **İnternet kapalı:** satır "İnternet gelince gönderilecek"; açınca kendiliğinden gönderir. Google girişi bu sürümde yok.
   - Bulut dosyaları `LastTurnGarage/cloud-v1.json` (sahip/bekleyen) ve `cloud-session-v1.json` (oturum; şifre saklanmaz). Geliştirici profili ve otomatik testler buluta bağlanmaz.
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
1. Ana menü → Mutant → Koşuya başla → Başla → araç + pasif seç (Son Nefes önerilir).
2. Atölye, sandık, etkinlik işaretinin içinde dur. **Beklenen:** ilgili panel; sandık bir kez açılır.
3. N nitro, 1/2/3 skill. Volt Kanat basılı tut → uç, havada fareyle sürükle → burun döner; bırak → süzül. Flying Dutchman → ağacın içinden geç. Kanca → rakibe/şehirde köşeye. **Beklenen:** reddedilen skill yuvası kısa süre "REDDEDİLDİ"/"HEDEF YOK".
4. Süre dolunca: Son Nefes bir kez +90 sn, sonra boss. Boss'u kazan → bölge 2 Kule Şehri; kaybet → koşu özeti, rekor.
5. Koşudan çık → kariyere dön. **Beklenen:** kariyer parası/ilerlemesi değişmemiş.

## 5. Ses (P5-E)
- Ayarlar → Ses kaydırıcıları. **Beklenen:** şu an **ses duyulmaz** (TS sesleri sentezdi; Unity'de ses dosyası yok). Ses dosyaları `Assets/LastTurn/Resources/Audio/<ad>` olarak eklenince çalar: `motor, lastik-asfalt, lastik-gevsek, muzik, carpma, inis, sayim, basla, kombo, kasa, yandi, nitro, nitroBitti, kanca, hayaletAc, hayaletKapa, donusumAc, donusumKapa, ruzgar, red, bitis, tik`.

## P7-2 Garaj / Modifiye F kabul turu (6 Kasım 2026)

1. Ana menü → Yarış → Garaj. Beklenen: F sekmeleri (Kariyer/Garaj/Mağaza), solda araç/kurulum, ortada katalog siluetinden 3B vitrin, sağda altı özellik ve fizik değerleri, altta sahip olunan araç kartları. Vitrin geçici katalog geometrisidir; nihai araç grafiği değildir.
2. ←/→ veya fare kartı değiştirir. Enter ile aracı seç; seçili araçta Enter Yarış seçimine gider. Seçimden sonra oyunu yeniden aç: aynı araç seçili kalmalı. Fareyi araç üstünde basılı sürükle: vitrin döner.
3. Mağaza sekmesi veya alttaki Mağazaya git kartı F Mağaza'yı açar. Araç alımı mevcut üç saniyelik ikinci onay akışındadır. Garaj'a geri gelince yeni araç görünmeli.
4. M veya Modifiye: soldaki 12 kategori (↑/↓), ortadaki parçalar (←/→ veya fare), sağda gerçek takma/sökme önizlemesi. Çubuk beyaz işareti önizleme puanıdır; sayılar kaynak performans değerleridir. Enter ilk kez satın alma onayı, üç saniye içinde ikinci Enter alır/takar. Sahip olunan parçayı takmak tekrar para harcamaz.
5. X veya Kategoriyi sök: kurulum değişir, parça sahipliği ve para korunur. Takılı parça seçiliyken sağ taraf sökme sonucunu gösterir. Stoka dön tüm takılı parçaları çıkarır; iade yoktur. Paket düğmeleri mevcut paket al/tak komutunu kullanır.
6. Esc: Modifiye → Garaj → Yarış menüsü. Q Kariyer, E Mağaza. Onay beklerken Esc önce onayı kapatır. Bakiye ve seçili parçalar yeniden açılışta aynı olmalı.
7. 1280×720, 1920×1080 ve 2560×1080'de panel/işlem çakışması olmamalı; parça listesi kaydırılabilmeli ve satın alma düğmesi görünür kalmalı. Güncel görseller `Unity/Logs/p7-gameview-{garage,mods,store}-{1280,1920,2560}.png`.

Otomatik Play ayrı kayıtta gerçek UI Toolkit paneli, sentetik klavye ve panel hit-test'inden geçen PointerDown/Up ile yürütülür. Güncel `p7-gameview-*` görselleri ayrı grafik Editor'da Game View'den ScreenCapture ile alınır; eski `p7-garage-*` / `p7-mods-*` görselleri batch panel render'larıdır. İnsan fare/klavye kullanımı ve görsel beğeni ayrıca kabul edilmelidir.

## P7-3 Mağaza F kabul turu (6 Kasım 2026)

1. Ana Menü → Yarış → Garaj → E. Mağaza F açılmalı; Q Garaj'a, E Kariyer'e, Esc Yarış menüsüne döner. Yeni açılan ekran açılış tuşunu tekrar işlememeli.
2. Tür filtrelerine fareyle bas; yalnız o tür görünmeli. Oklar veya fare kartı seçsin, sol vitrin/özellik/fiyat güncellensin. Katalogda sahip olunan araçlar da görünür; üzerlerinde SAHİPSİN yazar.
3. Kilitli araçta gerekli seviye/kupa bilgisi, eksik para ve kapalı satın alma düğmesi görünmeli. Bakiye yetmezken işlem uygulanmamalı.
4. Satın alınabilir aracı Enter veya düğmeyle onayla: ilk basış para harcamaz; Esc iptal eder. Üç saniye içinde ikinci onay yalnız tek bedel harcar. GARAJDA GÖR alınan aracı açar; Garaj'da Enter sürüşe seçer. Yeniden yükleme sahipliği, seçimi ve bakiyeyi korur.
5. PARÇALAR veya Tab, sahip olunan araçla mevcut Modifiye ekranına gider; yeni parça/mağaza ekonomisi yoktur. Tak/sök/geri akışını kontrol et. Üç ekran boyutunda satın alma düğmesi ve alt gezinme görünür kalmalı.

## P7-4 Mutant başlangıcı F §5a–d (6 Kasım 2026)

1. Ana Menü → Mutant: ayrı menü, en iyi koşu ve koşu bilgisi. H / NASIL OYNANIR kısa açıklamayı açar/kapatır. Enter / KOŞUYA BAŞLA önce onay açmalı; Esc koşu oluşturmadan iptal etmeli.
2. Onayda Enter: üç mevcut başlangıç aracı ve ilk boss bilgisi. 1/2/3, oklar veya fare yalnız odağı değiştirir; DEVAM / Enter gerçek araç seçimini yapar. Garajdaki parça/para bu koşuya taşınmaz.
3. Başlangıç yeteneğinde 1/2/3, ↑/↓ veya fare kartı seçer; Enter / SÜRÜŞE BAŞLA mevcut yetenek komutunu uygular ve dünyayı açar. Metinler mevcut yetenek kataloğundan gelmeli. Kaynak sistem üçüncü teklifte skill sunabilir; pasif/skill türü kartta doğru yazmalı, filtrelenerek RNG değiştirilmemeli.
4. Yetenek adımında ← / ARACI DEĞİŞTİR / Esc araç adımına dönmeli. Boss, araç ve yetenek teklifleri yeniden çekilmemeli; süre seçim sırasında akmamalı. Araç adımında Esc Mutant menüsüne çıkar.
5. Sürüşe başlandığında seçilen araç/pasif uygulanmalı ve boss süresi akmalı. Sürüşte Esc mevcut duraklatmayı açar; Koşudan çık Mutant menüsüne döner. Kariyer ilerlemesi ve önceki Mutant rekoru aynı kalmalı.
6. 1280×720 ve 1920×1080'de boss metni/kartlar/düğmeler çakışmamalı; uzun boss bilgisi kaydırılabilmeli. Otomatik Game View görselleri `Unity/Logs/p7-mutant-{menu,confirm,car,skill}-{1280,1920}.png`; fiziksel fare ve insan görsel kabulü ayrıca yapılır. Koşunun sonraki seçimleri/atölye/sonuç ekranları bu grubun F aktarımına dahil değildir.

## P7-5 Yarış hazırlığı F §4 (6 Kasım 2026)

1. Ana Menü → Yarış → pist kartında Enter. Hazırlık açılmalı; açan Enter yarışı aynı anda başlatmamalı. Pist adı/açıklaması, gerçek harita, üç yıldız hedefi, kariyer veya deneme rekoru ve ödül öngörüsü görünmeli.
2. 1/2/3 veya fare: Sabah/Öğlen/Akşam. 4/5/6 veya fare: Güneşli/Yağmurlu/Karlı. Koşullar mevcut oturumluk seçimlerdir; yeni kalıcı ayar/kayıt biçimi eklenmedi.
3. C veya ARACI DEĞİŞTİR → Garaj. Aracı seç, seçili araçta tekrar Enter veya Esc ile aynı hazırlığa dön. Pist, saat ve hava korunmalı; seçilen araç diskten yeniden yüklenince aynı kalmalı. Modifiye'ye de mevcut Garaj yoluyla girilebilir.
4. Bütçeyi aşan araçta ödülsüz deneme yazmalı, ödül 0 olmalı; deneme başlatılabilmeli. Kilitli pistte gerekçe görünmeli, düğme kapalı olmalı; doğrudan başlatma komutu da reddetmeli.
5. Enter veya fare Başla gerçek yarışı açmalı; seçilen hava mevcut fizik tutuşuna aktarılmalı. Hazırlık Esc kariyer kartlarına dönmeli. Yarıştan mevcut dönüş yolunu kullanınca para/ilerleme yalnız mevcut yarış bitiş kurallarına göre değişmeli.
6. Taslaktaki dakika başı örnek sayı yerine mevcut ödül servisinin önceki yıldızlara göre üç yıldız öngörüsü gösterilir; kesin ödül bitişte hesaplanır. 1280×720 ve 1920×1080 görselleri `Unity/Logs/p7-preparation-ready-{1280,1920}.png`; deneme/kilit örnekleri aynı klasörde `p7-preparation-{practice-1920,locked-1280}.png`. Arka plan geçici koyu zemindir; yeni 3B grafik yoktur.

## P7-6 Profil ve bulut hesabı F §6 (6 Kasım 2026)

1. Ana Menü → Profil: seviye/XP halkası, ad, yarış/galibiyet/yol/yıldız/para ve en çok kullanılan araç mevcut kayıtla aynı olmalı. Adı değiştir, Enter veya Kaydet; Esc düzenlemeyi iptal etmeli. Yeniden açılışta kayıtlı ad kalmalı, diğer sayaçlar değişmemeli.
2. Misafir hesabında e-posta/şifre/şifre tekrar ve Hesap oluştur; bağlı hesapta Giriş yap/Şifremi unuttum görünür. Tab alan/işlemler arasında ilerler, odaktaki işlem Enter ile yürür, Esc geri döner. Şifre alanları maskeli; gönderim ve ekrandan çıkışta temizlenir.
3. Geçersiz e-posta, kısa şifre ve farklı tekrar mevcut Türkçe hata metinlerini göstermeli. İşlem sürerken bulut işlemleri kapanmalı; hata sonrasında durum/hesap korunmalı ve metin görünmeli. Servis yoksa veya geliştirici/test profili ise bulut işlemleri kapalıdır.
4. Var olan hesaba girişte yerel ilerlemenin o hesabınkiyle değişmesi mevcut kaynak davranışıdır; ekrandaki açıklamayı koru. Yeni sağlayıcı, hesap türü veya eşitleme kuralı eklenmedi.
5. 1280×720 ve 1920×1080 görselleri `Unity/Logs/p7-profile-{guest,linked}-{1280,1920}.png`; unavailable/busy/error örnekleri aynı klasörde. Grafik otomasyon gerçek CloudAccount + yerel sahte sağlayıcı kullanır; gerçek Firebase'e giriş/hesap oluşturma/e-posta gönderme yapmaz. Canlı hesap ve insan görsel kabulü ayrı kullanıcı turudur.

## P7-7 Ayarlar F §7 (6 Kasım 2026)

1. Ana Menü → Ayarlar (ya da 4): solda altı bölüm (Sürüş, Kamera, Göstergeler, Ses, Grafik, Kontroller), ortada satırlar, sağda odaktaki satırın açıklaması; sahne arkada kararır. Q/E bölüm, ↑/↓ satır, ←/→ değiştirir, Enter sıradaki seçeneğe geçer; fareyle sekme, seçenek ve ses −/+ ya da çubuk tıklanır.
2. Sürüş yardımını değiştir; Garaj/kariyerde aynı seviye kalmalı. Direksiyon ters, kamera, harita biçimi ve sesleri değiştir; Esc (Kaydet ve dön) ana menüye döner. Oyunu kapatıp aç: değerler korunmalı.
3. Göstergeler Windows'ta yalnız Harita biçimini gösterir (hız/süre/pist adı F yerleşiminde sabit). Kontroller'de tuş tablosu sürüşte kullanılan eşlemeden okunur; tuş değiştirme yoktur (mevcut oyunda böyle bir özellik yok).
4. Yarışta Esc → Duraklatma → Ayarlar: aynı F ekranı açılır, HUD gizlenir. Esc ayarları kaydedip duraklatma menüsüne döner; bir Esc daha yarışa devam ettirir.
5. Görseller `Unity/Logs/p7-settings-{drive,sound,controls,race}-1920.png`, `p7-settings-{camera,controls}-1280.png`, `p7-settings-controls-2560.png`. Otomasyon sentetik klavye ve panel hit-test kullanır; insan görsel/fiziksel fare kabulü açık.
