# Last Turn — sürükleyici yarış ve MUTANT döngüsü

## İstek ve sahiplik

Cem (16 Kasım 2026): “last turn için neler yapabiliriz yap. harika ve sürükleyici bir oyun olmasını istiyorum. oyunun son halini incele ve günümüzde bir yarış oyununu ve rouge-like oyununu sürükleyici ve eğelenceli yapan şeyler ne araştır ve claude ile oyunu kendiniz geliştirin. yaptıklıarınızı inceleyip bensiz geliştirmeye devam edin”.

Sahip Codex; dal `codex/unity-p7-garaj`, taban `92c2c7e`. Kullanıcı mevcut işin devamını yetkilendirdi; kirli çalışma ağacı nedeniyle dal değişimi yok. `git fetch origin` başarılı. Önceki pit menüsü dosyaları, Editor doğrulamaları ve `_Recovery` korunuyor; yeni iş bunları teslim edilmiş/commit edilmiş saymaz. Başlangıçta çalışan Unity/Claude süreci görülmedi. Claude Pro / claude.ai resmi metadata ile doğrulandı; 5 saat/haftalık kapasite bilinmiyor. Güncel ücretli ek kullanım teyidi bekleniyor; API/ek kredi yetkisi yok. Claude rolü bağımsız salt okunur inceleme; aynı dosyalarda ikinci uygulayıcı yok.

## İnceleme ve araştırmadan karar

Güncel Core, HUD, sonuç ve MUTANT kodları ile yerel Play görüntüleri incelendi. Oyun 40 etkinlik, 15 araç, parça ekonomisi, rakipler, skill/pasifler ve bölgeli MUTANT döngüsünü zaten içeriyor. Kaynak aktarımı bitmiş; insan sürüş/beğeni kabulü açık. Önceki menü dosyaları devir özetinden ileri durumda; korunuyor. Mevcut görüntü incelemesi canlı insan sürüşü değildir.

- [Forza, rakip iyileştirmeleri, 30 Nisan 2025](https://forza.net/news/forza-motorsport-drivatar-changes): öngörülebilir yan yana yarış, geçiş ve pistte kalma; binlerce tur ve insan geri bildirimi birlikte kullanılıyor. Çıkarım: ileride YZ çalışması yalnız tur hızıyla kabul edilmemeli.
- [Forza, ilerleme revizyonu, 7 Şubat 2024](https://forza.net/news/forza-motorsport-car-progression-updates): parça seviyesi kilitlerini kaldırarak kurulum özgürlüğü. Çıkarım: yeni zorunlu grind/para birimi yerine mevcut seçimin etkisini anlaşılır kıl.
- [Hades II, Olympic Update, 16 Ekim 2024](https://www.supergiantgames.com/blog/hades2-olympic-update/): silah biçimleri, nimetler, çeşitli karşılaşmalar ve isteğe bağlı zorluklar. Çıkarım: rastgelelik tek başına yeterli değil; kurulumun kimliğini ve sonraki denemenin amacını görünür kıl.
- [Hades II güncel SSS, 14 Nisan 2026 revizyonu](https://www.supergiantgames.com/blog/hades2-faq/): tekrar oynanabilirlik ana ürün hedefi. Eski duyuruların mekanizma açıklamaları bugünkü bütün ürünün incelemesi sayılmadı.

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

## Sonuç

Uygulama sürüyor. Son SHA, test ve kalan işler kapanışta güncellenecek.
