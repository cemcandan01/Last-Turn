# Unity sürüş çekirdeği — ilk teker/lastik dilimi

- Aktif sahip: Codex; mevcut Unity/.NET bağlamı bu oturumda. Marka bazlı rol ataması yok.
- Dal: `codex/unity-surus-cekirdegi`; taban `cf6aa8ab497114f09104a0306f034cd5698511e5` (`unity/yerel-gelistirme`den).
- TypeScript referansı: 0.8.18 / `df3549e709469f0b519ebfbeaa9f63c1040fee05`.
- İkinci ajan: kullanılmıyor; dar matematik dilimi ve bağımsız çalıştırılan orijinal TS oracle'ı yeterli. Koordinatörün salt okunur yetkileri değiştirilmez; kod bu yetkili oturumda yazılır.
- Durum: ilk dilim tamamlandı ve yerelde doğrulandı; commit/push/merge yok. Kapsam ve toleranslar uygulamadan önce tanımlandı.
- Ajan/model/kullanım: tek Codex yetkili geliştirme oturumu; kesin model kimliği ve kalan abonelik kapasitesi bu oturum metadata'sında doğrulanmadığından bilinmiyor. İkinci ajan, yeni CLI model çağrısı veya ücretli API çağrısı yok.

## Kullanıcının özgün isteği

Last Turn koordinatörünün güvenli analiz denemesi başarılı. Artık ilk Unity geliştirme görevine başlayalım.

**Hedef:** TypeScript 0.8.18 sürüş fiziğini referans alan, test edilebilir ilk C# sürüş çekirdeğini oluşturmak.

Önce mevcut Unity geçiş belgelerini, fizik kodlarını ve 600 adımlık belirlenimcilik testini incele.

Görevin kapsamını küçük, tamamlanabilir bir ilk dilime ayır. Görev sahibini Codex veya Claude olarak sabit hiyerarşiyle değil, mevcut bağlam ve uygunluğa göre belirle. İkinci ajan yalnız bağımsız inceleme/test için gerçekten faydalıysa kullanılsın.

**Kabul kriterleri:**

1. Aynı başlangıç durumu, tohum ve girdilerle C# simülasyonu tekrarlanabilir sonuç üretmeli.
2. Referans TypeScript davranışıyla sayısal karşılaştırma yapılmalı; toleranslar önceden tanımlanmalı.
3. Simülasyon sabit zaman adımıyla çalışmalı; görüntüleme kare hızından bağımsız olmalı.
4. Mevcut Input System ayarları korunmalı.
5. Yeni C# dosyaları gerçek doğrulama kapsamına dahil edilmeli.
6. Unity Editor derleme sonucu ayrıca kontrol edilmeli.

**Güvenlik ve çalışma akışı:**

- Unity geliştirmesi için mevcut branch'ten ayrı görev branch'i kullan.
- Mevcut Input System değişikliklerini kaybetme.
- Salt okunur koordinatörün izinlerini dolanma. Yazma gereken geliştirmeyi yetkili ajan oturumunda yürüt.
- Kısa ilgili testleri çalıştır.
- Uzun regresyon, canlı yayın, force push ve master'a merge yapma.
- İş bitince değişiklikleri, test sonuçlarını, eksikleri ve sonraki adımı raporla.

İlk hedef tam oyunu taşımak değil; güvenilir bir C# sürüş çekirdeği oluşturmak.

## Seçilen tamamlanabilir dilim

Orijinal `tests/birim/fizik.test.ts:313` senaryosu gp3 pistini, araç 0'ı, dünya/çarpışma sorgularını, bütün süspansiyon ve aktarmayı kullanır. Bu tur o tam araç/pist sonucunun C# eşdeğerliği iddia edilmez.

Taşınanlar: `lastik.ts → lastikKuvveti`, `model.ts → tekerCoz` (22 bölme), `rastgele.ts → mulberry32`, 1/60 sn ana adım ve 8 alt adımlı boylamsal teker test düzeneği. Test düzeneği sabit yük altında tek bir eşdeğer teker ve kütleyi sürer; gaz/fren/kayma komutu alır, açısal hız, Fx/Fy, hız, konum ve teker açısını üretir. Süspansiyon, yaw/dördey, motor/vites, dünya/çarpışma, drift ve MUTANT henüz kapsam dışıdır. Bu sınırlı düzenek yeni oyun fiziği/denge modeli olarak bağlanmaz.

Oracle orijinal TS kaynaklarını **sabit SHA'dan** okur; yalnız ilgili fonksiyonların basit tip anotasyonlarını silerek orijinal matematiği Node VM içinde çalıştırır. Teker çözücüsü C#'tan TS'ye yeniden yazılmaz. Kaynak SHA ve dosya özetleri referansa bağlanır. Yeni TS düzenek döngüsü aynı fonksiyonları 8 alt adımda yürütüp referans izi üretir.

600 girişin RNG tüketim sırası mevcut testle aynıdır: `mulberry32(5)`, gaz `r()`, fren `r()<0.2 ? r():0`, kayma kontrolü `r()*2-1`. Başlangıç ve test parametreleri referans dosyasında açıkça bulunur; mevcut oyunun araç veya denge sayıları değiştirilmez.

## Önceden belirlenen kabul sınırları

- Tüm 600 adım boyunca TypeScript–C# mutlak farkı: teker açısal hızı ≤ `1e-7 rad/sn`; Fx/Fy ≤ `1e-4 N`; birleşik kayma ≤ `1e-6`; hız ≤ `1e-6 m/sn`; konum ve teker açısı ≤ `1e-5 m / rad`. Sonradan test geçsin diye genişletilmez.
- Aynı C# başlangıç/tohum/girdiyle iki koşum ve reset sonrası koşum aynı çalışma ortamında bit düzeyinde aynı sonuç verir. Mulberry32 dizisi ve üretilen gaz/fren/kayma girdileri TS ile aynı olur.
- 30/60/120 Hz çizim ve düzensiz kare dizisi 10 saniyede aynı 600 fizik adımını, aynı bit düzeyindeki sonucu verir. Girdi adım indeksinden alınır; çizim hızı RNG tüketimini değiştirmez.
- Normal ileri sürüş, ters yön, sıfır yük/kayma, güçlü frenle kilitlenme ve sonlu değer/yanlış girdi sınırları kapsanır. Hatalı girdi simülasyon durumunu kısmen ilerletmez.
- Core dosyalarının tamamı gerçek .NET derleme glob'una girer; Unity Editor'da da yeni sınıflar yüklenip kaynak özetli ayrı derleme kanıtı üretilir. Editor kanıtı yoksa açık eksik olarak raporlanır.

## Korunacak yerel durum

- Input System `ProjectSettings.asset` SHA256: `932D7CC94918134ABD2A1832474024300E97565B31B3A393F21D0F07CA08A28D`.
- İzlenmeyen `PackageManagerSettings.asset` SHA256: `AC9E80F330154C62CAF293F87DCBCFA5DF8ED2ADEF2E18552B0B34C1EDA7E48C`.
- Önceki koordinatörün gönderilmemiş dosyaları yeni dala korunarak taşındı; bu görevin değişikliği diye sunulmaz. Stash/reset/commit/push/merge yok.

## Kanıt ve sonraki adım

- `node Unity/Validation/validate-project.mjs`: başarılı.
- `node Unity/Validation/export-reference.mjs --check`: sabit SHA'daki orijinal TS matematiğiyle 3 × 600 adım başarılı. Referans kaynak dosyalarının SHA256 değerleri ve test parametreleri `Unity/Validation/Reference/wheel-drive-0.8.18.json` içindedir; platformlar arası matematik farkı için önceden belirlenen toleranslar kullanılır, girdi/kaynak/parametre değişikliği tam eşleşme ister.
- `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release`: başarılı; **1.800 adım × 7 çıktı**, **26.241 doğrulama koşulu**. İleri asfalt, düşük tutuşta ters yön, temassız teker; bit düzeyinde tekrar/reset; her senaryo için 30/60/120 Hz + düzensiz kare zamanları; fren kilidi ve yanlış girdi sınırları. Bu sayı 26.241 ayrı test senaryosu anlamına gelmez. Kısa çalışma çıktısı `tests/cikti/unity-surus/dotnet-validation.txt` (ignore).
- Önceden belirlenen sınırlara karşı ölçülen en büyük mutlak farklar:

| Çıktı | En büyük fark | Kabul sınırı |
| --- | ---: | ---: |
| Açısal hız | `7.105427357601002e-15` | `1e-7 rad/sn` |
| Fx | `4.774847184307873e-12` | `1e-4 N` |
| Fy | `1.8189894035458565e-12` | `1e-4 N` |
| Birleşik kayma | `4.440892098500626e-16` | `1e-6` |
| Hız | `8.881784197001252e-16` | `1e-6 m/sn` |
| Konum / teker açısı | `0 / 0` | `1e-5 m / rad` |

- `.csproj` bütün `Core/**/*.cs` dosyalarını derler. `dotnet msbuild ... -getItem:Compile` kanıtı `tests/cikti/unity-surus/compiled-files.json` içinde: Program + 6 Core dosyası; yeni beş fizik dosyası gerçekten kapsamda.
- **Ayrı Editor kanıtı:** zaten açık Unity 6000.3.9f1 projesinde Assets → Refresh, başarılı gerçek script derlemesi/yenilenmesi ve 600 adımlık kısa tekrar kontrolü. Console 0 uyarı / 0 hata; filtrelenmiş Editor.log'da C# hata/uyarısı yok. `node Unity/Validation/check-editor-proof.mjs` başarılı: 6 güncel Core kaynağı SHA256 ve zaman kontrolü, UTC `2026-10-30T14:46:37.2626641Z`, assembly MVID `c7171381-65ac-485a-81c5-32d05ef50d74`. Kanıt `Unity/Logs/drive-core-compilation.json`, kontrol çıktısı `tests/cikti/unity-surus/editor-validation.txt` (ikisi de ignore). Editor projesi kapatılmadı, sahne/ayar değiştirilmedi. Bu Editor kısa kontrolü TS sayısal karşılaştırmasının, tam EditMode/PlayMode veya cihaz testinin yerine sunulmaz.
- Başarısızlıklar/giderme: sandbox ilk .NET restore denemesinde kullanıcı NuGet.Config okumasını reddetti; normal yetki onayından sonra kısa kontrol başarılı, yeni NuGet paketi eklenmedi. Editor.log salt okuma da onaylı normal erişimle yapıldı. Biçim sonrası eski Editor kanıtı kaynak hash uyuşmazlığıyla doğru biçimde reddedildi; Refresh ve yeni derlemeden sonra tekrar geçti. Toleranslar genişletilmedi, başarısızlıklar gizlenmedi.
- Koruma: iki Input System WIP dosyasının yukarıdaki SHA256 değerleri son kontrolde de aynı. Mevcut koordinatör dosyaları korunuyor; izin politikası genişletilmedi. HEAD hâlâ `cf6aa8a`; dal `codex/unity-surus-cekirdegi`; bütün geliştirme gönderilmemiş yerel değişikliktir.
- CI: yeni Core glob'u ve sabit TS kaynak kontrolü mevcut Unity işine bağlandı; checkout geçmişi sabit SHA için getirir. Push/CI çalıştırılmadı; Editor CI lisans işi hâlâ kapalıdır. Tam regresyon, yayın, IL2CPP/cihaz ve tam gp3 araç testi yapılmadı.
- Son kısa statik kontroller: yeni JS dosyalarında `node --check`, etkilenen JS/JSON/YAML dosyalarında çevrimdışı Prettier ve `git diff --check` başarılı. Referans JSON biçimlendirmesinden sonra da orijinal TS kontrolü geçti.

### Bu görevin dosya sahipliği

- Yeni: Core `TireModel.cs`, `WheelSolver.cs`, `SeededRandom.cs`, `WheelDriveBench.cs`, `FixedStepRunner.cs` ve `.meta` dosyaları; `Editor/DriveCoreCompilationCheck.cs` ve klasör/dosya `.meta` dosyaları; `Validation/export-reference.mjs`, `Reference/wheel-drive-0.8.18.json`, `check-editor-proof.mjs`; bu kart.
- Güncellenen: `Validation/Program.cs`, `.csproj`, `validate-project.mjs`; `.github/workflows/unity-dogrulama.yml`; `docs/UNITY-GECIS.md`, `docs/DEVIR.md`. `RacePhase.cs` için biçimleyicinin kapsam dışı girinti değişikliği geri alındı; diff yok.
- Başlangıçtan gelen AGENTS/CLAUDE/ORTAK-CALISMA/package.json/koordinatör dosyaları ve yerel Input ayarları bu görevin üretimi değildir; aynı worktree'de korunur.

### Sonraki tek geliştirme görevi

Sabit düzlem `DunyaSorgusu` sözleşmesi, saf C# vektör/dördey ve rijit gövde durumuyla **dört teker süspansiyon + gövde kuvvet/tork toplamının küçük düz-zemin senaryosunu** taşı. Mevcut teker/lastik çekirdeğini yeniden yazma. Önce sabit SHA'dan bu yeni senaryonun TS izini ve pozisyon/hız/yönelim toleranslarını ekle; sonra C# sonucunu ölç. Motor/vites, pist çarpışması ve gp3 tam 600 adım eşdeğerliğine bundan sonra geç. Girdi/kamera adaptörünü ve sürülebilir sahneyi doğrulanmış gövdeye bağlamak ayrı görevdir; Input System WIP'si yine korunur.
