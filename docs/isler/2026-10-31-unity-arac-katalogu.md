# Unity araç kataloğu, sınıf ve modifiye aktarımı — 31 Ekim 2026

## İstek

TypeScript 0.8.18 araç kataloğu, sınıf sistemi ve modifiye verilerini otomatik ve tekrarlanabilir biçimde Unity'ye taşı. Mevcut güç, sınıf limitleri, modifiye payı, fiyat ve gelişim kuralları korunsun; aynı kombinasyonun sayısal eşdeğerliği test edilsin. Editor geliştirici kataloğu oluşturulsun. GTTest/TerrainTest korunsun. Yeni fizik mekaniği, push, merge, uzun regresyon ve yayın yok. Ayrı görev dalı ve yerel commit kullanılacak.

## Sahiplik ve taban

- Sahip Codex: mevcut C#/Editor teslim kanıtı ve bağlamı; taban `0b341e6`, dal `codex/unity-arac-katalogu`. Fetch başarılı; kabul edilmiş yerel fizik zinciri üzerine yeni görev dalı açıldı.
- Sabit TS `typescript-baseline-0.8.18` / `df3549e709469f0b519ebfbeaa9f63c1040fee05`; TS referansı değiştirilmeyecek.
- Claude CLI bulundu; `npm run koordinator -- --oturum --ajan claude`: resmi abonelik doğrulanamadı, model çalıştırılmadı. 5 saat/hafta/model bilinmiyor; API/ek kredi yok. Claude için bağımsız inceleme rolü devredilebilir; yapılmış sayılmaz.
- Ayrı Codex ajanları: `katalog_aktarim` yalnız export-catalog.mjs, vehicle-catalog.json ve catalog-cases fixture; `katalog_performans` yalnız CatalogPerformance.cs; `katalog_dogrulama` bağımsız salt okunur kaynak/risk incelemesi. Ana oturum diğer C#, Editor, test ve belgelerin sahibi. Ortak dosya eşzamanlı yazılmaz, derlemeyi ana oturum yürütür.

## Kabul

1. Bütün 15 araç/42 parça/12 kategori/5 paket ve 28 lastik kaynak SHA/hash manifestiyle otomatik üretilir; `--check` sapmayı reddeder.
2. Stok, tek parça, paket, karma/sıra/çakışma kurulumları; yardım/lastik/araç/fizik ve performans özellikleri TS oracle ile karşılaştırılır. Sınıf/para tam; kayan sayılar önceden 1e-9 mutlak + 1e-10 göreli toleransla sınanır.
3. Sınıf aralıkları, stok tavan verisi, lastikten bağımsız puan, özel fiyatlar, kategori kredisi ve XP/ödül/erişim kuralları korunur. Yeni denge/clamp yok.
4. Last Turn menüsündeki geliştirici kataloğu araç/parça/paket, stok ve değiştirilmiş değerleri gösterir; geçersiz katalog sürümü/kimliği/verisi reddedilir.
5. Mevcut GTTest/TerrainTest sahne ve fabrikaları korunur; kısa çekirdek testleri ve Editor derleme kanıtı ayrı raporlanır.

## Uygulama / kanıt

Tamamlandı. Katalog saf JSON, aynı bağımlılıksız C# okuyucu .NET ve Unity'de kullanılır. Sürüşe bağlantı açık `CreatePhysics` sınırıdır; sahneler otomatik olarak yeni kurulum seçmez. Negatif alçaltma farkı için VehicleParameters Lift doğrulaması NonNegative'den Finite'a genişler; fizik denklemi değişmez.

## Sonraki adım

Bu ilk uygulama adımı tamamlandı; kapanış ve tek sonraki adım aşağıdadır.

## Tamamlanan teslim ve bağımsız inceleme

- Otomatik katalog: **15 araç, 42 parça, 12 kategori, 5 paket, 28 lastik, 6 yüzey**; 21 özgün TS dosyasının SHA256 manifesti. Stok dağılımı **7 D / 7 C / 1 B**. Yeni denge/fiyat yok. TypeScript, sahneler, mevcut GT fabrikası, Prototype, Input System, TimeManager ve paketlerde diff yok.
- `VehicleCatalog`: normalize/kurulum, önayar-yardım sınırları, yarış lastiği, fizik fabrikası; `CatalogPerformance`: altı özellik/sınıf ve dört tur tanısı; fiyat/net kategori kredisi, XP, 40 kariyer etkinliği bütçesi, yıldız ve alternatif araç erişimi. Kalıcı kayıt/satın alma/ödül yazımı henüz oyun akışına bağlanmadı. Kullanım ve sınır: `Unity/ARAC-KATALOGU.md`.
- Editor: **Last Turn → Araç ve Modifiye Kataloğu**. Gerçek pencerede GT stok **C448 → asfalt paketi C458**, 480 hp/1240 kg korunarak yükseklik **0 → −.04 m**, fiyat **4400**, otomatik lastik **Yarış K3**, sınıf bütçesi **52 → 42** gözlendi. Motor/tek parça seçenekleri ve paket/stok dönüşü mevcut. Bu seçim sürüş sahnelerini değiştirmez.
- Bağımsız kaynak incelemesi: bilinmeyen/tekrarlı parça, son-kategori sırası, motor değişimi/turbo, AWD kütlesi, lift/hcg payı, paket eşitliği, lastikten bağımsız puan, özel fiyat/kategori kredisi, XP ve yıldız kapıları doğrulandı. İncelemede bulunan fazladan alan testi, normalize/uyum, farklı tur, RaceTire, erişim API/testi ve bozuk veri doğrulama açıkları kapatıldı.
- Plan makbuzu `2fa8a509-5341-4a1c-8089-f826e66e39dc` (ignore edilen tests/cikti/koordinator). Gerçekte üç sınırlı Codex ajanı kullanıldı, tam model/kota bilinmiyor. Claude oturumu doğrulanamadığı için çalıştırılmadı; API/ek kredi kullanılmadı. Ajan dosya sınırları korundu.

## Test kanıtı (31 Ekim 2026, yerel)

- `export-catalog.mjs --check` başarılı, 1395 norm + 30 yardım kurulumu. `tests/cikti/catalog-export-check.txt`.
- `.NET --catalog`: **1425 kurulum / 983569 koşul** başarılı. Tam araç/ayar/yardım/normalize/uyum, türetilmiş fizik ve 6×4 lastik; 60 farklı tür performansı, 42 parça fiyatı, 3 kategori geçmişi, 25 yarış lastiği, 140 araç erişimi, 160 yıldız kapısı, 640 ödül geçişi, XP ve sınıf/bütçe uçları, bozuk JSON/fiyat/indeks. `tests/cikti/catalog-validation.txt`.
- Sınıf/özellik puanları ve ekonomi tam eşleşti. Ana sayısal tolerans **1e-9 + |referans|×1e-10** değişmedi. Ek rx tur tanısının ilk denemesi **3.909548e-8 sn** farkla bu sıkı genel sınırı aştı; elips sınırındaki kayan sayı yuvarlamasının süreye büyümesi ayrı kaydedildi. Yalnız `/tur` tanısı **1e-6 sn** ile sınanır; sınıf/fizik toleransı büyütülmedi. Son bütün sonuçlarda en büyük mutlak fark 3.909548e-8; ana fizik alanlarında tepe 7.80872e-9 (büyüklüğe göre göreli sınır içinde).
- Eski kısa `.NET` çekirdek: teker **1800/26241**, gövde **3000/150073**, motor **4800×58/288063**, arazi **4200×51/218790**, toprak denge **4800×51/250042**, 48 kararlılık karşılaştırması/**197 koşul** geçti. `tests/cikti/catalog-core-regression.txt`; bu uzun oyun regresyonu değildir. Proje ve gerekli eski teker/gövde/motor/GT `--check` geçti; eski fixture/tolerans değişmedi.
- Unity **6000.3.9f1**: **20 Core**, 600+600+1200 kısa adım + 6 gösterim geçti. Katalog **30 gerçek kurulum/sürüş bağlantı testi**, 23 güncel kaynak/hash doğrulandı; UTC **2026-10-31T07:13:08.3611001Z**, derleme **07:13:09.6474595Z**. Kanıt `Unity/Logs/catalog-compilation.json`, `drive-core-compilation.json`; checker'lar başarılı.
- Gerçek GT Play **28/28**, UTC **07:12:42.6616309Z**; Terrain Play **23/23**, UTC **07:13:23.6871791Z**. Türkiye saati 10:12/10:13. Arazi beta **3.88355° → .0000949533°**, önceki kabul ile aynı. İki Play checker güncel tüm kaynak/meta hash'lerini doğruladı; `tests/cikti/catalog-gt-play.txt`, `catalog-terrain-play.txt`. Play kapalı, Console 0 hata/uyarı.
- İlk .NET denemelerinde DTO alan adı/yol yanlışları düzeltildi; bir eşzamanlı build dosya kilidi sonrası build tek oturuma alındı. İlk büyük fixture okumasındaki gereksiz Substring maliyeti kaldırıldı. İlk sandbox Editor başlatması pencere açmadı; mevcut lisanslı kullanıcı oturumunda açıldı. İlk UI popup koordinatı hedef dışı görünüme geçti; pencere yeniden seçilip görünür alana taşındı, paket kontrolü gerçek Unity'de tamamlandı.
- `Unity/Assets/_Recovery/` Editor'ın ürettiği kurtarma sahnesi olarak korunur, görevin commit'ine alınmaz. Kullanıcı verisi silinmez.
- CI'ya katalog üretim/eşdeğerlik kontrolü eklendi; **CI çalıştırılmadı**. Push, merge, yayın, uzun regresyon, cihaz/IL2CPP ve kullanıcı sürüş hissi kabulü yok.

## Son durum / tek sonraki adım

Teslim SHA'sı bu kartı son değiştiren yerel commit'tir (`git log -1 -- docs/isler/2026-10-31-unity-arac-katalogu.md`). Sonraki öneri: bu veri katmanını kullanan **Unity garajı ve araç başına parça sahipliği/kategori yatırımı kayıt akışı**; satın alma/sökme/takma ve eski kayıt uyumu ayrı kabul ölçütleriyle ele alınsın. Yeni fizik mekaniği başlatılmasın.

Son dosya sonu/metadata boşluk temizliği ve fixture'ın aynı sayısal veriyi koruyan 7,43 MB kompakt satır biçimi sonrası yeniden --check ve .NET --catalog başarılı (aynı 983569 koşul). Son Editor katalog/çekirdek kanıtı UTC 07:19:17.8759593Z/07:19:18.9569156Z; son GT Play 28/28 UTC 07:18:53.8536112Z, son Terrain Play 23/23 UTC 07:19:33.0283332Z. Her dört checker güncel kaynaklarla yeniden başarılı. Son kaynak test zamanları Logs kanıtından okunur; önceki saatler ilk başarılı turdur.
