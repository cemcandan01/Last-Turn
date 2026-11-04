# GT düz-asfalt prototipi

Unity **6000.3.9f1** ile `Unity/` projesini aç. `Assets/LastTurn/Scenes/GTTest.unity` sahnesini açıp **Play**'e bas; Game penceresine tıkla. Alternatif: **Last Turn → GT Test Sahnesini Aç** (`Ctrl+F7`). Kısa otomatik Play kontrolü **Last Turn → GT Kısa Play Doğrulaması** (`Ctrl+F8`) menüsündedir; test yaklaşık 20–35 saniye sürer ve Play'i kendisi kapatır.

Küçük Editor penceresinde HUD okunmuyorsa Game çözünürlüğünü **Free Aspect**, ölçeği **1x** seç. Güncel fizik düzeltmesi gerçek Editor Play'de 28/28 kısa kontrolden geçti; ayrıntılı sonuçlar görev kartındadır. Sürüş hissi için aşağıdaki manuel kontrol hâlâ gereklidir.

| Tuş | İşlev |
| --- | --- |
| W / ↑ | Gaz |
| S / ↓ | Fren; durunca basılı tutarak otomatik geri |
| A / ← | Sol |
| D / → | Sağ |
| Space | Arka teker el freni |
| R | Başlangıç konumuna dön; araç ve kamera sıfırlanır |

İleri giderken S önce frenler. Geri giderken W, kaynak TypeScript mantığıyla ileri vitesi seçer. İki yön tuşu aynı anda basılıysa direksiyon nötrdür. Pencere odağı kaybolduğunda simülasyon duraklar. Yeniden başlatma biriktiriciyi/girdi kaydını da sıfırlar.

## Kısa manuel oynanış listesi

1. W'ye 2–3 saniye bas: araç ileri gitsin, jant işaretleri dönsün, hız/RPM artsın. Otomatik vites ve kısa geçiş tork kesmesini gözle.
2. W'yi bırakıp S'ye bas: hız düşsün; durunca S'yi tutarak geri git. W ile ileriye dön.
3. W+A ve W+D dene: ön tekerler doğru yöne dönsün, araç o yöne dönsün. Ok tuşlarını da dene; zıt/çapraz sol–sağ tuşları nötr olmalı.
4. Dönüşte Space'e kısa bas: arka tekerler kilitlensin, arka tutuş azalsın. Düz giderken el freni yapay bir dönüş kuvveti eklemez.
5. Kamera aracı yakın izlesin; roll/pitch ile ufuk yatmasın, yol okunabilsin ve fizik adımları görüntüde titremeye dönüşmesin.
6. R'ye bas: araç, vites, hız ve kamera birlikte başlangıca dönsün. Başlangıca uçan uzun kamera geçişi olmamalı.
7. HUD kenarda kalsın; hız, RPM/vites, dört teker teması, ön/arka yük ve girdiler makul olsun. GT turbosuzdur; turbo %0 normaldir.

Bu alan sonsuz düz/asfalt fizik zemininin primitive gösterimidir. Çizgiler/dekor çarpışma nesnesi değildir; engebeli pist, bariyer çarpışması, manuel vites, ses ve mobil cihaz testi sonraki görevlerdir. Tek fizik `PowertrainVehicle`dır; Rigidbody/WheelCollider ekleme.

## Doğrulama

31 Ekim fizik düzeltmesi: GT geri viteste 3000 RPM manevra kesicisi kullanır; −3 oran ve son dişli korunur. Kaynak kesicinin %2 eşiği ve teker geçişleriyle düz zeminde yaklaşık 37 km/sa görülür. İleri devir/tork eğrisi aynı kalır. Normal dar dönüşte CG yana hızı artık gazı kesmez; TCS teker torkuna birleşik lastik tutuşu üzerinden uygulanır. Bu iki fark TS 0.8.18 üzerine açık düzeltmelerdir; özgün referans dosyaları korunur.

Yeniden deneme: R → A'yı araç dururken tam çevir → W'yi tut; aynı testi D ile yap. Araç dar yayda kalkmalı. R → S'yi 10 sn tut; yaklaşık 37 km/sa ve 3000 civarı RPM görülmeli. Ardından W ile ileriye geç, düz frenleme ve Space'i dene. Ayrıntı `docs/isler/2026-10-31-unity-gt-fizik-hatalari.md`.

```powershell
node Unity/Validation/validate-project.mjs
node Unity/Validation/export-reference.mjs --check
node Unity/Validation/export-vehicle-reference.mjs --check
node Unity/Validation/export-powertrain-reference.mjs --check
node Unity/Validation/export-powertrain-reference.mjs --gt-fixes --check
node Unity/Validation/export-gt-prototype.mjs --check
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release
node Unity/Validation/check-editor-proof.mjs
node Unity/Validation/check-prototype-proof.mjs
```

Son iki komut güncel yerel Editor / Play kanıtını ister; ilk kontrollerin yerine geçmez. Play kontrolü fizik adımlarına kaydedilmiş gerçek Input System girdilerini 30/60/120 FPS'de tekrar yürütür, 58 gövde/motor durumunu bit düzeyinde karşılaştırır. Kamera/tekerler simülasyona yazmaz. Kaynaklar değişince eski kanıt reddedilir; Editor yenilenip Play kontrolü tekrar çalıştırılır.

Sahne ilk kez Editor kurucusu tarafından oluşturulur ve gerçek `.unity` / primitive materyal dosyaları depoya alınır. Adsız bir sahne açıksa Unity'nin additive kısıtı nedeniyle içeriği önce **ignore edilen `Assets/LocalRecovery/BeforeGT*.unity`** dosyasına korunur; bu kurtarma kopyası Git'e gönderilmez. Mevcut sahne/ayar dosyaları ezilmez.

Kamera kaynak ölçüleri `src/oyun/dongu.ts:241` yakın takip profilidir. Girdi API'si [Unity InputAction](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputAction.html) üzerinden kuruludur. Ayrıntılı kapsam/kanıt/görev sahipliği `docs/isler/2026-10-30-unity-surulebilir-gt.md` kartındadır.
