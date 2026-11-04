# Unity geçişi — dal notu

- Dal `codex/unity-p3-mutant`; Claude ve Codex dönüşümlü. Ayrıntı ve kanıt: `docs/isler/2026-11-01-unity-tam-aktarim.md`, devir `docs/DEVIR.md`.
- Tamam: P1 kariyer, P2 dünya/rakip, P3 Mutant, P4 nitro/skill/enerji, P5 kontroller/HUD/hava/kamera/bulut sözleşmesi/ses altyapısı; Cem elle kabul turu yaptı (2026-11-05).
- Karar: kural/veri saf C# katmanında (`Scripts/Core`), her TS işlevi gerçek TS kaynağından üretilen oracle ile (`Unity/Validation/export-*.mjs --check`, `dotnet run -- --<alan>`) sınanır. Kaynak TS 0.8.18 (`df3549e`); denge değişmez.
- Karar: Unity testleri açık Editor'a dokunmadan proje kopyasında batch koşar; Play kanıtı `Unity/Logs/*.json` + `check-*-proof.mjs` (kaynak hash'ine bağlı).
- Karar: `Unity/Validation/Reference/` ve `Unity/Assets/LastTurn/Resources/` üretilmiş veri; Prettier dışı (bayt karşılaştırması).
- Bırakılan: drag'de yan şeritten Slipstream takibi geometrik olarak tutmaz (TS'de de); test sürücüsü rakip şeridine geçer.
- Cem: iş paketleri arasında onay beklenmez; push/merge/yayın yalnız açık istekle.
- Cem (2026-11-05): geliştirme Windows'ta; mobil (dokunma/eğim/cihaz derlemesi) sonraya. Bulut orijinal Firebase projesiyle (`src/bulut/ayar.ts`), aynı hesaplar/`users/{uid}`; SDK yerine REST.
- Açık: Firebase REST bağdaştırıcısı, görsel/menü/ses varlık fazı, kokpit/ayna, Mutant bölge 3 Play.
- Sonraki: Windows Firebase REST bağdaştırıcısı (misafir, e-posta bağlama, belge oku/yaz + CloudContract birleştirme), ardından görsel/menü fazı.
