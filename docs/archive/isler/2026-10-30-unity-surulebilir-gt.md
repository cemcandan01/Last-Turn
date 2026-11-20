# Sürülebilir GT prototipi

- Sahip tek Codex: mevcut C# / Editor bağlamı; ikinci bağımsız iş gerekmediğinden Claude/sub-agent yok. Kesin model/kalan kapasite bilinmiyor, yeni API/ek kredi çağrısı yok.
- Dal `codex/unity-surulebilir-gt`, temiz taban `25ea571`; önceki `5aa1b55` güvence commit'i korunur. TS sabit SHA `df3549e709469f0b519ebfbeaa9f63c1040fee05`.

## Kullanıcının özgün isteği

Last Turn Unity motor ve aktarma geliştirmesini kabul ediyorum. Artık ilk gerçekten sürülebilir Unity prototipini oluşturacağız.

**Hedef:** Unity 6000.3.9f1 üzerinde, mevcut C# fizik çekirdeğini kullanan, klavyeyle kontrol edilen, üçüncü şahıs kameralı bir GT test aracı.

**Kapsam:**

1. Basit düz asfalt test sahnesi oluştur. Dış asset kullanma; Unity primitive nesneleri yeterli.
2. Dört tekerli görsel araç gövdesi oluştur. Tekerleklerin dönüşü ve direksiyon açısı fizik durumuyla uyumlu olsun.
3. Yeni Unity Input System ile gaz, fren, direksiyon, el freni ve yeniden başlatma kontrollerini bağla.
4. Mevcut C# fizik çekirdeğini gerçek sahneye bağla. WheelCollider veya alternatif hazır araç fiziğiyle mevcut sistemi değiştirme.
5. Daha önce kararlaştırdığımız yakın takip kamerasını uygula. Kamerada titreşim ve ani sıçrama olmasın.
6. Hız, RPM, vites ve temel fizik tanılarını gösteren küçük bir test HUD'ı oluştur.
7. Test sahnesi Unity Editor'de Play ile doğrudan açılıp sürülebilsin.

**Kabul kriterleri:**

- Araç ileri/geri hareket, fren, dönüş ve el freni girdilerine beklenen tepkiyi versin.
- Fizik 1/60 sn ve 8 alt adımlı düzenini korusun.
- Görsel kare hızı simülasyonun sonucunu değiştirmesin.
- Aynı başlangıç koşulları ve girdiler tekrarlanabilir sonuç üretsin.
- Önceki TypeScript–C# fizik karşılaştırmaları bozulmasın.
- Unity Editor derlemesi ve kısa ilgili testler geçsin.

**Ajan koordinasyonu:** Görev sahibini mevcut uzmanlık, bağlam ve kapasiteye göre seç. İkinci ajan yalnızca bağımsız inceleme veya ayrı alt görev gerçekten faydalıysa çalışsın. Hangi ajanın ne yaptığını raporla.

**Git güvenliği:** Mevcut temiz branch ve commit geçmişini koru. Yeni özellik için ayrı görev branch'i kullan. Input System dosyalarını ve TypeScript referansını koru. Yerel commit oluşturabilirsin. Push, merge, uzun regresyon ve yayın yapma.

**Teslim:** Unity Editor'de açılabilir test sahnesi, çalışan araç kontrolleri, takip kamerası, tanı HUD'ı, test/derleme kanıtları ve benim manuel oynanış testim için kısa kontrol listesi.

## Uygulamadan önce sözleşme

- GT/ar verisi doğrulanmış motor referansından üretilir; fizik sabitleri yeniden ayarlanmaz. 1/60 + 8 alt adım korunur; görüntüleme / kamera simülasyona yazamaz. Kayıtlı fizik adımı girdileriyle aynı Mono/.NET ortamında tekrar / farklı çizim takvimleri bit düzeyinde aynı olmalı; önceki sayısal toleranslar değişmez.
- TS x-sol → Unity x-sağ gösteriminde vektör (-x,y,z), dördey (qx,-qy,-qz,qw). Eksen dönüşümünün dönüşle değişmeliliği Editor'da ≤1e-5 toleransla test edilir. Ön teker Ackermann açısı, sıkışma ve sarılmamış teker dönüş açısı önceki/şimdiki fizik görüntüsü arasında interpolasyonla gösterilir.
- Kamera kaynağı `src/oyun/dongu.ts:241-260`: yakın mesafe 6.8 + hız payı 2 m, eğim .25 rad, yükseklik 1.7 m, bakış önde 3 m/yukarı1.2m. Gövde roll/pitch'i kamera up eksenine verilmez; yaw/mesafe/FOV üstel süzülür, rastgele sarsıntı yok. Reset kamerayı aynı karede yeni başlangıca kurar.
- W/↑ gaz, S/↓ fren (kaynak otomatik geri), A/D veya ←/→ direksiyon, Space el freni, R reset. Eşzamanlı sol/sağ nötr, fokus kaybında girdi bırakılır / simülasyon duraklar. Legacy Input kullanılmaz; Input System sürüm/ayarları korunur. Test HUD'ı isteğe özel hız ve RPM'i birlikte kenarda gösterir; eski oyun HUD kuralı bu tanı ekranına taşınmaz.
- Kaynak fizik düz/asfalt ve çevre çarpışması olmadan çalışır. Dekor ikinci fizik üretmez; WheelCollider/Rigidbody yok. Engebeli pist/duvar, manuel vites, ses ve cihaz/IL2CPP ayrı işler.
- Koruma SHA256 ProjectSettings.asset `932D7CC94918134ABD2A1832474024300E97565B31B3A393F21D0F07CA08A28D`; PackageManagerSettings.asset `AC9E80F330154C62CAF293F87DCBCFA5DF8ED2ADEF2E18552B0B34C1EDA7E48C`.

## Sonuçlar

Tamamlandı: 31 Ekim 2026. GTTest sahnesi gerçek Unity Editor Play döngüsünde doğrulandı. Teslim commit'i bu kartı son değiştiren commit'tir: `git log -1 --format=%H -- docs/isler/2026-10-30-unity-surulebilir-gt.md`. Taban `25ea571`; push/merge/yayın yok.

### Teslim dosyaları ve çalışma

- Sahne: `Unity/Assets/LastTurn/Scenes/GTTest.unity`. Primitive gövde/kokpit/kanat/dört teker, asfalt ve mesafe çizgileri, yakın kamera ve HUD; dokuz yerel Standard materyali. Dış asset yok. Oluşturulan dekor collider'ları kapalı; sahnede Rigidbody/WheelCollider yok.
- `Core/GtPrototypeParameters.cs`, önceki doğrulanmış motor referansındaki GT/ar kurulumundan `export-gt-prototype.mjs` ile üretilir. C# tork/gövde fiziği yeniden yazılmadı veya yeniden ayarlanmadı. Üretilmiş GT fabrika parametreleri gerçek .NET karşılaştırmasının accelerate-coast-gt senaryosuna bağlandı.
- Runtime adaptörleri `Scripts/Prototype/`: GtKeyboardInput (InputActionMap), GtPrototype (Update ana adımları, LateUpdate görüntüleme ve HUD), GtPresentation (yansıma/teker açıları), GtFollowCamera. Gövde dördeyi, teker sıkışması, Ackermann açısı ve sarılmamış teker açısı önceki/şimdiki görüntüler arasında çizilir. Görsel transformlar simülasyona geri yazılmaz.
- Kamera kaynak yakın ölçülerini (6.8+2 m, .25 rad, 1.7 m, 3 m önde bakış) kullanır; yaw/mesafe/FOV/zemin yüksekliği yumuşatılır, rastgele shake/roll yok. Test HUD'ı kenarda hız, RPM/vites, turbo, yük/temas, adım ve gerçek girdileri gösterir. GT turbosuzdur; %0 normaldir.
- W/↑ gaz, S/↓ fren ve durunca otomatik geri, A/D veya ←/→ sol/sağ, Space el freni, R reset. Zıt ve çapraz yönler nötrdür. Pencere odağı kaybında input bırakılır ve simülasyon duraklar; R yeni araç ve biriktirici kurup kamerayı aynı karede başa alır. Girdiler fizik adımı bazında en çok 7200 adımlık kısa kayıt için tutulur.
- Normal açılış: sahne dosyasını aç → Play → Game penceresine tıkla. Alternatif Ctrl+F7 / Last Turn → GT Test Sahnesini Aç. Kısa Play kontrolü Ctrl+F8 / Last Turn → GT Kısa Play Doğrulaması. Game görünümünde Free Aspect / Scale 1x HUD okunurluğunu sağlar; bu yalnız Editor görünüm tercihidir.

### Kısa fizik / derleme kanıtı

- Eski .NET kontrolleri aynı kod/ortam kapsamında yeniden kullanıldı: teker 1.800 adım/26.241 koşul; dört teker 3.000 adım/150.073 koşul; motor 3.000 adım×58 değer/180.042 koşul başarılı. Koşul sayısı ayrı test senaryosu sayısı değildir. GT prototip fabrikası da bu derlemede gerçek Core kapsamındadır. Çıktı `tests/cikti/unity-surulebilir-gt/dotnet-validation.txt` (ignore).
- Üç özgün TS oracle `--check`, GT üretim `--check`, proje düzeni ve Node sözdizimi başarılı. Önceki toleranslar değiştirilmedi. Core yine 1/60 sn + 8 alt adım; Input System 1.14.0 sürümü/ayarları aynı.
- **Unity 6000.3.9f1 gerçek derlemesi:** 16 Core + 4 Runtime adaptörü; eski 600 teker + 600 gövde + 1200 motor kısa adımı ve 6 gösterim kontrolü geçti. Gösterim kontrolü TS/Unity yansımasının dönüşle uyumunu ve sarılmamış teker interpolasyonunu sınar. `check-editor-proof.mjs` Core ve adaptör SHA256 değerlerini doğrular. Assembly MVID `fb802f58-03f6-49bf-9884-c7a3c9c047d2`.
- Güncel kaynakla normal Play'de araç/kamera/HUD görüldü; son koşum Console 0 hata/0 uyarı. Son Editor kısa kanıt UTC `2026-10-30T22:05:55.8981006Z` (31 Ekim 01:05:55 Türkiye), `Unity/Logs/drive-core-compilation.json`. Bu tam EditMode/PlayMode framework paketi, CI Editor, IL2CPP/cihaz veya Cem'in sürüş hissi onayı değildir.

### Gerçek Play kontrolü — 18/18

`GtPrototypeValidation` menüsü, gerçek sahneyi Play'e alıp Input System'e geçici sanal klavye olayları verir; kontroller doğrudan simülasyona tork yazılarak atlanmaz. Test cihazı sonunda kaldırılır, Play kendisi kapanır. Kanıt `Unity/Logs/gt-prototype-play.json`, UTC `2026-10-30T22:05:11.3458247Z` (31 Ekim 01:05:11 Türkiye). `node Unity/Validation/check-prototype-proof.mjs` sahne, Core/Runtime/Editor kaynakları, materyal ve meta dosyaları için güncel hash eşleşmesini doğruladı. Çıktılar `tests/cikti/unity-surulebilir-gt/play-validation.txt` ve `editor-validation.txt` (ignore).

| Kontrol | Gerçek sonuç |
| --- | --- |
| Gaz / ↑ ve W | 120 adımda 22.7379 m/sn; ileri yer değiştirme |
| Fren / ↓ ve S | 30 adım sonra hız 5.7621 m/sn; belirgin azalma |
| A / D direksiyon | Kaynak sol/sağ işareti ve görsel ön teker açısı doğru |
| Space | Arka iki teker açısal hızı <1 rad/sn; el freni girdisi açık |
| Otomatik geri | Kaynak geri vitesi; boylamsal hız −16.7384 m/sn |
| R | Konum/hız/vites/biriktirici ve kamera başlangıca döndü |
| Dört teker / ikinci fizik yok | Görsel bağlantılar ve Rigidbody/WheelCollider yokluğu geçti |
| Zıt/çapraz yön tuşları | Nötr |
| Gerçek Play girdi kaydı | 30/60/120 FPS'de tüm 58 gövde/motor değeri bit düzeyinde aynı |
| Kamera göreli kare adımı | Ölçülen en büyük 0.1344 m; önceden konulan 1.5 m üst sınırının altında |

### Hatalar ve koruma

- İlk Editor derlemesi, projede ses modülü olmadığı için AudioListener başvurusunu reddetti. Ses bu görevde olmadığı için başvuru kaldırıldı; yeni ses paketi eklenmedi. Son derleme başarılı.
- İlk sahne kurma denemesi adsız açık sahne nedeniyle Unity'nin additive kısıtına takıldı. Açık sahne hiçbir şey silinmeden **Assets/LocalRecovery/BeforeGT.unity** dosyasına kaydedildi; kurtarma alanı/metası ignore edilir ve commit'e alınmaz. GT sahnesi ayrı dosyada oluşturuldu. SceneTemplateSettings.json Editor'ın ürettiği varsayılan proje kaydıdır.
- İlk tur Computer Use fiziksel Esc ile durduruldu; Editor işlemleri durdu ve eksik teslim açık raporlandı. Kullanıcı “Unity açık, devam edebilirsin” yanıtıyla 31 Ekim devamını yetkilendirdi. Devamda gerçek Play ve görsel kontrol tamamlandı. Giriş koruması bir UI işlemini son kullanıcı girdisi nedeniyle reddetti; eski koordinatlarla tekrar giriş gönderilmedi. Başarılı kanıtlar ayrı doğrulandı.
- Input System iki korunan dosya hash'i başlangıçla aynı. Manifest/lock'taki tek modül farkı yerleşik IMGUI'nin doğrudan bağımlılık olması (önceden dolaylıydı); Input System ve test-framework sürümleri değiştirilmedi. `TimeManager` değiştirilmedi.
- Tek Codex uygulaması ve test/birleştirme; yeni Claude/sub-agent/model çağrısı yok. Önceki Claude incelemesi bu görevde yeni inceleme diye sayılmadı. Kullanım kapasitesi ve kesin model kimliği bilinmiyor.
- Yeni: dört Runtime adaptörü ve metaları; GT parametre üreticisi + Core fabrika/meta; iki Editor kurucu/Play doğrulayıcı + meta; GTTest sahnesi/meta ve dokuz materyal/meta; proje kısa rehberi ve bu kart. Güncellenen: derleme/kanıt betikleri, PowertrainValidation'da gerçek GT fabrikası kullanımı, Unity workflow, manifest/lock, kurtarma ignore kuralı ve devir/geçiş belgeleri. Ham loglar, LocalRecovery ve Library/bin/obj commit dışıdır.
- Push, merge, yayın ve uzun regresyon yok. Engebeli pist/bariyer çarpışması, manuel vites, ses, mobil cihaz/IL2CPP performansı kapsam dışında. Görsel primitive kalite ve gerçek klavye sürüş hissi için Cem'in manuel kontrolü bekleniyor.

## Cem'in kısa manuel kontrol listesi

1. GTTest.unity → Play → Game: W/↑ ile hızlan, RPM ve otomatik vites geçişini gör.
2. S/↓ ile frenle; durunca tutup geri git, W ile ileriye dön.
3. A/D ve oklarla dönüş; zıt yönler birlikte nötr. Space ile arka teker kilidi/tutuş değişimini dene.
4. Yakın kamera yolu ve aracı okunur göstersin; ufuk yatmasın, sürüşte titreşim/sıçrama olmasın.
5. R ile araç/kamera birlikte başa dönsün; Console'da hata oluşmasın.

Ayrıntılı açılış/tuşlar `Unity/GT-PROTOTIP.md` dosyasındadır. Sonraki tek adım Cem'in bu ilk prototipte kamera mesafesi, klavye hissi ve tanı HUD'ı kabulünü bildirmesi; ardından özgün TypeScript dünya sorgusu/engebeli pist dilimi planlanır. Fizik hissi farkı çıkarsa önce kayıtlı girdiyle teşhis edilir; kaynak denge sayıları sessizce değiştirilmez.
