# Unity test paneli kullanılabilirliği — 1 Kasım 2026

## İstek / kabul

Yeni mekanik olmadan geçici geliştirici ekranını Garaj, Modifiye, Yarışlar, Test / Geliştirici, Ayarlar bölümlerine ayır. Beş tür × sekiz pist, görünür yarış başlatma, dg_1 ve GTTest/TerrainTest/RaceTest kısayolları, okunabilir ve kaydırılabilir düzen, anlaşılır hata. Mevcut garaj/modifiye/kayıt/yardım işlevleri korunacak. Fizik/yarış/ekonomi/kayıt biçimi değişmez. Push/merge/uzun regresyon/yayın yok.

- Taban `a49d45e`, dal `codex/unity-test-paneli`; sahip tek Codex. Claude/alt ajan/model çağrısı yok; kota bilinmiyor. Önceki devir ve kaynaklar okundu. Başlangıçta yalnız `_Recovery` izlenmiyordu; korunur.
- Kök neden: 1224 genişlikli alt alanda 330+500 genişlik ile üç düğme birlikte kullanılıyor; sağdaki Yarışlar erişimi sıkışıyor. Kırk etkinlik tek listede, tür filtresi yok; Drag alt sıralarda. Yarış verisi/manuel Drag mekaniği mevcut; yeniden geliştirilmeyecek.
- Kabul: (1) beş sekme ve farklı çözünürlüklerde taşmayan kaydırmalı düzen; (2) tür başına sekiz pist ve dg_1 gerçek açılışı; (3) diğer dört türden bir pist ve kısayollar; (4) mevcut garaj/kayıt/yardım/modifiye komutları; (5) ilgili .NET ve kısa Unity Play kanıtı + rehber.

## Plan / dosya sınırı

Yalnız görünüm, saf panel sunum modeli, sahne açma/hata servisi ve dar UI testleri. Core kural dosyaları, TS referansı, kayıt şekli ve fizik korunur.

## Uygulama / kanıt

- `GarageScreen`: beş sekme; seçili değerler turkuaz; 18 punto metin, 22/26 punto başlık, en az 46 px düğme, iki satırlı araçlar 72 px. Dar ekranda kısa Test etiketi, kategori satırları ve kaydırma. Yarışı Başlat alt sabit satırda.
- `TestPanelModel`: yalnız tür/sıralama/yerleşim sunumu. `TestPanelActions`: mevcut yarış görünüm modelinden erişim, kilit/geçersiz pist/eksik sahne açıklaması; `GarageSession.TryLaunch` gerçek başlatma sonucunu bildirir. Ekonomi ve kayıt işlemleri eski komut/oturum servislerinde.
- Beş tür × sekiz pist; dg_1 fareyle **Yarışlar → Drag → Yarışı Başlat** yolundan RaceTest'e açıldı. Panel testi aynı seçim/başlatma yoluyla dg_1/gp_1/rx_1/rl_1/dp_1 ve GTTest/TerrainTest/RaceTest'i gerçek sahnede doğrular; geçici ayrı profilde kayıt değişmezliğini kontrol eder.
- .NET Release derleme: 0 hata/uyarı; `--panel` **54/54**, mevcut `--garage-ui` **117/117**. Çıktılar `tests/cikti/panel-validation.txt`, `panel-garage-ui.txt`. CI iş akışına yalnız kısa `--panel` adımı eklendi; uzaktaki CI çalıştırılmadı.
- Son kaynakla Unity 6000.3.9f1: panel **41/41** (UTC 12:44:31), beş tür yarış **71/71** (12:45:00), GT **28/28** (12:45:50), Arazi **23/23** (12:46:40). Panel ve yarış kanıt okuyucuları bütün ilgili kaynak hash'lerini doğruladı. Yarış testi dg_1'i 11,4 sn'de tamamladı; diğer dört tür de bitti. Core Editor derleme/smoke (36 dosya; 600+600+1200 adım + 6 gösterim) ve katalog (30 kurulum/sürüş) kanıtları başarılı. Çıktılar `tests/cikti/panel-{play,race-play,gt-play,terrain-play,editor,catalog}.txt`; tekrar üretim için mevcut `Unity/Validation/check-*-proof.mjs` okuyucuları.
- Mevcut garaj Play **20/20** (UTC 12:47:13): gerçek disk yeniden açma, sahiplik/parça ayrımı ve 120+120 GT/Arazi sürüş adımı; güncel hash okuyucusu başarılı (`tests/cikti/panel-garage-play.txt`). Nihai sonuç: kabul ölçütleri panel kapsamında tamamlandı; açık ürün engeli yok. Commit kanıtı bu kartı son değiştiren `codex/unity-test-paneli` yerel commit'idir; gerçek uygulayıcı Codex, model kimliği/kullanım yüzdeleri bilinmiyor, ek model/API/kredi çağrısı yapılmadı. Yerel koordinatör planı `tests/cikti/koordinator/f1691e3c-3ed0-40dc-9793-c2c0ab5cc071.json`; tek ajan gerekçesi dar UI kapsamı ve Cem'in Claude kota sınırı.
- Manuel Editor: 640×480, 1920×1080 ve serbest 1208×610 Game alanı. Beş sekme, modifiye kategori/parça kaydırması, test profili/kayıt düğmeleri, yardım seçimi, yarış listesi ve sabit başlatma erişimi incelendi. İlk incelemede saptanan iki satırlı araç düğmesi sıkışması düzeltildi. 1920 görünümü Editor'da 0,57× önizlemedir; gerçek yazı boyutu sabittir.
- Görsel kanıtlar (yerel/ignore): `tests/cikti/panel-640-drag.jpg`, `panel-1920-garaj.jpg`, `panel-1920-drag.jpg`, `panel-dg1-acildi.jpg`. Sonuncu gerçek RaceTest açılışını gösterir; mevcut sürüş HUD'unda küçük çözünürlükte üst üste yazı vardır, bu panel görevinde sürüş HUD'u değiştirilmedi.
- Test geliştirme notu: ilk çalıştırma mevcut Play açıkken reddedildi; Play durdurulup tekrarlandı. İlk erişim iddiasında TS etkinlik alias'ı ile dış pist anahtarı karıştırılmıştı; gerçek `RaceTrack` ve `Type_Level` ile düzeltildi. Bunlar ürün mekaniği değişikliği değildir. Arazi kanıt okuyucusu test bitmeden eski timeout dosyasını okudu; güncel tamamlanmış kanıt başarılıdır.
- Rehber: `Unity/TEST-PANELI.md`; yarış rehberinin eski alt menü/yardım konumları güncellendi. Yeni mekanik/denge/TS/kayıt biçimi değişikliği yok. `_Recovery` korunur; Editor'ın otomatik QualitySettings değişikliği teslim dışı bırakılır.

Sonraki tek öneri: sürüş HUD'unun küçük ekranlarda okunabilirliğini ayrı, dar bir UI görevinde düzenlemek.
