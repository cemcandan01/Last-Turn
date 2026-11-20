# GT manuel test fizik hataları

- Sahip Codex; mevcut GT/C# ve ölçüm bağlamıyla tek uygulayıcı. Bağımsız ajan kullanılmadı; kapasite bilinmiyor. API/ek kredi yok.
- Dal `codex/unity-gt-fizik-hatalari`, taban `726b232`. Başlangıç temiz; kabul edilen prototip korunur. Fetch başarılı. Push/merge/uzun regresyon yok.
- Öncelik: mevcut dünya sorgusu/pist işinden önce bu iki hata. Önceki görevler yeniden açılmadı.

## İstek ve kabul

Cem, GTTest'te S ile yaklaşık 100 km/sa geri hız ve W+A/D ile tam direksiyon kalkışında aşırı ivme kaybı bildirdi. TS 0.8.18 önce incelenecek; keyfi hız limiti, çekiş çarpanı veya direksiyon kısıtlaması eklenmeyecek. Motor/devir, diferansiyel, teker kuvvetleri ve birleşik tutuş ölçülecek. Mevcut değişiklikler/GT özellikleri korunacak; yerel görev dalı ve commit, kısa Unity Play isteniyor.

1. Aynı GT fabrika parametreleri ve gerçek klavye bayraklarıyla iki hata sayısal olarak üretilecek; önce/sonra kanıtı saklanacak.
2. Geri hız aktarma ve motor devrinden doğacak; referans ile bilinçli fark açıkça belirtilecek.
3. Önceden tam çevrilmiş direksiyonla ve eşzamanlı W+A/D ile kalkış, dar yay ve sol/sağ simetrisi test edilecek. TCS normal dönüşü patinaj saymayacak; teker bazlı birleşik tutuş korunacak.
4. Düz hızlanma, fren, el freni, tekrar/reset ve 30/60/120 FPS; önceki TS izleri aynı toleranslarla denetlenecek. Kasıtlı hata düzeltmesi farkı eski oracle'ın üstüne yazılmayacak.
5. Unity 6000.3.9f1 derleme ve gerçek Input System Play kontrolü; yerel commit ve devir.

## Başlangıç kanıtı

- TS sabit `df3549e709469f0b519ebfbeaa9f63c1040fee05`; mevcut Core ile eski teker/dört-teker/motor karşılaştırmaları geçti. Sayısal çıktı `tests/cikti/gt-physics-before.txt` (ignore).
- −3 × 3,48403798 oran, 0,33 m yarıçap, 8200 RPM ve kaynak 1,02 kesici eşiği: geri teorik çevresel hız 99,55 km/sa. 4 s ölçüm 100,00 km/sa, gösterge 8408 RPM. Kesici eksik değil; TS'nin geri aktarma/devir tanımı aynı.
- Eşzamanlı W+A: 1 s 32,79; 2 s 54,64 km/sa. Önce A'yı 2 s tutup W: 0,2 s 3,72; 1 s 21,04; 2 s 49,18 km/sa. Düz 1 s 39,59; 2 s 81,86 km/sa.
- Normal dar dönüşte CG yana hızı oluşuyor. Kaynak TCS bunu `atan2(vt,max(vl,.5))` ile patinaj sayıyor; teker tork sınırlamasına ek ikinci gaz kesme var. Önceden çevrilmiş direksiyonda 0,2 s gaz %50,3; sürücü %100 basıyor. Diferansiyel/lastik sayıları aynı tutulup yalnız bu gaz kesme çıkarılarak nedensellik ölçülüyor.
- Geri dişli veya geri motor devir tanımı tercihi Cem'e soruldu; yanıt beklenirken bağımsız kalkış incelemesi sürüyor.

## Sonuç ve kök nedenler

Cem **“Geri vitese özgü motor devir sınırı”** seçeneğini onayladı. Tamamlandı: 31 Ekim 2026; yalnız yerel. Teslim SHA'sı bu kartı son değiştiren commit'tir: `git log -1 --format=%H -- docs/isler/2026-10-31-unity-gt-fizik-hatalari.md`.

1. **Geri hız:** C# taşıma/işaret/RPM hatası değil, TS'deki ortak 8200 RPM kesicisinin geri vitese de uygulanmasıydı. −3 geri oranıyla yaklaşık 100 km/sa matematiksel olarak beklenen sonuçtu. `ReverseMaxRpm` motor parametresi eklendi; GT fabrikası açık **3000 RPM manevra kalibrasyonu** verir. Bu sayı TS veya gerçek bir GT araç üreticisinden alınmış veri diye sunulmaz. Genel parametre verilmezse kaynak MaxRpm kullanılır; diğer referans araçların konfigürasyonu değişmez. İleri kesici karşılaştırması ve tork eğrisinin 8200 RPM normalizasyonu aynen korunur. Yakıt/tahrik torku kesilir, hız/teker durumu kelepçelenmez. Kaynak %2 kesici eşiği ve geçici teker kaymasıyla gösterge yaklaşık 3100 RPM, hız yaklaşık 37 km/sa olur. Başlangıçtan kesici üstü geri hız verilen testte araç aniden 37'ye düşmez; tork sıfır, doğal akış devam eder.
2. **Tam direksiyon kalkışı:** CG kayma açısına bağlı TCS gaz kesmesi, dar yayın normal kinematik yana hızını patinaj sayıyordu. Aynı araçta zaten her tekerin birleşik lastik kuvvetinden hesaplanan ayrı TCS tork sınırı vardı. İkinci ve hatalı CG gaz kesmesi kaldırıldı. Yeni çekiş çarpanı/direksiyon sınırı yok. TCS tekerlerde çalışmaya devam eder; lastiğin yanal talebi boylamsal payı azaltır. Ortak motor sınıfındaki düzeltme GT'ye özel bir istisna değildir.

### Önce / sonra — aynı GT, 1/60 × 8, klavye bayrakları

| Ölçüm | Önce | Sonra |
| --- | --- | --- |
| S, 4 s geri hız | 100,00 km/sa | 36,68 km/sa |
| S, 20 s geri hız | 99,70 km/sa | 37,08 km/sa |
| A'yı önce tam çevir, sonra W; 0,2 s | 3,72 km/sa, gaz %50,3 | 5,33 km/sa, gaz %94,4 (normal gaz süzmesi) |
| Aynı kalkış, 1 s | 21,04 km/sa | 34,44 km/sa |
| Aynı kalkış, 2 s | 49,18 km/sa | 54,35 km/sa |
| Eşzamanlı W+A, 1 s | 32,79 km/sa | 35,90 km/sa |
| Düz W, 1 / 2 s | 39,59 / 81,86 km/sa | 39,59 / 81,86 km/sa |

D sonuçları A'nın ayna simetriğidir. Diferansiyel oran/bağlama hızı, dört teker tork dağılımı, süspansiyon yükü ve lastik/örtük teker çözümü incelendi; bunlar kök neden değildi ve kaynak dosyaları değiştirilmedi. GT arka LSD `0,45 × 220`, geri oran −3, son dişli 3,48403798 ve teker yarıçapı 0,33 m aynı. Tam direksiyonla uzun süre gaz vermek hâlâ tutuş limitine ulaşabilir; doğal birleşik tutuş korunur.

### Testler ve kapsam

- `GtPhysicsValidation`: **6 × 1200 adım**, her senaryoda 30/60/120 FPS bit eşitliği ve reset/tekrar; önceden çevrilmiş sol/sağ, eşzamanlı sol/sağ, düz, geri. Fren/el freni, sol/sağ simetrisi, sonlu durum, kesici torku ve sürtünme elipsi: **10.033 koşul geçti**. Çıktı `tests/cikti/gt-physics-after.txt`; ilk hâl `gt-physics-before.txt` (ignore).
- Eski teker **1800 / 26.241** ve dört-teker **3000 / 150.073** kontrolleri aynı toleranslarla geçti. Motor **4800 × 58 değer / 288.063 koşul**: dört özgün senaryo aynen; T16 el freni sonrası CG kesmesi farkı için düzeltilmiş TS izi; üç yeni GT geri/tam-direksiyon izi. Tekrar/reset ve dört kare takvimi geçti.
- Üç özgün TS oracle `--check` geçti; eski JSON/SHA değiştirilmedi. `export-powertrain-reference.mjs --gt-fixes --check`, sabit TS kaynağına açık iki farkı uygulayıp yeni `powertrain-gt-fixes.json` dosyasını bağımsız üretir/doğrular. C# sonucundan referans üretilmez. Tolerans genişletilmedi. T16'nın eski hatalı gaz kesmesini bekleyen sonucu yeni koda zorlanmadı.
- GT üretim `--check`, proje düzeni, Node/Prettier/whitespace ve korunan iki Input System dosyasının SHA256 kontrolü geçti. TimeManager, sahne, materyaller ve kamera değiştirilmedi.
- Unity 6000.3.9f1 gerçek derleme: **16 Core + 4 Runtime**, eski 600 teker + 600 gövde + 1200 motor ve 6 gösterim kontrolü. Gerçek Play, geçici sanal klavyeyle **28 kontrol**: ileri/fren/el freni/geri kesici/R, önceden tam sol/sağ kalkış, gerçek kayıtların 30/60/120 FPS tekrarları. Kanıtlar `Unity/Logs/drive-core-compilation.json` ve `Unity/Logs/gt-prototype-play.json`; hash denetleyicileriyle doğrulanır. Son kaynak Play kanıtı aşağıdaki devir kaydında belirtilir.

### Değişiklikler, hatalar ve sınırlar

- Üç Core dosyası: PowertrainParameters/Vehicle ve üretilen GT parametreleri. Editor Play doğrulayıcısı ve kanıt denetimi genişletildi. Yeni GT sayısal test sınıfı/TS düzeltme fixture'ı; mevcut motor doğrulayıcısı/üreticileri, GT rehberi ve görev/devir belgeleri güncellendi.
- Başlangıç Git güvenli sahiplik uyarısı yalnız komut başına `safe.directory` ile çözüldü; global ayar değiştirilmedi. Worktree ortak Git metadata yazımı ve NuGet.Config okuması olağan sandbox yetkisiyle yapıldı. Kaynakta gönderilmemiş kullanıcı değişikliği yoktu; Input System hash'leri kabul edilmiş prototiple aynı.
- Teşhis sırasında eski T16 oracle'ı, kaldırılan gaz kesmesi nedeniyle beklenen şekilde kaldı. Ayrı düzeltme oracle'ı eklendi. İlk oracle geri sınırını T16'ya da uyguluyordu; GT kapsamına daraltıldı. JSON hash karşılaştırmasının boşluk bağımlılığı giderildi. Son kontroller başarılı; test kapatma/tolerans büyütme yok.
- Yerel koordinatör yalnız plan çalıştırdı: `tests/cikti/koordinator/1f2be0c4-320b-437e-86bc-795a39a9187d.json`. Yeni model/Claude/sub-agent oturumu yok; kesin model/kota bilinmiyor. Sahip, C# / oracle / Editor bağlamı nedeniyle Codex. Plan makbuzu geliştirme kanıtı yerine sunulmaz.
- Push, merge, uzun regresyon, yayın, CI Editor, cihaz/IL2CPP yapılmadı. Yeni manevra devri şimdilik yalnız GT fabrikasında; diğer araçların geri kalibrasyonu ayrı değerlendirilir. Cem'in sürüş hissi kabulü otomatik test yerine sayılmaz.

## Sonraki tek adım

Son kaynak kanıtı: Play UTC `2026-10-30T22:50:28.0776671Z` (31 Ekim 01:50:28 Türkiye), 28/28, geri 36,7388 km/sa / 3092,65 RPM; tam sol/sağ 34,4393 km/sa. Derleme UTC `2026-10-30T22:50:08.0789322Z`, MVID `44b96571-47b6-4678-8acc-b82796ed3622`. İki hash denetleyicisi geçti; Console 0 hata/uyarı. Kaynak/ayar dosyalarının son Git kontrolü temiz kapsamı doğrular.

Cem GTTest'te R → A/D'yi önce tam çevir → W ile kalkış; ardından R → S'yi 10 s tutup yaklaşık 37 km/sa / 3000 civarı RPM ve W ile ileri seçimini denesin. Düz fren, Space ve R'yi tekrar kontrol etsin. İki davranış kabul edilince dünya sorgusu/engebeli pist görevine dönülür.
