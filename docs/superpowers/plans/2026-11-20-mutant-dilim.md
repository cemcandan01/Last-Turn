# MUTANT Dikey Dilim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2 belirgin farklı arabayla, 10 kartlık kural değiştiren skill setiyle, 3 rakipli yarış + sabit boss'tan oluşan ~10 dakikalık, kazanılabilir ve tek tuşla tekrar denenebilen bir MUTANT koşusu.

**Architecture:** Yeni saf Core sınıfı `MutantSlice` bir "dilim modu" bayrağı ve dilim verisini (araç ayarı, kart seti, düğüm grafiği) tutar. Bayrak yalnız MUTANT koşusu başlarken açılır; kapalıyken mevcut kod, TS referans testleri ve kariyer birebir aynı çalışır. Dondurulan her şey silinmez, bayrakla atlanır. Yarışlar arası akış açık dünya yerine saf bir düğüm modelinden ve mevcut `MutantRacePlan` / `MutantRuntime.StartRace` yolundan geçer.

**Tech Stack:** Unity 6.3 LTS, saf C# Core (`Unity/Assets/LastTurn/Scripts/Core`), UI Toolkit görünümleri, .NET doğrulama projesi (`Unity/Validation`, `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release -- --<bayrak>`).

**Spec:** `AGENTS.md` (Tasarım sütunları + "Karar (Cem, 20 Kasım 2026): MUTANT dikey dilimi") ve `rapor.md` (önceki turun tasarım önerisi, Cem tarafından onaylı).

## Global Constraints

- Kullanıcı metni, yorum ve commit mesajı Türkçe. Oyun arayüzünde emoji ve marka logosu yok.
- Core'da UnityEngine, girdi, sahne, arayüz yok. Görünüm kural içermez, yalnız görünüm modelini çizer.
- Fizik sabit adımlı (1/60 sn, 8 alt adım) ve belirlenimli kalır. Katalog JSON'larına (`vehicle-catalog.json`, `mutant-catalog.json`) dokunulmaz; dilim ayarı kod katmanında MUTANT kopyasına uygulanır.
- Kariyer, drag/drift ve TS referans testleri değişmez. `MutantSlice.Enabled` kapalıyken mevcut `--mutant-*` ve `--opponents` doğrulamaları aynı sonucu vermeli.
- Dilim: arabalar Bordo Tilki (`c33`) ve Bozkır Tavşanı (`golf`); yarışlar rakipli asfalt (`gp`) ve rallikros (`rx`); boss sabit Gece Şahini (`gece-sahini`); 3 skill yuvası; meta ilerleme yok.
- Dondurulanlar silinmez: açık dünya/yol görevleri, MUTANT miniharita/işaretler, sandık/lanet, atölye/parça stoğu/tamir, Bölge 2–3/şehir, drift ve drag etkinlikleri, Volt Kanat, ekonomi ve sayısal pasifler, 15 dk geri sayım.
- Kirli çalışma ağacındaki Codex'e ait dosyalar (Pit menü, `_Recovery`, UI değişiklikleri) commit'e alınmaz; her commit yalnız o görevin dosyalarını ekler.
- Her görevin sonundaki **Kontrol noktası**, Cem oynayıp onaylamadan sonraki göreve geçilmez.

## Review Focus

- Bayrak kapalıyken (kariyer, TS testleri) araç/skill/seçim davranışı birebir aynı kalmalı: mevcut `--mutant-*`, `--opponents` ve `--garage-f` sonuçları değişmez.
- Gövde hasarı yarışlar arasında taşınır ve tamir yoktur; 0 gövdede koşu "pert" ile biter, Tekrar Dene yine çalışır.
- Tekrar Dene: aynı araba, yeni tohum; önceki koşunun skill/pasif/gövde durumu sızmaz.
- Skill yuvası dolu (3) iken 4. teklif: bırakma seçimi olmadan teklif kabul edilemez, yükseltme/evrim/eklenti teklifi yine çıkar.
- Bir kart seçeneği havuzda kalmadığında (örn. tüm pasifler alınmış) seçim ekranı boş kalmaz, koşu kilitlenmez.

---

### Task 1: Dilim bayrağı ve iki arabanın ayrışması

**Files:**
- Create: `Unity/Assets/LastTurn/Scripts/Core/MutantSlice.cs`
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantVehicle.cs` (`Apply`, `DirtBalance` çağrı yolu: `Configure`)
- Create: `Unity/Validation/MutantSliceCarsValidation.cs`
- Modify: `Unity/Validation/Program.cs` (yeni bayrak `--mutant-slice-cars`)

**Interfaces:**
- Produces: `public static class MutantSlice { public static bool Enabled {get;set;} /* varsayılan false */; public static readonly string[] CarKeys = {"c33","golf"}; public static CatalogNode TuneCar(CatalogNode car); }` `TuneCar` yalnız `Enabled` iken ve `car["k"]` bir `CarKeys` değeriyse alanları değiştirilmiş bir klon döndürür, aksi halde aynı düğümü.
- Consumes: `MutantVehicle.Apply(CatalogNode stock, IEnumerable<string> passives, ...)`; `GarageBenchResult.Measure(VehicleCatalog, CatalogSetup)` (`GarageBench.cs`: `Hundred`, `Brake60`, `Slip`).

- [ ] **Step 1: Failing test.** `MutantSliceCarsValidation.Run()` iki araç için `MutantSlice.Enabled=true` ve `false` ile `GarageBenchResult.Measure` alır. Assertion'lar: (a) `Enabled=false` iken `Measure` sonuçları ayarsız referansla birebir aynı; (b) `Enabled=true` iken Tilki ile Tavşan arasında `Brake60` farkı ≥ %15, `Slip` farkı ≥ %15, `Hundred` farkı ≥ %10; (c) `TuneCar` yarı tanımlı araçta (`k` yok) aynı düğümü döndürür.
- [ ] **Step 2: Run** `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release -- --mutant-slice-cars`. Expected: derleme hatası ya da FAIL (`MutantSlice` yok).
- [ ] **Step 3: Implement** `MutantSlice.TuneCar` ve `MutantVehicle.Apply` başında çağrı. Başlangıç değerleri (hissederek ayarlanacak, kontrol noktasında Cem'le revize edilir): Bordo Tilki `iz` ×1.25, `rb` ×0.85, `brk` ×0.8, `dmax` +0.12, `trq` ×1.1; Bozkır Tavşanı `iz` ×0.75, `rb` ×1.12, `brk` ×1.3, `awd` 0.65, `hp` ×1.1. Değerler `MutantSlice` içinde adlandırılmış sabitlerdir.
- [ ] **Step 4: Run** aynı komut. Expected: PASS. Ardından `--garage-f` ve `--mutant-hud` koşulup değişmediği doğrulanır (bayrak kapalı).
- [ ] **Step 5: Commit** (`MutantSlice.cs`, `MutantVehicle.cs`, doğrulama dosyaları): `MUTANT dilimi: dilim bayrağı ve iki araba ayrışması`.

**Kontrol noktası 1 (Cem oynar):** Task 2'nin başlangıç ekranı hazır olmadan sürülemez; bu yüzden Task 2 ile birlikte onaylanır.

### Task 2: Dilim başlangıç ekranı ve araç denemesi

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantMenuModel.cs:142` (`Read`: `MutantSlice.Enabled` iken `StartingCarsCards` yalnız iki arabayı döndürür)
- Modify: `Unity/Assets/LastTurn/Scripts/Prototype/MutantRuntime.cs` (koşu başlarken `MutantSlice.Enabled=true`, `Exit` içinde `false`)
- Test: `Unity/Validation/MutantSliceCarsValidation.cs` (ek senaryo)

**Interfaces:**
- Consumes: `MutantSlice.Enabled`, `MutantMenuModel.Read(MutantRun, VehicleCatalog, int selectedCar)`.
- Produces: `MutantMenuModel.StartingCarsCards` dilimde tam 2 kart (`golf`/`c33`).

- [ ] **Step 1: Failing test:** `Enabled=true` iken `Read(...).StartingCarsCards.Length==2` ve kart `Type`'ları `rx`/`dp` değil `c33`/`golf` araç kimlikleriyle eşleşir; `Enabled=false` iken eski 3/5 kart davranışı aynı.
- [ ] **Step 2: Run** `--mutant-slice-cars`; FAIL.
- [ ] **Step 3: Implement** filtre ve bayrağın `MutantRuntime` giriş/çıkışında açılıp kapanması.
- [ ] **Step 4: Run** `--mutant-slice-cars` PASS; `--mutant-summary` ve `--mutant-hud` değişmeden geçer.
- [ ] **Step 5: Unity derle + Play doğrulaması** `EngagementPlayValidation` benzeri mevcut MUTANT başlangıç doğrulamasıyla (Editor'ı görünür açma; `-batchmode`).
- [ ] **Step 6: Commit:** `MUTANT dilimi: iki araçlı başlangıç ekranı`.

**Kontrol noktası 1 (Cem oynar):** MUTANT → iki araç → serbest sürüş (mevcut Geliştirici modu, F2) ve Atölye A/B (0–100, 60–0, slalom). Cem iki arabayı sürüp "gerçekten farklı mı?" der. Onay yoksa Task 1 sabitleri birlikte ayarlanır, sonraki göreve geçilmez.

### Task 3: Dilim kart seti ve 3 yuva

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantSlice.cs`
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantRun.cs:72-86` (`SkillOffers`, `DrawChoices`)
- Create: `Unity/Validation/MutantSliceCardsValidation.cs`; Modify: `Unity/Validation/Program.cs` (`--mutant-slice-cards`)

**Interfaces:**
- Produces: `MutantSlice.ActiveSkills = {"slipstream-engine","grappling-hook","flying-dutchman","risk-taker"}`; `MutantSlice.Passives = {"takip-dinamosu","kalkan-bataryasi","drift-harvester","temiz-cikis"}`; `MutantSlice.SkillAddons = {"sok-bobini","kor-cekirdegi"}`.
- Consumes: `MutantRun.SkillOffers()`, `MutantRun.Choose(string id, string drop)`, `MutantSkills.Slots` (3).

- [ ] **Step 1: Failing test:** `Enabled=true` iken yeni bir `MutantRun` için 200 farklı tohumda `SkillOffers()` ve `DrawChoices` çıktıları yalnız yukarıdaki 10 kimlikten oluşur; `volt-kanat` ve sayısal pasifler hiç çıkmaz; eklenti teklifi yalnız uyumlu skill'e (`Compatible`) çıkar. Yuva 3 doluyken yeni skill (`b:`) teklifi `drop` olmadan `Choose` ile reddedilir, `y:`/`v:`/`e:` teklifleri kabul edilir. Havuz tükendiğinde `secenekler` boş kalmaz ya da faz `surus`'a döner. `Enabled=false` iken katalog davranışı birebir aynı.
- [ ] **Step 2: Run** `--mutant-slice-cards`; FAIL.
- [ ] **Step 3: Implement** havuz filtresi: `Catalog` değiştirilmez, `SkillOffers`/`DrawChoices` içinde `MutantSlice.Enabled` iken kimlik listesine göre süzülür.
- [ ] **Step 4: Run** yeni test PASS; `--mutant-pairs`/`--mutant-hud` (mevcut) değişmeden geçer.
- [ ] **Step 5: Commit:** `MUTANT dilimi: 10 kartlık set ve 3 yuva`.

**Kontrol noktası 2 (Cem oynar):** Geliştirici modunda (F2) her kart tek tek denenir; ödül kartlarındaki metinlerin okunur olduğu görülür.

### Task 4: Combo'lar

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantPairs.cs`, `MutantSkills.cs`, `MutantAbilityDriver.cs` (yalnız gerektiği kadar)
- Create: `Unity/Validation/MutantSliceCombosValidation.cs`; `Program.cs` (`--mutant-slice-combos`)

**Interfaces:**
- Produces: `MutantPairs` önizleme listesine 5 dilim combo'su (`Hayalet Batarya`, `Kancalı Şok`, `Kor Döngüsü`, `Rüzgâr Avcısı`, `Drift Motoru`) adı ve etki cümlesiyle eklenir (`Preview(...)` çıktısı).
- Consumes: `MutantPairs.Preview(CatalogNode state, string offer, CatalogNode catalog, out string effect)`.

- [ ] **Step 1: Failing test (her combo için ayrı senaryo, sabit tohum ve sabit girdi):**
  1. Hayalet Batarya: Flying Dutchman fazında `KorumaEngelledi` kaydı → enerji, Kalkan Bataryası kazancı kadar artar.
  2. Kancalı Şok: Grappling Hook rakibe bağlanınca rakip 1,2 sn elektrikli ve yavaşlamış.
  3. Kor Döngüsü: Risk Taker dönüşüm izinde rakip yanar; yanma hasarının dönüşümü uzatıp uzatmadığı bu testle belirlenir ve sonuç karta yazılır (uzatmıyorsa kart metni "uzatır" demez).
  4. Rüzgâr Avcısı: takipte depo + enerji aynı karede artar; takipten çıkışta güç artışı gelir.
  5. Drift Motoru: Temiz Çıkış sonrası Drift Hasadı enerji kazancı ve itiş.
- [ ] **Step 2: Run** `--mutant-slice-combos`; hangi combo'lar şu an zaten çalışıyor, hangileri FAIL, çıktı listelenir.
- [ ] **Step 3: Implement** yalnız FAIL olan halkalar (en küçük değişiklik; kural katmanı Core'da kalır). Çalışmayan bir combo bu adımda kalıyorsa Cem'e raporlanır, sessizce kaldırılmaz.
- [ ] **Step 4: Run** PASS; `--mutant-ability`, `--mutant-damage` (mevcut) değişmeden geçer.
- [ ] **Step 5: Commit:** `MUTANT dilimi: skill combo'ları ve testleri`.

**Kontrol noktası 3 (Cem oynar):** Geliştirici modunda 5 combo'yu iki arabayla dener; "hissettiriyor mu?" onayı. Hissettirmeyen combo'nun sayıları birlikte ayarlanır.

### Task 5: Koşu düğüm modeli (saf)

**Files:**
- Create: `Unity/Assets/LastTurn/Scripts/Core/MutantSliceRun.cs`
- Create: `Unity/Validation/MutantSliceRunValidation.cs`; `Program.cs` (`--mutant-slice-run`)

**Interfaces:**
- Produces:
  `public sealed class MutantSliceNode { public int Index; public CatalogNode Event; public int Risk; public string Type; public string TrackName; public string RewardHint; }`
  `public sealed class MutantSliceRun { public MutantSliceRun(MutantRun run); public int Stage {get;} /* 0..2 yarış, 3 boss */; public MutantSliceNode[] Options(); public void Pick(int optionIndex); public void FinishRace(bool passed); public bool BossStage {get;} public bool Won {get;} public bool Lost {get;} }`
- `Event` mevcut etkinlik düğümü biçimindedir (`id,i,ty,sev,x,z,yapildi`) ki `MutantRacePlan.Create` değişmeden çalışsın.
- Consumes: `MutantRun`, `MutantRoute` risk fikri (0 güvenli, 2 meydan okuma), `track-catalog`.

- [ ] **Step 1: Failing test:** sabit tohumla `Options()` her aşamada 2 seçenek, hepsi `gp`/`rx`, 1. seçenek risk 0, 2. seçenek risk 2; aşama 0→1→2→boss ilerler; boss aşamasında tek seçenek `gece-sahini`; `FinishRace(false)` hasar/pert yoksa koşuyu bitirmez ama kaçırılan hedef bedeli uygulanır; aynı tohum aynı düğümleri verir; farklı tohum farklı.
- [ ] **Step 2: Run** `--mutant-slice-run`; FAIL.
- [ ] **Step 3: Implement** düğüm üretimi: pist/tip, `Run` tohumundan türeyen `SeededRandom` ile; zorluk aşama arttıkça `sev` artar. Süre ödülü yok, geri sayım yok.
- [ ] **Step 4: Run** PASS.
- [ ] **Step 5: Commit:** `MUTANT dilimi: koşu düğüm modeli`.

### Task 6: Akışı oyuna bağla

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Prototype/MutantRuntime.cs:152-207` (`OpenWorld`, `Continue`, `Finished`, `StartRace`)
- Create: `Unity/Assets/LastTurn/Scripts/Ui/MutantSliceNodeView.cs` (iki düğüm kartı: tip, pist, risk, ödül ipucu, hedef; Enter/1/2 ile seçim)
- Modify: `Unity/Assets/LastTurn/Scripts/Ui/UiRoot.cs` (yeni görünümü kaydet)
- Create: `Unity/Assets/LastTurn/Editor/MutantSlicePlayValidation.cs` ve `Unity/Validation/check-mutant-slice-proof.mjs`

**Interfaces:**
- Consumes: `MutantSliceRun.Options()/Pick/FinishRace`, `MutantRuntime.StartRace(int eventId, int risk, bool boss, bool keepReturn)`.
- Produces: `MutantRuntime.Panel=="slice-node"`; `Continue()` dilimde `OpenWorld()` yerine bu paneli açar; açık dünya yüklenmez.

- [ ] **Step 1: Failing Play doğrulaması (batchmode):** başlangıç kartı seçildikten sonra doğrudan düğüm paneli açılır; seçim yarışı yükler; yarış bitince sonuç → kart seçimi → düğüm paneli; açık dünya hiç yüklenmez; geri sayım sabit.
- [ ] **Step 2: Run** `-batchmode -executeMethod LastTurn.EditorValidation.MutantSlicePlayValidation.StartBatch` (ayrı proje kopyasında), sonra `node Unity/Validation/check-mutant-slice-proof.mjs`; FAIL.
- [ ] **Step 3: Implement** `MutantRuntime` yönlendirmesi ve `MutantSliceNodeView` (görünüm kural içermez, yalnız `MutantSliceRun` okur ve komut verir).
- [ ] **Step 4: Run** Play doğrulaması + `node Unity/Validation/validate-project.mjs` PASS.
- [ ] **Step 5: Commit:** `MUTANT dilimi: yarışlar arası düğüm akışı`.

**Kontrol noktası 4 (Cem oynar):** Başlangıçtan 3. yarışın sonuna kadar sürüp "ölü zaman var mı, akış hızlı mı, seçimler anlamlı mı?" der.

### Task 7: Sabit boss ve tehdit

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantSliceRun.cs`, `Unity/Assets/LastTurn/Scripts/Core/MutantRun.cs` (`Damage`/`CutPenalty` yolu değişmez; yarışlar arası gövde taşıma ve tamirsizlik bayrak altında)
- Test: `Unity/Validation/MutantSliceRunValidation.cs`

**Interfaces:**
- Consumes: `BossEncounter.Read("gece-sahini", double time)`, `MutantRun.BossTrack()`, `MutantRun.BossTarget(CatalogNode track)`, `MutantRacePlan.Create(..., boss:true, ...)`.

- [ ] **Step 1: Failing test:** dilimde `State["boss"]["id"]=="gece-sahini"`; gövde yarışlar arasında taşınır ve atölye/tamir `Repair()` çağrısı dilimde reddedilir; boss hedefi mevcut `BossTarget` ile aynı hesaplanır (ayrı sayı uydurulmaz); boss yenilince `Won`, kaybedince `Lost`.
- [ ] **Step 2: Run** `--mutant-slice-run`; FAIL.
- [ ] **Step 3: Implement** sabit boss seçimi (`MutantRun` sabit boss için `Pick` çağrısını atlayan dilim yolu) ve tamir kapısı.
- [ ] **Step 4: Run** PASS; `--mutant-boss` ve `--mutant-run` (mevcut) değişmeden geçer.
- [ ] **Step 5: Commit:** `MUTANT dilimi: sabit boss ve gövde taşıma`.

**Kontrol noktası 5 (Cem oynar):** Boss'a kadar tam koşu; "boss gerçek bir sınav mı, kazanılabilir mi?" Hedef/denge ayarı yalnız `DENGE.md` ölçümüyle yapılır.

### Task 8: Koşu sonu ve Tekrar Dene

**Files:**
- Modify: `Unity/Assets/LastTurn/Scripts/Core/MutantSummaryModel.cs`, `Unity/Assets/LastTurn/Scripts/Ui/MutantSummaryView.cs`
- Modify: `Unity/Assets/LastTurn/Scripts/Prototype/MutantRuntime.cs` (`Retry()`)
- Test: `Unity/Validation/MutantSliceRunValidation.cs`, `MutantSlicePlayValidation.cs`

**Interfaces:**
- Produces: `public static void MutantRuntime.Retry()`: aynı araba, yeni tohum, bayrak açık, doğrudan başlangıç kartı seçimi; özet ekranında tek tuş (`R`).
- `MutantSummaryModel.Reason`: kazanınca "Koşu kazanıldı.", pertse/boss yenilince mevcut metinler.

- [ ] **Step 1: Failing test:** kazanılan ve kaybedilen koşunun özetinde doğru başlık; `Retry()` sonrası `State` tamamen yeni (skill/pasif/gövde sıfır), araba aynı, tohum farklı; kayıt dosyası (`lt_mutant.json`) dilim koşusunda değişmez.
- [ ] **Step 2: Run** `--mutant-slice-run` + Play doğrulaması; FAIL.
- [ ] **Step 3: Implement** `Retry`, özet düğmesi ve `R` kısayolu.
- [ ] **Step 4: Run** PASS; `--mutant-summary` (7 kontrol) değişmeden geçer.
- [ ] **Step 5: Commit:** `MUTANT dilimi: koşu sonu ve Tekrar Dene`.

**Kontrol noktası 6 (Cem oynar):** Kazan, kaybet, ikisinde de `R` ile hemen yeniden başla; "bir koşu daha" isteği oluşuyor mu?

### Task 9: Kapanış

**Files:**
- Modify: `docs/DEVIR.md` (en üste giriş), `docs/isler/2026-11-16-surukleyici-dongu.md` (dilim bölümü)
- Create: Windows paketi ve kanıt (mevcut `*Windows-<tarih>` düzeni)

- [ ] **Step 1:** Etkilenen kontroller (`--mutant-slice-*`, `--garage-f`, `--mutant-hud`, `--mutant-summary`, `--opponents`, `validate-project.mjs`) bir kez son kaynakla koşulur; sonuçlar karta yazılır.
- [ ] **Step 2:** Unity Play doğrulaması ve Windows build; iki süreçte kayıt kontrolü mevcut yordamla.
- [ ] **Step 3:** Devir girişi: sahip, dal, son SHA, kapsam, kanıt yolları, açık engel, tek sonraki adım (Kara Boğa ve meta ilerleme dilim onayından sonra).
- [ ] **Step 4: Commit:** `MUTANT dilimi: devir ve kanıt`.

**Kontrol noktası 7 (Cem oynar):** Paketlenmiş oyunda baştan sona koşu. "Dilim eğlenceli mi?" kararı Cem'indir; test geçmesi bunun kanıtı sayılmaz.
