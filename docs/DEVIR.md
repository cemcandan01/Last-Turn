# Son devir: Unity AI destek kurulumu ve sınırları (2026-11-06) — Codex

- Cem'in “gerekli kurulumları yap” onayı uygulandı. Dal `codex/unity-p7-garaj`, başlangıç `e749c37`; tek Codex, yeni alt ajan/Claude model çağrısı/ücretli API yok. Kota bilinmiyor. `_Recovery` korundu, push/merge/yayın yok.
- Coplay **v10.3.0 / aa5fc638d623f56178d50329d9ad8c541a57fe66**, izole uv **0.13.7**, kilitli **75** Python bağımlılığı kuruldu. Ayrı `Unity/Logs/McpEditorPilot` kopyası, stdio/loopback; ana Assets/Packages ve genel istemci ayarı değişmedi.
- Gerçek MCP: **48 araç**, doğru Editor/proje, sahne ağacı, Console, Play/Stop. MCP üzerinden mevcut Garaj Play testi **29/29**, oyuncu kayıt hash'leri aynı. Kanıt `Unity/Logs/McpEditorPilot/Logs/p7-garage-play.json`; yeniden başlatma sonrası `tests/cikti/unity-mcp-pilot/connection-proof.json` da geçti.
- UI kabulü eksik: aktif sahneyle sınırlı nesne araması `DontDestroyOnLoad` UI kökünü bulmuyor; batch ekran yakalaması kuyrukta kalıyor. Ana projeye taşınmadı; tam UI pilot başarısı iddia edilmez. Ayrıntı/kurulum makbuzu/geri alma: [UNITY-MCP-PILOT.md](UNITY-MCP-PILOT.md).
- Claude Code proje kaydı yalnız pilot dizininde; CLI **Project / Pending approval** doğruladı. Kullanıcı bu dizinde `claude` açınca ilk proje güven ekranını inceleyip kabul etmeli. Genel config/trust ayarına dokunulmadı. Başlatıcı `scripts/unity-mcp-pilot.ps1`; salt okunur SDK kontrolü `scripts/unity-mcp-probe.py`. Pilot Editor yeniden açıldı.
- Context7 bağlı ve Unity Manual kitaplığı çözümlendi; görsel üretim yerleşik mevcut. Bunlar yeni kurulum/üretim sonucu değildir. 3B/ses sağlayıcısı, Blender, ML-Agents ve ücretli hizmet kurulmadı; MCP araç listesi bunların erişim kanıtı sayılmaz.
- Sonraki tek teknik adım: grafik Editor oturumunda UI ağacı/ekran kabulü ve upstream arama düzeltmesini değerlendirmek. P7-2 insan görsel kabulü hâlâ açık; yeni oyun ekranı bu kurulum işine eklenmedi.

# Son devir: P7-2 Garaj/Modifiye F teslimi + MCP salt okunur değerlendirmesi (2026-11-06) — Codex

- Dal `codex/unity-p7-garaj`, taban `4ccd81a`, kod/test commit'i **`7f6797f`**; devir kapanış SHA'sı bu notu son değiştiren yerel commit. Tek Codex, yeni alt ajan/Claude/API/ek kredi yok; kota bilinmiyor. Push/merge/yayın/uzun regresyon yok. `_Recovery` korundu ve commit dışı.
- Garaj/Modifiye UI Toolkit F §1–2: `Scripts/Ui/GarageView.cs`, `GarageVehiclePreview.cs`, `UiRoot.cs`, `Resources/UI/lt.uss`; eski IMGUI görünürlüğü `Scripts/Garage/GarageScreen.cs`. Araç kartları/seçim, Mağaza bağlantısı, 12 kategori/42 parça, paket al/tak/sök, sınıf/gerçek performans önizlemesi, Q/E/oklar/M/Enter/X/Esc ve fare. Kurallar mevcut GarageCommand/Session/State içinde; `Core/GarageViewModel.cs` yalnız tipli sunum/önizleme genişlemesi. Araç vitrini mevcut katalog geometrisi; nihai grafik varlığı değil.
- **Gerçek Unity 6000.3.9f1 Play: 29 kontrol**, ayrı `Logs/P2EditorScratch` kopyası, gerçek disk yeniden yükleme, oyuncu dosyaları aynı hash'te. Klavye sentetik aygıttan; fare OS Game View yerine gerçek panel hit-test ve PointerDown/Up yolundan. Dört gerçek UI panel render'ı (3B vitrin dokusu dahil) ajan tarafından incelendi: [Garaj 1920](../Unity/Logs/p7-garage-1920.png), [Garaj 1280](../Unity/Logs/p7-garage-1280.png), [Modifiye 1920](../Unity/Logs/p7-mods-1920.png), [Modifiye 1280](../Unity/Logs/p7-mods-1280.png). İlk çakışmalar düzeltildi; son iki çözünürlükte düğmeler görünür. İnsan oyuncu kabulü değildir.
- Kanıt kodu `Editor/GarageFPlayValidation.cs`, `Validation/GarageFValidation.cs`, `check-garage-f-proof.mjs`, Program ve CI dar adımı. `check-garage-f-proof` **131 güncel C#/USS** hash'ini doğrular. `--garage-f` **294**, `--garage-ui` **117**, kayıt **66**, garaj ekonomi **18.107**, proje kontrolü geçti; .NET Release 0 hata/uyarı. **Önceki F ana menü/HUD Play 27/27** geçti. Ham kanıt `tests/cikti/p7-garage-*.txt`, `Unity/Logs/p7-garage-play.json`; Unity'de önceki MutantRun nullable uyarıları var, yeni C# derleme hatası yok.
- Manuel kabul: `Unity/OYUNCU-TEST-REHBERI.md` → “P7-2”. Diğer P7 ekranları (Mağaza F, yarış hazırlığı, Mutant koşu adımları, Profil/bulut, Ayarlar, pause/sonuç) kapsam dışı ve eski çalışan ekranlarda. Bu ekranlara başlanmadı.
- **MCP:** [karşılaştırma ve somut kurulum kapsamı](UNITY-MCP-PILOT.md). Tek öneri CoplayDev/unity-mcp, incelenmiş v10.3.0 + ayrı kopya + loopback. Unity/Python 3.12.4/Claude Code 2.1.302 yerel sürümleri doğrulandı; uv bulunmadı. IvanMurzak'ın güncel README'si boşluklu proje yolunu dışlıyor. İki adayda bu projeye gerçek bağlantı denenmedi. Paket/sunucu/istemci config'i kurulmadı; izinler, Python bağımlılıkları, Editor kod/yazma riski, abonelik kotası ve geri alma raporda. **Açık kullanıcı onayı olmadan kurulum yok** (kullanıcının bu görevdeki şartı).
- **Sonraki küçük adım:** Cem'in bu iki ekranı manuel kabulü; MCP pilotu için açık kurulum kararı. Sonraki geliştirme önerisi yalnız Mağaza F sunumu; bu görev tamamlandığında duruldu.

# Önceki devir: P7-1 revize — ana menü 4 seçenek, ayrı Yarış ve Mutant menüleri (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; kart → "P7-1 revize: menü yapısı". Cem kararı `docs/GELISTIRICI-AYRINTILARI.md`de. `_Recovery` commit dışı.
- Ana menü: Yarış, Mutant, Profil, Ayarlar. Yarış menüsü: Kariyer/Garaj/Mağaza. Mutant menüsü + başlama onayı. P7/P1/P5/P3 batch Play geçti.
- **Sonraki tek adım:** Garaj + Modifiye F ekranı (yarış menüsünün GARAJ sekmesi, ekranlar-f.html §1–2).

# Son devir: P7-1 F ana menüsü ve panelsiz yarış HUD'u Unity'de (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; kart `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P7-1" (ölçütler + sonuç). `_Recovery` commit dışı.
- UI Toolkit F arayüzü (`Scripts/Ui`), `HudLayout` masaüstü kipi, V kamera / T piste dön, duraklatmada Ayarlar. `--hud` + P7/P1/P5 kontroller/P5 Mutant ilerleme batch Play geçti; görüntüler `Unity/Logs/p7-*.png`.
- **Sonraki tek adım:** sekmelerin F ekranları — önce Garaj + Modifiye (ekranlar-f.html §1–2), sonra Mutant menüsü/onay/adımlar (§5a–d).

# Son devir: P7 F ekranları onaylandı; Mutant ayrı menü (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; yalnız belge/taslak (oyun sürümü artmaz). Kart → "P7" revizeleri. `_Recovery` commit dışı.
- Cem dokuz ekranı onayladı; Mutant kendi menüsü + başlama onayı + araç → yetenek adımlarıyla (`docs/tasarim/ekranlar-f.html` 5a–5d). Karar `docs/GELISTIRICI-AYRINTILARI.md`de.
- **Sonraki tek adım:** HUD.md'ye PC bölümünü yaz; Unity sunum katmanında ortak F bileşenlerini kur, ilk ekran olarak ana menü + yarış HUD'unu uygula.

# Son devir: P7 F yönü seçildi; bütün ekran taslakları hazır (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; yalnız belge/taslak (oyun sürümü artmaz). Kart → "P7" revizeleri. `_Recovery` commit dışı.
- Cem F'yi (sekmeli menü, panelsiz HUD) seçti. Dokuz ekranın F uyarlaması `docs/tasarim/ekranlar-f.html`.
- **Sonraki tek adım:** Cem ekranları onaylar ya da düzeltme ister; sonra HUD.md'ye PC bölümü yazılır ve F Unity sunum katmanında (önce ortak üst şerit/tuş/panel bileşenleri, sonra ana menü + HUD) uygulanır.

# Son devir: P7 PC taslakları (D/E/F) hazır (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; yalnız belge/taslak değişikliği (oyun sürümü artmaz). Kart `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P7" revizesi. `_Recovery` commit dışı.
- Cem: yalnız Windows, dokunmatik tuşlar yok, eski tasarıma yakın PC düzeni, ünlü yarış oyunları örnek alınsın. Taslak `docs/tasarim/menu-hud-pc.html` (D Köşe, E Yayın şeridi, F Sade); ilk A/B/C taslağı yerinde duruyor.
- **Sonraki tek adım:** Cem D/E/F (ya da karışım) seçer; HUD.md'ye PC bölümü yazılıp seçilen yön Unity sunum katmanında uygulanır.

# Son devir: P6-A Windows bulut bağdaştırıcısı (Firebase REST) tamam (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; deneme 0.8.20 yayında (P5). Bu iş aynı dalda; kart `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P6-A". `_Recovery` commit dışı.
- Web oyunuyla aynı Firebase projesi/hesap/`users/{uid}`: misafir, e-posta oluştur/bağla/giriş, şifre sıfırlama, TS eşitleme kuralları. `--cloud-sync` 92 koşul, `--cloud` 3.039, varsayılan C# kontrolleri, Unity batch derleme 0 hata. Canlı: anahtar masaüstünden kabul ediliyor (veri oluşturmayan yoklama).
- Açık: Cem'in Play'de canlı bulut denemesi (`Unity/OYUNCU-TEST-REHBERI.md` → Profil), Google masaüstü girişi, CI `--race-all` (P5 öncesinden; yerelde geçiyor).
- Deneme 0.8.21 yayında. P7 kararları alındı (yarı gerçekçi, önce menü/HUD, ücretli paket onayla, yeni tasarım). Üç yön taslağı `docs/tasarim/menu-hud-taslaklari.html`.
- **Sonraki tek adım:** Cem A/B/C (ya da karışım) seçer; seçilen yön Unity sunum katmanında (uGUI/UI Toolkit) uygulanır.

# Son devir: Cem kabul turu yapıldı; Windows önce, bulut orijinaldeki gibi (2026-11-05) — Claude

- Dal `codex/unity-p3-mutant`; yerel commit'ler hâlâ push/merge edilmedi (taban `6ae5a27`). `_Recovery` commit dışı.
- Kararlar kartta (`docs/isler/2026-11-01-unity-tam-aktarim.md` → "Cem kararları (2026-11-05)") ve `docs/GELISTIRICI-AYRINTILARI.md` kararlar listesinde: mobil ertelendi, Windows'ta geliştirme; bulut aynı Firebase projesi/hesapları.
- **Sonraki tek adım:** Cem'in seçimine göre Windows Firebase REST bağdaştırıcısı ya da görsel/menü fazı; öncesinde P5 commit'lerinin denemeye gönderimi Cem'e soruldu.

# Son devir: P5 uygulandı — A/B/C/D/E/F; aktarım K/Y engelleriyle açık (2026-11-04) — Claude

- Dal `codex/unity-p3-mutant`, gönderilmiş taban `6ae5a27` (= gelistirme, deneme 0.8.19); üstünde yalnız yerel commit'ler (son: bu devir). Push/merge yok. `_Recovery` commit dışı.
- Kart: `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P5 uygulaması" … "P5 son durum ve hazır olma değerlendirmesi". Elle test: `Unity/OYUNCU-TEST-REHBERI.md`.
- P5 bölümleri:
  - **A** kontroller/tercihler (`--controls` 24.641)
  - **B** HUD/miniharita (`--hud` 17.501)
  - **C** hava/kamera (`--conditions` 5.356)
  - **D** bulut sözleşmesi (`--cloud` 3.039)
  - **E** ses altyapısı (`--audio` 22)
  - **F** uçtan uca
- Düzeltilen gerçek hatalar:
  - Yarışta Mutant tuşları bağlı değildi.
  - Mutant yarış HUD'u yoktu.
  - Geçici HUD çakışmaları vardı.
- **Play (hepsi 283 güncel kaynak):** P1 65, P2 59, P3 39, P3 core 8, P4 29, P5 51, P5 ilerleme 17 — hepsi geçti. .NET 35 alan geçti. Batch kopyası için `Validation/Reference` eşitlenmeli (Editor duman kontrolü okur).
- Açık (aktarım tamam değil): gerçek cihaz dokunma/eğim + mobil derleme, Firebase erişimi, ses varlıkları, kokpit iç mekânı/ayna, bölge 3 ve gök sarkacı Play'i, insan kabulü. Matris T24/K14/Y1/D3.
- **Sonraki tek adım:** Cem'in `Unity/OYUNCU-TEST-REHBERI.md` ile elle kabul turu; ardından cihaz derlemesi ve Firebase kararı.

# Son devir: P4 tamam — nitro, beş skill ve fizik/oyun bağı (2026-11-04) — Claude

- Dal `codex/unity-p3-mutant`; kart `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P4 dilim 2–4". Codex dilim 2–3 dosyalarını commit'siz bırakıp durmuştu; Claude doğrulayıp tamamladı. Push/merge/yayın/uzun regresyon yok; `_Recovery` commit dışı.
- TS–C#: skill 181.774 (1,78e−14), skill dünyası 17.600, kuvvet/uçuş 4.009 (3,41e−9), mekanik 589.426, **enerji akışı + HUD 971.504 (1,78e−14)**; P1–P3 koruma sayıları değişmedi.
- Gerçek Unity batch (ayrı kopya): **P4 Play 29/29** nitro + beş skill + iki kombinasyon (Volt Kanat+havada nitro, kanca→Slipstream) gerçek fizik ve gerçek rakiple; P3 Play 39/39, P3 core 8/8, P2 Play 59/59. Denetleyiciler `check-mutant-ability-proof.mjs` vb. güncel kaynakla geçti.
- Açık: dokunmatik düğmeler/sürükleme, skill efekt/ses, evrimli skill Play'i, şehirde kanca Play'i, insan kabulü; P1 Play etkileşimli Editor bekliyor.
- **Sonraki tek adım:** P5 oyuncu yüzeyi — kabul ölçütleri karta yazılarak başlanır.

# Son devir: P3 tamam, P4 dilim 1 (mekanik yürütücü) tamam (2026-11-02) — Claude

- Dal `codex/unity-p3-mutant`, taban `5f64f5d`; kart `docs/isler/2026-11-01-unity-tam-aktarim.md` → "P3 teslimi". Codex dosyaları yazıp Play üretmeden durdu; Cem devri Claude Code'a verdi. Push/merge/yayın/uzun regresyon yok; `_Recovery` commit dışı.
- Saf katman: `MutantRun`, `MutantGameSession`, `MutantMenuModel`, `MutantRacePlan`, `MutantRoadMission`, `MutantVehicle`, `MutantRecordStore`, işaret kapısı. 11 TS–C# kontrolü (`--mutant-*`) fark 0 / ≤2,31e−10; P1/P2 koruma sayıları değişmedi.
- Devirde üç Editor derleme engeli (bozuk .meta GUID dahil) kapandı; Play senaryosundaki yanlış atölye varsayımı düzeltildi (kaynak davranış değişmedi).
- Gerçek Unity batch (ayrı kopya): P3 core 8/8, **P3 Play 39/39** menüden boss kaybıyla koşu sonuna, rekor ayrı dosyada, oyuncu dosyaları korundu; P2 Play 59/59 yenilendi. P1 kariyer Play etkileşimli Editor gerektirdiğinden yenilenmedi.
- Açık: Mutant IMGUI ekranının insan kullanımı, bölge 2–3/boss galibiyeti/süre dolması Play'de yok (oracle'da var). Skill/enerji 121 P4 çağrı sınırında bekliyor.
- P4 dilim 1: `MutantMechanics.cs` (mekanikAdimi/perkler/drift gözlemcisi) `--mutant-mechanics` 589.426 koşul, fark 7,11e−15; oyuna henüz bağlı değil. P3 Play 39/39 yeni kaynakla yenilendi. Kartta P4 kabul ölçütleri ve dört dilim.
- **Sonraki tek adım:** P4 dilim 2 — `beceri.ts` beş skill + yakınlık gözlemi (TS–C# izleri); ardından `enerjiAdimi` oyun/fizik bağı. Cem açık Editor'da P1 kısa Play'i bir kez çalıştırırsa P1 kanıtı da yenilenir.

# Son devir: P2 dünya ve rakip çekirdeği (2026-11-01) — P3 başlamaz

- Dal `codex/unity-p2-dunya-rakip`, P1 tabanı `3ba87ad`, ara commit `607636b`; kapanış SHA'sı aynı kartı (`docs/isler/2026-11-01-unity-tam-aktarim.md`) son değiştiren yerel commit'tir. Push/merge/yayın/uzun regresyon yok. `_Recovery` ve oyuncu kayıtları korundu. TS referansı aynı `df3549e`.
- Otomatik 43 bölge / 19.578 fiziksel nesne (16.672 solid, 2.100 bush, 41 water, 765 box), 812 görsel koni, dokuz şehir rotası. Saf kaynak ızgara/temas/su/sınır ve üç açık dünya/teleport; primitive görünümde ikinci Unity fiziği yok. Gerçek darbe zamanı drift kurallarına bağlı.
- `OpponentPilot`/`OpponentRacer`: 120 kaynak plan, gerçek fizik, sıra/bitiş ve takılma dönüşü. Geliştirici bölümünde gp_1/rx_1/rl_1/dg_1 fiziksel rakipli ödülsüz yarış; normal kariyer kaynak gibi rakipsiz, mevcut Drag manuel kararı korunur. Kaynak YZ Drag otomatik; GTTest geri kesicisi rakibe yayılmaz.
- TS–C#: çevre **8.641**, fark **7,11e−15**; rakip **139.374**, fark **4,55e−13**; dört çevreli YZ bitişi; kayıt **66**, kariyer **3.597** fark 0. GT **10.033**, arazi **250.042 + 197** kısa koruma geçti. Ham kanıt `tests/cikti/p2-*.txt`; derleme 0 hata/uyarı. CI dar adımları eklendi, uzak CI çalıştırılmadı.
- Gerçek Unity Editor Play ayrı proje kopyasında batch ile çalıştırıldı; mevcut küçültülmüş Editor kapatılmadı. Dört oyuncu/YZ yarışı, üç dünya/teleport, gerçek engel ve sınır, kariyer ödülü/yükleme, 10 oyuncu dosyasının hash koruması. Son `Logs/p2-play.json` + `check-p2-proof.mjs`; kamera PNG'leri `Logs/p2-{race,world}-*.png`. Batch kamerası IMGUI/Editor arayüzü kanıtı değildir. Kaynak oyunda hata yok; Unity SearchDatabase başlangıç istisnası ayrı tanıda. İnsan oynanış/etkileşimli UI kabulü yapılmadı.
- Rehber `Unity/DUNYA-VE-RAKIPLER.md`. Araç–araç solver kaynakta yok: Cem'in isteğiyle ayrı `Unity/ARAC-TEMASI-TASARIM.md` hazır, uygulanmadı. Mutant sağlık/armor/pert, düello/kovalama/boss ve sokak/oda girişleri P3/P4 bağıdır; dokuz sokak rotası veri olarak hazır, bağımsız oynanabilir etkinlik sayılmaz. Birleşik dünya kapıları da P3'tedir; matris K statülerini korur.
- Ana Codex çevre/entegrasyon/doğrulama; bağımsız Codex `p2_rakip` ayrı yeni rakip dosyalarını yazdıktan sonra kullanım sınırıyla durdu. Yeni Claude/ajan/API/ek kredi açılmadı. **Sonraki adım:** Cem'in P2 incelemesi; yeni onay olmadan P3 veya yeni araç teması uygulaması başlamaz.

# Önceki devir: P1 tamamlandı ve doğrulandı (2026-11-01) — P2 onayı bekleniyor

- Dal `codex/unity-p1-kariyer`, ara commit `0f83963`; aynı kart `docs/isler/2026-11-01-unity-tam-aktarim.md`. Kapanış SHA'sı kartı son değiştiren yerel commit'tir. Tek Codex; Claude/alt ajan/API/ek kredi yok. **P1 kapandı, P2 başlatılmadı.** Push/merge/yayın/uzun regresyon yok.
- Ana menü → garaj/kariyer → gerçek yarış → sonuç/ödül → kariyer; profil adı/sayaç/km ve pause/devam/dönüş bağları çalışır. Ekonomi/XP/yıldız/kapılar eski servislerden. Kilometre yazılamazsa sahneden çıkış iptal edilip hata görünür; gerçek I/O ret/yeniden deneme testli. Sonuç/pause taşmaları kapandı; rehber `Unity/KARIYER-AKISI.md`.
- Son **P1 Play 65/65**, UTC **15:35:48**, 187 kaynak hash'i güncel: beş tür tamamlandı, gerçek GT klavye sürüşü/pause, yarım yarışın ödülsüz km kaydı, iki Play oturumunda ilerleme/profil aynı, oyuncu dosyaları değişmedi. Görseller `Unity/Logs/p1-result-*.png`, `p1-pause.png`; ajan görsel denetimi yapıldı, Cem'in manuel kabulü değildir.
- .NET P1 **3597**, sayısal fark **0**; Release 0 hata/uyarı. Yarış **293455**, kayıt **66** önceki aynı Core kanıtı yeniden kullanılır. Oracle'ın değişken `updatedAt` saati ayrıldı; diğer 61 snapshot alanları/sayıları değişmedi; peş peşe export ve `--check` başarılı. Dar CI adımları eklendi; uzak CI koşmadı. Editor 37 Core/600+600+1200+6 smoke başarılı. Kanıtlar `tests/cikti/p1-*.txt`.
- **Sonraki tek adım:** Cem'in yeni onayıyla P2 (fiziksel dünya/engel çarpışması/açık dünya/YZ) aynı karttan ayrı dalda başlatılabilir. Kariyere yeni rakip/denge kuralı eklenmez. `_Recovery` korunur; Editor'ın otomatik QualitySettings değişikliği teslim dışıdır.

# Önceki devir: P1 kariyer uygulaması (2026-11-01) — son Play kullanıcı Esc'iyle kesildi

- Dal `codex/unity-p1-kariyer`, taban `bbdebfe`; aynı kart `docs/isler/2026-11-01-unity-tam-aktarim.md`. Sahip tek Codex, Cem açıkça seçti; Claude/alt ajan/API/ek kredi çağrısı yok. **P1 henüz kapanmadı; P2 başlamaz.**
- Ana menü/garaj/kariyer/profil bağları, pause/devam/dönüş, sonuçtan kariyere dönüş, ad ve eksik km kayıt akışları uygulandı. Mevcut ekonomi/ödül/kapı/fizik korunur. Manuel rehber `Unity/KARIYER-AKISI.md`.
- .NET: yeni TS–C# P1 **3597**, fark 0; yarış oturumu **293455**, fark 1,33e−15; kayıt **66**, Release 0 hata/uyarı. İlk gerçek P1 Play menüden beş yarışı bitirdi, ödülü ve iki Play oturumunda yeniden açmayı doğruladı; oyuncu dosyaları korundu (UTC 15:25:38).
- Sonrasında test kapsamına yarım yarış ve gerçek klavye GT km/pause kontrolü eklendi. Son kaynak için Play yeniden koşulmadan kullanıcı fiziksel Esc ile Computer Use'u durdurdu; tekrar UI girdisi gönderilmedi. Eski Play kanıtı güncel sayılmaz.
- **Sonraki tek adım:** kullanıcı devamından sonra P1 kısa Play ve `check-career-flow-proof.mjs`, temel menü/sonuç görsel kontrolü; sonra P1 kapanışı + yerel commit ve P2 onayı bekle. `_Recovery` korunur; push/merge/yayın/uzun regresyon yok.

# Önceki devir: Unity tam aktarım kapsam denetimi (2026-11-01) — uygulama sahibi teyidi bekliyor

- Dal `codex/unity-aktarim-matrisi`, taban `a991221`; tek kart `docs/isler/2026-11-01-unity-tam-aktarim.md`. Matris ve beş büyük paket hazır; **P1 uygulanmadı**. Tamamlandı iddiası yok. Kullanıcı Claude devam edecek dedi; mesaj Codex'e geldi. Uygulayıcı tercihi soruldu; yanıt gelmeden paralel kod yazılmadı.
- TS sabit SHA'daki **122/122 kaynak dosyası** hash'li envanterde; `node Unity/Validation/check-migration-scope.mjs` kapsamı, TS çalışma kaynağını ve matris bağlantılarını denetler. Bu davranış eşdeğerliği testi değildir. Sekiz mevcut Editor/Play kanıt okuyucusu güncel kaynakla başarılı; uzun regresyon ve yeni Play tekrarlanmadı.
- Ana fark: garaj/kariyer yarış çekirdeği var; ana oyun akışı kısmi, Mutant run/skill/YZ/açık dünya yok; çevre çarpışması/ses/mobil kontrol/bulut da kapanmadı. Beş paket aynı kartta ilerler; küçük fonksiyon kartları açılmaz. Ayrıntılı görsel faz sonraya.
- Claude CLI aboneliği claude.ai Pro doğrulandı; ek kullanım manuel ayarı doğrulanmadığından yeni Claude süreci açılmadı. API/ek kredi yok. Mevcut kullanıcının Claude oturumunda devralması veya Codex'in devam etmesi tercihine göre **ilk adım P1'i uygulamak**. `_Recovery` korunur; push/merge/yayın yok.

# Önceki devir: Unity test paneli kullanılabilirliği (2026-11-01) — yalnız yerel

- Dal `codex/unity-test-paneli`, taban `a49d45e`; kart `docs/isler/2026-11-01-unity-test-paneli.md`. Tek Codex; Claude/alt ajan çağrısı yok. Push/merge/uzun regresyon/yayın yok. Teslim SHA'sı kartı son değiştiren yerel commit'tir.
- Garaj / Modifiye / Yarışlar / Test-Geliştirici / Ayarlar; beş tür × sekiz pist, sabit Yarışı Başlat, dg_1 ve GTTest/TerrainTest/RaceTest kısayolları, anlaşılır kilit/sahne hataları. Mevcut komut/oturum servisleri kullanılır; fizik/yarış/ekonomi/TS/kayıt biçimi değişmedi.
- Gerçek Editor fare akışıyla Garaj → Drag dg_1 açıldı; 640×480, 1920×1080 ve serbest Game görünümü incelendi. Yerel görüntüler `tests/cikti/panel-*.jpg`; kısa rehber `Unity/TEST-PANELI.md`. Küçük ekranda mevcut sürüş HUD'u üst üste yazıyor; panel kapsamı dışı, ayrı sonraki UI işi önerisi.
- .NET: panel 54/54, mevcut garaj sunumu 117/117, derleme 0 hata/uyarı. Unity kısa panel erişimi 41/41; beş tür yarış 71/71 (dg_1 11,4 sn tamamlandı). Mevcut GT/Arazi/Garaj kısa testleri ve kaynak hash kanıtları kartta. Bu tur önceki Drag devir notundaki kısa Play açığını da kontrol eder.
- `_Recovery` korunur, Editor'ın otomatik QualitySettings değişikliği teslim dışı. Sonraki tek öneri: sürüş HUD'unu dar ekran için düzenlemek; yeni mekanik yok.

# Önceki devir: Drag'e özel manuel vites ve kalkış (2026-10-31) — yalnız yerel, Unity Play bekliyor

- Dal `claude/unity-drag-manuel-vites` (taban `fcac30e`); kart `docs/isler/2026-10-31-drag-manuel-vites.md`. Sahip Claude; ikinci ajan yok. Push/merge/yayın yok.
- Manuel şanzıman yalnız drag'de; kalkış devri geri sayımda, debriyaj ~0,25 sn'de kavrar; gösterge (geçiş devri, kalkış bandı, uyarılar), E/Q; hayalet vites + kalkış durumu. `--drag` 20 koşul: uygun vites otomatikle ±0,05 sn, erken/geç/hiç/rölanti/kesici kalkış yavaş; 8 drag pisti manuel biter.
- Drag dışı: vites girdisi bit düzeyinde etkisiz; `--assists`, `--race-session`, varsayılan fizik testleri geçti.
- **Açık:** Unity Kısa Play (GT/Arazi/Garaj/Yarış) koşulmadı — Cem başka uygulamadayken Unity'ye odak zorlanmadı. Derleme kanıtları geçti.
- Kayıtlı Cem kararları: TCS TS eşdeğer kalır; drift eşikleri değişmez, Gerçekçi'de kolay drift tasarım incelemesi.

# Önceki devir: Unity sürüş yardımları ve drift oynanışı (2026-10-31) — yalnız yerel

- Dal `claude/unity-surus-yardimlari` (taban `74546cf`); kart `docs/isler/2026-10-31-unity-surus-yardimlari.md`; içerik kaydı `2026-10-31-rl3-icerik-dengesi.md`. Sahip Claude; ikinci ajan yok. Push/merge/yayın/uzun regresyon yok.
- TS yardımları (drift penceresi, kz/ini lastik, str/stm/dft kuvvetleri, hız koruma, TCS gaz kesme yalnız yardımlı araçta) Core'da; `--assists` 24 durum TS tam simülasyonuyla 5,1e-12. Tercih garaj kaydında (`assistLevel`, varsayılan norm); garajda geçici seçici. GT/Arazi prototipi bit düzeyinde aynı.
- Drift: kariyer algısı `DR.on || |β|>0,5`; klavye tekniğiyle real dp_1 1129/700 = 1★; norm/arc'ta yıldız yok (sayılar kartta). Eşikler değişmedi. 40/40 pist norm ile bitti. Unity Play Yarış 69/69, GT/Arazi/Garaj geçti (UTC 13:43); `--catalog` 983.569 koşul.
- **Karar bekleyen:** yardımlı araçta TCS gaz kesme (TS) korunsun mu (GT düzeltmesi 201d7b3 yardımsız prototipte geçerli). rl_3 içerik dengesi.

# Önceki devir: Unity yarış türleri (rx/rl/dp/dg) oynanabilir + rekor/hayalet (2026-10-31) — yalnız yerel

- Dal `claude/unity-yaris-turleri` (taban `745d5d3`). Kart `docs/isler/2026-10-31-unity-yaris-turleri.md` (1. commit); rekor/hayalet ayrı commit ve kart. Açık kartlar: `2026-10-31-drag-manuel-vites.md`, `2026-10-31-unity-surus-yardimlari.md`, `2026-10-31-gt-play-kare-zamanlamasi.md`. Sahip Claude; ikinci ajan yok. Push/merge/yayın/uzun regresyon yok; `_Recovery`, `QualitySettings.asset`, geçici `_ClaudeGeciciTetik` commit dışı.
- Beş türün TS bölge dünyası + su birikintisi fiziği + kariyer drift algısı; `--race-types` 132.239 koşul. `--race-all` gerçek fizikle **40/40 pist bitti** (rl_3 kariyer aracı TS'de de yokuşta kalır; araç 3 ile biter). Unity Play: Yarış 51/51 (gp_1, rx_1, rl_1, dp_1, dg_1), GT/Arazi/Garaj geçti. Garajda **Yarışlar** listesi, HUD **Piste dön**.
- **Rekor/hayalet** (2. commit, kart `2026-10-31-unity-rekor-hayalet.md`): TS `sv_` rekor, `lt_prof` sayaçları, nicemlenmiş girdi kaydı ve hayalet kuralı TS ile aynı; hayalet ayrı fizikte bit düzeyinde aynı yol. Unity Play Yarış 69/69 (UTC 12:58), GT/Arazi/Garaj geçti.
- Açık: sürüş yardımları/yardım seviyesi (drift Unity'de zor), dekor çarpışması, drag manuel vites.
- **Sonraki tek adım:** sürüş yardımları ve yardım seviyesi kararı.

# Önceki devir: Unity yarış kuralları (Paket A) ve yarış oturumu + gp_1 (Paket B) (2026-10-31) — yalnız yerel

- Dal `claude/unity-yaris-kurallari` (taban `03787f2`); Paket A commit'i `4f9b19d`, Paket B ayrı commit. Kartlar `docs/isler/2026-10-31-unity-yaris-kurallari.md`, `…-unity-yaris-oturumu.md`; teknik borç `…-gt-play-kare-zamanlamasi.md`. Sahip Claude (Codex kotası dolu), ikinci ajan yok. Push/merge/yayın/uzun regresyon yok; `_Recovery` ve `QualitySettings.asset` commit dışı.
- **A:** `RaceRules` (drift/bonus/x6, ters, pist dışı/dönüş, kesme algısı, yıldız). Kariyerde kesme yalnız bildirim (ceza TS'de MUTANT'a ait). `--race-rules` 266.363 iz koşulu + 37 TS birim iddiası, en büyük fark 3,4e-13.
- **B:** TS bölge/yarış dosyaları taklit kipli yükleyiciyle sabit SHA'dan çalıştırılarak oracle (`export-race-session.mjs`). Core `TrackWorld`, `RaceSession`, `RaceRun`, `RaceViewModel`, `GarageState.RaceFinished/TrackOpen`. Unity `RaceTest` sahnesi, `GtPrototype` yarış kipi, `RaceHud`, `RaceTrackVisuals`, garajda **Yarış: gp_1**. `--race-session` 293.352 koşul (fark 1,3e-15); `--race-drive` gerçek fizikle gp_1 2:14.6, 2★, ödül garajda.
- **Unity Play (UTC 10:45–10:46):** Yarış 16/16 (aynı 2:14.6, ödül geçici profilde kalıcı, piste dönüş 361 adım), GT 28/28, Arazi 23/23, Garaj 20/20; editor/catalog/track kanıtları geçti. Manuel rehber `Unity/YARIS.md`.
- Açık: rx/rl/dg sürüş dünyası, dekor çarpışması/sınır duvarı, drift fizik bağı, rekor/hayalet/rakip/profil sayaçları.
- **Sonraki tek adım:** rallikros/ralli bölge dünyası `TrackWorld`e (aynı taklit oracle'ı).

# Önceki devir: Unity pist aktarımı — yarış planı 1. aşama (2026-10-31) — yalnız yerel

- Dal `claude/unity-pist-aktarimi`, taban `62e5ba6`; kart `docs/isler/2026-10-31-unity-pist-aktarimi.md`. Teslim SHA'sı kartı son değiştiren yerel commit'tir. Sahip Claude (Codex kotası dolu); ikinci ajan yok. Push/merge/yayın/uzun regresyon yok; `_Recovery` ve `QualitySettings.asset` commit dışı.
- `export-tracks.mjs` sabit TS 0.8.18'den 40 pistin ham tanımı + `mkTrack` geometrisi (`Resources/track-catalog.json`) ve sorgu oracle'ı; THREE'li bölge/yarış dosyalarının 12 bileşim satırı birebir denetlenir. Core `TrackGeometry` (pist.ts sorguları) + `TrackCatalog`/`TrackLayout` (kerb, tabela, rampa, çamur, su, asfalt, başlangıç). Eğri üretimi C#'a yazılmadı.
- **Geçti:** `--tracks` 70.761 koşul, en büyük fark 1,14e-13 (.NET) / 3,58e-12 (Unity Mono), tolerans 1e-9; `gp_1` N=397, 1491,283 m. Unity UTC 09:36: pist kanıtı, editor (27 Core), katalog, GT 28/28, Arazi 23/23, Garaj 20/20. Kısa garaj regresyonu ve `--check`'ler geçti.
- Geçici geliştirici görünümü: **Last Turn → Pist Kataloğu** (çizim + fare altında canlı sorgu).
- Kalıcı karar: `docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı” (kesin; görevlerde yeniden tartışılmaz).
- **Sonraki tek adım:** yarış planı 2. aşama — `yaris-kurallari`, `piste-donus`, `yildiz` saf C# + TS birim testi girdileriyle oracle.

# Önceki devir: Unity garaj ve kalıcı kayıt (2026-10-31) — yalnız yerel, tamamlandı

- Dal `codex/unity-garaj-kayit`, taban `cd365a5`; kart `docs/isler/2026-10-31-unity-garaj-kayit.md`. Teslim SHA'sı kartı son değiştiren yerel commit'tir. Push/merge/yayın/uzun regresyon yok. `Unity/Assets/_Recovery/` commit'e girmez; Unity'nin tekrar tekrar sildiği `QualitySettings.asset` platform tablosu geri alınmış tutulur.
- Codex uyguladı (Core garaj/kayıt/sürüş adaptörü, sahne, oturum, TS oracle, üç .NET doğrulaması, Play doğrulaması) ve 10:37'de kota nedeniyle durdu. Claude devraldı: TS 0.8.18 bağımsız inceleme, takılı parçaya dokununca sökme, `catalogGeneration` geçişi (eski nesil geçirilir, yeni/bilinmeyen kaynak salt okunur), küçük sürüm “gelecek” sayılmaz, saf `GarageCommand`/`GarageViewModel` sunum ayrımı. Model claude-opus-5-5; kota bilinmiyor; API/ek kredi yok.
- **Geçti:** garaj TS–C# 17.947, kayıt 66, sürüş 14.761, sunum 117, katalog 983.569 koşul; `export-garage.mjs --check`. Unity (UTC 09:22): GT Play 28/28, Arazi 23/23, Garaj 20/20; derleme 25 Core + katalog 30; beş `check-*-proof.mjs` geçti. Ekonomi/fiyat/kredi formülü değişmedi.
- **Not:** aynı kaynakla ilk GT Play koşusu “A → sol dönüş” kontrolünde kaldı, ikinci koşu 28/28 geçti; doğrulayıcı adımı Editor karesinde ölçtüğü için kare zamanlamasına duyarlı görünüyor (kanıt `tests/cikti/unity-garaj/gt-play-ilk-kalan.json`). Ayrı küçük iş. Play menülerini Claude, Editor'de geçici (silinen, commit dışı) tetik betiğiyle çalıştırdı.
- Kalıcı mimari kararı: `docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı” (kesin; geçici garaj/HUD/kariyer/yarış/MUTANT ekranları kabul, TS işlevi eksiltilmez, yalnız işlemi engelleyen kullanılabilirlik düzeltilir). Yarış planı: `docs/isler/2026-10-31-unity-yaris-plani.md`.
- **Sonraki tek adım:** yeni dal `claude/unity-pist-aktarimi`, yarış planı 1. aşama (pist verisi/geometri/sorgular, `gp_1` referans).

# Önceki devir: Unity araç / sınıf / modifiye kataloğu (2026-10-31) — yalnız yerel

- Dal `codex/unity-arac-katalogu`, taban `0b341e6`; kart `docs/isler/2026-10-31-unity-arac-katalogu.md`. Teslim SHA'sı kartı son değiştiren yerel commit'tir. Push/merge/yayın/uzun regresyon yok.
- Sabit TS 0.8.18 `df3549e709469f0b519ebfbeaa9f63c1040fee05` içinden otomatik **15 araç / 42 parça / 12 kategori / 5 paket / 28 lastik / 6 yüzey**, 21 kaynak hash manifesti. `Unity/Validation/export-catalog.mjs --check` sapmayı reddeder. TS kaynakları değişmedi; araç/parça elle kopyalanmadı.
- Saf `VehicleCatalog`, `CatalogNode`, `CatalogPerformance`: kurulum/paket/yardım, altı özellik ve sınıf, fizik parametre fabrikası, yarış lastiği, fiyat/kategori kredisi, XP, kariyer bütçesi/yıldız/araç erişimi. Unity **Last Turn → Araç ve Modifiye Kataloğu**; stok/tek parça/paket değerleri ve maliyet incelenir. Rehber `Unity/ARAC-KATALOGU.md`. GT stok C448, asfalt paketi C458/4400 gerçek pencerede gözlendi.
- **Eşdeğerlik:** 1395 norm + 30 yardım kurulumu/**983569 koşul**; 60 tür performansı, 640 ödül, 42 fiyat, 25 yarış lastiği, 140 erişim, 160 yıldız kapısı, XP/bütçe/sınıf uçları ve bozuk veri reddi geçti. Sınıf/para tam; ana tolerans 1e-9 + göreli1e-10. Ek tur tanısı tepe fark **3.90955e-8 sn**, yalnız tanı süresi 1e-6 sn sınırında; sınıf/fizik sınırı büyümedi. `tests/cikti/catalog-validation.txt`, `catalog-export-check.txt`.
- **Koruma:** eski kısa .NET teker/gövde/motor/arazi/toprak denge testleri ve 197 kararlılık koşulu geçti (`catalog-core-regression.txt`). Unity 6000.3.9f1 20 Core + 600/600/1200 adım + 6 gösterim, katalog 30 gerçek kurulum/sürüş testi ve güncel hash'ler geçti. Son gerçek GT **28/28**, UTC 07:18:53; Terrain **23/23**, UTC 07:19:33 (Türkiye 10:18/10:19). Arazi beta önceki kabul ile aynı; son Console 0 hata/uyarı, Play kapalı. `check-editor-proof`, `check-catalog-proof`, `check-prototype-proof`, `check-terrain-proof` başarılı. Sahneler/GT fabrikası/Prototype/paket/ayar diff yok. Tek mevcut çekirdek değişimi negatif alçaltma farkını kabul eden Lift validasyonu; denklem değişmez.
- Sahip Codex; ayrı dosyalı `katalog_aktarim`, `katalog_performans` ve salt okunur `katalog_dogrulama` ajanları kullanıldı. Claude CLI resmi aboneliği doğrulanamadı, çalıştırılmadı; API/ek kredi yok, kesin model/kota bilinmiyor. Plan `2fa8a509-5341-4a1c-8089-f826e66e39dc`. Ajanların bulduğu erişim/bozuk veri/test kapsam açıkları kapatıldı.
- CI adımı eklendi ama çalıştırılmadı; cihaz/IL2CPP/uzun regresyon yapılmadı. Kalıcı satın alma/sahiplik/bulut ve kariyer sürüşü henüz Unity'ye bağlanmış sayılmaz. Ham katalog MUTANT toprak dengesini veya GT'ye özel 3000 RPM düzeltmesini genellemez. Editor'ın `Unity/Assets/_Recovery/` sahnesi korunur, görev commit'ine alınmaz.
- **Sonraki tek öneri:** katalog üstünden Unity garajı ve araç başına parça sahipliği/kategori yatırımının kalıcı kayıt akışı. Yeni fizik mekaniğine ara kararı sürer.
# Önceki devir: TerrainTest toprak kararlılığı (2026-10-31) — yalnız yerel

- Dal `codex/unity-toprak-kararlilik`, temiz taban `25690f9`. Kart `docs/isler/2026-10-31-unity-toprak-kararlilik.md`; teslim SHA'sı kartı son değiştiren yerel commit'tir. Push/merge/uzun regresyon/yayın yok.
- **Kök neden:** önceki TerrainTest ham GT/ar/yarış lastiğini kullanıyordu; TS 0.8.18 gerçek MUTANT kurulumundaki `toprakDengesi` eksikti. Kaynak .55 açık-pay kuralı seçili lastik×araç toprak açığını azaltır; uygun kombinasyonlar ve asfalt değişmez. GT birleşik **.396 → .6678**, ön/arka toprak mu **.31969/.27519 → .53911/.46407**. RX kendi Toprak lastiği **1.4 → 1.4**, GT Toprak lastiği **1.1 → 1.1**. `CreateTerrain()` açık kaynak kurulumunu, `Create()` eski ham GT/asfalt profilini üretir. Genel lastik kuvveti/kayma paydaları/Kp/Ap/C/diferansiyel/direksiyon/fizik kodu değişmedi; yeni ortak bonus yok.
- **Ölçüm:** aynı başlangıç/girdilerle 18 km/sa'ten tam gaz/%35 direksiyon 2 s, bırakınca 1 s beta **82,00 → 9,60°**. 28,8 km/sa/%20 gaz normal dönüşte tepe beta **4,54 → 1,89°**. 43,2 km/sa/%50 fren: toprak **11,6299 → 6,6243 m**, asfalt **3,47504 → 3,47504 m**. Sert el freni toprak kayması hâlâ var (**84,94°** tepe). Uzun tam gaz/direksiyon sınırı aşabilir; bu sonuç gizlenmedi. Kaynak denge aracı daha hızlı da ivmelendirir; her agresif senaryoda tepe beta azalıyor diye sunulmaz.
- **Testler:** 8 araç/lastik/ham-dengeli profil, **48 karşılaştırma + fren/el freni/FPS, 197 koşul**; yeni **8×600×51/250.042** TS/C# izi, aynı toleranslarla reset/30/60/120 FPS geçti. Eski teker/gövde/motor/GT/ham arazi kısa testleri ve tüm eski oracle/fabrika `--check` başarılı. 120 tam hassasiyetli kabul edilmiş GT ölçüm satırı aynen kaldı. Çıktılar `tests/cikti/dirt-validation.txt`, `dirt-final-focused.txt`, `dirt-before.txt`, `dirt-after.txt`. Yeni denge referansı `dirt-balance-0.8.18.json`; bağımsız checker CI akışına eklendi, CI bu tur çalıştırılmadı.
- **Unity gerçek Play:** TerrainTest **23/23**, UTC `2026-10-30T23:40:36.5049426Z` (31 Ekim 02:40:36 Türkiye): gerçek toprakta 18 km/sa kısa yön darbesi tepe beta **3,88355°**, 1 s sonra **.00009495°**. GTTest **28/28**, UTC `2026-10-30T23:41:44.9603792Z`; ileri/fren/geri/tam direksiyon sonuçları aynı. Son kaynak hash denetleyicileri ve Editor 17 Core+5 Prototype / 600+600+1200+6 kısa kontrolleri geçti; MVID `3377535f-aa33-44a4-b2b1-cee065645588`. Son Console 0 hata/uyarı. Yeni profil HUD'da “TS toprak dengesi”; sahne/paket/Input System/TimeManager değişmedi.
- Sahip Codex; bağımsız `zemin_inceleme` ajanı yalnız kaynak kurulum zincirini salt okunur denetledi, dosya yazmadı. Plan `3caeb74e-2d30-416e-a726-5e3d08e31870`; kapasite/model bilinmiyor, API/ek kredi/Claude CLI yok. İlk park sürücüsünde S kaynak otomatik geri seçimine geçtiği için aşama uzadı; park Space'e alındı. Play bitişinde yanlışlıkla açılan normal Play'de Refresh eski input hot-reload NullReference hatası doğurdu; oturum kapatılıp taze Play'de tekrarlandı. Son 23/28 kontroller ve Console temiz; genel hot-reload iyileştirmesi bu işte yok.
- **Sonraki tek adım:** Cem TerrainTest'te 10–20 km/sa kısa W/A/D girdileri, 25–35 km/sa gaz kesip toparlanma, asfalt karşılığı ve fren/Space/R listesini yeniden denesin (`Unity/ARAZI-PROTOTIP.md`). **Bu düzeltme sonrası yeni fizik özelliğine ara verilir; mevcut TS oyun sistemlerini Unity'ye taşıma sırası seçilir.** Yeni fizik, Drag veya tam MUTANT yardımı otomatik başlamaz; genel kariyer/serbest sürüşe MUTANT kuralı sessizce yayılmadı. Cihaz/IL2CPP/CI Editor ve Cem'in his kabulü yapılmış sayılmaz.

# Önceki devir: engebeli zemin ve yüzey fiziği (2026-10-31) — yalnız yerel

- Dal `codex/unity-zemin-yuzey`, temiz taban `201d7b3`; kart `docs/isler/2026-10-31-unity-zemin-yuzey.md`. Teslim SHA'sı kartı son değiştiren yerel commit'tir. GT düzeltmeleri, GTTest dosyası, Input System/TimeManager/paketler korunur; push/merge/uzun regresyon/yayın yok.
- **Güncel karar:** manuel vites genel sürüşe eklenmez; yalnız gelecekte Drag beceri mekaniği. Asfalt/ralli/drift/serbest sürüş/test otomatik kalır. Drag kalkış RPM/patinaj/vites zamanlaması/tork eğrisi sonraki iş; ayrı debriyaj tuşu ilk aşamada zorunlu değil. Bu tur yalnız belgelendi; Drag kodu yok. Kalıcı kayıt `docs/UNITY-GECIS.md`.
- Saf `IVehicleWorld`, her teker yüzeyi/normal, eğime göre reset, ışın teması, teğet lastik kuvveti, gövde-zemin teması/direnci taşındı. Süspansiyon kuvveti gövde-up ekseninde kalır; 1/60 × 8 aynıdır. GT'nin altı yüzey × dört lastik tablosu sabit TS 0.8.18 kaynağından üretilir; asfaltı tek çarpanla toprağa çevirme yok. Genel ham araç kurulumunda `surfaceTires` gerçek tablosu ayrıca verilmelidir; varsayılan eski açık lastik verisidir.
- **Yeni sahne:** `Unity/Assets/LastTurn/Scenes/TerrainTest.unity`; Last Turn → **Arazi Test Sahnesini Aç** / **Arazi Kısa Play Doğrulaması**. Yeni kısayollar Unity Focus Player kısayollarıyla çakıştığı için kaldırıldı. Düz başlangıç, sol toprak/sağ asfalt, 20–60 m tepe, 70–90 tümsek, 105–120 rampa; teker yüzeyi/temas/sıkışma cm tanıları. Rehber `Unity/ARAZI-PROTOTIP.md`. Aynı H fonksiyonu görsel mesh ve fizik için kullanılır; mesh .5 m örneklenir, gösterim sınırı ±40 / −15…360 m. Collider/Rigidbody ikinci fizik yok.
- **Sayısal:** yedi özgün TS senaryosu **4200×51 / 218.790 koşul**, aynı toleranslar; 30/60/120 FPS bit eşitliği ve reset/tekrar geçti. Max konum farkı 2,56e−13 m, yük 6,76e−9 N. Sabit 3500 Nm testinde 6. s asfalt **160,7810**, toprak **75,2060 km/sa**; düşüş/tepe tam-hava **20/29 adım**, sıkışma **0,261829/0,245313 m**. Eski teker 1800/26.241, gövde 3000/150.073, motor 4800×58/288.063, GT 6×1200/10.033 geçti. 201d7b3'ün 120 tam hassasiyetli GT ölçüm satırı aynen korundu. Çıktı `tests/cikti/terrain-validation.txt`; özgün/GT-düzeltme/arazi oracle ve fabrika `--check` başarılı, eski fixture/tolerans değişmedi.
- **Unity 6000.3.9f1:** 17 Core + 5 Prototype derlendi, eski 600+600+1200 adım ve 6 gösterim kontrolü geçti. Arazi gerçek Play **17/17**, UTC `2026-10-30T23:19:40.6464742Z` (31 Ekim 02:19:40 Türkiye): hava/iniş/toprak/karışık yüzey, 64 değerin kayıtlı girdilerle 30/60/120 FPS bit eşitliği; CG max **3,418881 m**, sıkışma **0,294266 m**, fren **28,04486 → 0,11754 m/sn**. GT gerçek Play **28/28**, UTC `2026-10-30T23:19:09.2704850Z`; ileri/fren/geri ve tam direksiyon sonuçları önceki kabul ile aynı. `check-terrain-proof.mjs`, `check-prototype-proof.mjs`, `check-editor-proof.mjs` güncel hash'leri doğrular. Normal Play'de arazi/gövde/HUD görüldü ve Play kapatıldı; Console 0 hata/uyarı.
- Sahip Codex C#/GT/Editor bağlamıyla seçildi. Bağımsız `zemin_inceleme` ajanı kaynak sözleşmesini denetledi ve yalnız iki ayrılmış yeni TS oracle/fixture dosyasını geliştirdi; aynı fizik dosyasında paralel yazma yok. Kesin model/kota bilinmiyor; API/ek kredi/Claude CLI yok. Yerel plan `4c07a0de-1992-498d-8777-b50553a37a5d`. İlk Computer Use Esc ile durdu; Cem devam izni verdi ve kalanlar tamamlandı. Tam dünya/gp3, bariyer/nesne çarpışması, cihaz/IL2CPP, CI Editor ve sürüş hissi kabulü yapılmış sayılmaz.
- **Sonraki tek adım:** Cem TerrainTest'te rehberin asfalt/toprak, tepe/tümsek, rampa/havalanma/iniş ve fren/Space/R listesini denesin. Bu dilimin his değerlendirmesi sonrası yeni iş seçilir; Drag geliştirmesi kendiliğinden başlamaz.

# Önceki devir: GT geri hız / tam direksiyon kalkış düzeltmesi (2026-10-31) — yalnız yerel

- Sahip tek Codex; dal `codex/unity-gt-fizik-hatalari`, temiz taban `726b232`. Kart `docs/isler/2026-10-31-unity-gt-fizik-hatalari.md`; teslim SHA'sı kartı son değiştiren yerel commit'tir. Kabul edilen prototip/Input System/sahne/kamera korunur; push/merge/uzun regresyon yok.
- **Geri hız kökü TS'de de var:** −3 oran, son dişli 3,484 ve ortak 8200 RPM → yaklaşık 100 km/sa. Cem geri vitese özgü motor devir sınırını seçti. Yeni `ReverseMaxRpm`, GT'de açık 3000 RPM manevra ayarı; torku keser, hızı/tekeri kelepçelemez. İleri motor eğrisi/kesicisi aynı; diğer referans araçların varsayılan devir ayarı korunur. 4 s geri **100,00 → 36,68 km/sa**, 20 s **99,70 → 37,08**. %2 kaynak kesici eşiği/teker geçişleriyle gösterge yaklaşık 3100 RPM; yeni kalibrasyon TS verisi diye sunulmaz.
- **Kalkış kökü:** CG yana hızını patinaj sayan TCS gaz kesmesi normal dar yayı boğuyordu. Bu ikinci kesme kaldırıldı; birleşik lastik kuvvetiyle teker bazlı TCS/diferansiyel aynı. Önce tam A/D, sonra W, 1 s **21,04 → 34,44 km/sa**; eşzamanlı W+A 1 s **32,79 → 35,90**. Düz 1/2 s **39,59 / 81,86 km/sa** aynı. Direksiyon sınırı/çekiş çarpanı eklenmedi.
- **Sayısal kısa kanıt:** eski teker 1800/26.241 + gövde 3000/150.073; motor 4800×58/288.063; yeni GT 6×1200/10.033 koşul geçti. 30/60/120 FPS bit eşitliği, reset, sol/sağ simetrisi, fren/el freni, birleşik tutuş/kesici. Eski üç TS fixture değişmedi ve oracle `--check` geçti. Dört özgün motor senaryosu aynı; T16'nın CG kesmesi sonrası izi ayrı **`powertrain-gt-fixes.json`** ile açık düzeltme olarak sınanır. Aynı dosyada üç yeni GT senaryosu var; `export-powertrain-reference.mjs --gt-fixes --check`. Tolerans büyütülmedi. Ham önce/sonra `tests/cikti/gt-physics-before.txt`, `gt-physics-after.txt` (ignore).
- **Unity 6000.3.9f1 son kaynak:** 16 Core + 4 Runtime, 600+600+1200 kısa adım ve 6 gösterim; gerçek Input System Play **28/28**, Console 0 hata/uyarı. Play UTC `2026-10-30T22:50:28.0776671Z` (31 Ekim 01:50:28 Türkiye); geri **36,7388 km/sa / 3092,65 RPM**, tam sol/sağ kalkış **34,4393 km/sa**. Kamera max0,0803 m. Derleme UTC `2026-10-30T22:50:08.0789322Z`, MVID `44b96571-47b6-4678-8acc-b82796ed3622`. `check-editor-proof.mjs` ve `check-prototype-proof.mjs` güncel hash'leri doğruladı.
- Tek uygulayıcı, bağımsız ajan/model çağrısı yok; kota/model bilinmiyor. Yerel koordinatör yalnız plan makbuzu `1f2be0c4-320b-437e-86bc-795a39a9187d`. Başlangıç Git ortak metadata ve NuGet erişimi olağan sandbox yetkisiyle çözüldü. Teşhiste eski T16 izi beklenen şekilde ayrıştı; ayrı oracle'daki ilk GT/T16 kapsam hatası düzeltildi. Son testler başarılı; cihaz/IL2CPP/CI Editor/uzun regresyon ve Cem'in his onayı yapılmış sayılmaz.
- **Sonraki tek adım:** Cem GTTest'te R → A/D'yi önce tam çevir → W; sonra R → S 10 sn → W ile ileri, fren/Space/R kontrollerini yeniden denesin. İki davranış kabul edilince dünya sorgusu/engebeli pist işine dönülür. Rehber `Unity/GT-PROTOTIP.md`.

# Önceki devir: sürülebilir GT prototipi (2026-10-31) — yalnız yerel

- Dal `codex/unity-surulebilir-gt`, temiz taban `25ea571`; önceki `5aa1b55` ve motor commit'i korunur. Kart `docs/isler/2026-10-30-unity-surulebilir-gt.md` (istek 30 Ekim, kapanış 31 Ekim). Teslim commit'i kartı/deviri son değiştiren commit'tir; yerel Git log'dan doğrulanır. Push/merge/yayın yok.
- Tek Codex mevcut C#/Editor bağlamıyla uyguladı ve doğruladı; yeni Claude/sub-agent çağrısı yok. Kesin model/kalan kapasite bilinmiyor. Fizik çekirdeği yeniden ayarlanmadı; GT/ar fabrika verisi doğrulanmış TS 0.8.18 referansından üretildi ve gerçek .NET sayısal senaryosunda kullanıldı.
- **Sahne:** `Unity/Assets/LastTurn/Scenes/GTTest.unity`. Primitive GT gövdesi/dört teker, düz asfalt/çizgiler, yakın takip kamera ve kenarda hız–RPM–vites–yük/temas HUD'ı. Aç → Play → Game'e tıkla; Ctrl+F7 açılış, Ctrl+F8 kısa Play kontrolü. W/↑ gaz, S/↓ fren ve otomatik geri, A/D/oklar yön, Space el freni, R reset. Rehber `Unity/GT-PROTOTIP.md`.
- **Kanıt:** .NET eski 1.800 + 3.000 + 3.000 adımlık izler ve 26.241/150.073/180.042 koşul başarılı. Dört TS/GT üretim kontrolü ve proje/biçim/sözdizimi doğrulamaları başarılı; tolerans değişmedi. Unity 6000.3.9f1, 16 Core + 4 Runtime adaptörü derlendi; eski 600+600+1200 kısa adım ve 6 gösterim testi geçti. Son Console 0 hata/uyarı; fizik 1/60 + 8 aynı.
- **Gerçek Play 18/18:** Input System sanal klavyesi gerçek sahne/Update üzerinden gaz, fren, sol/sağ, Space, geri ve R'yi çalıştırdı. İleri 22.7379 m/sn → frenle 5.7621; geri −16.7384. Kayıtlı gerçek girdiler 30/60/120 FPS'de 58 değer için bit düzeyinde aynı. Kamera göreli kare hareketi max0.1344m (<1.5m kabul sınırı). Kaynak/scene/material/meta hash'leri `check-prototype-proof.mjs` ile doğrulanır. Kanıt `Unity/Logs/gt-prototype-play.json`, UTC `2026-10-30T22:05:11.3458247Z`; çıktılar `tests/cikti/unity-surulebilir-gt/` (ignore).
- Editor ilk AudioListener modül hatası ses kapsam dışı olduğundan kaldırıldı. Adsız sahne additive engeli `Assets/LocalRecovery/BeforeGT.unity` yerel kurtarma kaydıyla, veri silmeden çözüldü; kurtarma/metası ignore. Computer Use ilk tur fiziksel Esc ile durduruldu, kullanıcı “Unity açık, devam edebilirsin” dediğinde devam edildi. Play kanıtı ve normal Play'de kamera/HUD gözlemi tamamlandı; Cem'in sürüş hissi onayı yapılmış sayılmaz.
- İki Input System dosya hash'i aynı; sürüm 1.14.0 ve TimeManager değişmedi. Yalnız yerleşik IMGUI doğrudan modül bağımlılığı oldu, test-framework sürümü korunur. SceneTemplateSettings Editor'ın yeni varsayılan kaydıdır. Rigidbody/WheelCollider yok; dekor collider'ları kapalı. CI Editor/uzun regresyon/cihaz/IL2CPP yapılmadı.
- Sonraki tek adım: Cem manuel GT sürüşünde kamera, klavye hissi ve HUD'ı değerlendirsin; sonra özgün TS dünya sorgusu/engebeli pist dilimi planlanır. Manuel vites/ses/MUTANT/bariyer çarpışması ayrı kapsamdır. Sorunda önce kayıtlı girdiyle teşhis; dengeyi sessizce değiştirme.

# Önceki devir: motor ve aktarma (2026-10-30) — yalnız yerel

- Kullanıcının açık talimatıyla kabul edilen önceki fizik/koordinatör WIP ve kartlar `codex/unity-dort-teker` dalında **5aa1b55d712dd4c8e81587ae8c2321c83223b9c3** yerel commit'iyle güvenceye alındı. Sonra temiz çalışma ağacından `codex/unity-motor-aktarma` açıldı. Push/merge yok. Motor teslim commit'i bu kaydı ve `docs/isler/2026-10-30-unity-motor-aktarma.md` kartını en son değiştiren commit'tir; `git log -1 --format=%H -- docs/isler/2026-10-30-unity-motor-aktarma.md` ile bulunur.
- Sahip tek Codex; C# / oracle bağlamı nedeniyle seçildi. Bu tur Claude/sub-agent çağrısı yapılmadı; kesin model ve kalan kapasite bilinmiyor. TS sabit SHA `df3549e709469f0b519ebfbeaa9f63c1040fee05` değişmedi. Kullanıcı açıklığı: **“Kaynağı birebir taşı; manuel sürüş sonraki görev.”** Kaynakta manuel vites/debriyaj girdisi yok; otomatik şanzıman ve otomatik ileri/geri seçimi taşındı.
- Yeni Powertrain Parameters/State/Vehicle/FixedStepRunner: gaz/direksiyon tepkisi ve ss/sm seçenekleri, tork eğrisi, bağlı devir/rölanti/kalkış tabanı, oran/verim, vites büyütme/küçültme ve tork kesme, motor freni, devir kesici, turbo, TCS/dijital kalkış sınırı ve duruş freni. Önceki gövde/diferansiyel 1/60 sn + 8 alt adımı korur; motor ana adımda bir kez çalışır. Oyun/önayar verisi değiştirilmedi.
- Kısa doğrulama başarılı: eski teker 1.800/26.241 koşul + dört teker 3.000/150.073 koşul + yeni motor **3.000 adım × 58 değer /180.042 koşul**. Bit düzeyinde tekrar/reset ve 4 kare takvimi geçti. GT/RX/T16; rölanti, hızlanma/boşa akış, küçültme, geri/ileri, turbo ve el freni. Aktarma torku en büyük fark `9.4531e-11 Nm` (sınır `1e-4`), RPM `1.1824e-11` (sınır `1e-5`); vitesler tam aynı. Yeni oracle özgün motor/girdi bloklarını sabit SHA'dan çalıştırır.
- Ayrı Unity 6000.3.9f1 gerçek derlemesi: **15 Core**, Console 0 hata/uyarı; eski 600 + 600, motor GT/T16 2×600 kısa adım geçti. `check-editor-proof.mjs` güncel kaynak hash'lerini doğrular; UTC `2026-10-30T15:35:12.4489747Z`, MVID `8f33d58d-8e28-49ed-95de-5b7c4c7f3014`. Kanıt `Unity/Logs/drive-core-compilation.json`; sayısal/derleme listesi/Editor çıktıları `tests/cikti/unity-motor-aktarma/` (ignore). TS oracle/proje/biçim/whitespace kontrolleri başarılı.
- Input System iki hash'i başlangıçla aynı ve güvence commit'inde. Başlangıç PackageManagerSettings boşlukları korundu; eski Editor kanıtı doğru reddedildi, bir pencere etkinleştirme zaman aşımı yenilenen gözlem sonrası çözüldü. Açık test hatası yok. CI Editor lisans işi kapalı; push/merge, uzun regresyon, yayın, IL2CPP/cihaz ve görsel sürüş testi yapılmadı.
- Sonraki tek görev: düz zeminde sürülebilir GT sahnesi; mevcut Input System'den ham DrivingInput, PowertrainFixedStepRunner, eksen dönüşümlü interpolasyon/gövde/dört teker görüntüsü, kamera ve hız–RPM–vites–turbo göstergesi. İkinci Rigidbody/WheelCollider fiziği ekleme. Manuel vites ve engebeli gp3/yardımlar/MUTANT ayrı görevler; sonraki sahip bağlam/kapasiteyle seçilir.

# Önceki devir: dört tekerli rijit gövde (2026-10-30) — ilk teslim anı

- Sahip bu tur Codex (mevcut C#/.NET bağlamı); gerçek bağımsız salt okunur Claude incelemesi tamamlandı. Dal `codex/unity-dort-teker`, HEAD `cf6aa8a` değişmedi. Kart `docs/isler/2026-10-30-unity-dort-teker.md`; önceki kabul edilen çekirdek/koordinatör ve Input System WIP korunuyor. Kalıcı hiyerarşi yok; sonraki sahip yeni görevin bağlam/kapasitesine göre seçilir.
- Saf Core: double vektör/dördey, dört süspansiyon + lastik/fren/çekiş + diferansiyel + aero + gövde-zemin teması, `r×F`, yerel atalet/dünya açısal hızı ve yarı örtük Euler. 1/60 sn + 8 alt adım korunur. Ağırlık transferi süspansiyon/gövde hareketinden doğar; ek `m*a*h/aks` yükü yok. Motor/vites/turbo, yardımlar, engebeli dünya ve tam gp3 henüz taşınmadı; aktarma çıkış torku açık komuttur.
- Claude `claude-opus-5-5`, oturum `80191c40-7ab4-4707-bfd9-da6571474346`, yaklaşık 32,5 sn, ayrı temiz `agents/claude` worktree/TS sabit SHA, araç/dosya/ref değişikliği 0. `claude.ai`/Pro resmi kontrolü ve geçerli manuel ek kullanım kapalı teyidi kullanıldı; kota bilinmiyor, API/ek kredi geçişi yok. Tam geometri/lastik dosyaları ve sınırlı model alıntıları incelendi; koordinatörün 32.000 karakter sınırı nedeniyle modelin tamamı veya C# denetlenmiş sayılmaz. Riskler/uygulama karşılıkları kartta, gerçek rapor `tests/cikti/koordinator/80191c40-7ab4-4707-bfd9-da6571474346.json`.
- Kısa .NET doğrulaması başarılı: eski 3×600 adım/26.241 koşul + yeni 5×600 adım×45 durum değeri/150.073 koşul. RWD durağan/gaz–fren, AWD viraj/el freni/geri sürüş ve iniş; bit düzeyinde tekrar/ilerlemiş simülasyonu resetleme, her senaryoda 4 çizim takvimi, yük transferi ve sınır testleri. En büyük yük farkı `3.602e-10 N` (sınır 0.05), konum `1.368e-13 m` (sınır 1e-5). Toleranslar uygulamadan önce tanımlandı ve genişletilmedi.
- Sabit SHA orijinal TS alt adım bloğu ve gerçek gt/rx + kontrollü ar önayar/yarış lastiği ile referans `Unity/Validation/Reference/four-wheel-0.8.18.json`. Eski/yeni oracle `--check`, proje düzeni, sözdizimi/biçim/whitespace kontrolleri geçti. Çıktılar `tests/cikti/unity-dort-teker/`; Compile listesi 11 Core + Program/VehicleValidation. İlk oracle imza silme hatası düzeltildi; eski Editor kanıtı kaynak değişince doğru reddedilip yenilendi. Son durumda açık test hatası yok.
- Ayrı Unity 6000.3.9f1 gerçek derlemesi ve eski/yeni modelin 600'er adımlık kısa kontrolleri geçti; Console 0 hata/uyarı. `check-editor-proof.mjs` güncel 11 Core hash/zamanını doğrular. Kanıt `Unity/Logs/drive-core-compilation.json`; UTC `2026-10-30T15:12:34.5407576Z`, MVID `645d5044-f996-48bf-b07c-46e63720cd74`. Editor CI hâlâ lisans bekliyor; CI/push, commit/merge, uzun regresyon ve yayın yapılmadı. Cihaz/IL2CPP ve görsel sürüş hissi ölçülmedi.
- Sonraki tek görev: TS motor/devir/vites/turbo ve araç kurulumu parametrelerini bu çekirdeğin aktarma torku sınırına bağla; özgün gaz–fren girdileri için TS izini/toleransları önce belirle. Tam gp3/engebeli sorgu ve Unity giriş/görüntüleme adaptörü sonraki işlerdir. İki Input System dosyası hash'leri karttaki başlangıçla aynı; yazma için yetkili oturum kullanılır, salt okunur koordinatörün izinleri genişletilmez.

# Önceki devir: ilk C# sürüş çekirdeği (2026-10-30) — gönderilmedi

- Sahip Codex, dar Unity/.NET bağlamı nedeniyle tek ajan; kalıcı hiyerarşi yok. Dal `codex/unity-surus-cekirdegi`, HEAD `cf6aa8a` (değişmedi). Kart `docs/isler/2026-10-30-unity-surus-cekirdegi.md`; sabit TS 0.8.18 SHA `df3549e709469f0b519ebfbeaa9f63c1040fee05`. İkinci CLI/ücretli API çağrısı yok; kesin model ve kalan kapasite bilinmiyor.
- Yeni saf Core: lastik kuvveti, 22 bölmeli örtük teker/fren çözümü, Mulberry32, 1/60 sn + 8 alt adımlı boylamsal tek teker düzeneği, çizimden bağımsız biriktirici. Sabit test yükü oyun araç dengesi değildir; tam gp3 600 adım araç/pist eşdeğerliği henüz taşınmadı. Bütün Core dosyaları .NET derleme glob'unda.
- Kısa kontroller başarılı: sabit kaynaktan TS oracle 3 × 600 adım; .NET 1.800 adım × 7 çıktı, 26.241 koşul, tekrar/reset ve 4 çizim takvimi. En büyük kuvvet farkı `4.78e-12 N`; toleranslar kartta önceden tanımlı, genişletilmedi. Çıktı `tests/cikti/unity-surus/dotnet-validation.txt`; gerçek derleme dosya listesi `compiled-files.json` aynı klasörde.
- Ayrı Unity 6000.3.9f1 Editor gerçek derlemesi ve 600 adımlık kısa tekrar kontrolü geçti; 0 C# hata/uyarı. `node Unity/Validation/check-editor-proof.mjs` güncel 6 Core SHA256/zamanını doğruluyor; kanıt `Unity/Logs/drive-core-compilation.json`, UTC `2026-10-30T14:46:37.2626641Z`. Bu tam Editor test paketi/cihaz/IL2CPP kanıtı değildir. Editor CI lisans işi kapalı kaldı.
- Önceki koordinatör WIP ve Input System değişiklikleri korundu; iki korunan dosyanın başlangıç/son hash değerleri kartta aynı. İlk sandbox NuGet.Config/Editor.log okuma engelleri normal erişim onayıyla çözüldü; eski derleme kanıtı kaynak değişince doğru reddedilip Refresh sonrası yenilendi. Commit/push/merge, uzun regresyon ve yayın yok. Yeni/güncellenen dosya listesi kartta; Unity geçiş belgesinde kısa kontrol komutları var.
- Sonraki tek adım: aynı kart/kanıttan devam ederek düz-zemin dünya sorgusu, vektör/dördey ve rijit gövde üzerinde dört teker süspansiyon + gövde kuvvet/tork diliminin TS izini/toleransını önce belirle, sonra C#'a taşı. Salt okunur koordinatör yazma yetkisi açmaz; yetkili geliştirme oturumu kullanılır. Tam gp3/aktarma ve sürülebilir sahne sonraki görevlerdir.

# Önceki devir: yerel Codex–Claude koordinatörü (2026-10-30) — gönderilmedi

- Sahip Codex; dal `unity/yerel-gelistirme`, HEAD `cf6aa8a`. Kart `docs/isler/2026-10-30-yerel-koordinator.md`. Yeni görev sistemi kurulmadı; mevcut kök rehber/kart/devir akışına sınırlı `scripts/koordinator.mjs` ve Unity ek kuralları bağlandı. Oyun sürümü 0.8.18; sabit TS etiketi/SHA korunuyor.
- **Revize 2:** Codex ve Claude Code eşit yetkili geliştiriciler; kalıcı koordinatör yok. Saf yönlendirme iş türü/kanıtlı uzmanlık, aynı kart-SHA bağlamı, ilgili başarı geçmişi ve bilinen 5 saat/haftalık kapasiteye bakar. Küçük işte tek ajan; ikinci bağımsız iş için rol/gerekçe ve ayrı dosya sahipliği gerekir. Eksik resmi kullanım/model bilgisi bilinmiyor yazılır.
- **Revize 3:** resmi CLI kontrolleri Codex ChatGPT/Plus, Claude claude.ai/Pro oturumlarını doğruladı. Codex resmi rate-limit metadata arayüzü var; Claude kotası bilinmiyor, bu tek başına engel değil. Cem “İkisinde de ücretli ek kullanım kapalı” diye manuel hesap ayarını doğruladı; sabit ignore edilen kayıt en çok 24 saat geçerli, hesap/ayar değişirse yenilenir. Bu bilgi otomatik kredi ayarı kanıtı veya ücretli kullanım izni değildir.
- Gerçek revize 3 analizi: Claude `claude-opus-5-5`, `93b95e95-7296-438f-9280-ea93c8ff2b68`, yaklaşık 5,6 sn; yalnız sağlanan package.json görüntüsünde 0.8.18, araç çağrısı 0, dosya/ref farkı 0. Tek yeni model çağrısı. API/üçüncü sağlayıcı env taşınmaz, abonelik kaynak bayrağı sabit; raw auth/stderr veya kimlik bilgisi loglanmaz. Kanıt `tests/cikti/koordinator/93b95e95-7296-438f-9280-ea93c8ff2b68.json`. Codex model adaptörü yalnız sahte süreç/argv testleriyle sınandı.
- Yerel Input System dosyalarının SHA256 değerleri başlangıçla aynı; kayıtları kartta. Revize 2 kısa testleri 28/28 (`tests/cikti/koordinator-revize2-test.tap`), offline Prettier/sözdizimi/Git whitespace başarılı. İki yönlü yerel plan/maliyet engeli kanıtları kartta; yeni model kullanımı yok, iki aboneliğin kapasitesi bilinmiyor. İlk kurulumun proje düzeni kontrolü tarihsel kanıttır. Commit/push/merge, tam regresyon, CI veya yayın yapılmadı. Tam regresyon ve canlı geçiş önceden Cem onayı ister.
- Revize 3 son kısa testleri **34/34** (`tests/cikti/koordinator-revize3-test.tap`), offline biçim/sözdizimi/whitespace başarılı. Gerçek `--oturum` komutu ChatGPT Plus ve Claude Pro'yu doğruluyor; Codex pencereleri varsa okunuyor, Claude kapasitesi bilinmiyor ve engel yapılmıyor. Raw auth/stderr ve gizli config değerleri kaydedilmiyor. Son durum/ref ve Input System özetleri korunuyor; manuel ek kullanım teyidi hesap değişikliğinde yenilenmeli.
- Devir: aynı kart, HEAD, Git durumu, dosya SHA256 manifesti ve test kanıtı hazırlanır. Betik diğer oturumun durduğunu doğrulamadığı için devir `guvenli: false` çıkar; eski uygulayıcı durdurulup kanıtlar doğrulanmadan yeni yazan başlamaz. Gönderilmemiş değişiklikler kaynak worktree'de korunur; otomatik aktarım/commit yoktur.
- Sonraki tek adım: `npm run koordinator -- --oturum` ile güncel abonelik metadata kontrolü; sonra ilk saf C# fizik dilimini bağlama göre iki ajandan birine yönlendir. Salt okunur inceleme için `--calistir`, manuel hesap kontrolü yenilemek için terminalde `--oturum --ajan <ajan> --manuel-kontrol`. İlk fizik kartında kaynak TS 600 adım testi, toleranslar ve Core/Editor kanıtı korunur. Commit/push/merge ve uzun regresyon yok.

# Önceki devir: 0.8.18 denemede — MUTANT bekleme süreli skill'ler, 360° hava kontrolü, köşe/hava kancası, semtli şehir (LT-SYS-009)

- Claude / claude/mutant-hava-kontrol. Kart `docs/isler/LT-SYS-009-mutant-hava-kontrol.md`. Skill'ler enerjisiz (bekleme/hak; nitro enerjide), kanca aç/kapa + seviye kadar hak + köşe/rakip/sokak üstü hedef + parlama, Volt basılı 3 sn yukarı+ileri, havada sürükleyerek burun ve havada nitro, şehirde 5 semt.
- Yerel: kontrol temiz (2 eski uyarı), npm test 465/465, alan mutant 26/26 (bir senaryo düzeltme sonrası tek başına). Açık: denge ve iPhone 13 performansı; "her level" skill seviyesi diye yorumlandı.
- Sonraki tek adım: Cem /dev/ 0.8.18'de şehirde (DEV → Kule Şehri'ne git) kancayı kavşakta, Volt'u basılı tutup burnu sürükleyerek denesin.

# Son devir: 0.8.17 denemede — DEV panelinden Kule Şehri'ne doğrudan geçiş

- Claude / claude/mutant-sehir-dev. DEV atölyesinde "KULE ŞEHRİ'NE GİT" (bölge 2, şehrin girişi, sürüş). Kovalamaca rakibi pist boyunca 45 m önde (aralıklı e2e kalışı düzeldi).
- Yerel: kontrol temiz, npm test geçti, alan mutant 26/26 (iki koşu).
- Sonraki tek adım: Cem /dev/?mutantTest=1 → DEV → Kule Şehri'ne git.

# Son devir: 0.8.16 denemede — MUTANT Kule Şehri: sokak yarışları, Volt Kanat, kanca sarkacı (LT-SYS-008)

- Claude / claude/mutant-sehir (taban gelistirme 17b6828). Kart `docs/isler/LT-SYS-008-mutant-sehir.md`; ölçüm `docs/denge/2026-10-28-mutant-sokak-olcum.md`.
- Bölge 2+ Kule Şehri (ızgara, ~650 bina, Büyük Park); sokak yarışı 3 tür + kontrol noktası kapıları; Volt Kanat skill'i (fizikte `cx.ucus`, yokken aynı); kanca şehirde bina sarkacı; çatılara inilir.
- Yerel: kontrol temiz (2 eski uyarı), npm test 460/460, alan mutant 26/26 + kariyer 31/31 + hud 4/4. Açık: iPhone 13 performansı, uçuş/sarkaç dengesi, şehirde boss rotası yok.
- Sonraki tek adım: Cem /dev/ 0.8.16'te bölge 2'ye geçip (DEV: `?mutantTest=1` + bölge atla) şehirde sürsün, uçsun, sallansın.

# Son devir: 0.8.15 denemede — MUTANT rekabet: etkinlik rakibi, boss rakibi, yol görevleri (LT-SYS-007)

- Claude / claude/mutant-eglence (taban gelistirme 0988774). Kart `docs/isler/LT-SYS-007-mutant-eglence.md`; ölçüm `docs/denge/2026-10-28-mutant-rakip-olcum.md`.
- Her gp/rx/rl/dg etkinliğinde YZ rakip (kariyer hedef kurulumu; risk → kişilik), rakibi geçmek +%50 para; boss yarışı boss'a karşı (drift hariç); açık dünyada yol görevleri (drift/hız/kıl payı/sıçrama). Rakip YZ: açık pist bitişi, geri sayımda el freni, takılınca piste dönüş.
- Yerel: kontrol temiz (2 eski uyarı), npm test 451/451, alan mutant 24/24 + kariyer 31/31 + hud 4/4. Açık: asfalt boss'u bölge 2–3'te eski hedeften biraz yavaş; 5 rampalı pist rakipsiz; cihazda his.
- Sonraki tek adım: Cem /dev/ 0.8.15'te etkinlik rakibi, boss yarışı ve yol görevlerini denesin.

# Son devir: 0.8.14 denemede — MUTANT toprak dengesi, pist = açık dünya

- Claude / gelistirme (Codex PR #33 0.8.13 üstüne; commit 5399408 mesajı yanlışlıkla 0.8.13 der). Kart LT-SYS-006 Revize 3; ölçüm `docs/denge/2026-10-28-mutant-toprak-dengesi.md`.
- `toprakDengesi` (mutant-kosu.ts) koşu aracına ve rakibe uygulanır; MUTANT yarışında `yarisLastigiTak` çağrılmaz (yarislar.ts), rakip de önayar lastiğiyle (rakip.ts). Kariyer değişmedi.
- Yerel: kontrol temiz (2 eski uyarı), npm test 440/440, alan mutant 22/22 + kariyer 31/31. Açık: cihazda his.
- Sonraki tek adım: Cem /dev/ 0.8.14'te asfalt aracıyla toprak yolda ve asfalt pistte sürsün.

# Önceki devir: 0.8.128.13 MUTANT DEV drift ölçümü — PR #33

- **Sahip:** Codex; dal `codex/mutant-drift-telemetri`; görev `docs/isler/LT-SYS-007-mutant-dev-drift-tanisi.md`; PR [#33](https://github.com/cemcandan01/Last-Turn/pull/33).
- **Kapsam:** Fizik değiştirmeden DEV drift yarışında giriş açısı, kontrol edilebilir açı, karşı direksiyon, hazırlık ve spin soğuması görünür; DEV atölyesinden aç/kapat. Normal HUD'da drift açısı gösterilmez.
- **Test:** Hedefli birim + Playwright başarılı (GitHub Actions 40720719293); tam MUTANT alanı, tip/lint/biçim başarılı (40721212555). iPhone gerçek sürüş hissi ve görsel uyum manuel test gerektirir.
- **Sınırlar:** Normal MUTANT, kariyer drift, serbest sürüş ve `master` aynı. **Sonraki tek adım:** iPhone'da stok araç ile drift paketli aynı aracın giriş/limit ve kontrol hissini karşılaştır.

# Son devir: 0.8.12 denemede — MUTANT drift yarışında her araç drift yapabilir

- Claude / gelistirme. Cem: her araç drift yarışında drift yapabilmeli; driftte kalmak upgrade'le kolaylaşmalı, uygunsuz araçta zor ama mümkün. Kart LT-SYS-006 Revize 2; ölçüm `docs/denge/2026-10-28-mutant-drift-tutma.md`.
- `src/fizik/ortak.ts` (yalnız `driftYarisi`): tam direksiyon + gaz tutma girişi (`zorlama`), destek gücü drift uygunluğuna bağlı (`destek`). Kariyer/serbest sürüş değişmedi (kariyer testi geçti).
- Yerel: kontrol temiz (2 eski uyarı), npm test 435/435, alan mutant 21/21. Cem kararı: kolay drift yapan araç kolay yapsın (araçların güçlü olduğu tür farklı olabilir); şart yalnız her aracın drift yapabilmesi. Açık: cihazda his.
- Sonraki tek adım: Cem /dev/ 0.8.12'de uygunsuz bir araçla (ör. Gümüş Serçe, Haki Keçi) stok ve drift paketli drifti karşılaştırsın.

# Önceki devir: 0.8.11 denemede — MUTANT drift yarışında yön kilidi düzeltmesi

- Claude / gelistirme. Cem: "drifte girdikten sonra yön değiştiremiyorum, araba o açıda sabitleniyor". Neden: `driftPenceresi` yarış dalında hedef açı `giris` altına inemiyor, drift yönü girişte kilitleniyordu; yardım direksiyonu bu açıya çekiyordu. Düzeltme (`src/fizik/ortak.ts`, yalnız `driftYarisi`): alt sınır 0, `bt < giris/2` drifti bitirir, kıç öbür yana geçince yön döner. Kariyer/serbest sürüş değişmedi.
- Test: `mutant-drift-test.test.ts` tam fizikle ters direksiyon senaryosu (düzeltmesiz kalıyor, düzeltmeyle geçiyor). npm test 434/434, alan mutant 21/21. Açık: cihazda his; açı/yardım dengesi ölçülmedi.
- Sonraki tek adım: Cem /dev/ 0.8.11'de drift geçişlerini denesin.

# Önceki devir: 0.8.10 denemede — Codex drift atölyesi (#31) + canlı DEV paneli (#32)

- Claude / gelistirme (Cem: "canlıya çıkarma, teste yolla"). Regresyondaki 0.8.9 canlıya çıkarılmadı; `regresyon` dalı ve durum.json olduğu gibi (onay-bekliyor). Bu sürüm ondan sonraki işleri içerir.
- #31 ve #32 sürüm artırmadan birleşmişti; 0.8.10 yapıldı. Birleşme sonrası `kariyer.test.ts` 2 kalış: `driftYarisi` bütün `dp` yarışlarında (kariyer dahil) açılıyordu. Düzeltme: `src/oyun/surus.ts` yalnız `yaris.EV.mutant` iken; kariyer drifti eski ölçülmüş fizikte. İmza yardımcısı kapalı bayrak satırını ayıklar.
- `tests/e2e/duman.mjs` test sunucusu `/dev/` önekini köke eşler (DEV senaryosu `/dev/?mutantTest=1`e geçince 404 veriyordu).
- Yerel: kontrol temiz (2 eski uyarı), npm test 433/433, alan mutant 21/21. Açık: drift his/dengesi ve MUTANT_REFERANS yeniden ölçümü (LT-SYS-006), iPhone 13 cihaz.
- Sonraki tek adım: Cem /dev/ 0.8.10'da DEV paneli ve MUTANT drift yarışını denesin.

# Son devir: MUTANT drift deneme atölyesi ve sandık revizyonu — Codex dalında, inceleniyor

- **Codex / codex/mutant-drift-laboratuvari** (taban gelistirme 5a57aa6), görev kartı `docs/isler/LT-SYS-006-mutant-drift-laboratuvari.md`. Cem'in 28 Ekim isteği; kullanıcı henüz test etmedi ve gelistirme/master'a birleşmedi.
- Eklenen: yalnız yerel veya `/dev/?mutantTest=1` ile 3/3,5/4 dakikalık boss süresi, pasif/skill/seviye/parça seçebildiği ve tek tıkla kurulumu sıfırlayabildiği laboratuvar, doğrudan drift yarışı, yarıştan dönüp tekrar kurma, testte 1–3. bölge atlama. Normal koşu süresi korunur.
- Drift yarışı: serbest sürüşten ayrı ve modifiyeyle değişen 9–17° giriş açısı ile 0,1–0,2 sn hazırlık, otomobil stok karakteri/diferansiyel/açı kiti/drift ayarlarından kontrollü açı tavanı, aşımda spin ve kombo kaybı; diğer yarış tiplerine yeni mekanik henüz eklenmedi. **Gerçek sürüş dengesi ve tüm 3. bölge hedefleri ölçülmedi.**
- Sandık: açılışta bir rastgele ödül, al/reddet, alınmış veya başka açık sandıkta teklif edilmiş olanı diğer sandık sunmaz; eşsiz ödül havuzu bitince kaynak ödülü (para/tamir/enerji); görünür minimap ve ışık kuleleri yerine gizli 3B model. Bilinen yarış uzmanlığı olan upgrade kartında yarış rengi ve ikon; genel kartlar nötr.
- Doğrulama: birim/e2e testleri yeni sandık akışı için güncellendi, drift testleri yazılıp mutant alan koşucusuna kaydedildi; temel 75d4d7 test paketi başarılı, en son commitler için CI tekrarı gerekiyor. Tam kapsam ve kullanıcı kabulü görev kartında. **Claude aynı dosyalarda paralel kodlama yapmasın.** Sonraki adım: PR ve CI sonuçlarına bakıp hataları gider, cihazda drift hissini ve sandık keşfini dene; sonra kontrollü biçimde devral.

# Son devir: MUTANT skill hissi + açık dünya yol ağı (LT-SYS-005) — PR'da

- Claude / claude/mutant-skill-his (taban gelistirme 8817dd3 + Codex PR #29). Kart docs/isler/LT-SYS-005-mutant-skill-his.md.
- Denetim: kanca pist noktasında 100 km/sa'te 0,57 sn'de kopuyordu, açık dünyada hiç çalışmıyordu; Dutchman 1,5 sn yolda 0 m fark; perksiz koşuda enerji hiç dolmuyordu. Düzeltme: halat kayması + yol ağına tutunma, temel sürüş enerjisi (drift 2,5/sn), Dutchman 2,5/3/3,5 sn; efekt+ses (cizim/beceri-efekt.ts); 3 yuvalı HUD + neden; Çorak'a 8 asfalt yol (dunya/yollar.ts).
- Yerel: kontrol temiz, npm test 415/415, tarayıcı beceri-his 7/7, beceri 6/6. Regresyon Cem isteğiyle kesildi (392 geçti; 2 garaj perf kalışı yük kaynaklı, tek başına geçti).
- Açık: nitro sıklığı temel enerjiyle arttı (Cem), Dutchman engel içinden geçsin mi (Cem), iPhone 13 gerçek cihaz.
- Revize 1: pist kesme cezası (atlanan/10 gövde, hayalet de yer) + Dutchman katı nesnelerden geçer. Alan mutant 19/19, yarista-reset 3/3. Açık: kariyerde kesme cezası (şimdi yalnız uyarı).
- Sonraki tek adım: Cem PR #30'u incelesin; birleşince denemeye 0.8.8.

## Önceki iş: MUTANT sistemik skill mimarisi (LT-SYS-004) — 0.8.7 denemede

- Claude / claude/mutant-skill-mimarisi (taban gelistirme 8b036df). Kart docs/isler/LT-SYS-004-mutant-skill-mimarisi.md; kural ALANLAR "MUTANT → Skill sistemi".
- En çok 3 skill; skill'ler ortak olaylarla (HasarVerildi, YakinTakip, NearMiss, KonumEtkisi, DurumUygulandi, KorumaEngelledi) birbirini tanımadan çalışır: saf yürütücü src/cekirdek/beceri.ts, enerji yine mekanikler.ts. Grappling Hook, Flying Dutchman, Risk Taker, Slipstream Engine; seviye/skill eklentisi/evrim ayrı; 3 yeni enerji pasifi. Drift kaporası kilitli (tohum+etkinlik+deneme). Fiziğe tek isteğe bağlı giriş FizikBaglami.dis (yokken birebir aynı; kariyer imzası ayıklar).
- Yerel: kontrol temiz; npm test 402/402; alan mutant birim 80/80 + matris/plan; tarayıcı mutant 14/14, rakip 11/11, beceri 6/6; görüntü tests/cikti/beceri-hud.png (844×390). Ölçüm: kanca Sv3 1,5 sn'de farkı 28,3→15,8 m kapatır, ışınlanma 0; ekonomi döngüsü kendini beslemiyor (tests/cikti/beceri-ekonomi.json). iPhone 13 gerçek cihazda denenmedi.
- Açık: araç-araç çarpışması (Carpisma olayı/çarpışma hasarı hazır, üretici yok), YZ'nin skill kullanması, havuzun kalanı, ralli/drag zaman aşımı gövde erimesi (Codex dalındaki Cem kararı), kaporada drift puanına bağlı ek para. Cem'in mesajı §10'da kesik geldi.
- PR #28 birleşti (gelistirme d86bd72; kaynak 22af3a4). Denetim 40558110357 + 40558096290 başarılı (ilk koşu 40556618708: MUTANT e2e NİTRO denetimi rastgele tohumda Sert Nitro seçince enerji yetmiyordu; 22af3a4'te test o kartı seçmez). Yayın 40558864694 (derleme, /dev/ yayını, adres kontrolü) başarılı. Canlı 0.7.8 değişmedi. Bu ortamdan github.io'ya erişim yok (proxy 403); adres denetimi CI'da.
- Sonraki tek adım: Cem /dev/ 0.8.7'de PR #28'deki 5 deneme kabul maddesiyle oynasın (kanca düelloda, hayalet, Risk Taker drift etkinliğinde, kapora kartı).

## Önceki iş: MUTANT A3 ilk YZ rakip (issue #22) — 0.8.6 denemede

- Claude / claude/mutant-a3-rakip (taban gelistirme 9f92589, PR #24 dahil). Kart docs/isler/LT-SYS-003-a3-rakip-yz.md; ölçüm docs/denge/2026-10-27-rakip-olcum.json.
- Bölge 1 asfalt etkinliği = Yeşil Vadi'de 2 turluk düello; tek YZ rakip (src/yz: çizgi/hız planı, kişilik, pilot, yarışçı; oyun bağı oyun/rakip.ts) oyuncunun stok başlangıç aracıyla, aynı fizikte yalnız gaz/fren/direksiyonla. Güvenli→Çaylak, Riskli→Deneyimli. Çarpışma yok; ışınlanma/rubber-band yok.
- Yerel: kontrol temiz, npm test 376/376, alan mutant 11/11 + hud 4/4. Ölçüm: 50/50 düello bitti, 0 takılma/pist dışı/spin; deneyimli 44,0 / çaylak 49,0 sn uçan tur; tohum tekrarı birebir; sert taşma 16/20 (açık soru: rakibe pist dışı dönüş kuralı). iPhone 13 gerçek cihazda ölçülmedi.
- PR #26 birleşti (gelistirme 3cf10af; kaynak 82727a7). Denetim 40427125277 + 40427117424 başarılı (ilk koşu 40426397044 MUTANT e2e NİTRO beklemesi yavaş CI'da kaldı, 82727a7'de sağlamlaştı). Yayın 40427799983 (derleme, /dev/ yayını, adres kontrolü) başarılı. Canlı 0.7.8 değişmedi.
- Sonraki tek adım: Cem /dev/ 0.8.6'da kart/PR'daki 5 deneme kabul kriteriyle oynasın; sonra issue #25 ya da geçiş/savunma taktiği (Cem'in sırası).

## Önceki iş: MUTANT A2 (issue #19) 0.8.5 denemede

- Claude / claude/mutant-a2 (taban gelistirme 68b3da9). Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §10; ölçümler docs/denge/2026-10-26-mutant-olcum-yagmur.json, -nitro-*.json, -nitro-ozet.txt.
- Nitro (NİTRO tuşu/N: 40 enerji, güç ×1,6, 2,5 sn, 4 sn soğuma), ortak olaylar HasarAlindi/RiskBasladi, sistemik güçler (Çarpışma Pili, Risk Kondansatörü, Nitro kalkanı), eklenti sandıkları (2 normal + 1 lanetli/bölge), nitro hissi (FOV, alev, ses), salt okunur mutantDurumu() (Codex HUD PR #20 için), yağmurlu boss referansı (yalnız Plaj Kros).
- Yerel: npm test 366/366; alan mutant 8/8, hud geçti; matris 696 kombinasyon, nitro payı ≤ %44. Açık: nitro enerji build'i bölge 2'de 14/29 pistte stok araçla geçer (Cem: kalsın mı, ×1,4 mü); drift ölçümünde nitro yok; rallikros bölge 3 tek yolla geçilir.
- 0.8.5 denemede: gelistirme 2358ab9; PR #21 birleşti (CI denetim 40410660885 başarılı; ilk kalış ölçüm JSON biçimiydi, af6de67'de düzeldi); Yayın 40410828298 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi.
- Codex PR #23 (UI V2, taslak, taban claude/mutant-a2) `mutantDurumu()` sözleşmesine uyuyor; atölye başlığını "ATÖLYE" yaptığı için e2e'deki `includes("Atölye")` denetimi o dalda güncellenmeli. Sonraki Claude işi: issue #22 (A2 denge kapanışı + A3 tek NPC düello).

## Önceki iş: MUTANT issue #16 denge 0.8.4

- Claude / claude/mutant. Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §9; ölçüm docs/denge/2026-10-26-mutant-olcum.json (+ birlesik); referans src/oyun/mutant-denge.ts.
- Ölçüm (40 pist × 7 build) motor değişiminin tek başına baskın olduğunu doğruladı: MUTANT'ta satılmaz. Etkinlik risk kademesi (1★/2★/3★, ödül ×1/×2/×3,5, kaçırma süre cezası), bölge atölye stoğu, ölçülmüş boss hedefi (bölge 1 stok, 2 dengeli/uzman, 3 nadir+uzman; bölge 3 pisti tek yolun yetmediği 16 pistten), gövde hasarı/pert/tamir, kural pasifleri (Adrenalin, Cam top, Hurdacı, Kumarbaz, Son nefes).
- 0.8.4 denemede: 14b0548; Denetim 40347092291, Yayın 40347088798 başarılı. npm test 353/353, 5 alan 56/56. Açık risk: rallikros bölge 3 nadir motorla geçilir; drift referansı beceriyi ölçmez. Sonraki: Cem testi; PR #17 (Codex görsel) birleşimi.

## Önceki iş: MUTANT A1 (LT-SYS-002)

- Claude / claude/mutant. Kart docs/isler/LT-SYS-002-mutant-roguelite-tasarim.md §7-8; dal notu docs/notlar/mutant.md; kural ALANLAR "MUTANT".
- v1 (görev + Tutuş Darbesi) Cem testinde başarısız, kaldırıldı. A1: kötü araç + pasif → Çorak Topraklar'da etkinlik/atölye/boss işaretleri → boss geri sayımı (15 dk) → mevcut pistlerde tek turluk etkinlik (kariyer dışı) → XP/pasif, para/atölye → zorunlu boss (hava/gece, sıkı hedef) → bölge 2 ya da özet.
- Yerel: npm test 340/340; 9 alan 89 senaryo (garaj perf ölçümü yük kaynaklı kaldı, tek başına geçti). 0.8.3 denemede: 61fad1d; Denetim 40325792894, Yayın 40325798828 başarılı (0.8.2 CI kalışı yokuştaki etkinlik yeriydi, düzeltildi). Sonraki: Cem oynasın; A2 nitro + eklenti sandıkları.

## Önceki iş: MUTANT v1 0.8.1 denemede (LT-SYS-001)

- Claude / claude/mutant (tek sahip). Kart docs/isler/LT-SYS-001-sistemik-oynanis.md; dal notu docs/notlar/mutant.md; kural ALANLAR "MUTANT".
- Serbest sürüş menüden kalktı, yerine MUTANT: dünya → garaj → 3 perkten 1 → süreli görevler → özet. Tutuş Darbesi tek fizik etkisi (yerel `havaTutusu` çarpanı); yarışta 1. Ödül/XP/kariyer yok, rekor lt_mutant.
- Yerel: kontrol temiz, npm test 338/338, alan mutant+menu+garaj+hud+surus+hayalet+fizik 58/58. CI 40292640713 / 40292780668 başarılı. Matris 129 kombinasyon kırılmasız.
- 0.8.1 denemede: d85e09e; CI 40297645277, Yayın 40297650767 (derleme/yayın/adres kontrolü) başarılı. Canlı 0.7.8 değişmedi. Sonraki: Cem /dev/'de oynasın; zorluk/darbe hissine göre ince ayar; canlı çıkış regresyon + Cem onayı.

## Önceki iş: yakın takip kamerası 0.7.7

- Codex / codex/kamera; kart docs/isler/2026-10-26-yakin-takip.md. Taban mesafe 9 → 6,8 m, hız eki 3 → 2 m; yükseklik 1,7 m, açı 0,25 rad. Uzak/garaj/menü/kaput/kokpit korunur.
- Kaynak ef5803f; CI: https://github.com/cemcandan01/Last-Turn/actions/runs/40238496618. Yalnız kamera alanı ve iPhone 13 yatay görsel kanıtı; tam regresyon değil.
- 0.7.7 denemede: 0746c6f; Yayın 40238705321 derleme/yayın/adres kontrolü başarılı. /dev/ 0.7.7, kök 0.6.8. Sonraki: Cem yeni yakın kadrajı denesin; canlı çıkış regresyon + Cem onayı ister.

## Önceki iş: kariyer gelişimi 0.7.6 denemede

- Codex / codex/kariyer tamamladı. Kart docs/isler/2026-10-25-kariyer-uygulama.md. Kaynak 1fb87cd; CI 40227251363 başarılı: 31/31 alan, 91 seçilen birim + 11 tarayıcı bölümü. Tam regresyon değildir. 0.7.6 birleştirmesi 95ba863; Yayın 40227752816 başarılı. Adres kontrolü kök 0.6.8, /dev/ 0.7.6 doğruladı. Canlı 0.6.8 değişmez.
- 40 yarış sabit D200/D250/D400/C500/B600/açık999 bütçesinde. Üstü ödülsüz deneme, ayrı rekor/hayalet; yeni kariyer rekoru kariyer1_ ön ekinde, eski rekorlar profil/bulutta korunur. Bitiriş tekil.
- Normal motor 8/16/28%; büyük dönüşüm pahalı. Net kategori yatırım kredisi, süreye normalize para/XP, aynı türde iki yıldızla erişim alternatifi; mevcut XP/para/sahiplik/yıldız silinmez. Otomatik bileşik + K1/K2/K3 kalite.
- docs/DENGE.md temel; oyun/kariyer.ts sözleşme. Ölçüm raporları docs/denge/2026-10-25-kariyer-olcum.json (40 pist) ve yatirim-olcum.json (15 örnek). Yeni araç/pist/parça/fizik alanları ölçüm imzası + fiyat sözleşmesini koşar; yalnız etkilenen ölçüm yenilenir. İnsan keyfi/başarı oranı otomasyonla doğrulanmış değildir.
- Gelistirme 0.7.2–0.7.5 drift bonus, drift2 rekor, kerb ve 1 sn sonrası sayaç işleri korundu; yeni kuralla 8 drift hedefi + 3 yatırım örneği yeniden ölçüldü. 32 zamanlı pistte kuvvet/kinematik aynı olduğu kanıtlanıp başarılı ölçüm yeniden kullanıldı.
- Seviye penceresinin sonuçtan sonra garaj/sürüşü kapatması ve bonusun direksiyon alanıyla çakışması düzeldi. Garaj mevcut aracı geliştirmeyi önerir; sınıf/puan büyük, motor düğmesi altında kalır.
- Sonraki: Cem denemede oynasın, gerekirse ince ayar; canlı çıkış ancak regresyon + Cem onayıyla. Konu/deneme gönderiminde yeniden onay isteme. Önceki canlı kanıtı docs/isler/2026-10-25-canli-esitleme-regresyon.md.
