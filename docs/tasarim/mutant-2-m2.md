# Mutant 2.0 — M2 ilk ödül dilimi

**8 Kasım ilerlemesi:** başlangıç kart entegrasyonu `39fea95`, koşu içi B /5A ödül+skill değiştirme `3001f70`, tam ödül ikon eşlemesi `a6be53c`, B /6A boss `20ec0b2`, B /7A yarış sonucu `dd85772` ile tamamlandı. Cem B biyomekanik yönünü seçti. Son sonuç ekranı Unity181/.NET435.641 ve10 Game View; önceki dilimlerin kanıtları [güncel devirde](../DEVIR.md). Aşağıdaki ilk teslim sınırı ve “sonraki iş” tarihsel kayıttır; yeniden uygulanmaz. Diğer5 ekran henüz aktarılmadı; sıradaki tek iş B /8A koşu özetidir.

7 Kasım 2026 · [görev kartı](../isler/2026-11-07-mutant-m1-kapanis-m2.md).
M1 kapanışı `95e66b2` ile tamamlanıp .NET31/Unity41 kanıtı alındıktan sonra başlandı.

## Uygulanan sözleşme

`MutantRewards` mevcut `mutant-catalog.json` verisini okuyarak94 tanım oluşturur:31 pasif,6 sandık eklentisi,5 skill,5 evrim,2 skill eklentisi,42 parça,3 kaynak. Ad/açıklama ve seviye verileri kaynaktan gelir. `MutantRewardCard` kaynak, tür, seviye/işlem, nadirlik, lanet, uyumluluk ve sayısal etkiyi taşır. Kimlik kodları (`b/y/v/e`) mevcut protokoldür; yeni ödül alma komutu yoktur.

`Resources/mutant-reward-metadata.json` ayrı, schema1 bir sunum dosyasıdır. Ana TS üretilmiş kataloğunun baytları değişmez. Anahtarlar `passive/id`, `addon/id`, `skill/id`, `evolution/id`, `skillAddon/id`, `part/id`, `resource/id`; değerler Common/Uncommon/Rare/Legendary. Kataloğun ileride açık `rarity` alanı varsa o alan önceliklidir. Metadata eksikse Yaygın; geçersiz JSON/sürüm/tür/değer güvenli varsayılan + tanı üretir. Bilinmeyen anahtar yok sayılır, bilinmeyen teklif kullanılabilir gibi gösterilmez. Sayısal metin `"1"` nadirlik sayılmaz.

| Nadirlik | Renk | Renk dışı işaret |
|---|---|---|
| Common / Yaygın | gri `#A6ACB6` | `[I] Yaygın` |
| Uncommon / Seyrek | mavi `#4F9EED` | `[II] Seyrek` |
| Rare / Nadir | mor `#B078EF` | `[III] Nadir` |
| Legendary / Efsanevi | altın `#E2B247` | `[IV] Efsanevi` |

Başlangıç metadata sınıfları içerik bazında açıkça yazılıdır; fiyat/performans/skill seviyesinden otomatik türetilmez. Genel stat pasifleri çoğunlukla Yaygın, koşullu kaynak mekanikleri Seyrek/Nadir, Son Nefes ve bazı ayrı davranışlar Efsanevi olarak etiketlendi. Bu **sunum sınıflandırmasıdır**, fiyat veya düşme oranı kararı değildir. `nadir` legacy bool'u lanetli sandık havuzu filtresidir; yeni rarity'ye otomatik dönüştürülmez. Lanet ayrıca kırmızı metin/bedel olarak gelir.

Seviye ayrı eksendir: pasif birikim sayısı, skill1–3, parça basamağı ve seviyesiz kaynak birbirine karıştırılmaz. `y` yükseltme parametre değişimini, `v` evrim davranış açıklamasını, `e` hedef skill eklentisini belirtir. Örneğin Yaygın Motor ayarı3 araçta anlık güç farkı yaratabilir; Efsanevi Son Nefes1 doğrudan HP farkı yaratmaz, koşullu zaman faydası sağlar. Bu karşılaştırma her koşulda hangisinin daha güçlü olduğu iddiası değildir.

## Gerçek etki / uyumluluk

- Pasif/parça için mevcut `VehicleCatalog.Setup → MutantVehicle.Configure` öncesi/varsayımsal sonrası karşılaştırılır. Core kuralları UI'ya kopyalanmaz; gerçek koşu/araç kataloğu değiştirilmez. Güç/kütle/fren/açı/tutuş açıklanır. Güç farkları yapılandırılmış önce/sonra değerleriyle de taşınır.
- Skill sayıları `MutantSkills.Parameters` üzerinden okunur; örneğin Slipstream2→3 güç1,25→1,3 ve bekleme3→2,5. Evrimin davranışsal etkisi sahte bir tur süresi sayısına çevrilmez.
- Kaynaklarda mevcut katalog açıklaması sayısal olarak gösterilir; para/gövde/enerji kuralı kopyalanmaz. Üç kaynağın kart sayıları gerçek `AcceptChest` kazancıyla hedefli testte karşılaştırılır.
- Skill uyumu `MutantRun.SkillOffers` verisinden gelir.3 yuva doluysa değiştirme gereği açık gösterilir; seçim oyuncudadır. Aynı parçayı/pasifi tekrar sunma ve birikim sınırı uygunluk bilgisinde görünür; alma davranışını hâlâ eski servis belirler.
- Bu bir genel fayda/başarı puanı veya build önericisi değildir. Yeni skill, evrim, fiyat, fizik katsayısı, ödül veya boss kuralı eklenmez. Beklenmedik ama geçerli teklifler gizlenmez.

## Havuzlar — mevcut ve sonraki sözleşme

`RewardSource` bir sunum bağlamıdır; tek başına o kaynaktan yeni içerik düşürmez. Mevcut üretim aynen kalır:

| Kaynak | Bugün çalışan üretim | Sonraki havuz anahtarı / karar |
|---|---|---|
| Başlangıç | uygun pasiflerden2 + skill teklifinden1 | `start`; keşif payı korunur |
| Seviye | uygun pasif/skill/yükseltme/evrim/eklenti | `level`; sahiplik/max/uyum filtresi ayrı |
| Sandık |2 normal +1 lanetli, `nadir` filtresi ve kaynak fallback | `chest.normal/cursed`; lanet rarity değildir |
| Yarış | var olan para/XP, XP üzerinden seviye seçimi | `event`; doğrudan item düşüşü eklenmedi |
| Boss | mevcut200 para/150XP, gerekirse seviye seçimi | `boss`; özel ödül ağırlığı uygulanmadı |
| Atölye | mevcut5 stok parçası ve bölge filtresi | `workshop`; stok/fiyat/indirim/yenileme aynı |

M2'nin bu ilk dilimi yeni bir havuz seçicisini normal oyuna bağlamaz. Önerilen sonraki resolver `source/region/risk` bağlamı alır; önce uygun kimlik havuzunu belirler, sonra bağımsız rarity ağırlığı uygular. Uyum/beklenen fayda ağırlıktan ayrı kalır; uyumsuz eklenti filtrelenebilir fakat başka sürüş tarzına kapı açan skill gizlenmez. Keşif için sıfır olmayan uygun seçenek payı korunmalıdır; yüzdesi henüz kabul edilmedi.

## Dar deterministik aday ölçümü — üretim ayarı değil

`--mutant-rewards`: aynı1–128 tohum, başlangıçtaki36 uygun içerik (31 pasif+5 yeni skill). Baseline gerçek `Run` tekliflerinin384 kartıdır. İki aday, **yalnız test kodunda**, birleşik havuzdan tekrarsız3 seçim yapar; üretimdeki2 pasif+1 skill yapısından farklı oldukları özellikle kaydedilir. Metadata okumasından önce/sonra gerçek Run snapshot ve sonraki Choose sonucu da aynıdır.

| Dağılım | Yaygın | Seyrek | Nadir | Efsanevi |
|---|---:|---:|---:|---:|
| Gerçek başlangıç,128 tohum/384 teklif |45|228|81|30|
| Aday normal: içerik başına4/2/1/0,5 |116|223|37|8|
| Aday ileri bölge/yüksek risk:4/3/2/1 |76|267|34|7|

İlk çekilişte birleşik havuzun6/22/6/2 içerik sayısıyla teorik rarity payları normal adayda%32/%58,67/%8/%1,33; ileri/risk adayında%23,08/%63,46/%11,54/%1,92'dir. Sonraki iki çekiliş tekrarsız olduğundan paylar değişir. Tablodaki küçük örneklemde ikinci adayın Nadir/Efsanevi sayısı artmamıştır; bu, aday adının başarı garantisi olmadığını gösterir. Bunlar üretim ağırlıkları, oyuncu edinme süresi veya denge kabulü değildir. Kaynak/region/risk havuzlarının tamamı ölçülmeden kalıcı ağırlık seçilmez. Fiyat/XP ve900/780 sn değişmedi.

## Köşeler ve kayıt uyumu

- Dolu3 skill yuvası: kart değiştirmeyi belirtir; eski `Choose` drop olmadan reddeder, açık drop ile çalışır.
- Tükenmiş seçim havuzu boş döner. Sandık eklentileri tükenince mevcut3 kaynak fallback'i okunur. Sandık ikinci kez alınarak yeni ödül üretemez.
- Eski katalog metadata olmadan okunur; yeni metadata oyuncu kayıtlarına gömülmez. Eski kayıt/ilerleme, katalog kimlikleri ve Firebase biçimi aynı; migration gerekmedi.
- Bilinmeyen kimlik veya bozuk metadata nadirliğe göre ödül üretmez; kontrollü okunabilir boş/varsayılan model döner. Kayıttaki ödüller silinmez.

## UI ve kabul sınırı

`Ui/RewardCard` salt `MutantRewardCard` çizer. Koyu panel/turuncu seviye, dört rarity çerçevesi, metin+Roma işareti, ayrı kırmızı lanet, sayısal etki/araç farkı ve uyum altlığı vardır. Uzun içerik fare tekerleği veya PgUp/PgDn ile kayar; Tab odağı vardır. `MutantRuntime.Reward` gerçek kaynaklar/metadata üzerinden bu modeli verir. Kart herhangi bir üretim ekranına otomatik yerleştirilmedi; mevcut8 Mutant ekranı taşınmadı, F2/B/C seçilmedi.

Editor doğrulayıcıdaki dört örnek kart **katalog önizleme fixture'ıdır**, oyuncuya gerçekten dört teklif çekildiği veya alma akışının tamamlandığı iddiası değildir. Üç yuva, pasif birikimi ve curse bağlamı kontrollü hazırlanır. 1280/1920 Game View ve uzun metin/odak/kaydırma kanıtı görev kartına yazılır; gerçek oyuncu dosyaları yerine ayrı test ürünü kullanılır.

**Sonraki tek iş:** mevcut onaylı F §5d başlangıç yetenek/seçim ekranına yalnız ödül kartını bağlamak; mevcut `Choose/drop` işlemleri ve kayıt sözleşmesi korunmalı. Bu öneri F2/B/C seçimi veya koşu içi8 ekranın aktarımı değildir. Üretim ağırlığı/tempo/boss değişimine kendiliğinden geçilmez.
