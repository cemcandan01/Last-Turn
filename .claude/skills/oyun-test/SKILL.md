---
name: oyun-test
description: Last Turn değişikliğini test eder. Kapsamı değişikliğe göre belirler (Unity ya da web/TS); tam regresyon ve duman yalnız Cem isteyince. Kod değiştirdikten sonra, göndermeden önce ya da Cem "test et", "çalışıyor mu", "bozuldu mu" dediğinde kullan.
---

# Test et

Kural (`AGENTS.md` → "Test ve regresyon"): kapsam değişikliğe göre belirlenir: **normal durum + kritik sınır + önceki hata**. Küçük revizede tam alanı tekrarlama. **Tam regresyon ve `npm run duman` yalnız Cem istediğinde / regresyonda** (`regresyon` skill'i); kendiliğinden başlatma. **Oyunu görünür pencerede açma**: Unity'de `-batchmode`, ekran görüntüsü gerekirse batchmode ya da headless. Test atlanmaz, bozuk test kapatılmaz, boş koşum başarı sayılmaz. Aynı commit/ortam/kapsamın başarılı doğrulamasını yeniden kullan; kod, bağımlılık ya da hedef dal değişince etkilenenleri yenile. Ağ engelini tekrar indirerek çözmeye çalışma, kanıtı kaydet.

Uzun çıktıyı ana sohbete alma: komutları `testci` ajanına koşturup kısa sonucu kullan (birkaç saniyelik tek komutu doğrudan koşabilirsin).

## Unity (`Unity/` altı)

1. Her Unity değişikliğinde önce: `node Unity/Validation/validate-project.mjs`, `export-*-reference.mjs --check` betikleri, `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release` (tam liste `docs/UNITY-GECIS.md` → "Doğrulama"). Bunlar Editor derlemesi ya da cihaz testi yerine geçmez.
2. Sahne/oynanış/arayüz değişikliğinde ilgili Play doğrulaması: Editor küçültülmüşken mevcut oturumu korumak için ayrı proje kopyasında `-batchmode -executeMethod LastTurn.EditorValidation.<Sınıf>.StartBatch`, sonra ilgili `Unity/Validation/check-*-proof.mjs`.
3. Yeni ekran önce saf görünüm modeli ve komutlarıyla .NET'te sınanır, sonra görünüme bağlanır. Taşınan kuralda kaynak TS testi/ölçümü, C# karşılığı ve tolerans kartta bağlı olmalı.
4. Test geçmesi görsel beğeninin kanıtı değildir; insan kabulü açıksa kartta "açık" yaz.

## Web/TS (`src/`, `tests/`)

- Sık: `npm run alan -- <alan>[,<alan>]`. Göndermeden önce `npm run kontrol` (tip+ESLint+biçim), `npm test` ve dokunulan alanın senaryoları. Biçim hatasında `npm run format`.
- Görsel değişiklikte `npm run test:goruntu`; fizik değişikliğinde `npm run olcum`.
- Fizik testi kırıldıysa sürüş hissi değişmiştir: hangi kullanıcı kararını bozduğuna bak; bilerek değiştirildiyse Cem'e söyleyerek eşiği güncelle, değilse geri al.

## Bitirirken

Kapsamı, sonucu ve ham kanıt yolunu görev kartına yaz; Cem'e kısa Türkçe sonuç ver (hangi kontroller koştu, kaçı geçti, ne kaldı).
