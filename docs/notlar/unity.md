# Unity geçişi — dal notu

- Dal `codex/unity-p3-mutant`; Claude ve Codex dönüşümlü. Ayrıntı ve kanıt: `docs/isler/2026-11-01-unity-tam-aktarim.md`, devir `docs/DEVIR.md`.
- Tamam: P1 kariyer akışı, P2 dünya/rakip, P3 Mutant koşu/ekonomi/rekor, P4 nitro + beş skill + enerji akışı + fizik/rakip bağı.
- Karar: kural/veri saf C# katmanında (`Scripts/Core`), her TS işlevi gerçek TS kaynağından üretilen oracle ile (`Unity/Validation/export-*.mjs --check`, `dotnet run -- --<alan>`) sınanır. Kaynak TS 0.8.18 (`df3549e`); denge değişmez.
- Karar: Unity testleri açık Editor'a dokunmadan proje kopyasında batch koşar; Play kanıtı `Unity/Logs/*.json` + `check-*-proof.mjs` (kaynak hash'ine bağlı).
- Karar: `Unity/Validation/Reference/` ve `Unity/Assets/LastTurn/Resources/` üretilmiş veri; Prettier dışı (bayt karşılaştırması).
- Bırakılan: drag'de yan şeritten Slipstream takibi geometrik olarak tutmaz (TS'de de); test sürücüsü rakip şeridine geçer.
- Cem: iş paketleri arasında onay beklenmez; push/merge/yayın yalnız açık istekle.
- Açık: P1 Play etkileşimli Editor'da yenilenmeli; dokunmatik düğmeler/sürükleme, skill efekt/ses, evrimli skill ve şehirde kanca Play'i; insan kabulü.
- Sonraki: P5 oyuncu yüzeyi (mobil/klavye girdi, ayarlar, kamera, hava, HUD, ses, hayalet seçenekleri, profil/bulut).
