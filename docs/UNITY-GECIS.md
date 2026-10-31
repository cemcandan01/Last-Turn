# Unity 6.3 LTS geçişi

Bu depo iki ürünü birlikte taşır:

- Kök `src/`: yayınlanmaya devam eden TypeScript/Vite/Three.js oyunu.
- `Unity/`: Unity 6.3 LTS C# sürümü. İlk aşamada TypeScript oyununun yerine geçmez.

## Değişmez güvenlik sınırları

1. `master` canlı TypeScript sürümüdür. Ajanlar doğrudan bu dala gönderim yapmaz.
2. Özellik PR'ları `gelistirme`yi hedefler. Canlıya geçiş, mevcut regresyon akışı ve Cem'in açık onayıyla yapılır.
3. Aynı Unity sahnesi (`.unity`), prefab veya ScriptableObject aynı anda yalnız bir ajan tarafından değiştirilir.
4. Saf C# çekirdek kodu `Unity/Assets/LastTurn/Scripts/Core/` altında tutulur; Unity/arayüz bağımlılıkları üst katmanlara kalır.
5. TypeScript denge formülleri ve davranışları kaynak referanstır. Taşınan bir kuralın TypeScript testi ya da belgelenmiş ölçümü bağlanmadan davranışı yeniden tasarlamayız.

## Güncel vites kararı — 31 Ekim 2026

TS 0.8.18'de manuel vites yoktu. Genel sürüşe manuel vites eklenmeyecek: asfalt, ralli, drift ve serbest sürüş/test otomatik vites kullanır. Manuel vites yalnız gelecekteki **Drag yarışlarının beceri mekaniğidir**. Drag'ın sonraki tasarımında kalkış RPM kontrolü, patinaj, doğru vites zamanlaması ve gerçek tork eğrisine dayalı performans ele alınacak; ayrı manuel debriyaj tuşu ilk aşamada zorunlu olmayacak. Bu bir tasarım kaydıdır; mevcut zemin görevi Drag geliştirmesi içermez. Geçmiş bölümlerdeki “manuel mod sonraki görev” notları bu kararla sınırlanır.

## Dallar ve çalışma alanları

2026-10-30 yerel düzeni: ana depo `D:/Last Turn/Last-Turn` (`master`), Codex worktree'si `D:/Last Turn/Last-Turn-Codex` (`agents/codex`), Claude worktree'si `D:/Last Turn/Last-Turn-Claude` (`agents/claude`), Unity worktree'si `D:/Last Turn/Last-Turn-Unity` (`unity/yerel-gelistirme`). Bunlar fiziksel çalışma alanlarıdır, kalıcı uzmanlık/üstünlük ataması değildir. Sahip her görevde uzmanlık, bağlam, geçmiş ve bilinen kapasiteyle seçilir. Mevcut worktree'leri yeniden kurma veya kendiliğinden dal değiştirme.

| Eşit yetkili ajan / alan | Mevcut dal | Çalışma alanı | Sorumluluk |
| --- | --- | --- | --- |
| Codex | `agents/codex` | `D:/Last Turn/Last-Turn-Codex` | Görev kartındaki geçici sahiplik |
| Claude Code | `agents/claude` | `D:/Last Turn/Last-Turn-Claude` | Görev kartındaki geçici sahiplik |
| Unity ortak alanı | `unity/yerel-gelistirme` | `D:/Last Turn/Last-Turn-Unity` | Dosya başına tek yazan; iki ajan da devralabilir |

Geçiş temeline bağımlı geliştirme doğru kaynak SHA'yı içerir; bu koşul iki ajan için de aynıdır. Aynı sahne/prefab dosyasını iki ajan eşzamanlı değiştirmez. İlk paralel iş gerekiyorsa bağımsız referans incelemesi veya ayrı dosyalı test/geliştirme seçilir.

## Sabit kaynak ve ilk fizik görevi

- TypeScript 0.8.18: `typescript-baseline-0.8.18` etiketi → `df3549e709469f0b519ebfbeaa9f63c1040fee05`. Mevcut etiketi yeniden oluşturma/taşıma. Uzak dal referansı son fetch kadar günceldir; etiketi ve SHA'yı görev kartına bağla.
- Ek alan talimatları `Unity/AGENTS.md`de, iki eşit ajanın dinamik sahiplik/plan/devir yordamı `docs/ORTAK-CALISMA.md` → “Yerel koordinatör”dedir. Aynı görev kartı kullanılır.
- İlk geliştirme önerisi: saf C# sürüş çekirdeğinin TypeScript karşılaştırmalı ilk dilimi. Kaynak `tests/birim/fizik.test.ts` içindeki 600 adımlık belirlenimcilik senaryosudur. Girdi/durum, tohumlu RNG ve `DunyaSorgusu` sınırı C#'a taşınır; simülasyon 1/60 sn, model 8 alt adımı korur. TS `number` ile C# sayısal hassasiyet farkı ölçülür; diller arası bit eşitliği iddia edilmez.
- Geliştirmeye başlarken tek fizik kartı aç/devral: kaynak SHA/senaryo, korunacak girdi kaydı, pozisyon/hız toleransları, Core ve adaptör sahipliği, kısa .NET/Editor kanıtı yazılır. Kabul: aynı C# girişlerinin tekrarı aynı sonucu verir; 30/60/120 Hz çizim aynı simülasyon sonucuna ulaşır; TS referans farkı karttaki toleransı aşmaz; dış ivme/uçuş yokken temel davranış korunur; yeni Core dosyaları gerçekten doğrulama derlemesine girer.
- Görev sahibi iki ajandan biri olabilir. İkinci ajan gerekiyorsa bağımsız TS senaryosu, farklı dosyadaki C# testi veya risk incelemesi alabilir. Aynı dosyalara paralel yazılmaz; paylaşılmamış değişiklikler görülmüş/denetlenmiş sayılmaz. Revize 3'te resmi CLI abonelik doğrulaması ve ayrı manuel ek-kullanım kontrolü varsa kısa salt okunur CLI analizi açılır; belirsiz kota tek başına engel değildir. Yazma/geliştirme yetkisi bu analiz betiğinden verilmez.

İlk koordinatör denemesinin risk kaydı güncellendi: ilk fizik dilimi `docs/isler/2026-10-30-unity-surus-cekirdegi.md` kartındadır. Core artık lastik kuvveti, örtük teker çözümü, tohumlu RNG ve sabit adımlı boylamsal test düzeneğini içerir; .NET projesi bütün Core C# dosyalarını glob ile gerçekten derler. Tam gp3 araç/pist eşdeğerliği henüz yoktur. Editor CI kapalıdır; yerel Editor kanıtı ayrı kontrol edilir. Unity zaman ayarı yaklaşık 0,02 sn olarak korunur; bu çekirdek kendi 1/60 sn biriktiricisini kullanır ve henüz MonoBehaviour'a bağlanmaz. Test-framework manifest/kilit sürümleri farklıdır. Mevcut Unity CI filtreleri görev dalı `codex/**`yi kapsar; `unity/yerel-gelistirme` ve TS alan testi istisnası bu dilimde değiştirilmez. Kanca/uçuş çıktılarının sonraki fizik adımına uygulanması, nitronun enerji ve skill'lerin bekleme/hak kullanması ile MUTANT kayıtlarının eksik olması taşıma sözleşmesine dahildir.

## Aşamalı teslim planı

| Aşama | Teslim | Başarı ölçütü | PR hedefi |
| --- | --- | --- | --- |
| 0 | TypeScript referans etiketi ve davranış envanteri | Kaynak SHA, test/ölçüm ve taşınacak sözleşme kaydı | `gelistirme` |
| 1 | Unity proje iskeleti + saf yarış durumları | `Unity doğrulama` CI'sı ve yerel .NET çekirdek doğrulaması geçer | `gelistirme` |
| 2 | Tek araç, kamera, giriş ve test pisti | PC'de klavye ile sürülebilir kısa tur; Editor test kanıtı | `gelistirme` |
| 3 | Asfalt/toprak, drift ve telemetri | TypeScript referans senaryolarına bağlı sayısal kabul ölçütleri | `gelistirme` |
| 4 | Kariyer, yükseltme ve roguelite sistemleri | Taşınan her kural için veri eşleme ve regresyon kanıtı | `gelistirme` |
| 5 | Android/iOS hazırlığı | Android cihaz yapısı; iOS için Mac/Cloud Build kanıtı | `gelistirme` |

## Doğrulama

Unity dosyası değiştiğinde önce şunları çalıştır:

```powershell
node Unity/Validation/validate-project.mjs
node Unity/Validation/export-reference.mjs --check
node Unity/Validation/export-vehicle-reference.mjs --check
node Unity/Validation/export-powertrain-reference.mjs --check
node Unity/Validation/export-gt-prototype.mjs --check
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release
```

Bu kontroller Unity Editor derlemesinin yerine geçmez. Unity lisansı GitHub Actions'a tanımlandığında EditMode test işi eklenir. Yerelde Unity 6.3 LTS ile proje açılıp Console hatası kontrol edilir; sahne ve oynanış değişikliğinde ilgili EditMode/PlayMode testi de PR'a yazılır.

İlk sürüş diliminde `Core/TireModel.cs`, `WheelSolver.cs`, `SeededRandom.cs`, `WheelDriveBench.cs` ve `FixedStepRunner.cs` saf matematik sınırıdır. `WheelDriveSettings` değerleri açıkça verilir; referans dosyasındaki tek teker test değerleri oyun dengesi varsayılanı değildir. `FixedStepRunner.Advance(frameDelta, tick => input)` girdiyi fizik adım indeksinden alır; RNG'yi çizim karesinde tüketme. 100 ms üstü kare süresi TS gibi kırpılır; bu durumda gerçek zamanın tamamının simüle edildiği iddia edilmez. Görüntüleme `Previous`, `Current`, `Alpha` ve `InterpolatedPosition` okuyabilir; durum yazamaz. Reset gerektiğinde yeni düzenek/yürütücü oluştur; yalnız düzeneği resetleyip eski biriktiriciyi kullanma.

`export-reference.mjs` sabit SHA'daki orijinal `lastikKuvveti`, `tekerCoz` ve `mulberry32` fonksiyonlarını çalıştırır. Kaynak/parametre/girdiler tam eşleşir, farklı işletim sistemi/Node matematik kitaplığı için çıktılar kartın önceden belirlenen sayısal toleranslarıyla karşılaştırılır. Referansı bilinçsizce yeniden üretip farkları kabul etme. CI sabit SHA için geçmişi getirir; yeni paket gerekmez.

Editor'da proje `Unity/` diziniyle açılıp **Assets → Refresh** yapılır. Başarılı script yenilemesi `Editor/DriveCoreCompilationCheck.cs` üzerinden 600 adımlık kısa tekrar kontrolü ve ignore edilen `Unity/Logs/drive-core-compilation.json` üretir. Sonra `node Unity/Validation/check-editor-proof.mjs` çalıştır: güncel tüm Core kaynaklarının SHA256 değerleri ve zamanları eşleşmelidir. Eksik/eski kanıt başarısızlıktır. Bu kısa kontrol tam EditMode/PlayMode, IL2CPP veya cihaz testi değildir. Editor callback modeli [Unity'nin script yenileme belgesine](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor/callbacks/didreloadscripts) ve [delayCall sözleşmesine](https://docs.unity.com/en-us/engine/6000.3/script-reference/unityeditor/editorapplication/delaycall) uygundur.

## Dört tekerli düz-zemin çekirdeği (2026-10-30)

Güncel kart `docs/isler/2026-10-30-unity-dort-teker.md`; dal `codex/unity-dort-teker`. Önceki tek teker testleri korunur; `BodyMath`, `VehicleParameters`, `VehicleState`, `FourWheelVehicle` ve `VehicleFixedStepRunner` eklenmiştir. Orijinal TypeScript eksenleri ve 24 m/sn² yerçekimi korunur; Unity Rigidbody/float veya ek analitik yük transferi kullanılmaz. Dört köşenin kuvvetleri temas noktalarından `r×F` torkuna, yerel atalet üzerinden gövde dönüşüne ve sonraki süspansiyon yüküne gider. `FrontLoad/RearLoad/LeftLoad/RightLoad` son alt adımın dikey yükleridir; hesaplanmış yeni bir statik denge formülü değildir.

`VehicleParameters`, sabit TS `aracFizigi` çıktısındaki geometri/yay/atalet/fren/aero değerleri ile dört lastik parametresini alır; garaj verisinden C# türetme henüz taşınmamıştır. Komut sözleşmesi `VehicleCommand(steeringAngle, driveTorque, brake, handbrake, absStrength, slipLimit)`dir: direksiyon radyan, driveTorque toplam teker tarafı Nm, fren 0–1, ABS 0–1, slipLimit tepe kayma oranının katıdır. Ön/arka tork ve fren payları, el freni ve kavramalar kaynak sırayla uygulanır. Motor/devir/vites/turbo ve otomatik duruş freni bu sınırın dışındadır. Kendi kendine sürülen yeni bir oyun sürüş modeli/önayar eklenmez.

```csharp
var simulation = new FourWheelVehicle(parameters, initialSpeed: 12);
var runner = new VehicleFixedStepRunner(simulation);
runner.Advance(renderFrameDelta, tick => recordedCommands[tick]);
// Previous, Current ve Alpha görüntüleme içindir; RNG/girdi çizim karesinde tüketilmez.
```

Reset gerektiğinde simülasyonla birlikte yeni yürütücü kur; eski biriktirici/Previous görüntüsünü yeniden kullanma. Çekirdekte MonoBehaviour/Input System adaptörü yoktur; ProjectSettings zaman ve Input System ayarları korunur. Düz zemin H=0 ve normal=(0,1,0) bu dilimin açık sınırıdır; eğim, farklı zemin, çevre çarpışması, yardımlar ve MUTANT henüz desteklenmiş sayılmaz.

Yeni oracle sabit SHA'daki orijinal TS alt adım bloğunu ve geometri/lastik/direksiyon/fren hazırlığını çalıştırır. İki gerçek araç, beş 600-adımlık düz-zemin senaryosu, her adımda 45 durum değeri ve önceden belirlenmiş toleranslar karta/ref dosyasına bağlanır. .NET tüm 11 Core dosyasını derler; eski testler ve yeni tekrar/reset/4 kare takvimi/yük transferi testleri birlikte çalışır. Yerel Editor kanıtı eski teker ile yeni dört teker için 600'er kısa adım ister; `node Unity/Validation/check-editor-proof.mjs` hem Core hash'lerini hem Editor kaynakları/referans verisinin zamanını kontrol eder. Editor, Sources/Reference değiştiğinde yeniden Refresh edilmelidir. Bu kanıt CI Editor, IL2CPP veya cihaz doğrulaması değildir.

Claude'un gerçek bağımsız incelemesi ve sınırlaması karttadır; kaynak matematiğini değiştirecek yorumlar otomatik uygulanmaz. Özellikle Unity eksen eşlemesi yalnız gelecek gösterim adaptöründe test edilmelidir; Core'un TypeScript eksenini şimdi çevirmek sayısal sözleşmeyi bozar. Sonraki dilim orijinal motor/vites/aktarma komut üretimidir.

## Motor ve aktarma dilimi (2026-10-30)

Güncel kart `docs/isler/2026-10-30-unity-motor-aktarma.md`, dal `codex/unity-motor-aktarma`, güvence/taban commit'i `5aa1b55`. Kabul edilmiş önceki iki fizik dilimi ve Input System ayarları bu yerel commit'te korunur. `PowertrainParameters` özgün araç/motor/önayar değerlerini alır; `PowertrainVehicle` ham `DrivingInput` girdilerini özgün gaz/direksiyon ve motor hesabından geçirip dört teker çekirdeğine bağlar. Diferansiyeller mevcut gövde alt adımında kalır. Motor/gaz/direksiyon yalnız 1/60 sn ana adımda bir kez, gövde 8 alt adımda ilerler.

```csharp
var car = new PowertrainVehicle(powertrainParameters);
var runner = new PowertrainFixedStepRunner(car);
runner.Advance(renderFrameDelta, tick => recordedInputs[tick]);
// runner.PreviousBody / CurrentBody / Alpha: görüntüleme; runner.Engine: RPM/vites/turbo göstergeleri.
```

Girdi alanları gaz/fren 0–1, direksiyon −1…1, analog gaz/direksiyon bayrakları ve el frenidir. ss/sm seçenekleri PowertrainParameters'dadır; drift/ESC/viraj yardım torkları henüz kapsam dışıdır. Orijinal otomatik şanzıman ve otomatik geri/ileri seçimi korunur. Kaynakta manuel vites veya debriyaj pedalı yoktur; Cem'in açık yanıtıyla manuel mod sonraki ayrı göreve bırakıldı. Kaynak kalkış debriyajı bağlı motor devrine uygulanan tabandır; ek motor ataleti/manuel kavrama modeli eklenmez. Süzülen RPM göstergesi tork hesabındaki motor devrinden ayrıdır.

Yeni TS oracle, sabit kaynaktaki motor ve gaz/direksiyon bloklarını önceki gövde oracle'ıyla birleştirir; rölanti, gaz kesme, büyütme/küçültme, geri/ileri ve gerçek turbo T16 dahil 5×600 adımda 58 değeri karşılaştırır. Eski izler değişmez. .NET 15 Core dosyasını gerçekten derler; Editor kontrolü GT/T16 motor için ayrıca 2×600 kısa adım ister. Editor kanıtı `.NET` sayısal iz testinin veya cihaz/IL2CPP doğrulamasının yerine geçmez.

Sonraki sürülebilir prototip: kaynak gt parametrelerini veri olarak sahneye koy; Input System adaptörünü bu yürütücüye bağla, TS eksenlerini yalnız görüntüleme sınırında dönüştür, Previous/Current/Alpha ile görsel gövde/dört teker/kamera göster. Düz zemin, takip kamerası, hız/RPM/vites/turbo ve kısa PlayMode sürüşü yeterli ilk kapsamdır. Unity Rigidbody/WheelCollider ile ikinci simülasyon ekleme. Ayarlar korunur; manuel mod, engebeli dünya/gp3, MUTANT ve cihaz testleri ayrı görevlerdir.

## İlk sürülebilir GT prototipi (2026-10-31)

`Unity/Assets/LastTurn/Scenes/GTTest.unity` sahnesi Unity 6000.3.9f1'de Play ile sürülür. Yerel primitive materyaller dışında asset yoktur. Açılış/tuşlar ve manuel liste `Unity/GT-PROTOTIP.md`, kapsam/gerçek test kanıtı `docs/isler/2026-10-30-unity-surulebilir-gt.md` içindedir. Bu tanı prototipinde kullanıcı isteğiyle hız/RPM aynı kenar HUD'ında gösterilir; yayınlanan TS HUD düzeni değiştirilmez.

Girdiler InputActionMap üzerinden `PowertrainFixedStepRunner`a gider. Görsel kök, tekerler ve kamera önceki/şimdiki fizik durumlarını okuyup interpolasyon yapar; Core'a transform yazılmaz. TS x-sol gösterimde Unity x-sağa yansıtılır: vektör (-x,y,z), dördey (qx,-qy,-qz,qw). Ön teker Ackermann açısı, süspansiyon ve sürekli dönüş açısı çizilir; kamera yakın profil ölçülerini kullanır, rastgele shake ve gövde roll'u yoktur. Reset araç/kamera/biriktiriciyi birlikte sıfırlar. Runtime C# `Scripts/Prototype/`, GT fabrika verisi `Core/GtPrototypeParameters.cs` içindedir; veri üretim `--check` ile kaynak izine sabitlenir.

Menü `Last Turn → GT Kısa Play Doğrulaması` (Ctrl+F8), gerçek Play ve Input System üzerinden 18 kontrol yapar, girdi kaydını 30/60/120 FPS'de bit düzeyinde tekrarlar, sonra Play'i kapatır. `node Unity/Validation/check-prototype-proof.mjs` son başarılı sahne/CS/material/meta hash kanıtını doğrular; kaynak değişince kontrol yeniden çalıştırılmalıdır. `check-editor-proof.mjs` ayrıca Core ve Runtime adaptör derlemesi/gösterim testini doğrular. Kısa menü kontrolü tam Unity Test Framework paketi/CI Editor/cihaz testi değildir. Adsız Editor sahnesi varsa kurucu veri silmeden ignore edilen `Assets/LocalRecovery/BeforeGT*.unity` dosyasına korur; mevcut sahne dosyasını ezmez.

Test alanı sonsuz düz/asfalt fizik düzleminin gösterimidir; dekorun collider'ları kapalıdır, Rigidbody/WheelCollider yoktur. Engebeli sorgu/engel çarpışması, manuel vites, ses, mobil ve IL2CPP henüz kapsam dışı. Sonraki aşama önce Cem'in klavye/kamera hissi onayı, sonra TS dünya sorgusu/pist fiziği dilimidir.

## Engebeli zemin ve yüzey dilimi — 31 Ekim 2026

Kart `docs/isler/2026-10-31-unity-zemin-yuzey.md`, taban `201d7b3`; kabul edilen geri 3000 RPM / teker bazlı TCS korunur. `IVehicleWorld` saf H/yüzey/hava tutuşu sınırıdır. Varsayılan `FlatAsphaltWorld` eski düz GT izlerini korur. Dört tekerin yüzeyi ve .5 m merkezi-fark normali ana adımda; temas yüksekliği sekiz alt adımda yeniden sorgulanır. Temas ışını, zemin düzlemine lastik izdüşümü, gövde-up yay kuvveti ve gövde-zemin teması özgün TS sırasındadır. Reset dört teker altındaki zeminin pitch/roll ve ortalama yüksekliğini kullanır.

GT fabrika verisi, sabit TS oracle'ından üretilen altı yüzey × dört lastik tablosunu içerir; asfalt lastiğini tek tutuş çarpanıyla toprağa çevirmeyiz. `VehicleParameters` özel araç verisinde `surfaceTires` verilmezse eski açık lastik parametrelerini kullanır; yeni çok-yüzeyli araç kurulumunda gerçek yüzey tabloları verilmelidir. Islaklık/çamur izi, yüzeye bağlı yuvarlanma ve temaslı gövde direnci de taşındı. Otomatik vites, motor ve önceki GT düzeltmeleri dünya sorgusundan bağımsız kalır.

Yeni sahne `Unity/Assets/LastTurn/Scenes/TerrainTest.unity`; `Last Turn → Arazi Test Sahnesini Aç` / `Arazi Kısa Play Doğrulaması` menüleri. Rehber `Unity/ARAZI-PROTOTIP.md`. Kamera/görsel teker/klavye aynı adaptörü kullanır; yalnız bu sahnenin arazi bayrağı açıktır. GTTest sahne dosyası korunur. `export-terrain-reference.mjs --check` özgün TS reset/zemin/lastik/alt-adımlarını yedi 600-adımlık senaryoda sınar. `.NET` koşucusu 51 alanı ve 30/60/120 FPS/reset davranışını karşılaştırır. `check-terrain-proof.mjs` gerçek Play kaynak hash'lerini doğrular. Tam dünya/gp3, bariyer/nesne çarpışması, cihaz/IL2CPP ve Drag bu dilimde yoktur.

## TerrainTest toprak kurulum düzeltmesi — 31 Ekim 2026

`docs/isler/2026-10-31-unity-toprak-kararlilik.md`: ham modelin toprak dengesi ile TS MUTANT'ın gerçek araç kurulum profili ayrı katmanlardır. Önceki TerrainTest, MUTANT `toprakDengesi` uygulanmadan ham GT/ar/yarış lastiği kullanıyordu. Artık `GtPrototypeParameters.CreateTerrain()` sabit TS kuralıyla üretilen yüzey tablosunu kullanır; `Create()` ve GTTest ham/asfalt kabulünü korur. Seçili lastik × araç birleşik toprak değeri 1 altındaysa açığın .55'i kalır; asfalt ve uygun kombinasyonlar değişmez. Bu yeni genel fizik bonusu veya bütün modlara yayılan MUTANT kuralı değildir. Lastik kuvveti, kayma paydaları, direksiyon, diferansiyel ve sürtünme modeli değiştirilmedi. Ham oracle'lar korunur; yeni `export-dirt-balance-reference.mjs --check` üst kurulum zincirinin ayrı karşılaştırmasıdır.

**Cem'in sonraki aşama kararı:** Bu düzeltmenin ardından fizik üzerinde yeni özellik geliştirmeye ara verilir; mevcut TypeScript oyun sistemlerinin Unity'ye taşınması planlanır. Yeni Drag, fizik yardımı veya pist özelliği bu görevden kendiliğinden başlatılmaz.

## GitHub koruma ayarı

Bu bağlı GitHub entegrasyonunun yönetici izni koruma kuralını değiştirmeye yetmiyor. Depo sahibi GitHub'da `Settings → Rules → Rulesets` altında `master` için şu kuralları eklemeli:

- Pull request gerekli; doğrudan gönderim engelli.
- En az bir onay gerekli (tek geliştirici için kendi onayı zorunlu kılınmayabilir).
- `Denetim / denetim` ve Unity içeren PR'larda `Unity doğrulama / Unity C# çekirdek` başarılı olmalı.
- Force-push ve dal silme engelli.

`gelistirme` için en az `Denetim / denetim` kontrolünü gerekli tut; `master`a yalnız regresyon PR'ı aç.

## Araç kataloğu ve modifiye veri katmanı — 31 Ekim 2026

Kart `docs/isler/2026-10-31-unity-arac-katalogu.md`, rehber `Unity/ARAC-KATALOGU.md`. Sabit TS 0.8.18 kaynaklarından otomatik JSON + SHA256 manifesti; 15 araç/42 parça/5 paket/28 lastik. Saf C# kurulum, sınıf/performans, fizik parametreleri ve fiyat/erişim kuralları vardır. `export-catalog.mjs --check` ve `.NET --catalog` üretim/eşdeğerlik sınırıdır. Editor menüsü **Last Turn → Araç ve Modifiye Kataloğu**, ayrı kısa veri kontrolü ve `check-catalog-proof.mjs` güncel derleme/hash kanıtını denetler. Sürüş sahneleri mevcut fabrikalarını korur; ham katalog MUTANT dengesini veya GT geri manevra düzeltmesini genellemez. Kalıcı kayıt/garaj satın alma akışı sonraki iştir; fizik mekaniklerine ara sürer.
