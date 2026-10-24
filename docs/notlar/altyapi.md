# altyapi güncel notu

- Güncel iş: docs/isler/2026-10-25-ios-iframe.md; sahip Codex, codex/altyapi.
- GitHub Pages `__/auth/iframe` 439 bayt application/octet-stream sunuyor; iPhone açılışta dosya önizlemesine gidiyor. Handler.js varlığı geçerlilik kanıtı değildi.
- firebase.ts iki HTML uç noktasının MIME/attachment başlıklarını HEAD ile denetler. Uygun yardımcı yoksa asıl Firebase alanı + popup; SDK resolver'ı eski redirect/link kayıtlarında argument-error olmasın diye korunur. Doğru HTML hosting'de standalone redirect çalışır.
- Hesap/yerel kayıt silinmedi; Firebase config değişmedi. Gerçek iPhone Google popup sonucu ayrıca denenmeli.
- Yeni firebase-giris.test.ts: 8/8; bozuk helper+bekleyen redirect dahil. Bulut ve PWA ile 25/25. CI/deneme sürümü görev kartında güncellenir.
- Önceki PWA, ekonomi, bulut, çok araç ve cihaz ayrıntıları kayıpsız docs/notlar/arsiv/altyapi-0.5.26.md'de; yalnız gerektiğinde oku. Firebase kurulum kılavuzu docs/FIREBASE.md.
- Kurallar/devri: CLAUDE.md ve docs/DEVIR.md; canlıya çıkış regresyon + Cem'in onayıyla.
