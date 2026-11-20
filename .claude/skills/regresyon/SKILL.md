---
name: regresyon
description: Last Turn sürüm regresyonu ve canlıya çıkış. Yalnız Cem "regresyon koş", "regresyon raporu" ya da onaydan sonra "push" / "canlıya al" dediğinde kullan; kendiliğinden, zamanlanmış ya da "biraz da regresyon koşayım" diye başlatılmaz.
---

# Regresyon ve canlıya çıkış

Kurallar `AGENTS.md` → "Test ve regresyon" ile "Dallar ve yayın" ve `docs/SUREC.md`. **Tam regresyon yalnız Cem istediğinde koşulur.** Gece 00:00/04:00 otomasyonu, "regression sohbeti" ve yönetmen yoktur; zamanlanmış görev gerçekten kurulmadıkça bir şey vaat edilmez. Rebase ve force-push yok. Oyunu görünür pencerede açma: Unity için `-batchmode`, gerekirse ayrı proje kopyası.

## 1. Durumu öğren

```
git fetch origin --prune
git ls-remote --exit-code --heads origin regresyon
git show origin/regresyon:docs/regresyon/durum.json   # suruyor | onay-bekliyor | tamamlandi
```
Açık regresyon varsa yeniden başlatma, durumunu söyle. Bekletilen konu dalları bu sürüme girmez; adlarını raporda yaz.

## 2. Dondur ve koş

`regresyon` dalını `origin/gelistirme`den kur, `docs/regresyon/durum.json`'u yaz (`not` alanını her aşamada güncel tut), commit'le. Dalı göndermek (push) dondurma işaretidir; konu dalları bu durdukça `gelistirme`ye göndermez.

Koşum, işin türüne göre:
- **Unity:** `node Unity/Validation/validate-project.mjs`, `export-*-reference.mjs --check`, `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release`, ilgili `check-*-proof.mjs` ve `-batchmode -executeMethod LastTurn.EditorValidation.<Sınıf>.StartBatch` Play doğrulamaları (tam liste `docs/UNITY-GECIS.md` → "Doğrulama").
- **Web/TS:** `npm run kontrol`, `npm test`, `node tests/kosucu.mjs regresyon --sure 55`, ardından `npm run duman` (duman yalnız regresyonda).

Uzun çıktıyı ana bağlama alma (`testci` ajanı); sonuç ve hata satırlarını al. Ham kanıt yolu görev kartında.

## 3. Hataları çöz

Her hata onu yakalayan alanın sahibine aittir. Sebebi bul, düzelt, commit başlığını `[alan] ...` yap, yalnız etkilenen kontrolleri yenile. Test atlanmaz, kapatılmaz; boş koşum başarı sayılmaz. Aynı hata üç denemede çözülemezse dur ve Cem'e sor.

## 4. Rapor ve onay

0 hata olunca `durum.json`'u `onay-bekliyor` yap ve Cem'e Türkçe kısa rapor ver: sürüm, dallara göre neler değişti, test tablosu (kapsam, sonuç, kanıt yolu), çözülen hatalar, bekletilen dallar. Sonu: "Canlıya çıksın mı?".

## 5. Onay → canlı

Yalnız Cem bu iş için açıkça onay verince: `regresyon`u `master`a `--no-ff` birleştir, `README.md` "İçerik"i güncelle, `Yayın <sürüm>: ...` kaydını at, `git push origin master`. Yayın iş akışını ve canlı dumanı doğrula (yerel / push / CI / deneme adresi / canlı ayrı ayrı). Sonra `gelistirme`yi `master`la eşle, sonraki sürümü aç, `durum.json`'u `tamamlandi` yap. Unity'de canlı geçiş için önceden Cem onayı şarttır.
