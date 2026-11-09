# Mutant B — kalan ekranlar ve oynanış kalite raporu

9 Kasım 2026 · Codex · `codex/unity-p7-garaj` · başlangıç `b689b6e`.

**Test ve kalite raporu tamamlandı; açık kabul sınırları aşağıdadır.** B4A sandık `4cdb5ae`, B8A koşu özeti `a4e65c8`, sürüş kanıtı ve iki dar düzeltme `be51a76`. İnsan eğlencesi, nihai görsel kalite veya cihaz kabulü verilmedi. Push/merge/PR/yayın yapılmadı.

## Ortam ve kanıtın anlamı

E1: Unity6000.3.9f1, Windows11 Editor, i7-10750H, RTX2070,16.188 MB RAM; mevcut izole `Unity/Logs/P7HudCleanEditor`, ürün `LastTurnUiValidation`. Ana Editor/sahneler, `_Recovery`, TS0.8.18 ve gerçek oyuncu/Firebase kayıtları değiştirilmedi. Firebase üzerinden çevrimiçi kabul testi yapılmadı. Yeni paket/API/görsel/ajan yok.

Son sürüş kaydı UTC `2026-11-09T08:39:07.2319411Z`: **98 kontrol,667 telemetri örneği,30 gerçek Game View,225 güncel kaynak hash'i**. Runtime/Editor hatası0/0; bu, bütün Console uyarılarının sıfır olduğu iddiası değildir. Önceki teslimlerdeki UnityEditor.Search indeksleme tanısı ayrı tutuldu; bu son turda görülmedi. İlk izole başlangıçlarda eksik mevcut smoke referansları tamamlandı; ilk hatalar son başarı diye gösterilmedi.

Sürüşün büyük bölümü mevcut `StepWorld`/`StepRace` adaptörlerine normal gaz/fren/direksiyon/el freni girdileri veren mevcut test sürücüsüyle sabit adımlı ve hızlandırılmıştır. Araç konumu, yarış sonucu, tur/bitiş zamanı veya kazanma değeri enjekte edilmedi. Üç tamamlanan yarışın her birinde teleport sayısı0. Bunun yanında ayrı20 saniyelik **normal InputSystem klavye + normal render** kesiti bulunur; burada manuel fizik adımlaması kapalıdır. Bunların hiçbiri insan sürüşü değildir.

Görüntü alırken test kısa süre durur; sıralı kareler kesintisiz video değildir. Kamera hareketi ve konum değişimi değerlendirilebilir; yalnız bu karelerle akıcılık kanıtlanmaz. Telemetri de insan eğlencesini kanıtlamaz. Ses dinlenmedi, ses kalitesi test edilmedi. Windows Editor ölçümü iPhone performansı veya dokunmatik kontrol hissi değildir.

## Gerçek akış ve kontrollü sınırlar

Tohum53, başlangıç listesinin ilk mevcut aracı **Kara Boğa**. İlk10 saniye gaz/fren/yön/el freni; ardından daha hızlı kayma ve karşı direksiyon, sonra gerçek etkinlik işaretine yaklaşma/durma. Giriş koordinatına teleport yapılmadı. Sonraki yarışlar aynı koşuda sürdürüldü.

| Senaryo | Sonuç | Sınır / kanıt |
| --- | --- | --- |
| Açık dünya → işaret → etkinlik1/risk0 | Doğrulandı | Gerçek marker gate; `gate=True`, `direct-entry-fixture=False`; `world-*`, `outcomes` |
| Süreli `rx_1` / Toz Tepeleri | Doğrulandı | Fizik bitişi55,6833 sn, hedef geçildi; gövde92, teleport0; `race0-*`, `result-0` |
| Rakipli `gp_1` / Yeşil Vadi | Doğrulandı | Fizik bitişi84,6667 sn, hedef geçildi, gövde92, teleport0; etkinliğe doğrudan mevcut komutla giriş fixture'dır; `race1-*`, `result-1` |
| Sonuç → gerçek XP/seviye → sürüş | Doğrulandı | Aynı koşuda XP120/seviye1; gerçek tekliften `kalkan-bataryasi` seçildi, iki sonuçtan da dünyaya dönüş; seçim mevcut komutla, insan onayı değil |
| Boss `rl_1` / Kır Etabı → özet | Doğrulandı, giriş fixture | Boss'a mevcut komutla erken girildi;900 sn doğal süre sonu beklenmedi. Gerçek yarış55,4167 sn sonunda kaybedildi; gövde92, teleport0; `race2-*`, `result-2` |
| Atölye kısmi/tam tamir | Doğrulandı, fixture | Gövde/para başlangıcı kontrollü:70/20 →76/2, ardından76/72 →100/0. Mevcut UI komutları, gerçek önizleme; `partial-repair`, `full-repair` |
| Atölye motor alımı ve sürüş | Doğrulandı, fixture |500 para ve mevcut `motor-sokak` stok girdisi sağlandı; mevcut UI satın alma, araç kurulumunda parça, sonra aynı sürüş girdileri. Doğal para biriktirme/stoğa rastlama kabulü değildir |
| Normal/lanetli sandık | Kontrollü kabul |4A Play: normal kabul, lanetli ret ve kabul, açılmış/eski teklif; .NET normal/lanetli kabul ve ret. Dört yolun tamamına açık dünyadan sürerek ulaşılmadı |
| Volt Kanat ve Flying Dutchman | Doğrulandı, skill kurulumu fixture | Mevcut seviye1 skill'ler ve100 enerji kontrollü kuruldu; sonra gerçek pist/fizik. Volt Kanat yükseldi,13 örnekte havada; Flying Dutchman aktif oldu. Skill kazanma rotası doğrulanmadı |
| Başarılı kanca kullanımı | Test edilemedi | İki istek `hedef` reddi üretti, aktif kanca örneği0. Ret/HUD görülür; geçerli hedefe bağlanma ve sarkaç kabulü açık |
| Pause/Settings, menü, yeni koşu | Ekran testinde doğrulandı |4A/8A dar Play; fare/Enter ile dönüş, temiz yeni koşu, salt kayıt. Sürüş ortasındaki tüm skill kombinasyonları taranmadı |

4A: .NET220 ve ilgili menü4311; Unity89 kontrol,8 görüntü/221 kaynak, UTC `2026-11-09T07:38:22.3299037Z`.8A: .NET7; Unity69 kontrol,10 görüntü/224 kaynak, UTC `2026-11-09T07:51:06.3418113Z`. Son HUD metni için ilgili .NET **870 kontrol**,30/60/120 FPS sunumunda240 sabit adım/durum koruması geçti. Bunlar tam P1–P7 regresyonu değildir.

4A ve8A kanıtları kendi teslimlerine aittir. Sonradan eklenen kaynaklar nedeniyle eski event/workshop/chest/summary checker'ları değiştirilmeden **“Kaynak kapsamı eski”, exit1** verdi; güncel başarı olarak yeniden kullanılmadı. Kayıt `Unity/Logs/b-final-prior-proof-status.txt`. Son oynanış checker'ı225 kaynağı güncel hash'lerle doğrular; bütün olası UI/oyun akışlarının kabulü anlamına gelmez.

## Gözlem → oyuncuya etkisi → kanıt → öneri

| Başlık | Gözlem ve oyuncuya etkisi | Kanıt | Öneri / durum |
| --- | --- | --- | --- |
| Direksiyon, ağırlık, kontrol | Normal klavyede hız ve yön girdiye tepki verdi. Stok+nitro kesitinde4 sn'de27,05 m/sn; motorlu fixture'da28,18 m/sn. Aynı kısa girdide farklılaşma görülür; bunlar saf motor güç testi veya ağırlık hissi puanı değildir. | `world`, `motor-fixture`, `realtime-keyboard` örnekleri; `motor-*` | Tepki doğrulandı; ağırlığın doğal hissi insan kabulü gerektirir. Direksiyon/fizik katsayıları değiştirilmedi. |
| Drift ve toparlanma | Daha yüksek hızda el freni/tam direksiyon sonrası3 dünya örneğinde drift aktif, ardından hız1,53 m/sn'ye kadar düştü ve gövde100→92 oldu. Sürekli sert girdi spin üretebilir; bu rota rahat kontrol için kanıt değildir. | `world`14–20 sn; `world-1`; beta ve body alanları | Gözlem doğrulandı; doğal dozaj/karşı direksiyon kolaylığı insan kabulü gerekli. Otomatik denge revizyonu yapılmadı. |
| Nitro ve skill okunabilirliği | Nitro40→0 tüketimi ve aktif süre görülür. Enerji sabitken eski “DOLUYOR” metni otomatik dolum beklentisi yaratıyordu; “HAZIR DEĞİL” ile düzeltildi. Kancada “HEDEF YOK”, Volt'ta süre/bekleme görünür. | `realtime-*`, `skill-*`, son model hash'i ve HUD870 | Dar metin hatası düzeltildi. Nitro/skill kuralları aynı; hedefin neden uygun olmadığını daha açık göstermek yararlı olur. |
| Kanca, uçuş, havada kontrol | Volt Kanat aktifken Y35,03'e ulaştı;13 örnekte airborne. Havada küçük yön komutları uygulanırken pist dışına çıkma ve mevcut piste dönüş sayacı görüldü. Kanca uygun hedef bulamadı. | `skills-fixture`; `skill-3` ve `skill-4` | Uçuş hareketi doğrulandı; iniş/çizgi koruma ve başarılı kanca açık. Kamera/skill gücü değiştirilmedi. |
| Hız ve kamera | Normal zaman kesitinde araç kamerada izleniyor, hız göstergesi ve çevre konumu değişiyor. Düz ve seyrek çevre güçlü optik hız ipucu vermiyor. Havada ufuk belirgin eğiliyor. | `realtime-0..3`, `skill-3..4` | Takip gözlendi; hareketin rahatlığı/baş dönmesi ve hız hissi insan kabulü gerekli. Sıralı karelerden akıcılık kararı verilmedi. |
| HUD | Sürüş merkezi çoğunlukla açık.720p'de küçük metinler ve üç skill'de kesilen adlar, özellikle “Grappling H...” ve “Flying Dutch...”, öğrenme yükünü artırabilir. Başlangıçtaki atölye sütunu merkezde büyük görünüyor. | `skill-0..4`, `realtime-0`, `world-0` | Yerleşim çakışma/crash göstermedi; yazı boyutu ve marker görünürlüğü insan kabulü gerekli. Yeni grafik fazı başlatılmadı. |
| Risk/ödül kararı | Sandıkta teklif ile kırmızı lanet bedeli ayrık; açılmış teklif alınamıyor. Gerçek XP ile seviye teklifine geçiliyor. Bu rotada yalnız risk0 sürüldü. | `b-chest-cursed-*`, `invalid-*`; gerçek seviye outcome'u | Metin/komut doğrulandı. Diğer risklerin cazibesi/denge dağılımı değerlendirilmedi; ekonomi değişmedi. |
| Dünya, erişim, boss baskısı | Gerçek etkinlik işaretine ulaşılabildi; rota yaklaşık69 simülasyon saniyesi sürdü. Dünya çoğunlukla geniş boş yüzeyler ve tekrarlı primitive engeller. Boss'a doğal süre sonu yerine erken komutla girildi. | `world-0..3`, `gate=True`, boss giriş fixture kaydı | Erişim doğrulandı; tekrar ve boss temposu hakkında yalnız sınırlı gözlem var. Doğal900 sn koşu baskısı test edilmedi. |
| Menüden sürüşe dönüş | Yeni ekranlar eski IMGUI'yi örter; kabul/ret ve menü işlemleri tekrarlı ödül üretmez. İki gerçek sonuç ve seviye seçiminden dünyaya dönüldü. Kariyer/profil/dosya hash'leri korundu. |4A/8A Play ve son `outcomes`/checks | İşlev doğrulandı. Tüm yükleme donmaları/skill ile pause çakışmaları taranmadı. |
| Performans |20 sn normal klavye penceresinde580 örnek: ortanca8,118 ms, p95=13,348 ms, p99=16,723 ms, en büyük26,043 ms; örneklerde50 ms üzeri0. | `realtimeFrameMs`, `b-gameplay-metrics.json`, E1 | Kısa Editor örnekleminde belirgin büyük takılma yakalanmadı. Her render karesi kaydedilmedi; sahne yüklemeleri/görüntü alma etkisi dışarıda, bütün oturum veya cihaz performansı sonucu değildir. |

## İyi çalışan üç yön

1. Gerçek etkinlik, iki farklı fizik yarış bitişi, gerçek seviye seçimi ve boss yenilgisi→özet zinciri veri enjekte edilmiş sonuçlara ihtiyaç duymadan çalıştı.
2. Sandığın teklif/tüketim sözleşmesi ve özetin salt rekor okuması ayrıldı; para/bedel ve kalıcı profil koruması kanıtlı kaldı.
3. Kontroller araçta gözlenebilir etki üretiyor; mevcut motorla aynı kısa girdide hız değişimi, enerji tüketimi, uçuş ve normal klavye hareketi ölçülebildi.

## Sorunlar ve tekrar adımları

Önem sırası kabul riskine göredir; sayısal kalite puanı verilmez. Ortam tüm satırlarda E1'dir.

| Öncelik / durum | Tekrar adımı | Kanıt ve güven | Öneri |
| --- | --- | --- | --- |
| P2 — başarılı kanca kabulü açık |53/Kara Boğa, skill fixture'ı ile Toz Tepeleri; yarış başladıktan yaklaşık1 ve3 sn sonra kanca iste. | `skill-1..2`, `refusal=hedef`, aktif kanca0. Ret gözlemine güven yüksek; mekanik bozukluğu sonucu çıkarılamaz. | Geçerli hedefli kısa rota ve anlaşılır hedef/ret bilgisiyle tek kabul işi. |
| P2 — uçuş/iniş kabulü gerekli | Aynı fixture, Volt Kanat; havadayken testin15 fizik adımında bir verdiği küçük yön komutlarını uygula. | `skill-3..4`: yükselme, ufuk eğimi, ardından pist dışı geri dönüş sayacı. Gözlem yüksek, insan konforu yorumu orta güven. | Doğal el hareketiyle iniş ve pist sınırı kabulü; davranış/denge değişikliği kullanıcı kararı ister. |
| P2 — marker görünürlüğü |53 ilk araçla yeni koşuya gir, ilk konumda kameraya bak. | `world-0`, `realtime-0`: yeşil atölye sütunu aracın üstüne ve merkeze taşıyor. Görsel gözleme güven yüksek. | Sonraki görsel/geri bildirim işinde yakın marker'ın görüşü kapatma durumunu ele al. Bu görevde marker sistemi yeniden tasarlanmadı. |
| P3 — küçük HUD ve kısaltılmış skill adları |720p, üç skill takılı fixture ile sür. | `skill-0..4`; adlar kesiliyor, bilgi kenarda küçük. Gözlem yüksek, okunabilirlik beğenisi insan kabulü. | Kullanıcıya uygun metin ölçeği/ayrıntı erişimi kabulü. |
| P3 — seyrek/tekrarlı dünya | Dünya rotası boyunca görselleri sırayla izle. | `world-1..3`, `realtime-1..3`; primitive ve boş alanlar. Varlık gözlemi yüksek, sıkıcılık iddiası yok. | Profesyonel3D fazına tasarım girdisi; burada yeni grafik üretme gerekçesi sayılmadı. |
| Düzeltildi — pist kimliği | Mutant Toz Tepeleri/Kır Etabı'na gir; fizik planı ile `RaceTrack`/`TrackVisuals.Built` karşılaştır. | Eski `RaceTrack=gp_1`, yeni üç pistte gerçek plan/kimlik/görsel eşitliği kontrolü. İlk çizimin yanlış olduğuna kanıt yoktu; metadata/önbellek anahtarı yanlıştı. Güven yüksek. | `InitializeRace` Mutant'ta gerçek `track.Key` kullanıyor; fizik değişmedi. |
| Düzeltildi — dolum beklentisi | Nitro tüket, enerji yetersizken HUD'a bak. | Önce `DOLUYOR`, son `realtime-3`te `HAZIR DEĞİL`; HUD870 ve güncel hash. Güven yüksek. | Yalnız metin düzeltildi; enerji üretimi/bekleme süresi değişmedi. |

## Cem'in öznel kabul için en fazla beş denemesi

1. Kara Boğa ile30 sn gaz/fren/yön değiştir; ağırlık ve direksiyon tepkisinin beklediğin gibi olup olmadığını söyle.
2. Güvenli bir düzlükte hızlan, kısa el freni ve karşı direksiyon dene; drift başlangıcı ve toparlanmanın okunabilirliğine bak.
3. Nitro ve üç skill varken720p'de bilgileri hareket halinde okuyabildiğini kontrol et.
4. Geçerli hedef yakınında kanca, sonra Volt Kanat ile kısa uçuş/iniş dene; kameranın rahatlığını ve ret bilgisini değerlendir.
5. Sandık teklif/lanet bedeli, yarış riski ve boss süresinin karar vermeyi anlaşılır kılıp kılmadığını kısa bir koşuda değerlendir.

**Sonraki en değerli tek geliştirme önerisi:** kancanın geçerli hedefini/ret nedenini sürüş HUD'unda anlaşılır kılmak ve aynı kısa rotada başarılı bağlanmayı kanıtlamak. Bu işe başlanmadı; yeni fizik/denge döngüsü açılmadı.

## Kanıt yolları ve tekrar

- [Son ham sürüş kaydı](../Unity/Logs/b-gameplay-play.json), [hesaplanan ölçümler](../Unity/Logs/b-gameplay-metrics.json), `Unity/Logs/b-gameplay-editor.log`. Ham çıktı ve PNG'ler yerel/ignore; üretici ve checker commit'te.
- [Normal klavye başlangıcı](../Unity/Logs/b-gameplay-realtime-0-1280.png), [5 sn](../Unity/Logs/b-gameplay-realtime-1-1280.png), [10 sn](../Unity/Logs/b-gameplay-realtime-2-1280.png), [15 sn](../Unity/Logs/b-gameplay-realtime-3-1280.png).
- [Uçuş](../Unity/Logs/b-gameplay-skill-3-1280.png), [iniş/piste dönüş](../Unity/Logs/b-gameplay-skill-4-1280.png), [kısmi tamir](../Unity/Logs/b-gameplay-partial-repair-1280.png), [gerçek boss sonu özeti](../Unity/Logs/b-gameplay-result-2-1280.png).
- 4A `Unity/Logs/b-chest-{normal,cursed,invalid,long}-{1280,1920}.png`;8A `b-summary-{boss,wreck,none,unreadable,long}-{1280,1920}.png`. Her iki ekranın son8+10 görüntüsü açılıp incelendi. Son sürüşte temsilî dünya/yarış/skill/normal zaman ve iki tamir görüntüsü incelendi;30 karenin tamamına ayrı görsel kabul iddiası yok.
- Dar komutlar: `dotnet run --project Unity/Validation --no-restore -- --mutant-chest`, `--mutant-summary`, `--mutant-menu`, `--mutant-hud`; `node Unity/Validation/validate-project.mjs`; `node Unity/Validation/check-mutant-gameplay-proof.mjs`.
- Grafik sürücüsü, yalnız izole ürün korumasıyla `LastTurn.EditorValidation.MutantGameplayPlayValidation.StartGameView -lastTurnUiValidation` üzerinden çalışır. Normal iki yarış aynı koşudadır; boss girişi/atölye/skill kurulum fixture'ları `outcomes` içinde açıkça işaretlidir. Uzun/tam regresyon, push veya yayın yok.

Harici bildirim kanalı bu ortamda bulunmadı. Sohbet ve belge durumları harici bildirim gönderilmiş gibi sunulmadı. Otomatik onay incelemesi bir durum okumasını kullanım sınırı nedeniyle çalıştırmadı; sonraki devam talebiyle erişim yeniden sağlandı ve son kabul tamamlandı.
