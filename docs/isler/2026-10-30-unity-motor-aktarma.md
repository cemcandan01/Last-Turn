# Unity motor ve aktarma — TypeScript 0.8.18

- Sahip: Codex, önceki C# gövde/oracle bağlamı burada; ikinci ajan gerekmiyor. Bu tur Claude çağrısı yok. Kesin Codex model kimliği ve kalan kapasite bilinmiyor; yeni ücretli API/ek kredi çağrısı yok.
- Taban: `codex/unity-dort-teker` → yerel güvence commit'i `5aa1b55d712dd4c8e81587ae8c2321c83223b9c3`; önceki iki fizik dilimi, görev kartları, koordinatör ve mevcut Input System ayarları 53 dosyayla kaydedildi. Commit sonrası çalışma ağacı temiz doğrulandı. Yeni dal `codex/unity-motor-aktarma`.
- Sabit kaynak `typescript-baseline-0.8.18` → `df3549e709469f0b519ebfbeaa9f63c1040fee05` değişmez.

## Kullanıcının özgün isteği

Last Turn Unity dört tekerli fizik çekirdeğinin sonuçlarını kabul ediyorum. Sıradaki hedefimiz, orijinal TypeScript 0.8.18 motor ve aktarma sistemini C# çekirdeğine bağlamak.

**Önce Git güvenliği:**

- `codex/unity-dort-teker` dalındaki mevcut değişiklikleri ve önceki fizik dilimini doğrula.
- Mevcut değişiklikleri kaybetmeden, ilgili görev kartlarıyla birlikte yerel commit oluştur.
- Yeni göreve temiz bir geliştirme tabanından başla.
- Push veya merge yapma.

**Yeni geliştirme: Motor ve aktarma sistemi**

1. TypeScript'teki motor tork eğrisi, RPM, gaz tepkisi, rölanti, vites oranları, debriyaj, diferansiyel ve turbo hesaplarını incele.
2. Mevcut C# dört tekerli gövde çekirdeğine gerçek aktarma torku üretimini bağla.
3. Otomatik ve manuel vites davranışlarını, motor freni ve vites geçişlerini mevcut oyunun mantığıyla koru.
4. Aynı araç, başlangıç koşulları ve girdiler için TypeScript–C# karşılaştırma testleri oluştur. Toleransları testlerden önce belirle; sonuçlara göre gevşetme.
5. Eski fizik testlerini, sabit zaman adımını ve belirlenimciliği koru.
6. Unity Editor derlemesini ve kısa ilgili testleri çalıştır.

**Ajan koordinasyonu:**

- Görev sahibini bağlama ve kapasiteye göre seç.
- Claude veya Codex'ten biri uygulamayı yapsın; diğer ajan gerekirse bağımsız fizik denetimi gerçekleştirsin.
- İki ajanı gereksiz yere paralel çalıştırma.
- Gerçekten hangi ajanların çalıştığını ve katkılarını raporla.

**Kısıtlar:**

- TypeScript 0.8.18 referansı değişmeyecek.
- Input System yerel değişiklikleri korunacak.
- Uzun regresyon, push, merge ve canlı yayın yapılmayacak.

**Teslim:** Motor/aktarma C# uygulaması, sayısal karşılaştırma kanıtları, Unity derleme sonucu, Git commit bilgileri ve sonraki sürülebilir prototip aşaması.

## Kaynak ve açıklık kararı

Kaynak `model.ts:391-465`, `arac-fizigi.ts` motor/son oran, `ortak.ts:16-23` direksiyon/gaz süzgeci ve `FizikGirdisi` incelendi. Kaynakta manuel vites artır/azalt veya debriyaj girdisi yok. Kullanıcı ek soruya **“Kaynağı birebir taşı; manuel sürüş sonraki görev”** yanıtını verdi. Otomatik şanzıman, otomatik geri/ileri seçimi ve kaynak kalkış debriyajı modeli taşınır; yeni manuel mod tasarlanmaz.

## Uygulamadan önce kabul sınırları

- Hâlâ 1/60 sn ana adım + 8 gövde alt adımı. Gaz/direksiyon süzgeci, motor/vites/turbo ana adımda yalnız bir kez; diferansiyel mevcut alt adımda.
- Düz kuru asfalt; gerçek gt/RWD, rx/AWD ve turbo T16/AWD araçları (RX turbosuzdur; turbo için sabit kaynaktaki gerçek T16 seçildi), kontrollü ar önayar/yarış lastiği. Orijinal TS gaz/direksiyon ve motor blokları çalıştırılarak oracle üretilecek; C# matematiği TS'ye kopyalanmayacak.
- Her iz adımında önceden tanımlı mutlak sınırlar: gövde konum/doğrusal/açısal hız `1e-5`, dördey `1e-6`, teker hız/açı `1e-4`, sıkışma/kayma `1e-5`, dikey yük `0.05 N`; önceki sınırlar korunur. RPM ve bağlı motor devri `1e-5 rpm`, motor/aktarma torku `1e-4 Nm`, gaz/direksiyon/turbo/etkin fren/gaz/çekiş sınırı/geçiş saati `1e-10`; vites tam aynı. Sınırlar sonuçlara göre gevşetilmez.
- Rölanti/duruş freni, tam gaz hızlanma/vites büyütme, gaz kesme/motor freni/küçültme, otomatik geri/ileri, turbo dolma/boşalma, el freni ve dijital/analog gaz–direksiyon/TCS kapsanır. C# tekrar/reset ve çizim kare hızından bağımsızlık korunur; eski testler birlikte çalışır.
- Editor gerçek derlemesi ve yeni motor kısa kontrolü, .NET kontrolünden ayrı kaydedilir. Görsel prototip/cihaz/IL2CPP/engebeli pist/yardım torkları/MUTANT henüz bu görevde değil.

## Koruma

- ProjectSettings.asset SHA256 `932D7CC94918134ABD2A1832474024300E97565B31B3A393F21D0F07CA08A28D`.
- PackageManagerSettings.asset SHA256 `AC9E80F330154C62CAF293F87DCBCFA5DF8ED2ADEF2E18552B0B34C1EDA7E48C`.
- Bu Unity serileştirme dosyasında başlangıçtan kalan dört satır sonu boşluğu commit kontrolünde görüldü; hash korunması için temizlenmedi. Diğer staged dosyaların whitespace kontrolü geçti. Ignore edilen log/kimlik/kota kayıtları commit'e eklenmedi.

## Sonuç

Tamamlandı; kısa kontroller başarılı. Teslim commit'i bu kartı en son değiştiren commit'tir: `git log -1 --format=%H -- docs/isler/2026-10-30-unity-motor-aktarma.md`. Güvence/taban commit'i `5aa1b55`; kapanış SHA'sı kullanıcı raporuna ve ignore edilen `tests/cikti/unity-motor-aktarma/git-receipt.json` kaydına yazılır. Push/merge yok.

### Uygulama

- Yeni saf C# `PowertrainParameters`, `PowertrainState`, `PowertrainVehicle`, `PowertrainFixedStepRunner` ve `.meta` dosyaları. `DrivingInput` ham gaz/fren/direksiyon, analog bayrakları ve el frenini alır. Kaynak `sm` yumuşatma ve `ss` hız duyarlılığı seçenekleri korunur. Önceki teker/rijit gövde matematiği değiştirilmedi; diferansiyel ve el freni kavramaları mevcut dört teker modelinde çalışır.
- Orijinal tork eğrisi, gaz süzgeci, rölanti/kalkış devri tabanı (kaynak debriyaj yaklaşımı), AWD ağırlıklı teker devri, altı ileri/geri oranı, son oran/verim, otomatik vites büyütme/küçültme, geçişte tork kesme, geçiş bekleme süresi, motor freni, devir kesici, turbo dolma/boşalma, TCS/dijital kalkış sınırı ve otomatik duruş freni bağlandı. Yeni debriyaj pedalı, motor ataleti veya manuel şanzıman tasarlanmadı.
- Önemli kaynak sırası korundu: tekerden türetilen devir, vites değişiminden önceki oranla hesaplanır; geçiş sonrası aktarma torku yeni oranı kullanır. RPM göstergesi süzülür, tork hesabında gösterge RPM'i yerine bağlı/kalkış tabanlı motor devri kullanılır. Gaz/direksiyon/motor ana adımda bir kez ilerler; gövde sekiz alt adımı korur.
- Önceki Engine/Body görüntüleri ilerletilmez; başarısız reset yeni durum yayımlamaz. Reset yapılırken yürütücü de yeniden kurulmalıdır. Kaynak gaz/fren ters yön seçimi aynen korunur; yeni bir seçim/debriyaj mantığı eklenmedi.
- TS oracle sabit SHA'daki `ortak.ts` gaz/direksiyon fonksiyonunu ve `model.ts` motor bloğunu doğrudan çalıştırır; önceki orijinal gövde oracle'ına tork/fren/direksiyon çıktısı verir. Paylaşılan oracle import edilebilir yapıldı; import sırasında eski iz dosyası yeniden yazılmaz veya eski senaryolar gereksiz yürütülmez. TypeScript proje dosyaları ve sabit etiket değişmedi.

### Sayısal ve davranış kanıtları

- Üç TS `--check` başarılı: `export-reference.mjs`, `export-vehicle-reference.mjs`, `export-powertrain-reference.mjs`. Yeni iz `Reference/powertrain-0.8.18.json`; kaynak dosya hash'leri/başlangıçlar/girdiler/toleranslar içindedir. Oyun araç/önayar değerleri değişmez; üç araca aynı kontrollü ar önayarı/yarış lastiği testte açıkça uygulanır. Turbo T16'nın teker geometrisi sabit `gorunumler.ts` kaynağından alınır.
- `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release`: **eski teker 1.800 adım/26.241 koşul**, **dört teker 3.000 adım/150.073 koşul**, **motor 3.000 adım × 58 değer/180.042 koşul** başarılı. Koşul sayıları ayrı senaryo/test sayısı değildir.
- Yeni beş 600-adımlık senaryo: gt rölanti/duruş freni; gt tam gaz–boşa akış; gt yüksek başlangıç vitesinden küçültme; rx geri/ileri ve ss/sm kapalı dijital giriş; T16 turbo–el freni–gaz kesme. Bit düzeyinde tekrar/ilerlemiş simülasyonu reset, her senaryoda 30/60/120 Hz + düzensiz kare takvimi geçti. Vitesler tam aynı; tork kesme/motor freni, turbo dolma/boşalma ve otomatik yön seçimi ayrıca kontrol edildi.
- Kanıtlar (ignore): `tests/cikti/unity-motor-aktarma/dotnet-validation.txt`, `numerical-summary.json`, `compiled-files.json`. Gerçek Compile listesi 15 Core + 3 doğrulama C# dosyasıdır. Proje düzeni, Node sözdizimi, offline Prettier ve Git whitespace kontrolleri başarılı.

| Çıktı | En büyük mutlak TS–C# farkı | Önceden belirlenen sınır |
| --- | ---: | ---: |
| Konum (x) | `2.41584530158434e-13 m` | `1e-5 m` |
| RPM göstergesi | `1.18234311230481e-11 rpm` | `1e-5 rpm` |
| Bağlı motor devri | `1.45519152283669e-11 rpm` | `1e-5 rpm` |
| Motor torku | `1.49853462971805e-11 Nm` | `1e-4 Nm` |
| Aktarma çıkış torku | `9.45306055655237e-11 Nm` | `1e-4 Nm` |
| Turbo | `6.00214322687975e-16` | `1e-10` |
| Vites | `0` | tam aynı |
| Dikey teker yükü | `3.67435859516263e-10 N` | `0.05 N` |

### Ayrı Unity Editor sonucu

- Açık Unity **6000.3.9f1** son kaynakları gerçekten derledi: Console **0 hata/0 uyarı**, filtrelenmiş Editor.log'da C# hata/uyarısı yok. Eski teker 600 + dört teker 600 + motor GT/T16 2×600 adımlık kısa tekrar kontrolleri başarılı. Motor kontrolü gövde + motorun 58 değerini sonluluk/bit düzeyinde tekrarlanabilirlik açısından sınar; TS sayısal karşılaştırması .NET'te ayrıdır.
- `node Unity/Validation/check-editor-proof.mjs` geçti: 15 Core dosyasının güncel SHA256 değerleri ve Editor/referans zamanları eşleşti. UTC **2026-10-30T15:35:12.4489747Z**, assembly MVID **8f33d58d-8e28-49ed-95de-5b7c4c7f3014**. Yerel kanıt `Unity/Logs/drive-core-compilation.json`; çıktı `tests/cikti/unity-motor-aktarma/editor-validation.txt`.
- Bu kanıt tam EditMode/PlayMode, CI Editor, IL2CPP, cihaz performansı veya görsel sürüş hissi değildir. CI'ya motor TS kontrolü eklendi; push/CI/uzun regresyon/yayın çalıştırılmadı.

### Hatalar, koruma ve dosyalar

- İlk güvence commit'inde önceden mevcut PackageManagerSettings satır sonu boşlukları staged whitespace kontrolünde bildirildi. Korunan dosya değiştirilmeden, bu dosya dışındaki staged kod/belgeler doğrulanarak commit tamamlandı; başlangıç dosyası byte hash'i aynıdır.
- Editor pencere etkinleştirme çağrısı bir kez zaman aşımına uğradı. Yeni pencere envanteri/gözlem alındı; derleme tamamlanınca yeni kanıt ve Console doğrulandı. Eski motor alanı olmayan kanıt önce doğru reddedildi. Son durumda açık hata yok; tolerans gevşetilmedi.
- Input System başlangıç hash'leri aynen korundu; önceki yerel değişiklikler güvence commit'indedir. Tek Codex oturumu uyguladı/test etti/sonuçları birleştirdi; bu görevde Claude/sub-agent çağrılmadı. Önceki görevdeki Claude incelemesi yeni inceleme gibi sayılmadı.
- Yeni dosyalar: dört `Core/Powertrain*.cs` + meta; `Editor/PowertrainCoreSmokeCheck.cs` + meta; `Validation/PowertrainValidation.cs`, `export-powertrain-reference.mjs`, `Reference/powertrain-0.8.18.json`; bu kart. Güncellenen: Editor iki mevcut kontrol dosyası, Program, paylaşılan oracle/kanıt betikleri, proje doğrulayıcısı ve Unity workflow; geçiş/devir belgeleri; önceki fizik kartlarına güvence commit bağlantısı. Kimlik/kota, Library/bin/obj ve ham loglar commit dışıdır.

## Sonraki tek görev: sürülebilir düz-zemin GT prototipi

Doğrulanmış gt parametrelerini sahneye veri olarak bağla; Input System'den gaz/fren/direksiyon/el freni girdilerini `PowertrainFixedStepRunner`a ver; görüntülemeyi PreviousBody/CurrentBody/Alpha ile yap. Basit GT gövdesi/dört teker, düz zemin, takip kamerası ve hız–RPM–vites–turbo göstergesi oluştur. TypeScript → Unity eksen eşlemesini görsel adaptörde kısa testle doğrula; Rigidbody/WheelCollider ile ikinci fizik ekleme. Aynı kayıtlı sürüşün 30/60/120 Hz'de eşdeğerliği ve kısa PlayMode sürüşü kabul ölçütü olsun. Input System ayarlarını koru. Manuel vites, engebeli dünya/gp3, drift/ESC/MUTANT ve cihaz/IL2CPP ayrı görevlerdir; sonraki sahip bağlam/kapasiteyle seçilir.
