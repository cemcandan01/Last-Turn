# Dört tekerli rijit gövde — düz zemin

- Sahip: Codex; önceki C# ve doğrulama bağlamı burada. Claude eşit yetkili ajan olarak bağımsız salt okunur kaynak/risk incelemesi yapacak; bu tur dosya yazmayacak.
- Dal: `codex/unity-dort-teker`; önceki görev dalından, HEAD `cf6aa8ab497114f09104a0306f034cd5698511e5`. Önceki kabul edilen gönderilmemiş çekirdek ve koordinatör WIP korunur. Commit/push/merge yok.
- Sabit TypeScript 0.8.18: `df3549e709469f0b519ebfbeaa9f63c1040fee05`.
- Kullanıcı isteği: dört tekerin süspansiyon, lastik, fren ve çekişini rijit gövdeye bağla; konum/dördey/doğrusal ve açısal hız/ağırlık transferini koru; 1/60 sn + 8 alt adım; düz zemin TS karşılaştırması; eski testler ve Editor derlemesi; güvenli koordinatörle gerçek Claude incelemesi; kısa testler, ayrı dal/kart; mevcut değişiklikleri koru; push/merge/uzun regresyon/yayın yok.
- Durum: tamamlandı, yerelde doğrulandı; gönderilmedi. Codex kesin model kimliği bu oturum metadata'sında bilinmiyor. Claude modeli gerçek CLI sonucuyla doğrulandı; kapasite pencereleri bilinmiyor.

## Kullanıcının özgün isteği

Last Turn Unity sürüş çekirdeğinin ilk dilimini kabul ediyorum. Şimdi dört tekerli rijit gövde fiziğine geçelim.

**Öncelik:** TypeScript 0.8.18'in araç fizik modelini davranış olarak korumak; sıfırdan farklı bir sürüş sistemi tasarlamamak.

1. Dört tekerin süspansiyon, lastik, fren ve çekiş kuvvetlerini tek bir rijit gövde durumuna bağla.
2. Gövdenin konumunu, yönelimini, doğrusal/açısal hızlarını ve ağırlık transferini hesapla.
3. Mevcut 1/60 sn ve 8 alt adımlı simülasyonu koru.
4. Düz zemin için C# ve TypeScript karşılaştırma senaryoları oluştur.
5. Önceki sürüş çekirdeği testlerini ve Unity Editor derleme kontrolünü koru.

**İki ajanlı çalışma:**

Claude Code'u mevcut güvenli koordinatör üzerinden bağımsız, salt okunur fizik analizi için çağır. Claude özellikle TypeScript'teki dört teker, süspansiyon, gövde torku ve ağırlık transferi kurallarını inceleyip olası taşıma hatalarını raporlasın.

Codex veya Claude'dan hangisinin sonraki geliştirmeyi üstleneceği kalıcı hiyerarşiye göre değil, görev bağlamına göre belirlensin. Bu turda bağımsız Claude incelemesi gerçekten çalıştırılsın; başarısız olursa açıkça raporlansın.

**Güvenlik:**

Mevcut değişiklikleri kaybetme. Her görevin ayrı branch'ini ve görev kartını koru. Kısa ilgili testleri çalıştır. Push, merge, uzun regresyon veya canlı yayın yapma.

**Teslim:** Dört tekerli fizik çekirdeği, karşılaştırma sonuçları, Claude incelemesi, Unity derleme kanıtı ve sonraki geliştirme adımı.

## Uygulamadan önce kabul sözleşmesi

- Kaynak `model.ts` alt adım sırası ve `arac-fizigi.ts` geometrisi esas: gövde yerel eksenleri x sol, y yukarı, z ileri; 0/1 ön sol/sağ, 2/3 arka sol/sağ. Yerçekimi 24. Teker çözücüsü yeniden yazılmaz.
- Düz zemin H=0, normal=(0,1,0). Süspansiyon basma/açılma sönümü, tampon, denge çubuğu; temas noktası hızı; lastik/fren/çekiş; diferansiyel, aero, gövde zemin teması; yarı örtük Euler ve dünya açısal hızıyla dördey güncellemesi taşınır. Yük transferine ikinci bir analitik yük eklenmez.
- Sınır: fizik çekirdeğine direksiyon açısı, toplam aktarma çıkış torku, ayak/el freni, ABS ve çekiş sınırı verilir. Motor/devir/vites/turbo, kullanıcı girdisi yumuşatma, drift/ESC/viraj yardımları, MUTANT, engebeli pist ve çevre çarpışmaları sonraki dilimlerdir. Bunların var olduğu iddia edilmez; yardımsız düz-zemin kaynak alt modeli karşılaştırılır.
- Önceden belirlenen mutlak TS–C# toleransları, her iz adımında: konum/hız/açısal hız `1e-5`, dördey bileşenleri `1e-6`, teker açısal hızı/açısı `1e-4`, sıkışma/kayma `1e-5`, dikey yük `0.05 N`; temas bool'u tam aynı. Test geçsin diye genişletilmez.
- Aynı başlangıç/tohum/girdi C# tekrar/reset sonucu bit düzeyinde aynı; 30/60/120 Hz ve düzensiz kare takvimi eşdeğer. Durağan denge, gaz/frenle boylamsal transfer, virajda yanal transfer, ters hız ve havadan temas kapsanır.
- Mevcut üç 600-adımlık teker izi ve kısa testler korunur. Tüm Core dosyaları .NET glob'unda, Editor ayrı gerçek derleme/kısa kontrol ve kaynak hash kanıtı üretir.

## Koruma ve başlangıç

- ProjectSettings.asset SHA256 `932D7CC94918134ABD2A1832474024300E97565B31B3A393F21D0F07CA08A28D`.
- PackageManagerSettings.asset SHA256 `AC9E80F330154C62CAF293F87DCBCFA5DF8ED2ADEF2E18552B0B34C1EDA7E48C`.
- Koordinatör izinleri genişletilmez; Claude çağrısında depo dosyaları dondurulur, C# geliştirme bu yetkili oturumda yapılır.

## Claude kanıtı / sonuçlar

- **Gerçek bağımsız çağrı başarılı:** `node scripts/koordinator.mjs --kart docs/isler/2026-10-30-unity-dort-teker.md --gorev <kayıtlı-sınırlı-görev> --dosya src/fizik/yeni/arac-fizigi.ts --dosya src/fizik/yeni/lastik.ts --mevcut codex --ajan claude --sure 180 --calistir`.
- Model `claude-opus-5-5`; oturum/kanıt `80191c40-7ab4-4707-bfd9-da6571474346`; sonuç kodu 0, tamamlandı, yaklaşık 32,5 sn model çalışması. Ayrı `D:/Last Turn/Last-Turn-Claude`, temiz `agents/claude`, HEAD sabit TS SHA. `tools=[Glob,Grep,Read]`, `dontAsk`, MCP yok, araç çağrısı yok; kaynak/hedef dosya veya ref farkı yok. Rapor `tests/cikti/koordinator/80191c40-7ab4-4707-bfd9-da6571474346.json` (ignore). Kaydedilmiş istek `tests/cikti/unity-dort-teker/claude-gorev.txt` (ignore).
- Gerçek `claude.ai`/Pro aboneliği yeniden doğrulandı; geçerli manuel ek kullanım kapalı teyidi kullanıldı. 5 saatlik/haftalık kapasite bilinmiyor; API/ek krediye geçiş yok. CLI `costBasis:list` telemetrisi gerçek fatura veya kalan kota diye sunulmaz. Koordinatörün kodu, 32.000 karakter sınırı ve izin politikası değiştirilmedi.
- **İnceleme sınırı:** 34.308 karakterlik model.ts bütünü görüntü sınırını aştığı için `arac-fizigi.ts` ve `lastik.ts` tam görüntüsü + görevde sabit model.ts'ten seçili süspansiyon/kuvvet/tork/tümleştirme alıntıları verildi. Claude bunu açıkça belirtti; tam model veya yeni C# kodunu denetlediği iddia edilmez. Görevde satır aralıkları yaklaşık etiketlendi; gerçek kaynak bölüm başlangıçları `model.ts:510` kuvvet, `:521` süspansiyon, `:556` denge çubuğu, `:607` temas hızı, `:649` diferansiyel, `:671` aero, `:769` tümleştirme, `:785` dördeydir.

### Claude bulgularının uygulamadaki karşılığı

1. **Ek analitik transfer yok:** `r×F` gövdeyi döndürür, süspansiyon yükleri değişir; ayrıca `m*a*h/aks` eklenirse iki kez sayılır. C# yalnız orijinal kuvvet/tork zincirini kullanır. Gaz ön yükü azaltmalı, fren artırmalı ve viraj sağ/sol yükünü ayırmalı kontrolleri geçti.
2. **Atalet ve eksenler:** TS'nin yerel [yunuslama, yalpa, yatış] ataleti ve dünya açısal hızı korunur; gövdeye dönüştür, bileşenleri atalete böl, dünyaya dönüştür. TS'de olmayan jiroskopik terim/Unity Rigidbody eklenmedi. Claude'un Unity eksen dönüşümü uyarısı gösterim adaptörü için saklandı; **Core'da x işareti çevrilmedi**, aksi TS karşılaştırmasını bozar. Gerçek gösterim eşlemesi henüz yapılmadı.
3. **Temas/sönüm:** temas kesilince sıkışma 0; yeniden temasta basma/açılma sönümü, tampon ve ilk `12*Fz0` sınırı aynı sırada. Havadan temas senaryosu geçti.
4. **Denge çubuğu:** iki teker temastaysa ilk yay sınırından sonra, lastik yükünden önce; iki taraf ayrı `max(0)` alır. Sonradan ikinci bir 12× sınırı eklenmedi.
5. **Lastik/fren:** eski örtük çözücü kullanıldı; yanal kuvvet işareti, hız paydaları 3/2, ABS çarpanı, ön/arka fren payı, el freni arka tork kesmesi ve AWD merkez kavrama açılması orijinal kurallarla izlerde karşılaştırıldı.

## Uygulama ve gerçek kısa doğrulama

- Yeni Core: `BodyMath.cs` (double vektör/dördey), `VehicleParameters.cs` (açık TS parametre/komut sözleşmesi), `VehicleState.cs` (gövde/teker görüntüsü ve aks yükleri), `FourWheelVehicle.cs`, `VehicleFixedStepRunner.cs`. Eski teker/lastik çekirdeği yeniden yazılmadı. Yayımlanan önceki durum görüntüleri ilerletilmez; hatalı komut ve sayısal taşmalı reset kısmi durum yayımlamaz.
- Oracle `Unity/Validation/export-vehicle-reference.mjs`: sabit SHA'daki **orijinal 8 alt adım bloğunu**, geometri türetme fonksiyonunu, lastik hazırlığını, direksiyon/fren hazırlığını ve yardımcılarını çalıştırır; C#'tan TS model yeniden yazılmaz. Yalnız sabit imzaların türleri silinir, genel TS derleyicisi değildir. Test bağlamı düz asfalt/yardımlar kapalıdır; özgün gövde-zemin temas noktaları, aero ve diferansiyeller dahildir. Kaynak dosya hash'leri ve girdiler referansa bağlanır.
- Gerçek araç 0 (gt, RWD) ve 1 (rx, AWD) verileri kullanılır; kontrollü karşılaştırma için **ikisinde de ar önayar değerleri ve yarış lastiği** kullanılır. Bu, RX'in varsayılan toprak önayarı veya yeni oyun dengesi diye sunulmaz; oyun/garaj verileri değişmez. Motor/devir/vitesin üreteceği toplam teker torku bu tur açık komut olarak sağlanır.
- `node Unity/Validation/export-reference.mjs --check`: eski 3 × 600 iz başarılı.
- `node Unity/Validation/export-vehicle-reference.mjs --check`: durağan RWD, gaz–fren RWD, direksiyon + el frenli AWD, geri giden AWD, havadan inen RWD; **5 × 600 = 3.000 adım**, her adımda **45 durum değeri** karşılaştırması başarılı. Metadata/parametre/girdiler tam, sayılar önceden belirlenen toleranslarla kontrol edilir.
- `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release`: eski **26.241** ve yeni **150.073 doğrulama koşulu** başarılı. Bunlar ayrı test senaryosu sayısı değildir. Aynı başlangıç/girdiyle bit düzeyinde tekrar ve gerçekten ilerlemiş simülasyonu resetleme, her yeni senaryoda 30/60/120 Hz + düzensiz kare takvimi, dördey normu ve yük/temas kontrolleri geçti. Kare süresi >100 ms TS gibi kırpılır; bu durumda tüm gerçek zamanın simüle edildiği iddia edilmez.
- Kanıtlar: `tests/cikti/unity-dort-teker/dotnet-validation.txt`, `numerical-summary.json`, `compiled-files.json` (ignore). Gerçek .NET Compile listesi **11 Core dosyası + Program + VehicleValidation**; yeni beş dosya gerçekten derlenir. .NET Core projesi UnityEngine başvurusu almaz.

| Ölçüm (3.000 adımın tamamı) | En büyük mutlak TS–C# farkı | Önceden tanımlı sınır |
| --- | ---: | ---: |
| Konum bileşeni | `1.36779476633819e-13 m` | `1e-5 m` |
| Dördey bileşeni | `5.21804821573824e-15` | `1e-6` |
| Doğrusal hız bileşeni | `4.15223411209809e-14 m/sn` | `1e-5 m/sn` |
| Açısal hız bileşeni | `9.17126617705488e-15 rad/sn` | `1e-5 rad/sn` |
| Teker hızı / açısı | `4.9737991503207e-14 / 5.6843418860808e-14` | `1e-4 rad/sn / rad` |
| Süspansiyon sıkışması | `3.88578058618805e-16 m` | `1e-5 m` |
| Teker dikey yükü | `3.6015990190208e-10 N` | `0.05 N` |
| Temas bool'u | tam aynı | tam aynı |

### Ayrı Unity Editor kanıtı

- Açık **Unity 6000.3.9f1** projesinde Assets → Refresh ile son kaynaklar derlendi. Console 0 hata / 0 uyarı; filtrelenmiş Editor.log'da C# hata/uyarı satırı yok. Sahne/ayar değiştirilmedi; ikinci Editor projenin kilidine karşı açılmadı.
- Önceki 600 adımlık teker kısa kontrolü korunur. Yeni `Editor/VehicleCoreSmokeCheck.cs`, TS'den türetilmiş gerçek gt parametreleriyle 600 adımlık gaz/fren/direksiyon koşumunu iki kez çalıştırır; tüm 45 durum değeri bit düzeyinde eşit ve sonlu, sabit adım yürütücüsü de sınanır. Bu Editor kısa kontrolü .NET'teki TS sayısal iz karşılaştırmasının veya tam EditMode/PlayMode/IL2CPP/cihaz testinin yerine sunulmaz.
- `node Unity/Validation/check-editor-proof.mjs`: başarılı; tüm **11 güncel Core** kaynağının SHA256 değerleri eşleşir, Editor kaynakları ve kullanılan yeni referans verisi kanıttan eski olmalıdır. UTC **2026-10-30T15:12:34.5407576Z**, assembly MVID **645d5044-f996-48bf-b07c-46e63720cd74**. Kanıt `Unity/Logs/drive-core-compilation.json`; çıktı `tests/cikti/unity-dort-teker/editor-validation.txt` (ignore).
- Özgün iki Input System dosyasının yukarıdaki hash değerleri son kontrolde de aynı. HEAD değişmedi; önceki kabul edilen tüm yerel değişiklikler yerinde.

### Hatalar, sınırlamalar ve dosyalar

- Claude çağrısı başarılı; kota/izin/zaman aşımı yok. İlk oracle tip silme denemesi dizi `[]` işaretini bıraktığı için sözdizimi hatası verdi; sabit imza kuralı düzeltildi ve orijinal blok çalıştırılarak referans üretildi. C# sayısal karşılaştırması ilk koşumda geçti; toleranslar değiştirilmedi. Son reset sınır koruması sonrası kısa testler tekrar geçti. Kaynak değişince eski Editor kanıtı doğru şekilde reddedildi; Refresh sonrası yeni derleme kanıtı doğrulandı.
- Yeni: yukarıdaki beş Core + `.meta`, `Editor/VehicleCoreSmokeCheck.cs` + `.meta`, `Validation/VehicleValidation.cs`, `export-vehicle-reference.mjs`, `Reference/four-wheel-0.8.18.json`, bu kart. Güncellenen: `Validation/Program.cs`, `validate-project.mjs`, `check-editor-proof.mjs`, `Editor/DriveCoreCompilationCheck.cs`, mevcut Unity workflow, `docs/UNITY-GECIS.md`, `docs/DEVIR.md`. İlk kart ve önceki koordinatör dosyaları yeniden oluşturulmadı/değiştirilmedi.
- CI'ya yeni TS kontrolü bağlandı; push/CI çalıştırılmadı. Editor CI lisans işi kapalı. Commit/push/merge, uzun regresyon ve yayın yok. Cihaz/IL2CPP performansı, GC/ayırma maliyeti, görsel sürüş hissi ölçülmedi. Tam gp3/pist, motor/vites/turbo, input/kamera adaptörü, sürüş yardımları ve MUTANT henüz kapsam dışı.

## Sonraki tek geliştirme görevi

TypeScript'in **motor/devir/vites/turbo + aktarma çıkış torku üretimini** bu doğrulanmış dört teker çekirdeğinin `VehicleCommand.DriveTorque` sınırına bağla; önce orijinal gaz/fren/giriş dizileriyle yeni TS izini ve toleransları kaydet. Garaj/araç kurulumu parametre dönüşümünü aynı kaynaktan tamamla. Bu, düz zeminde tam gaz–vites–fren davranışını kanıtlasın; sonra engebeli dünya sorgusu ve tam gp3 senaryosuna geç. Sonraki sahip o turdaki bağlam/kapasiteye göre seçilir; kalıcı Codex/Claude hiyerarşisi kurulmaz.
