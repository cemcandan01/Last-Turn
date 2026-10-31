# Unity araç ve modifiye kataloğu

Unity menüsü: **Last Turn → Araç ve Modifiye Kataloğu**. Araç, yardım seviyesi, yarış bileşiği, tek parça veya paket seçilebilir. Stok/seçili güç, kütle, performans, altı özellik puanı, sınıf, kalan sınıf bütçesi, fiyat, önayar, lastik ve türetilmiş motor verisi gösterilir. Bu pencere GTTest/TerrainTest seçimini değiştirmez.

## Tekrarlanabilir aktarım

```powershell
node Unity/Validation/export-catalog.mjs
node Unity/Validation/export-catalog.mjs --check
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj -c Release -- --catalog
```

Üretici `git show df3549e709469f0b519ebfbeaa9f63c1040fee05:<yol>` ile özgün TS modüllerini bellekte transpile edip yürütür. Yerel `src/`, etiket, oyun kaydı veya mevcut denge değiştirilmez. Paket kilidindeki TypeScript kullanılır; yeni bağımlılık yoktur. JSON `Assets/LastTurn/Resources/vehicle-catalog.json`; kaynak dosyaların SHA256 manifesti içindedir. Araçların görsel/geometri alanları da korunur. 7 taban lastik ve TS'nin ürettiği 21 kalite lastiği birlikte taşınır. Fixture bağımsız TS fonksiyonlarının gerçek sonuçlarını içerir; C# çıktısından üretilmez.

## C# bağlantısı

Saf katman `CatalogNode`, `VehicleCatalog`, `CatalogSetup`, `CatalogPerformance`; UnityEngine veya harici JSON paketi gerektirmez. Unity tarafında örnek kullanım:

```csharp
var text = UnityEngine.Resources.Load<UnityEngine.TextAsset>("vehicle-catalog");
var catalog = new LastTurn.Core.VehicleCatalog(text.text);
var setup = catalog.Setup(10, new[] { "motor-sokak", "suspansiyon-spor" });
var stats = LastTurn.Core.CatalogPerformance.Calculate(catalog, setup);
var simulation = new LastTurn.Core.PowertrainVehicle(catalog.CreatePhysics(setup));
```

`Setup`: kategoride son parça, kategori sırası, motor değişimi/turbo sırası, yükseltme ve paket eşitliği TS ile aynıdır. `CreatePhysics` kaynak geometri/yay/atalet/motor/aktarma ve altı yüzey × dört lastik tablosunu üretir. Tablo kuru, sıfır kayma başlangıcıdır; mevcut çekirdek ıslaklık/çamur durumunu sürüşte uygular. Katalog yardım sınırlarını taşır; çekirdekte henüz desteklenmeyen üst düzey drift/ESC yardımları yeni mekanik olarak eklenmez.

Garaj performans/sınıf hesabı `norm` kurulumu ister; Editor bunu otomatik kullanır. Seçilen yardım yalnız sürüş parametrelerini değiştirir. Yarışta `RaceTire` etkinlik bileşiği ve takılı kaliteyi verir; uygulayıcı `setup.Tire` alanına bu indeksi atayıp fiziği yeniden üretebilir. MUTANT toprak dengesi bu ham kataloğa kendiliğinden uygulanmaz.

`PartPrice`, `PurchaseCost`, `XpLevel`, `StarGate`, `VehicleAccess`, `WithinBudget` ve `CareerEligible` saf fiyat/kredi/gelişim sınırlarıdır. `PurchaseCost` yalnız seçili aracın `parça kimliği → ödenmiş gerçek net bedel` sözlüğünü alır. Kayıtları silmez, satın alma yapmaz. Eski sahiplik/bulut kayıtları henüz Unity'ye bağlanmadı. `Reward` 40 özgün etkinliğin kaynak referans ödül tabanından yıldız geçişini hesaplar. Kariyer sürüş akışı ve ödülün tekil kayda yazılması sonraki entegrasyon işidir.

Sınıf D400/C500/B600/A700/S800/X999; stok tavanları D200/C450/B550/A650/S750/X900 metadata olarak korunur. Stok tavanı yeni bir otomatik clamp değildir. Lastik seçimi puanı değiştirmez. Alçaltma parçasının negatif `lift` değeri korunur; VehicleParameters yalnız bu geçerli aralığı kabul edecek biçimde genişletildi.

## Doğrulama

- 1395 norm + 30 yardım kurulumu: bütün araçlarda stok, her tek parça, paket, kısmi/eşit paket, karma ve kategori çakışması.
- Araçların bütün alanları, ayarlar, yardımlar, normalize parça/uyum, türetilmiş fizik, 6×4 lastik, performans/sınıf ve bedeller karşılaştırılır.
- 60 farklı türde performans tanısı; 42 fiyat, 3 geçmiş yatırım, 25 yarış lastiği, 140 araç erişimi, 160 yıldız kapısı, 640 ödül geçişi; XP ve sınıf/bütçe sınırları, bozuk katalog reddi.
- Sayısal tolerans: 1e-9 mutlak + 1e-10 göreli; puan/sınıf/para tam eşleşir. Tur süresi tanısında elips sınırındaki yuvarlama etkisi nedeniyle ayrı 1e-6 sn kabulü vardır; ölçülen tepe fark 3.90955e-8 sn. Diğer testlerin toleransı büyütülmedi.
- **Last Turn → Katalog Verisini Doğrula** 30 gerçek Editor kurulum/sürüş bağlantı kontrolü üretir. `node Unity/Validation/check-catalog-proof.mjs` güncel kaynak/JSON hash'lerini denetler.

Tam kombinasyon uzayı, insan sürüş hissi, cihaz/IL2CPP ve tam regresyon kanıtı değildir. GTTest'in kabul edilmiş 3000 RPM geri düzeltmesi ayrı fabrikasında kalır; ham kaynak kataloğu yeni manevra ayarı uydurmaz.
