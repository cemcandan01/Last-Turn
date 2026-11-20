# Unity yarış oturumu — Paket B (yarış planı 3–6. aşama) — 31 Ekim 2026

## İstek ve kabul

Cem: Paket A'dan sonra geri sayım/başlangıç, tur ve kontrol noktası, geçerli tur/bitiş, süre/sonuç/ödül; `gp_1`de ilk tamamlanabilir Unity yarışı. Mantık UI'dan ayrı; geliştirici HUD'ı ve primitive pist yeterli. Pist geometrisi, zemin yüksekliği, yüzey türü ve yarış sorguları sürüş sahnesine gerçekten bağlanmadan “tamamlandı” denmez.

1. Yarış durum makinesi TS `startEvent`/geri sayım/`evTick`/`endEvent`/`yarisBitti` ile aynı (sentetik izlerde adım adım).
2. Sürüş dünyası TS bölge yüksekliği/yüzeyi/ipucu (`Hw`/`surfW`/`ipucu.ti`) ile aynı; gerçek fizik bu dünyada sürer.
3. `gp_1`: gerçek fizikle 3 tur, bitiş, yıldız, ödül kayda yazılır; piste dönüş çalışır; .NET ve Unity Play.
4. Kurallar Core'da; Unity yalnız görünüm/HUD/oturum bağı; geçici ekranlar değiştirilebilir.

## Sahiplik / Git

Sahip ve uygulayıcı Claude (claude-opus-5-5); Codex kotası dolu, ikinci ajan yok. Dal `claude/unity-yaris-kurallari` (Paket A `4f9b19d` üstünde ayrı commit). Yalnız yerel commit.

## Yapılan

- **Oracle (TS'nin kendisi):** yükleyiciye taklit kipi eklendi (`export-catalog.mjs createBaselineLoader({stubs:true})`): THREE/DOM her şeyi kabul eden taklit, `import.meta.env` üretim dışı sabit. Böylece `bolgeler.ts`, `dunya.ts`, `yarislar.ts`, `surus.ts`, `ilerleme.ts` sabit SHA'dan yüklenir; görsel kurulum çalışmaz. Varsayılan kip kapalı; katalog çıktısı değişmedi (`--check`).
- `Validation/export-race-session.mjs`: `Resources/race-events.json` (TS `TYP` + 40 `EVENTS`: anahtar, tur, hedef, yıldız eşikleri, başlangıç `g`) ve `Reference/race-session-0.8.18.json`. Dünya: gp_1/dp_1'de fizik sırasıyla (4 teker + merkez yüzeyi, sonra yükseklik) 1.500'er adım, bölge kutusu dışına taşma dahil. Oturum: TS `startEvent` → `dongu` geri sayımı → konum/hız yazılıp `evTick` → `endEvent` → `yarisBitti`; bildirimler (`note`) yakalanır. 10 senaryo (aynı ilerleme kaydıyla zincir):
  - gp_1 temiz 3 tur, 3★;
  - gp_1 2★ (önceki 3★ ile ödül);
  - gp_1 pist dışı → PİSTE DÖNDÜN;
  - gp_1 iç sahadan kestirme → PİST KESME (ceza yok);
  - gp_1 ters sürüş + hazır olmadan çizgi geçişi;
  - gp_1 bütçe dışı araç (kariyer dışı `deneme_` anahtarı, ödül 0; aracın erişimi için yalnız TS admin kipi);
  - rl_1 A→B;
  - dg_1 drag (tuzak hızı);
  - dg_1 yavaş 0★;
  - dp_1 drift: x2…x5, KOMBO YANDI, ÇARPAN x6, bank.
- Core: `TrackWorld` (TS asfalt/drift bölge `H`=Hb+kerb, `surf`, `regAt`, ipucu durumu), `RaceEventCatalog`, `RaceSession` (evTick/endEvent: kesme bildirimi, 1+5 sn piste dönüş, ters, drift/x6, tur hazırlığı %40–60, %80→%20 çizgi, A→B N−4 / drag N−1 + tuzak hızı, yıldız, kariyer ödülü, kazanma), `RaceRun` (geri sayımda fizik donuk; fizik adımı → yarış adımı; dönüşte araç yerleştirme + ipucu tam tarama), `RaceViewModel` (TS hud olayPaneli/ters/piste dönüş sayacı/drift x6 satırı, sonuc.ts satırları), `GarageState.RaceFinished` (TS yarisBitti), `TrackOpen` (pistAcikMi), `StarsOf`. `PowertrainVehicle.Place/ReferencePoint`, koşucuya adım sonrası geri çağrı (mevcut çağrılar aynı).
- Unity: `GtPrototype` yarış kipi (`raceTrack`, boşsa GT/Arazi aynen), `RaceTrackVisuals` (çalışma anında TrackWorld'den arazi ızgarası, asfalt, kerb, çizgi, tabela), `RaceHud` (yalnız görünüm modeli), `GarageRace` (seçili araç kurulumu + etkinlik lastiği, kariyer uygunluğu, pist kilidi, ödülü `Transact` ile kayda; açılışta kayda yazmaz), `RaceData`, sahne `RaceTest.unity` (+ build listesi), garajda **Yarış: gp_1** düğmesi, `RaceTestSceneBuilder`, `RacePlayValidation`, `check-race-proof.mjs`, `Unity/YARIS.md`.
- Doğrulama sürücüsü `Editor/RaceTestDriver.cs` (saf; oyun YZ'si değil): ileri bakan direksiyon + eğriliğe göre hız (yanal 18 m/s²).
- `TrackCompilationCheck` Play'e girerken koşmaz (kare süresine bağlı Play doğrulamalarını bekletmesin).
- CI: `export-race-session --check`, `--race-session`, `--race-drive` (çalıştırılmadı).

## Kanıt

- `--race-session`: **10 senaryo / 52.650 adım + bölge dünyası 3.000 adım, 293.352 koşul**; en büyük fark **1,33e-15**. Geri sayım 181 kare, BAŞLA!, her adımda ipucu, durum (süre, tur, hazır, önceki, en iyi tur, ters, pist dışı, kesme, puan, kombo, çarpan, drift oranı, x6), bildirim metinleri, ışınlanma noktası/ipucu, sonuç (süre, tur, yıldız, puan, XP, para, tuzak hızı), TS ilerleme kaydıyla XP/para/yıldız zinciri, kariyer uygunluğu (`CareerEligible`) ve pist açıklığı.
- Duyarlılık (geçici bozma, geri alındı; hepsi yakalandı): tur hazırlığı 0,4→0,42; ödülde önceki yıldız yok sayma; yükseklik katsayısı 0,6→0,61; yüzey sınırından kerb çıkarma.
- `--race-drive` (gerçek fizik, .NET): başlangıç aracı (10, D200) gp_1 kariyerine uygun; başlangıçta pist yüksekliğinde; 181 kare geri sayım, araç kıpırdamadı; 3 tur **2:14.6** (134,65 sn), en iyi tur 0:42.5, **2★**, +80 XP +640 para garaja işlendi; yükseklik 0,12–5,20 m; 10 bin+ adımın tamamı asfaltta; tekrar koşu bit düzeyinde aynı; 40 m dışarı konup fren → **361 adımda** piste dönüş, dönüş noktası asfalt, sonra yarış bitti.
- Unity 6000.3.9f1 Play (UTC 10:45–10:46), kod değişmeden: **Yarış 16/16** (`check-race-proof`: gp_1 **2:14.6**, en iyi tur 0:42.5, 2★, +80 XP +640 para yeniden açılan geçici profilde; 8.079 adım; yükseklik 0,12–5,20 m; dönüş 361 adım; 179 kaynak hash'i). Aynı koşuda **GT 28/28**, **Arazi 23/23**, **Garaj 20/20**; `check-editor-proof` (32 Core), `check-catalog-proof`, `check-track-proof` geçti. Unity sonucu .NET ile aynı süre.
- Play menülerini Claude, Editor'de geçici (silinen, commit dışı) tetik betiğiyle çalıştırdı. İlk iki zincirde GT/Arazi/Garaj kaldı/zaman aşımı: Claude'un açık bıraktığı Pist Kataloğu penceresi Game görünümünü örtüyordu; kapatınca dördü de geçti. Yarış doğrulaması sabit adımları kendisi verdiği için her zincirde geçti. Ayrıntı: `docs/isler/2026-10-31-gt-play-kare-zamanlamasi.md`.
- Regresyon: `--race-rules`, `--tracks`, `--garage`, `--garage-storage`, `--garage-ui`, `--garage-drive`, varsayılan motor/teker, `--gt-physics`, `--dirt-stability`; `export-catalog/tracks/race-rules/race-session/garage --check`; `validate-project` geçti. `--catalog` (uzun) koşulmadı: katalog kodu/verisi değişmedi.
- `QualitySettings.asset` Unity'nin kendiliğinden silmesi yine geri alındı; `EditorBuildSettings` yalnız RaceTest eklemesi.

## Kapsam dışı / açık (TS işlevi kaldırılmadı, henüz taşınmadı)

- Unity fiziğinde dekor/bariyer çarpışması (`yakin`) ve bölge sınır duvarı (`kutu`) yok; kerb sarsıntı bayrağı (`S.kerb`) yok.
- Sürüş dünyası yalnız asfalt/drift bölgeleri; rallikros/ralli/drag dünyası (rampa, çamur, su, toprak, drag kutusu) yok. Oturumları .NET'te TS ile eşleşir.
- Drift yarışı için fizikteki drift bayrağı/β ve `driftYarisProfili` Unity sürüşüne bağlı değil (oturum girdisi hazır).
- Rekor (`best`/`saveBest`), hayalet kaydı, YZ rakip, MUTANT, profil yarış/galibiyet sayaçları, geri sayım ışığı/sesi.
- Geri sayım Unity'de kare süresiyle (TS gibi); doğrulamada 1/60 adım.

## Sonraki tek adım

Rallikros/ralli bölge dünyası (`bolgeler.ts` rx/rl dalı: rampa, çamur, su, toprak/asfalt aralığı, ralli tepeleri) aynı taklit oracle'ıyla `TrackWorld`e; ardından drift fiziği bağı ve rekor/hayalet.
