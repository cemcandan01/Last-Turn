# Last Turn — profesyonel menü yönü

14 Kasım 2026. [Görev kartı](../isler/2026-11-14-profesyonel-menu.md). [Gezilebilir örnek](menu-profesyonel.html).

HTML dosyası görsel yönü göstermek için hazırlanmış gezilebilir örnektir. Cem ikinci yönü 15 Kasım'da onayladı; gerçek Unity uygulaması aynı görev kartında yapılıyor. HTML içindeki örnek veriler, rotalar ve performans değerleri oyuncu kaydı veya denge önerisi değildir; Unity'de mevcut görünüm modelleri, gerçek pist çizimleri ve komutlar kullanılır. Ayrı bir web ürünü değildir.

## Tasarım kararı

Güncel yön **02 / pit panosu ve yarış afişi**. Cem ilk örneğin okunaklılığını beğendi, fakat genel bir GPT tasarımı hissini azaltmamızı istedi. Alttaki dört kutu ve büyük reklam sloganı kaldırıldı. Solda numaralı dikey bölüm listesi, sağda oyunun kendi görüntüsünden bir yarış afişi var. Krem kâğıt, grafit, konturlu başlık, eğik kalkış numarası, ince baskı noktaları, teknik yazılar ve kesik servis fişi ayraçları ortak kimliği kuruyor.

Kariyer listesi kâğıt fiş; garaj bilgileri teknik döküm; mağaza numaralı katalog; ayarlar kontrol masası gibi düzenlenir. Başlıklar doğrudan bölüm adıdır. Mevcut Barlow ve turuncu kökeni korunur. Yarış altında Kariyer / Garaj / Mağaza kardeş bölümlerdir; Profil ve Ayarlar üst şeritten de erişilir. Erişim ve temel yerleşim `menu-profesyonel.css`, ikinci yönün görsel kuralları `menu-pit.css` içindedir.

Bu yapıda ana ekrandan hazırlığa üç tıklama gerekmez: Kariyere Git → Yarışa Hazırlan iki işlemdir; farklı pist seçilirse üç olur. Hazırlık → araç değiştir → hazırlığa dön akışı saat ve hava seçimini korur. Escape açık pencereyi, ardından önceki ekranı kapatır. Ana menü geçmişi temizler; kardeş sekmeler arasında dolaşmak geri dönüş zinciri üretmez.

## Yarış oyunlarından alınan ilkeler

- [Forza Motorsport resmî erişilebilirlik desteği](https://support.forza.net/hc/en-us/articles/20964254277267-Forza-Motorsport-Accessibility-Support): ana menüden erişilebilir ayarlar ve açık giriş/tuş açıklamaları. Last Turn karşılığı: sürekli Ayarlar erişimi, altta denetim ipuçları, görünür odak.
- [Need for Speed Unbound resmî erişilebilirlik kaynakları](https://www.ea.com/able/resources/need-for-speed-unbound): erişilebilirlik ve görsel/ses tercihlerine açık erişim. Last Turn karşılığı: kolay bulunan ayar grupları; örnekte çalışan büyük metin ve azaltılmış hareket.
- Bu kaynaklar menünün kopyalandığı veya tüm erişilebilirlik özelliklerinin uygulandığı anlamına gelmez. Yerleşim ve görsel kompozisyon bu projeye özeldir. Kumanda, ekran okuyucu anlatımı ve gerçek ses/oyun ayarı bağlantısı bu örnekte yoktur.

## Görsel sistem

| Öğe | Karar |
| --- | --- |
| Zemin | Grafit `#1b2225` |
| Yüzey | Krem kâğıt `#ddd8c9`, karbon `#20292b`; açık fiş ve kesik ayraçlar |
| Ana metin | `#eae5d8`; açık kâğıtta koyu karbon |
| İkincil metin | `#b8beb9`; açık kâğıtta `#485653` |
| Vurgu | `#f17b4d`; numara, baskı etiketi, işlem şeridi |
| Başlık | Yerel Barlow Condensed Bold / ExtraBold Italic |
| Gövde | Yerel Barlow Regular / SemiBold; teknik etiketlerde sistem Consolas / Courier New |
| Odak | Koyu yüzeyde 3 px açık çizgi, açık fişte koyu iç çizgi; hover'dan bağımsız |
| Seçim | Çerçeve/şerit + SEÇİLİ metni + aria durumu |
| İşlem alanı | En az 44 px yükseklik |
| Animasyon | Yalnız 220 ms giriş; sistem ve kullanıcı azaltılmış hareket tercihine uyar |
| Boyut | 1280×720 ve 1920×1080; ultra geniş ve 640 px pencere uyarlaması |

Fontlar ve arka planlar yereldir, Google Fonts/CDN bağlantısı yoktur. Arka planlar mevcut `docs/tasarim/pc/` oyun görüntüleridir; yeni görsel üretimi veya dış varlık indirmesi yapılmadı. Mevcut `_Recovery` korunur.

## Unity eşleme planı

| Örnek yüzey | Mevcut bağlanacak yüzey / model | Entegrasyon sınırı |
| --- | --- | --- |
| Ana ekran | `MainMenuView.BuildHome`, `CareerMenuModel` | Mevcut dört ana işlem; örnek sayılar yerine gerçek model, onaylı gece afişi |
| Kariyer | `MainMenuView.BuildRace/Rebuild`, `RaceEventRow` | Gerçek 40 etkinlik, hedef ve kilit nedeni; temsili pist SVG'si gerçek pist verisinin sunumuyla değişir |
| Hazırlık | `RacePreparationView`, `GameFlow.OpenRace` | Mevcut saat/hava ve katılım uygunluğu; yeni ödül/uygunluk kuralı yok |
| Garaj | `GarageView`, `GarageViewModel` | Gerçek araç sahnesi, sınıf/puan ve parça karşılaştırması; örnek 0–100 barları taşınmaz |
| Mağaza | `StoreView` | Var olan katalog, fiyat ve sahiplik; satın alma onayı mevcut komuta bağlanır |
| Mutant başlangıcı | `MainMenuView.BuildMutant/BuildConfirm`, `MutantStartView` | Mevcut araç → yetenek → sürüş; koşu ekonomisi aynı kalır |
| Profil | `ProfileView`, `ProfileViewModel` | Gerçek istatistik, kayıt ve hesap durumları; hesap çağrıları mevcut servisten |
| Ayarlar | `SettingsView`, `SettingsViewModel` | Mevcut tercihler korunur; örnekteki yeni metin/hareket tercihi kalıcı olacaksa ayrıca mevcut ayar modeline bağlanır |

Görünüm yalnız model çizer ve mevcut komutları çalıştırır. C# ekranlarına yeni ekonomi, yarış koşulu veya kayıt mantığı gömülmez. HTML içindeki örnek veri ve kullanıcı tercihleri bellektedir; Unity davranışının kanıtı değildir. Unity'nin ortak stili `Resources/UI/pit.uss` içindedir; Mutant başlangıcı, ödül, boss, etkinlik, atölye, sandık, sonuç/özet ve HUD için petrol/asit yeşili uyarlama içerir. Gerçek ödül ikonları, nadirlik rengi/metni ve lanet bedelleri korunur.

## İnceleme ve çalıştırma

Depo kökünde `python -m http.server 5181 --bind 127.0.0.1`, sonra `http://127.0.0.1:5181/docs/tasarim/menu-profesyonel.html`. Modül betiği nedeniyle HTML dosyasını dosya sistemi adresiyle açmak yerine bu yerel sunucu kullanılır. Yeni paket kurulumu gerekmez.

Ana menü, kariyer, hazırlık, garaj, mağaza, Mutant, profil ve ayarlar gezilebilir. Satın alma, hesap, yarış başlatma ve Modifiye ayrıntısı açıkça örnek açıklaması gösterir; bu işlemler uygulanmış sayılmaz. Görsel yön kullanıcı değerlendirmesine açık; tam erişilebilirlik sertifikasyonu iddiası yoktur.

## Claude ile inceleme

Cem'in açık kaynak aktarım izniyle Claude Pro üzerinden `claude-opus-5-5` mevcut `MainMenuView.cs` ve kısa yön özetini inceledi. HTML, kart içeriği ve görseller sağlanmadı; bu bir görsel kalite onayı değildir. Sekiz bulgunun ikisi, diğer Unity ekranları okununca doğrulanmadı: Q/E zaten döngüseldi ve her ekran kendi etkin sekmesini çiziyordu. Mevcut çalışan davranış değiştirilmedi.

Örneğe Q/E bölüm döngüsü, H ile Mutant yardımı, ekrana göre tuş ipuçları, yardım kapatıldığında odak dönüşü ve erişilebilir ekran adları eklendi. Baskın ana işlem, görünür odak, büyük metin ve azaltılmış hareket zaten vardı. H yardımından sonra odak dönüşündeki eksik yeni kontrolde bulunup düzeltildi. Güncel Chrome kontrolü **14 grup başarılı**. Ham inceleme kanıtı ve ayrıntılı kararlar görev kartındadır; Unity hata yollarına ilişkin statik bulgular entegrasyon sırasında ayrıca doğrulanacak.

Kanıt: `tests/cikti/menu-profesyonel/result.json` ve aynı klasörde ekran PNG'leri. Bu çıktılar ignore edilir, commit ile başka makineye taşınmaz. Yerel kontroller C# derlemesi veya insan görsel kabulü değildir. Vite mevcut ortamda native rolldown bağımlılığını bulamadı; statik örnek mevcut Python sunucusuyla doğrulandı, bağımlılıklar değiştirilmedi.
