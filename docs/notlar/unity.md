# Unity geçişi — dal notu

- Dal `codex/unity-p3-mutant`; Claude ve Codex dönüşümlü. Ayrıntı ve kanıt: `docs/isler/2026-11-01-unity-tam-aktarim.md`, devir `docs/DEVIR.md`.
- Tamam: P1 kariyer, P2 dünya/rakip, P3 Mutant, P4 nitro/skill/enerji, P5 kontroller/HUD/hava/kamera/bulut sözleşmesi/ses altyapısı; Cem elle kabul turu yaptı (2026-11-05).
- Karar: kural/veri saf C# katmanında (`Scripts/Core`), her TS işlevi gerçek TS kaynağından üretilen oracle ile (`Unity/Validation/export-*.mjs --check`, `dotnet run -- --<alan>`) sınanır. Kaynak TS 0.8.18 (`df3549e`); denge değişmez.
- Karar: Unity testleri açık Editor'a dokunmadan proje kopyasında batch koşar; Play kanıtı `Unity/Logs/*.json` + `check-*-proof.mjs` (kaynak hash'ine bağlı).
- Karar: `Unity/Validation/Reference/` ve `Unity/Assets/LastTurn/Resources/` üretilmiş veri; Prettier dışı (bayt karşılaştırması).
- Bırakılan: drag'de yan şeritten Slipstream takibi geometrik olarak tutmaz (TS'de de); test sürücüsü rakip şeridine geçer.
- Cem: iş paketleri arasında onay beklenmez; push/merge/yayın yalnız açık istekle.
- Cem (2026-11-05): geliştirme Windows'ta; mobil (dokunma/eğim/cihaz derlemesi) sonraya. Bulut orijinal Firebase projesiyle (`src/bulut/ayar.ts`), aynı hesaplar/`users/{uid}`; SDK yerine REST.
- P6-A bulut (2026-11-05): Firebase REST (SDK yok), `CloudSync`/`CloudAccount` TS esitleme/hesap kuralıyla; yalnız `GarageSession.PlayerProfile` eşitlenir. Taşıyıcı HttpClient (projede UnityWebRequest modülü kapalı). `--cloud-sync` 92.
- Açık: canlı bulut kabulü (Cem Play), masaüstü Google girişi, bilinen hesaplar/admin/yeni oyuncu; CI `--race-all` kalıyor (yerelde 40/40, log yetkisi yok); görsel/menü/ses fazı, kokpit/ayna, Mutant bölge 3 Play.
- P7 görsel faz (2026-11-05): Cem F (Sade) yönünü ve 9 ekran taslağını onayladı (`docs/tasarim/ekranlar-f.html`); Mutant kendi menüsü + başlama onayı + araç → yetenek. Arayüz UI Toolkit (`Scripts/Ui`, `Resources/UI/lt.uss`, Barlow OFL); dokunmatik ekran yoksa sürüş tuşu yok (`HudLayout` masaüstü kipi), V kamera, T piste dön.
- P7-1 tamam: F ana menüsü + panelsiz yarış HUD'u; batch Play ekran görüntüsü panel dokuya çizilip kamerayla birleştirilerek (`FUiPlayValidation`).
- Sonraki: sekmelerin F ekranları (Garaj/Modifiye, Mağaza, yarış hazırlığı, Mutant menüsü/onay/adımlar, Profil, Ayarlar, duraklatma, sonuç); Cem bulutu ve F'yi Play'de dener.
