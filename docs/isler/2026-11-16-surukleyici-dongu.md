# Last Turn — sürükleyici yarış ve MUTANT döngüsü

## İstek ve sahiplik

Cem (16 Kasım 2026): “last turn için neler yapabiliriz yap. harika ve sürükleyici bir oyun olmasını istiyorum. oyunun son halini incele ve günümüzde bir yarış oyununu ve rouge-like oyununu sürükleyici ve eğelenceli yapan şeyler ne araştır ve claude ile oyunu kendiniz geliştirin. yaptıklıarınızı inceleyip bensiz geliştirmeye devam edin”.

Sahip Codex; dal `codex/unity-p7-garaj`, taban `92c2c7e`. Kullanıcı mevcut işin devamını yetkilendirdi; kirli çalışma ağacı nedeniyle dal değişimi yok. `git fetch origin` başarılı. Önceki pit menüsü dosyaları, Editor doğrulamaları ve `_Recovery` korunuyor; yeni iş bunları teslim edilmiş/commit edilmiş saymaz. Başlangıçta çalışan Unity/Claude süreci görülmedi. Claude Pro / claude.ai resmi metadata ile doğrulandı; 5 saat/haftalık kapasite bilinmiyor. Güncel ücretli ek kullanım teyidi bekleniyor; API/ek kredi yetkisi yok. Claude rolü bağımsız salt okunur inceleme; aynı dosyalarda ikinci uygulayıcı yok.

## İnceleme ve araştırmadan karar

Güncel Core, HUD, sonuç ve MUTANT kodları ile yerel Play görüntüleri incelendi. Oyun 40 etkinlik, 15 araç, parça ekonomisi, rakipler, skill/pasifler ve bölgeli MUTANT döngüsünü zaten içeriyor. Kaynak aktarımı bitmiş; insan sürüş/beğeni kabulü açık. Önceki menü dosyaları devir özetinden ileri durumda; korunuyor. Mevcut görüntü incelemesi canlı insan sürüşü değildir.

- [Forza, rakip iyileştirmeleri, 30 Nisan 2025](https://forza.net/news/forza-motorsport-drivatar-changes): öngörülebilir yan yana yarış, geçiş ve pistte kalma; binlerce tur ve insan geri bildirimi birlikte kullanılıyor. Çıkarım: ileride YZ çalışması yalnız tur hızıyla kabul edilmemeli.
- [Forza, ilerleme revizyonu, 7 Şubat 2024](https://forza.net/news/forza-motorsport-car-progression-updates): parça seviyesi kilitlerini kaldırarak kurulum özgürlüğü. Çıkarım: yeni zorunlu grind/para birimi yerine mevcut seçimin etkisini anlaşılır kıl.
- [Hades II, Olympic Update, 16 Ekim 2024](https://www.supergiantgames.com/blog/hades2-olympic-update/): silah biçimleri, nimetler, çeşitli karşılaşmalar ve isteğe bağlı zorluklar. Çıkarım: rastgelelik tek başına yeterli değil; kurulumun kimliğini ve sonraki denemenin amacını görünür kıl.
- [Hades II güncel SSS, 22 Ekim 2026 revizyonu](https://www.supergiantgames.com/blog/hades2-faq/): başarısızlık/başarılarla açılan anlatı, keşif, yükseltmeler ve müziğin deneyimdeki rolü. Arama özeti 14 Nisan tarihini gösteriyordu; gerçek sayfa açılarak güncel tarih düzeltildi. Eski duyuruların mekanizma açıklamaları bugünkü bütün ürünün incelemesi sayılmadı.

Bu çıkarımlar Last Turn için tasarım hipotezidir; eğlence veya bağımlılık ölçümü değildir. İlk dilim yeni içerik/ödül üretmeden ustalık geri bildirimini tamamlar. Yeni araç/parça/pist/XP/para/yıldız eşiği ve fizik değişmez; edinme süresi ve gerçek performans etkisi bu dilimde sıfır. Kariyer bütçesi ve kayıtlar korunur.

## Kabul ölçütleri

1. Kariyer/deneme yarışında mevcut yıldız eşiklerinden türeyen hedef görünür; driftte yalnız bankalanmış puan sayılır, zamanlı türlerde kalan toplam zaman bütçesi gösterilir. MUTANT kendi hedef sözleşmesini korur.
2. Yarış sonunda bir sonraki yıldızın hedefi ve eksik puan/kazanılması gereken süre bütün beş türde doğru görünür; 3 yıldızda hayali dördüncü hedef olmaz.
3. MUTANT özeti süre, etkinlik, seviye, pasif/skill/parça kurulumunu ve koşunun durumuna uygun bir sonraki deneme önerisini gösterir. Boş kurulum ve uzun listeler okunabilir kalır.
4. Sunum okumaları oyun durumu, RNG, para/XP, rekor ve kayıtları değiştirmez. Kritik eşik sınırları ve gerçek 40 etkinlik hedefleri kısa .NET testinde sınanır.
5. Değişen UI Unity'de derlenip ilgili Play görüntüleri incelenir. Koşulamayan kontroller açık yazılır; otomasyon insan keyfi kabulü sayılmaz.

## Dosya sahipliği ve doğrulama

Codex: `Core/RaceViewModel.cs`, yeni saf yarış hedef modeli, `Ui/RaceHudView.cs`, `Core/MutantSummaryModel.cs`, `Ui/MutantSummaryView.cs`, ilgili .NET/Editor kontrolleri ve bu kart/devir. Önceden değişmiş `Ui/ResultView.cs` düzenlenmez; mevcut satır çizicisi kullanılır.

Claude: yalnız bu değişikliklerin bağımsız incelemesi; başlatılma ve sonuç kanıtı henüz yok. Öncelik sırası: hedef geri bildirimi → koşu özeti → kısa test → inceleme/Play → bulgu düzeltme. Tam regresyon/canlı için mevcut onay yordamı korunur; zamanlanmış sürekli çalışma kurulmadı.

## Uygulama ve bağımsız inceleme

- `257494f`: ilk uygulama ve dar testler yerel commit. Yalnız bu görev dosyaları; önceki menü ve `_Recovery` kapsam dışında kaldı. Sonraki revize aşağıda; push/merge/CI/yayın yok.
- Kariyer/deneme HUD'ı, tur sonucu tahmin etmeden mevcut yıldızın kalan toplam süre bütçesini veya bankalanmış drift puanı açığını gösteriyor. Sonuçta sıradaki hedef ve gelişim farkı iki ayrı satır. Hedefler katalogdan, ödüller aynı bitiş yolundan; MUTANT'a kariyer yıldızları gösterilmiyor.
- MUTANT özeti: boss dışında geçen hazırlık süresi (`zaman` boss fazında ilerlemez), etkinlik/seviye/çarpma/spin, yığınlı pasifler, skill seviyesi/evrimi/eklentileri, parçalar, gerçek boss zayıflığına veya perte göre sonraki deneme önerisi. İki panel kaydırılabilir; klavyede ok/PageUp/PageDown, sağ panel için Shift; gamepad yön tuşu ve sağ omuzla sağ panel, alt düğmeyle çıkış. İlk açılış karesindeki erken dönüş korunur; önceki panelin Enter'ı özeti istemeden kapatmaz.
- **Claude gerçek inceleme:** Pro / claude.ai, model `claude-opus-5-5`, oturum `61b5230b-a7bf-4054-9b27-99a0951c9654`; dört kaynak dosyası ve görev özeti. Aynı `257494f` tabanında temiz `claude/dongu-inceleme-20261116` / `tests/cikti/koordinator/dongu-inceleme`; kaynak/hedef değişmedi. Kanıt `tests/cikti/koordinator/61b5230b-a7bf-4054-9b27-99a0951c9654.json`. Kullanıcının bu konuşmadaki ek kullanım kapalı teyidi ortak yardımcıyla kaydedildi; API/ek kredi yok. Kapasiteler bilinmiyor; liste fiyatı telemetrisi fatura sayılmadı.
- Claude'un **8 bulgusu** yerelde değerlendirildi. Uygulananlar: eksik/NaN hedefte sahte tamamlanma, hedef zaman biçimi, çok küçük canlı süre gösterimi, gamepad çıkışı ve sağ panel klavye erişimi. Sabit üç yıldız metni katalog uzunluğuna bağlandı. Doğrulanmayanlar: `s.Result` doğrudan `Time`/`Drift.Score` alias'ı; boss `zayif` alanı katalogda kullanıcı metni, kimlik değil; `zaman` etiketi kaynak anlamıyla uyumlu. İlk kare tuş kaybı test nedenimiz değildi; test öncesinde ekran zaten birçok kare açık kaldı. Claude oyunu oynamadı ve test çalıştırmadı; inceleme sonrası revize Codex tarafından uygulandı.
- İlk görsel incelemede sonuç satırı taşması bulundu, iki kısa satırla düzeltildi. İlk PageDown denemesi başarısızdı; eksik grafik batch giriş ayarları eklendi ve gerçek sentetik klavye yolu geçti. Yeni Windows build kanıt sınıfının `uint/int` derleme hatası düzeltildi. Hedef biçimi testindeki yanlış üçüncü yıldız indeksi düzeltildi. Eski başarısız denemeler son başarı yerine sunulmadı.

## Doğrulama

- `.NET --engagement`: **1.252 kontrol, 40 etkinlik / 5 tür**; her yıldızda alt/eşit/üst sınır, sıfır drift, geçersiz hedef verisi, küçük süre farkı, mevcut HUD/sonuç bağı, boş/uzun kurulum, yığın/evrim/eklenti, durum ve sonraki bölge RNG eşitliği. `tests/cikti/engagement-core.json` kaynak hash'leri.
- Mevcut `.NET --race-session`: **293.455 koşul**, 10 senaryo / 52.650 adım + 3.000 dünya adımı; en büyük fark `1,33e-15`. `--mutant-hud`: **870**; 30/60/120 FPS, 240 sabit adım. `--mutant-summary`: **7**. Fizik/eşdeğerlik kodu değişmedi; son revize yalnız hedef metinleri/erişim, geniş senaryolar sebepsiz tekrarlanmadı.
- Proje düzeni ve dört zorunlu TS referans/GT parametre `--check` başarılı. Biçim/sözdizimi/diff kontrolü başarılı. Tam regresyon çalıştırılmadı.
- **Gerçek Unity 6000.3.9f1 grafik Play:** 26 kontrol / **10 görüntü** / 244 güncel kaynak / runtime 0. 1280×720 ve 1920×1080: canlı hedef, gerçek drag bitiş sonucu, normal özet, uzun kurulum, klavyeyle kaydırılmış kurulum. Sonuç satırlarının alanına sığması, Shift PageDown sağ panel, gamepad yönü ve gerçek menü çıkışı sınandı. Uzun sağ metin ve tam envanter test fixture'ıdır; normal koşuda verilmez. Kanıt `Unity/Logs/P7StoreEditor/Logs/engagement-play.json`; üretici `EngagementPlayValidation.cs`, doğrulayıcı `node Unity/Validation/check-engagement-proof.mjs`. Yeni kaynak gelirse kanıt eskir.
- Yeni Windows Development paketi ayrı `Unity/Builds/EngagementWindows-20261116/LastTurn.exe`; önceki FunctionalWindows ürünü korunur. Kaynak manifestli build **Succeeded / 0 hata** (`Logs/P7StoreEditor/Logs/engagement-build.json`). Gerçek WindowsPlayer ilk süreç **25**, ayrı yeniden açılış **15** kontrol geçti; satın alınan parça, tam garaj durumu, ayarlar ve sürüş mesafesi yüklendi. Normal InputSystem ile sürüş, gerçek tork etkisi ve AudioSource oynatma görüldü. İki süreç sonunda dosya hash'leri eşit olmak zorunda değil: yeniden açılan ürün yeni sürüş başlatır; açılıştaki tam snapshot eşitliği runtime içinde sınanır. İlk checker'ın yanlış bitiş-hash beklentisi bu sözleşmeye göre düzeltildi; ürün testleri başarısız değildi. `node Unity/Validation/check-engagement-proof.mjs --build` hem Play/build kaynak eşleşmesini hem iki süreç kanıtını doğruladı. Paket mevcut yerel pit menüsü değişikliklerini de içerir; bunlar önceki işin henüz commit edilmemiş kaynaklarıdır, yalnız bu görevin commit'inden tam menü paketi yeniden üretildiği iddia edilmez. Ürün ayrı test kimliği kullanır; otomatik kabul bayrağı yalnız kendi `Validation/` dizinine yazar, gerçek ana ürün kayıt hash'leri korundu.

## Sonraki geliştirme sırası

Son oyun kaynak SHA'sı **`77dede6`** (`257494f` ilk dilim). Bu SHA sonrası yalnız kanıt/devir belgesi güncellenir; Play/build kaynak hash'leri değişmez. Kaynak uygulama Codex, bağımsız inceleme Claude Opus 5.5; önceki menü dosyaları ve recovery hâlâ ayrı yerel değişikliklerdir. Yeni oyun özellikleri bu iki yerel commit'te; push/merge/CI/yayın yok.

1. **Tek sonraki adım:** Yarışlar arası MUTANT dolaşımının temposunu ölçmek: bölge/mesafe/boş geçen süre/etkinlik aralığı; mevcut yol görevlerini ve boss süresini birlikte karşılaştır. Önce sabit tohumlu birkaç doğal koşunun ölçümü; oyuncu oynamadan rastgele daha fazla içerik veya ödül ekleme.
2. Rakibin geçiş/savunma davranışını temsilî asfalt/toprak/şehir yollarında ölç; yalnız hızlı turu rekabet sayma. Gizli güç/rubber-band yasağı korunur.
3. Build çeşitliliği: baskın tek yükseltme ve etkisiz seçim taraması; hedef boss'a en az iki rota. Denge değişikliği öncesi `DENGE.md` ölçümleri gerekir.
4. Ses, hız hissi ve kişilik: mevcut efekt/skill geri bildiriminin okunabilirliği ile çevre çeşitliliğini küçük örneklerde değerlendir. Bu kaynak/ekran testleri insanın eğlendiği iddiası değildir.

Bu sıra aynı kartın devamıdır; yeni görev/devir sistemi veya zamanlanmış arka plan ajanı kurulmadı. İnsan sürüş/keyif kabulü, tam regresyon ve canlıya çıkış açık kalır.
