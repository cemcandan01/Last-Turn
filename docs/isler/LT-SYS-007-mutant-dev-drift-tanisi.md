# LT-SYS-007 — MUTANT drift DEV telemetrisi

- **Sahip:** Codex.
- **Kaynak:** `gelistirme` (0.8.12); **dal:** `codex/mutant-drift-telemetri`.
- **Talep:** Cem, 28.10.2026 — MUTANT'ı biraz daha geliştirelim. Drift/skill testini hızlandıran DEV modundan sonraki ölçülebilir adım: drift neden başlıyor veya kopuyor anlaşılsın.
- **Kapsam:** DEV drift yarışında salt okunur durum/ölçüm şeridi. Yeni perk, güç çarpanı, skor veya fizik müdahalesi yok. Kullanıcının normal HUD'da drift açısı gösterilmeme kararı korunur.

## Kabul ölçütleri

1. Yalnız `/dev/` MUTANT test koşusunun drift yarışında açı, gerçek giriş eşiği, kontrol açısı ve fizik durumuna bağlı kısa uyarı görünür; normal MUTANT/kariyer/serbest sürüş ve `master` etkilenmez.
2. Stok ve modifiyeli araçların eşik ve limitleri `driftYarisProfili` üzerinden türetilir, ikinci sabit eşik veya fiziğe etki yoktur.
3. Hazırlık, tam direksiyonla giriş, driftte karşı direksiyon, spin sınırı ve soğuma ayrı durumlar olarak okunabilir.
4. DEV Atölyesi'nden ölçüm açılıp kapanabilir. Yarış duraklatıldığında veya menüye çıkıldığında şerit kaybolur.
5. iPhone yatay HUD'da yolun/araç kontrollerinin üstünü kapatmaz; merkez üst şeritte kompakt ve dokunma engeli olmayan bir gösterge.
6. Birim durum matrisi, Playwright DEV paneli akışı, tip, lint, biçim ve MUTANT alan kontrolleri geçer.

## Teknik yaklaşım

- `src/fizik/drift-tani.ts`: yalnızca `SimDurumu` ve mevcut `driftYarisProfili` okuyan saf fonksiyon.
- `src/arayuz/mutant-ui.ts`: DEV aç/kapat ve en çok 10 Hz DOM güncellemesi; normal HUD'da yok.
- `src/stil.css`: kompakt üst orta şerit; dokunmaya müdahale etmez.
- `tests/birim/mutant-drift-tani.test.ts`: fizik eşikleri ve tanı durumlarının regresyonu.
- `tests/e2e/bolumler/mutant-dev.mjs`: gerçek tarayıcıda gösterim/atölye aç-kapat.

## Açık sınırlar

- Gösterge **tanı** aracıdır: ölçülen drift skorları, gerçek iPhone sürüş hissi veya oyun dengesi için tek başına başarı kanıtı değildir.
- Mevcut fizik ve x6/kombo kuralları bu görevde değişmez. Kalibrasyon için gerçek cihaz geri bildirimi gereklidir.
- Claude ile aynı dosyaya paralel yazılmaz; isterse ayrı görevde iPhone görsel/UX incelemesi yapabilir.

## Devir / doğrulama

- **PR:** [#33](https://github.com/cemcandan01/Last-Turn/pull/33), hedef dal `gelistirme`.
- **Hedefli CI:** [başarılı](https://github.com/cemcandan01/Last-Turn/actions/runs/40720719293); birim testleri, Playwright DEV akışı, tip/lint/biçim.
- **Tam MUTANT alanı:** [başarılı](https://github.com/cemcandan01/Last-Turn/actions/runs/40721212555); tip/lint/biçim, Chromium ve alan testleri.
- **Gerçek iPhone:** kullanıcının sürüş hissi ve ekran okunabilirliği testi hâlâ gerekli. 0.8.13 geliştirme sürümünde denenebilir.
- **Sonraki tek adım:** testler geçince `gelistirme` denemesinde stok vs drift paketli aracı Cem'in karşılaştırması.
