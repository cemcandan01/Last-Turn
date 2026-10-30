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

## GitHub koruma ayarı

Bu bağlı GitHub entegrasyonunun yönetici izni koruma kuralını değiştirmeye yetmiyor. Depo sahibi GitHub'da `Settings → Rules → Rulesets` altında `master` için şu kuralları eklemeli:

- Pull request gerekli; doğrudan gönderim engelli.
- En az bir onay gerekli (tek geliştirici için kendi onayı zorunlu kılınmayabilir).
- `Denetim / denetim` ve Unity içeren PR'larda `Unity doğrulama / Unity C# çekirdek` başarılı olmalı.
- Force-push ve dal silme engelli.

`gelistirme` için en az `Denetim / denetim` kontrolünü gerekli tut; `master`a yalnız regresyon PR'ı aç.
