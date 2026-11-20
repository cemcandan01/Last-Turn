# Mutant 2.0 — M0 tasarım sözleşmesi

7 Kasım 2026 · yerel taban `c54e784` · [görev/kabul](../isler/2026-11-07-mutant-2-m0-m1.md).

Bu belge gerçek C# ve JSON kaynaklarının denetimidir. M1 ayrı, sınırlı bir Core pilotudur; normal koşuya bağlanmaz. M2–M4 uygulanmadı. Risk of Rain 2 / Slay the Spire yalnız kullanıcının belirttiği yönü anlatır; bu oyunların güncel sistemlerine ilişkin araştırma veya eşdeğerlik iddiası yok.

## 1. Gerçek teknik durum

| Sınıf | Çalışan kaynak / bulgu | Yeni hedefe etkisi |
|---|---|---|
| Zaten uygun | `MutantRun`: tohumlu RNG, başlangıç seçimi, her bölgede 8 etkinlik/3 sandık/5 stok; `MutantGameSession` ve marker kapısı: oyuncu istediği işarete gider | Sabit rota veya build sınıfı ekleme; yeniden yazma gerekmiyor |
| Zaten uygun | `MutantMechanics`: veri tabanlı tetik/koşul/maliyet/kazanç/değiştirici, `EnergyGained`; pasif listesi normalizasyonu | Ortak olayla kombinasyon için mevcut temel kullanılabilir |
| Zaten uygun | `MutantSkills`: 5 skill ×3 seviye, 5 evrim, 2 etiketli eklenti; 3 yuva, skill başına 2 eklenti | Yeni skill üretmek ilk iş değil |
| Zaten uygun | `MutantEnergyController`: drift, hasar, risk ve yakınlık olaylarını bir sıra uzayında birleştirir; skill çıktısı sonraki adıma aktarılır | Enerji ve skill katmanları arasında çalışan bir köprü var |
| Zaten uygun | `MutantVehicle` / `MutantAbilityDriver` / `OpponentRacer`: mevcut kurulum, fizik girdisi, hasar/gövde, uçuş ve rakip etkileri | Kariyer fiziği yerine ayrı fizik motoru gerekmiyor |
| Geliştirilecek | `MutantSkills` davranışları kimlik bazlı switch ve parametre tablolarında; katalog açıklama/seviye kopyası ayrıca var | Tamamen veriyle tanımlanan mekanik grafiği henüz yok; küçük ortak olay ekleriyle ilerle |
| Geliştirilecek | `MechanicState` tetik/kazanç/harcama/kesilme telemetrisi, skill toplam hasar/kesilme; test sürüşü paneli | Ortak koşu/boss/metrik kaydı ve sürüş profilleri yok; tam denge laboratuvarı değil |
| Geliştirilecek | Boss katalogları, ortak pilot/kurulum, yağmur/gece ve taktik açıklamalar | Boss metni özel AI politikasının kanıtı değil; kombinasyona tepki modeli yok |
| Bulunmuyor | Ortak dört nadirlik, kaynak bazlı ağırlık tablosu, araç etkisi karşılaştıran ortak ödül DTO'su | M2 metadata + sunum modeli gerekir; fiyat/sv/nadir bool otomatik eşlenemez |
| Bulunmuyor | Çerçeveler arası kök/ebeveyn/türetilmiş olay zarfı ve tüketici idempotency sözleşmesi | Mevcut sıra sayacı tek başına gelecekteki tüm dönüşüm döngülerine yeterli değil |
| Bulunmuyor | Genel kaynak→kaynak dönüşümleri, nitro→tutuş olayı, katalogdan genel tepkisel skill tanımı | Kullanıcı örnek zinciri bugün bütünüyle uygulanmış değil |
| Bulunmuyor | Canlı koşuyu tüm RNG/süre/marker/skill geçici durumlarıyla devam ettiren disk kaydı | `Snapshot()` derin kopyadır; yeniden yükleme API'si değildir. Runtime yalnız boss sonrası Mutant rekorunu kaydeder |
| Tasarım kararı | Güçlü kombinasyon sınırı, kaynak havuzu ağırlıkları, tekrar edilebilir görev ekonomisi, tempo, boss karşılığı | Ölçüm/oyuncu kabulü gerekir; bu oturumda sayılar değişmez |

Kaynaklar: `Unity/Assets/LastTurn/Scripts/Core/Mutant{Run,GameSession,Mechanics,Skills,EnergyController,RacePlan,Vehicle,AbilityDriver,RoadMission,RecordStore}.cs`; `OpponentPilot.cs`, `OpponentRacer.cs`, `MutantSkillWorld.cs`; `Prototype/MutantRuntime.cs`, `MutantScreen.cs`; `Ui/MutantStartView.cs`; `Resources/mutant-catalog.json`. Geliştirici paneli `Garage/GarageScreen.cs` ve `Prototype/GtPrototype.cs` içinde; Mutant sırasında GT telemetri paneli gizleniyor.

P7: başlangıç F §5a–d ve ortak ayarlar/duraklatma uygulanmış. Koşu içi event/shop/chest/choice/boss/result/summary hâlâ IMGUI; yeni HTML/görsel alternatifler Unity uygulaması veya onay değildir. Mevcut çalışma ağacındaki görsel çalışmalar ayrı korunur.

## 2. Mekanik kataloğu ve etkileşim matrisi

Tam kaynak dökümü [ayrı matriste](mutant-2-matris.md): **31 pasif + 6 sandık eklentisi + 5 skill/15 seviye/5 evrim + 2 skill eklentisi + 42 araç parçası + 5 boss**. Pasif/eklenti içindeki `m` tanımı tetik/kaynak/dönüştürme/sınırın gerçek verisidir; `m` olmayanlar `Run/Vehicle` içinde sayaca dayalı davranışlardır. Nitro ve temel sürüş enerjisi her zaman kurulur; kodda bulunan `GripPulse` normal `Installed` listesine otomatik girmez.

İlişkiler build adıyla kodlanmaz. Mevcut örnekler:

- Drift → temel enerji + Drift Hasadı → nitro maliyeti → araç gücü.
- Hasar → Çarpışma Pili + Hasar dönüştürücü → enerji → nitro → Nitro kalkanı ile sonraki hasar azalması.
- Yakın takip → Takip Dinamosu → enerji; aynı takip ayrı Slipstream/risk barını da besler.
- Kanca → konum olayı → Şok bobini → elektrik → rakip frenlenmesi.
- Risk alevi → hasar → Kor çekirdeği/yanma → Hasar Bataryası → enerji. Skill olayı enerji tarafına **sonraki adımda** geçer.

Son iki yolun mevcut Unity testleri var; M1 bunları yeniden tasarlamaz veya genişletmez. Tutuşun sürüşte drift davranışını değiştirmesi fiziksel geri beslemedir; tek başına yeni bir enerji ödülü değildir.

## 3. Güvenlik sınırları ve açık riskler

| Katman | Gerçek sınır | Sınırın kapsamadığı durum |
|---|---|---|
| Enerji | Kapasite100–200, maliyet çarpanı .5–2, süre .5–2, güç katkısı0–.3, tutuş katkısı0–.2, yanma .2–1 | Değiştirici sırası ve yuvarlama tüm rastgele içerikler için kanıtlanmış değil |
| Olay | Derinlik3, işlem64; aynı mekanik aynı adımda ikinci kez tetiklenmez; artmayan Seq atılır; EnergyGained kaynağı kendine dönmez | Gelen kök listesi önce kuyruğa alınır; belleğe giriş sınırı yok. Yeni sıra verilen sahte aynı hasar gerçek hasardan ayırt edilmez |
| Aktif etki | Tek ortak etki slotu; açıkken veya beklerken başka aktif etki başlamaz; Nitro2.5 sn + ardından4 sn | Gelecekte çoklu aktif etkide takılma sırası öncelik yaratır; bunu gizlice alfabetik sıralamak çözüm değil |
| Skill | Normal ivme12; uçuş yatay60, dikey[-60,84], ileri60; hasar10/hedef/adım; durum süresi en çok3 sn | Tekil tavanlar birleşik fizik sonucunun dengeli olduğunu kanıtlamaz |
| Araç | Pasif güce stok kurulumun1.9 tavanı; nitro×skill ayrıca1.9; skill tutuşu1.3 | Toplam “yalnız1.9 kat güç” iddiası yanlış: iki güç aşaması çarpılabilir |
| Yakınlık | Yarış filtresi, takip hedef başına4 sn kredi; takip dışı .25/sn dolum; NearMiss180 adım ve çarpma sonrası60 adım | Yeni obstacle/target kimliği üretmek veya farklı hedefe geçmek toplam ekonomi açısından ayrıca ölçülmeli |
| Koşu | Yapılmış etkinlik tekrar ödül vermez; sandık incelendiğinde teklif sabitlenir, kabul/ret tek kullanım | Yol görevleri yenilenebilir; olayın başka sıra numarasıyla yeniden sunulması için genel kimlik doğrulaması yok |

Eski düşük seviye yürütücüler geçersiz dt'de süreyi0 kabul edip yine adım/olay işleyebilir; mevcut TS oracle'ları bunu da kapsıyor. Kaynak eşdeğerliğini sessizce bozmak yerine M1 giriş sınırı ayrı seçilir. Normal Runtime zaten fizik sonrası1/60 sn kullanır. M1 tam beceri motorunu güvenli ilan etmez; çapraz-adım türev döngüsü için kök zarfı sonraki kontrollü entegrasyon dilimidir.

## 4. Ödül/nadirlik — bugün ve önerilen sözleşme

Bugün başlangıç/seviye seçimi: uygun pasiflerden tekrarsız3 çekilir; **üçüncü teklif** ayrı türetilmiş RNG ile skill/yükseltme/evrim/eklenti teklifine çevrilir. Başlangıçta31 pasif adayı ve5 skill vardır; çoğu koşuda iki pasif + bir skill teklifi görülür. Skilllerin3 seviye/evrimi, pasiflerin `en` birikimi ve parça `sv` basamağı ayrı kavramlardır.

Sandık havuzu: 3 normal ve3 `nadir=true` eklenti; bölgede2 normal +1 lanetli sandık. `nadir` burada lanetli sandık filtresidir; dört nadirlik kademesi değildir. Teklifler sahiplik ve incelenmiş sandık rezervlerini dışlar; havuz bitince para180/tamir35/enerji60 kaynağına düşer. Lanet ayrı: süre−45, gövde−25 veya paranın yarısı. Atölye5 parça; ilk bölge özel motor-yaris/turbo-buyuk/lastik-yaris yok; sonrasında stokta bu gruptan en çok1. Yenileme40; fiyat basamak40/80/170/380, özel parçada×1.4, tüccar indirimi; tamir3 para/gövde. Boss+200 ve150XP verir; genel yeni skill doğrudan vermez, XP üzerinden seçim açabilir.

**M2 için öneri, uygulanmadı:** `RewardDescriptor` içeriğin kimliği/türü, `rarity`, `level`, `curse/risk`, sayısal `effectDelta`, araçla ilgili önizleme, kaynak/pool ve katalog sürümünü taşımalı. Yaygın=gri, Seyrek=mavi, Nadir=mor, Efsanevi=altın; kırmızı lanet ayrı. Metin+sembol+çerçeve renk dışında da okunur. Level ile rarity bağımsız: yüksek seviye yaygın seçenek durumdaki etkisiyle tercih edilebilir.

Havuzlar `start/level/event/chest/boss/workshop` bazında tanımlanır. Önce mevcut draw sırası/saltları referans alınır; yeni metadata RNG tüketimini değiştirmemeli. Uygunluk filtresi (sahiplik/max/uyumluluk) ile araç faydası skoru ayrı kalmalı. Keşif payını koruyan ağırlıklı seçim adaydır; sayısal ağırlıklar **henüz seçilmedi**. “Hiç önerilmeyen içerik / sürekli aynı kart / tükenmiş havuz / üç dolu skill / curse+rarity” durumları deterministik karşılaştırılmalı. Eski `nadir` kayıtlarını rarity'ye çevirmek açık migration tasarımı gerektirir; eski ödüller kaybolmaz.

## 5. Dar dağılım ölçümü ve ritim

`--mutant-pilot`: **tohum1–128**; gerçek Run API. Başlangıç/ilk bölge stok/üç sandık incelenir. Ayrı rota örneklerinde tüm etkinlikler başarılı kabul edilir ve her seviyede ilk teklif seçilir. Elde edilen ödüller sonraki seçimleri etkiler; bu yüzden sonuç salt risk katsayısının karşılaştırması değildir. **Araç sürülmez, yarış kazanma olasılığı/gerçek edinme dakikası ölçülmez.** Binlerce tohum veya uzun regresyon yok.

| Ölçüm | Kayıt |
|---|---|
| Başlangıç teklifleri | 384:256 pasif +128 skill; 128 tohumun başlangıcı tekrarda aynı |
| Sandık teklifleri | 384: Yedek tüp83, Kızgın egzoz90, Takviye tampon83; Çift ateşleme43, Hasar dönüştürücü43, Turbo kartuşu42 |
| Atölye | 640 stok kartı; ilk bölge yasaklı özel parça yok |
| İlk boss | Çamur20, Drag28, Drift24, Gece31, Toprak25; küçük örneklem, hedef ağırlık olarak kullanılmaz |
| Tüm etkinlikler başarılı, risk0 | Ortalama +940.53 para,632.23XP,3.17 seviye seçimi |
| Aynı politika, risk1 | Ortalama +1901.95 para,1273.52XP,5.16 seviye seçimi |
| Aynı politika, risk2 | Ortalama +3539.48 para,2373.37XP,7.53 seviye seçimi |

Ham frekanslar, gerçek değerler ve kaynak hash'leri: `tests/cikti/mutant-m0-m1-proof.json` (yerel, gitignored). Başlangıç ilk tercihi dahil pasif etkileri, alınan seçimler ve RNG varyasyonu ortalamaya dahildir; bu rakamlar “ortalama oyuncu bölgede bu kadar kazanır” demek değildir.

İlk bölge900 sn, sonraki780 sn; Son Nefes bir kez90 sn. Başarılı etkinliğin Zaman pasifi+20 sn/adet, risk kaybı45/90 sn, Kumarbaz ölümcül kaybı×2; hasar/tamir ekonomi maliyeti ayrıca var. Runtime panel/ayar/duraklatmada fizik ilerlemiyorsa koşu sayacı da ilerlemez. Artan boss tehdidi bugün zamanın bitmesi ve bölge kurulumuyla ifade edilir; zamanla sürekli değişen saldırganlık eğrisi yok.

Bir bölgede8 tek kullanımlık etkinlik,3 sandık ve yenilenebilir atölye/yol görevi var. Normal risk varsayımsal rotada yaklaşık3.17 seviye seçimi + başlangıç1 + sandık3 elde etme fırsatı var; satın alma ve yol görevleri dahil değil. Bu sayı ilk anlamlı kombinasyonun zamanını söylemez. İlk bölgede yol görevi37 para+20 enerji; başlangıç6 sn, sonra8 sn bekleme, görev süresi25 sn; sürüş/başarıya bağlı. Yol görevi çiftliğinin yarış/sandık karşısındaki dakika verimi ölçülmeden değişiklik önerilmez.

| Tempo adayı — uygulanmadı | Karşılaştırılacak metrik / ödünleşim |
|---|---|
| Mevcut900/780, kazanılan ek süreler | Baseline; rota/boş sürüş/ödül süreleri ölçülecek |
| Mevcut süre, daha belirgin tehdit geri bildirimi | Kural değiştirmeden oyuncunun boss'a hazırlığını anlama testi |
| Daha kısa süre + daha sık seçim veya etkinlik ödülü | İçerik yoğunluğu artabilir; başarısız rota ve keşif olanağı simüle edilmeden süre sayısı seçilmez |

İstismar denetimi: aynı etkinlik tamamlamasına ikinci ödül testte reddedildi. Farklı kimlikli benzer kısa etkinliğin veya yenilenen yol görevinin daha verimli olması henüz ölçülmedi. Boss için erken giriş ve daha çok kaynak uğruna bekleme seçenekleri korunur; süre/boss kuralı değişikliği Cem onayı bekler.

## 6. Boss ve laboratuvar

Boss bazında yarış türü, gerçek araç, hava, zayıflık ve taktik fırsatlar [matriste](mutant-2-matris.md). Beş yarış ustalığı korunur. Drift boss'u bugün fiziksel rakip değil puan hedefidir; Drag'ın “son metrede nitro” metni özel AI kodu değildir. Skill zorunluluğu yok; yeni karşılıklar mevcut pilotun niyet/kurulum ve fizik sınırları üzerinde ayrı dilimlerde sınanmalı.

Mevcut test altyapısı: dar `.NET --mutant-*`, TS0.8.18 sabit oracle JSON'ları, `RaceTestDriver`, `TrackReferenceComparison` ve Editor Play kanıtları. Bunlar tek bir kapsamlı denge paneli değildir. Yeni paket/ML-Agents gerekmez.

| İstenen metrik | Kaynak ve tanım | Bugünkü açık |
|---|---|---|
| Tür bazında başarı / boss kazanma | RacePlan.Passed; seed/araç/kurulum/sürüş profili ile kazanılan/denenen | M0 rota sonuçları zorlanmıştır, başarı oranı sayılmaz |
| Süre/hedef/ustalık | RaceSession süre, drift puanı, limit oranı | Kombinasyonlar için toplu koşum yok |
| Enerji dengesi | Telemetry.Gain/Spent, Burned, kapasitede kesilen kazanç | Kaynak bazında zaman serisi, boşa giden üretim metriği eksik |
| Skill kullanım sıklığı | Driver istek/refusal + skill Local süre/bekleme/şarj | Gerçek aktivasyon sayacı ile reddi ayıran ortak çıktı yok |
| Spin/çarpışma | Run spin/carpma; gövde kaybı | Süre/km başına normalize edilmeli |
| Ödül değeri | FinishEvent, ChestOffer/Accept, BuyPart/Repair, seviye seçimi | Tek skor yok; para/XP/etki/risk ayrı raporlanmalı |
| Çeşitlilik / baskın kombinasyon | Kullanılan farklı skill, farklı mekanik kaynağı, içerik kapsaması | Sahip olmayı kullanım sanma; kolay/orta/uzman sürüş profilleriyle karşılaştır |
| Döngü / fizik sınırı | Mekanik Cut, skill kesilen, maksimum ivme/güç/enerji | Çok güçlü sonuç tek başına hata değil; düşük beceriyle her türü domine etme ve kaynak döngüsü aranır |

M4'te önerilen protokol: aynı seed/araç/iz için sabit giriş; üç sürüş profili; önce küçük riskli kombinasyon kümesi; sonra onayla daha büyük örneklem. Kazanma oranı yanında dağılım/örnek sayısı ve başarısız senaryo izini sakla. Gerçek sürüş denemesi yapılmadan “denge sağlandı” deme.

## 7. M1 pilot sözleşmesi ve sınırı

M0 büyük bir motor değişikliği gerektirmiyor. En güvenli ilk dilim, çalışan enerji motorunun önünde **ayrı seçilen sabit-adım ve kök girdi sınırı**: `MutantMechanicPilot`. Catalog'dan gerçek mekanikleri kurar; sonuç hesabı `MutantMechanics.Step` içinde kalır. Yeni skill/denge sayısı/olay kuyruğu yazılmaz. Pilot genel Runtime'a **bağlı değil**; bu karar eski oracle ve oyuncu davranışını korur.

- Tam1/60 sn; sıfır/negatif/NaN/sonsuz veya30Hz toplu adım reddedilir. Çizim30/60/120Hz olabilir; çağıran biriktirici fizik adımlarını üretir.
- Artan güvenli tamsayı sıra; sıralama düzeltilmez. Tek geçersiz olay bütün partiyi durum değişmeden reddeder. Tekrarı bir sonraki adımda yeni ödüle çeviremez.
- `EnergyGained` gibi türev enerji dış kök olarak gönderilemez; iç türevleri mevcut motor üretir. Kök parti en çok64. Sayısal kaynaklar sonlu olmalı.
- İç state dışarı yalnız kopya verilir. Bu bir güvenlik/anti-cheat sınırı değildir: çağıran sahte hasara yeni kimlik verirse pilot gerçek hasar olduğunu ispatlayamaz.
- Üç sınırlı etkileşim (drift/hasar/takip→enerji→nitro), maliyet/süre/bekleme/kapasite, türev yankı sınırı ve kapsanan pasiflerin ters takılma sırası dar testte doğrulanır. Canlı skill motoruna genel sıra bağımsızlığı iddiası yok.

Gerçek Unity Play/görsel kabul bu M1 tesliminde yok: çalışan ekran/Runtime/fizik yolu değişmedi. Core derlenmesi Unity kabulü olarak sunulmaz. Pilotun Runtime'a bağlanması önce gözlemci/olay sırası ve geçersiz girdi davranışını değiştiren ayrı kabul ister.

**Sonraki tek iş:** Claude entegrasyonunda `MutantEnergyController` için kök/ebeveyn/derived olay zarfının tek bir hasar→enerji yoluna taşındığı kontrollü dilim; eski geçerli girdi izleri korunmalı, aynı hasarın yeni sıra ile replay'i ve sonraki adıma taşınan türev test edilmeli. Nadirlik/tempo/boss değişimine bu iş bitmeden geçilmez; bu oturum M0 + ayrı M1 pilotunda durur.
