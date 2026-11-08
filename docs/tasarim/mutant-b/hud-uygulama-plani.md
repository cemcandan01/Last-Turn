# Mutant B koşu içi HUD — teknik uygulama planı

9 Kasım 2026 · Codex · başlangıç `43cb031`, `codex/unity-p7-garaj`.
[Aynı görev kartı](../../isler/2026-11-07-mutant-m1-kapanis-m2.md) · [ikon envanteri](odul-ikon-envanteri.md).

Bu teslim yalnız inceleme ve plandır; aşağıdaki yeni sınıflar/dosyalar henüz uygulanmadı. İkonlar `a6be53c` ve `678f230` ile tamamdır. B yönü kesin; başka yön veya yeni grafik üretimi önerilmez. Sonraki geliştirme yalnız HUD dilimi olmalı; etkinlik/atölye/sandık/özet ekranlarına taşmamalı.

## Mevcut durum ve yerleşim

- `docs/tasarim/mutant-f.html` → ilk “Sürüş HUD’u” B varyantı, `.hud.layout-b` ve veri kaynakları tablosu esas alınır. HTML içindeki örnek sayılar ve katalog JavaScript'i Unity verisi olarak kullanılmaz.
- `docs/HUD.md §8`: panelsiz, gölgeli okunabilir yazı; B asit yeşili/magenta yalnız vurgu. Ödül ekranının tam ekran biyomekanik çerçevesi sürüşe taşınmaz. Sol üst bölge/boss/gövde/para/seviye/XP; sol alt N nitro ve üç skill; sağ üst mevcut miniharita; sağ alt hız/vites. Üst orta yarış süre/puan/hedef alanı ve alt orta yatay%42–58/alt%35 boşluğu korunur.
- `UiRoot.Hud` mevcut UI Toolkit katmanıdır;1920×1080 referans, `PixelToPanel` dönüşümü vardır. `Hud.Rects`/`Core.HudLayout` ortak koordinat kaynağıdır. Varsayılan masaüstü dikdörtgenleri dört skill/nitro kutusunu tek satıra zorlamaz; sığmayan yuvayı üst satıra alır. Metinler bu alanlara göre ölçülmeli, elle ekran pikseliyle ikinci yerleşim yapılmamalı.
- `MutantScreen.OnGUI` şu anda `MutantBar` içinde tek satır bölge/timer/gövde/para/seviye çizer; değişen Message'ı `TouchDrivingOverlay.Note`a yollar. Nitro/skill kutuları `TouchDrivingOverlay` IMGUI çizimindedir. `RaceHudView` yalnız yarış varken hız/vites/sayaç/bildirim çizer; serbest Mutant sürüşünde UI Toolkit hız göstergesi yoktur.
- `MiniMapView` korunur; bu dilimde harita motoru/rota yeniden yapılmaz. Taslak “sandık haritada gösterilmez” derken mevcut MiniMapView sandık noktalarını da çiziyor. Bu eski fark belgelenir; HUD çalışması içinde işaret görünürlük kuralı sessizce değiştirilmez.

## Gerçek veri bağlantıları

Yollar `Unity/Assets/LastTurn/` köküne göredir.

| HUD bilgisi | Mevcut kaynak | Entegrasyon sınırı |
| --- | --- | --- |
| Bölge / yaklaşan boss | `Prototype/MutantRuntime.Model` → `MutantMenuModel.Region`, `BossId`, `BossName`; `Session.PendingBoss` | Ad/kimlik katalog ayrıştırmadan sunulur; boss seçilmez/üretilmez. |
| Boss süresi | Aynı model `Remaining`, `Timer` | Ekran kendi zaman sayacını çalıştırmaz; mevcut sabit adım/Advance kaynağını okur. PendingBoss durumu ayrıca görünür; yarış sayacıyla karışmaz. |
| Gövde / para / seviye / XP | `Body`, `Money`, `Level`, `Xp`, `NextLevelXp`, `PowerLossPercent` | Toplam gösterilir; ödül/onarım/XP hesabı yapılmaz. |
| Nitro / enerji | `MutantRuntime.Abilities.Nitro()` → `Energy`, `Capacity`, `Cost`, `Open`, `Left`, `Ready` | Çubuk yalnız gösterim oranıdır; nitro maliyeti/tüketimi/kapasitesi yeniden hesaplanmaz. |
| Üç skill yuvası | `Abilities.Skills()` → `Id`, `Name`, `Kind`, `Level`, `Evolution`, `Addons`, `Wait`, `FullWait`, `Left`, `Charges`, `MaxCharges`, `Bar`, `Blocker`, `Open`, `Ready` | `MutantSkillSlot.Read` mevcut Fill/Text/State üreticisidir; bekleme/engel/şarj kuralı UI'a kopyalanmaz. Tetiklenen skill ayrı etiketlenir, aktif düğme gibi sunulmaz. |
| Skill adı/evrim/ikon | `Skills()` tipli alanları ve mevcut ödül modeli/eşleme | Katalog kimlik çözümü saf sunum modelinde; UI JSON okumaz. Evrim adı gerekiyorsa mevcut `MutantMenuModel` ad çözümü ortaklaştırılır. `MutantRewardIcons` yalnız görseli yükler; bulunmazsa `?`. |
| Yakın etkinlik / işaret | `MutantWorldMarkerModel.Read(run)` → `Key`, `Name`, `Kind`, `X`, `Z`, `Used`; `Session.Markers`; araç `ReferencePoint` | Salt sunum sorgusu eksik. Kullanılmışları dışlayan en yakın mevcut işaret ve mesafesi saf modelde hazırlanır. Bu seçim yalnız bilgi içindir; giriş mesafesi/süre/hız ve panel açma yetkisi `MutantMarkerGate`te kalır. Gerçek giriş koşulunu doğrulamadan “içinde dur” denmez. |
| Yol görevi | `Session.Missions.Active` → `Kind`, `Target`, `Progress`, `Remaining`, `Money`, `Energy`; `MutantRoadMissions.Name` | Tipli görev satırı eklenir. Draw/Step/ödül yolu çağrılmaz; görevi başlatmaz veya tamamlamaz. Aktif görev metni yakın işaret satırından öncelikli gösterilir. |
| Mekanik geri bildirimi | `MechanicState.Telemetry` (Triggers/Gain/Spent), `LastTrigger`; `Abilities.Refusal` (Id/Reason/Count), Runtime hasar/görev mesajları | Ekran net enerji farkından mekanik tetiklenmesi uydurmaz. Tipli, salt gözlem snapshot'ı aşağıdaki adaptörde hazırlanır. Fizik olay kuyrukları okunup boşaltılmaz/yeniden gönderilmez. |
| Hız/vites / yarış hedefi | Araç Simulation + `RaceViewModel.Hud`, mevcut `RaceHudView` | Yarışta mevcut sayaç/hız sahibi korunur; yalnız serbest Mutant sürüşünde aynı hız/vites bileşeni kullanılır. Kopya hesap/gösterge oluşmaz. |

## Dosya bazlı uygulama sırası

| Dosya | Planlanan değişiklik |
| --- | --- |
| **Yeni** `Scripts/Core/MutantHudModel.cs` | Salt sunum modeli/builder: koşu özet alanları, nitro, üç tipli slot, görev/yakın işaret ve bildirim satırı. Mevcut MenuModel/Nitro/Skills/Slot.Read çıktılarını birleştirir; `CatalogNode` görünümden uzak tutulur. Null koşu/Abilities, boş yuva, eksik ikon, finished/panel/pause açık durumlarında güvenli boş model. Görünürlük ve bilgi önceliği açık alanlardır. |
| `Scripts/Prototype/MutantRuntime.cs` | Salt `HudModel` sınırı ve geçici bildirim snapshot'ı. AfterPhysics sonrasında mevcut telemetri sayaçlarının farkını kümülatif okuyup sunum sıra kimliğiyle tutar; çoklu fizik adımı bir render'a denk gelince tüm artışları toplar. İlk bağlanma/reset/yeni koşu/yeni bölge sayaç tabanı kurar, geçmiş tetikleri tekrar göstermez. Mevcut hasar/görev mesajı tek sunum kanalına aktarılır. Run.State'e, DamageEvents kimliğine, RNG'ye veya bekleyen skill olaylarına yazılmaz. |
| **Yeni** `Scripts/Ui/MutantHudView.cs` + `.meta` | `UiRoot.Hud` altına panelsiz B öğeleri. Modelden bölge/boss/gövde/para/seviye/XP, nitro ve üç slot çizer. Değişmeyen ikon/slot öğeleri her kare yeniden yaratılmaz. Etkinlik/görev ve kısa bildirim tek satır/öncelik ile sınırlandırılır. `PickingMode.Ignore`: masaüstü HUD fare hava kontrolünü veya sürüşü yakalamaz. Nitro/skill klavye girişi mevcut GtKeyboardInput/GtPrototype yolunda kalır. |
| **Yeni** `Resources/UI/mutant-hud.uss` + `.meta` | B yeşil/magenta, şeffaf zemin, metin gölgesi, dolgu ve durum sınıfları. Hazır/açık/bekleme/engel renk yanında metinle ayrılır; uzun isimler taşmaz. Mevcut font/ikonlar kullanılır, yeni görsel/paket yok. |
| `Scripts/Ui/UiRoot.cs` | Yeni HUD bileşenini bir kez kur; mevcut Hud/Screen/Top sırası değişmez. |
| `Scripts/Prototype/MutantScreen.cs` | Yalnız yeni görünüm gerçekten sahipken eski drive MutantBar/Hint/Message çizimini sustur. Geçici paneller ve Esc/pause işleyicisi korunur; yeni HUD ikinci Esc işleyicisi eklemez. |
| `Scripts/Prototype/TouchDrivingOverlay.cs` | Yeni Toolkit HUD'u aktifken yalnız eski masaüstü Nitro/Skill/Passive çizimini sustur. Dokunmatik kontrollerin çizim/hit-test/release davranışı korunur. Ortak Note'ın Mutant bildirimini iki kez göstermesini tek sahiplikle engelle. |
| `Scripts/Ui/RaceHudView.cs` | Yarış sayacı/hedef/drag sahipliğini koru; serbest Mutant sürüşünde ortak hız/vitesi gösterecek dar görünürlük genişlemesi. Nitro ipucu/note çakışmasını tek sahiplikle çöz; kariyer HUD'u aynı kalır. |
| `Scripts/Prototype/Hud.cs`, `Scripts/Core/HudLayout.cs` | Önce mevcut MutantBar/Nitro/Skill/Passive/Hint/Speed rect'lerini kullan. Görev satırı için gerçekten yetmezse yalnız adlandırılmış Mission rect'i ekle ve çakışma testiyle kanıtla. Alt orta boşluğu daraltma. |
| **Yeni** `Unity/Validation/MutantHudValidation.cs`; mevcut Validation proje/Program | Dar `--mutant-hud` modeli, null/boş yuva, slot sırası, görev/işaret önceliği, bildirim tekilleştirmesi, salt okuma hash'i. Mevcut `--hud` yerleşim testi yalnız rect davranışı etkilenirse çalıştırılır. |
| **Yeni** `Editor/MutantHudPlayValidation.cs` + `.meta`; `Unity/Validation/check-mutant-hud-proof.mjs` | Mevcut Choice/Boss Play üreticilerindeki izole profil, gerçek Game View ve hash/Console kanıt düzenini kullan. Yeni test sistemi/paket kurma. |

Bildirim snapshot'ı oyun kayıt formatına eklenmez; sonlu sayıda satır/sunuma ait süre tutar. Telemetri birikimli miktar verir, bütün kök/ebeveyn olay zincirini gösterdiği iddia edilmez. İlk HUD dilimi “hasatçı tetiklendi / +enerji”, nitro durumu, mevcut skill reddi ve hasar/görev mesajıyla sınırlıdır. Pilotun normal koşuda olmayan mekaniklerini açmak, yeni olay yayını veya hasar kimliği tasarlamak kapsam dışıdır.

## Uygulama kabulü — sonraki görevde çalıştırılacak

1. Dar yeni model testi: model okumasından önce/sonra Run.State/RNG ve kayıt hash'i aynı; boş/üç dolu slot, aktif/tetikli, evrim/eklenti, kapasite0/enerji sınırı, bekleme/engel/şarj ve bilinmeyen ikon. Nitro/skill değerleri mevcut üreticilerle birebir aynı; ikinci timer veya kural hesabı yok.
2. Gerçek kısa Unity Play: serbest dünya → etkinlik yarışı → mevcut ödül → dünya; süre biterken boss; pause/Esc/settings → dön; koşudan çık/yeni koşu. Eski HUD çift çizilmez, görünmez HUD girdi tutmaz; N/1/2/3 ve havada fare kontrolü korunur. Bu plan yeni UI düğmeleri eklemez.
3. Görev/işaret: aktif görev/ilerleme/süre gerçek Session'dan; işaret yakınlığı yalnız gösterim, paneli mevcut gate açar. Hasar/görev mesajı ve skill reddi bir kez; pause/resume/sahne değişimi/eski snapshot tekrar göstermez.
4. Aynı kontrollü kısa sürüş girdisi30/60/120 render FPS altında sabit-adım sonuçları aynı; kümülatif telemetri toplamları/son durum aynı, render sayısına bağlı çift bildirim yok. Olay kuyruğu tüketme/yeniden üretme yok; hasar replay testi yalnız ilgili mekanik adaptöre dokunulursa yenilenir.
5. 1280×720 ve1920×1080 gerçek Game View: boş/dolu slot, uzun boss/skill adı, görev/bildirim ve yarışta sayaç/drag ile çakışma yok. Alt orta boş; miniharita görünür/kapalı ayarı korunur. Console0 yeni hata, güncel kaynak hash'i, ekran görüntüleri ve test profilinin kayıt koruması proof'a yazılır. Geniş P1–P7 regresyonu başlatılmaz.

## Bu plan tesliminde doğrulanan kanıt

- 9 Kasım yerel durum: `43cb031`; son15 commit incelendi, origin fetch başarılı; yalnız `_Recovery` untracked ve korundu. `3001f70` sonrası ikon ve boss/sonuç teslimleri zaten mevcut.
- İkon checker yeniden geçti:94 tanım/64 simge/27 RGBA; görevde sayılan49 ödülün tamamı (31 pasif+5 skill+5 evrim+2 skill eklentisi+6 sandık eklentisi) ayrı simgelidir. Üç kaynakla52; eksik0/M0.42 atölye parçası önceki12 kategori ikonunu paylaşır ve bu görevde değişmedi.
- `.NET --mutant-rewards` yeniden740/128 seed geçti. `check-mutant-choice-proof.mjs` yeniden geçti:208 mevcut kod/veri/görsel hash'i,459 gerçek grafik Play kontrolü,0 çalışma hatası/0 Editor tanısı. Unity kanıtı8 Kasım UTC `2026-11-08T16:05:32.8996994Z`; kod/varlık/ortam değişmediğinden yeniden Play başlatılmadı. Bu,9 Kasım yeni Play koşumu iddiası değildir.
- `Unity/Logs/m2-choice-{offer,icons,curse,replace}-{1280,1920}.png` sekiz gerçek görüntü yeniden açılıp incelendi. Üç seçim/dolu slot/evrim/eklenti/dört rarity/kırmızı lanet okunur; çakışma yok. Curse ortak kart Editor önizlemesidir; fiziksel OS girdisi/insan beğeni kabulü değildir. Önceki kanıt mouse/keyboard/onay/iptal/Esc-pause/RNG/kayıt akışını kapsar. JSON: `Unity/Logs/m2-icons-acceptance-play.json`, `m2-choice-play.json`; .NET: `tests/cikti/mutant-reward-proof.json`.

Bu oturumda HUD/ikon/oyun kodu veya grafik değiştirilmedi; yalnız plan/devir belgesi. Sonraki tek iş bu planın B HUD dilimini uygulamaktır; açık yeni kullanıcı göreviyle başlanır.
