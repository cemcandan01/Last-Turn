---
name: surum-yayinla
description: Last Turn'de biten işi konu dalından gönderir. Kapsamdaki kontrolleri koşar, Türkçe commit atar; Cem "gönder", "denemeye gönder", "push" dediğinde gelistirme dalına birleştirir. Cem bekle dediyse iş kendi dalında kalır.
---

# Konu dalından gönder

Akış (`AGENTS.md` → "Dallar ve yayın", ayrıntı `docs/SUREC.md`): konu dalı → ilgili kontroller → `gelistirme` (deneme) → regresyon → `master` (canlı). Konu dalları `master`a yazmaz; canlıya çıkış regresyon ve Cem'in onayı ister. Rebase ve force-push yok; başka ajanın dalına yazılmaz.

1. **Kontroller:** `oyun-test` skill'ini işin kapsamına göre uygula. Geçmeden gönderme. Oynanış/görsel değişiklikte `denetci` ajanından diff denetimi iste.
2. **Kayıt:** görev kartını (`docs/isler/`) ve ilgili `docs/notlar/<alan>.md`yi (en çok 15 satır) güncelle; `docs/DEVIR.md`ye yeni giriş en üste. Kartta sahip, dal, son SHA, test kapsamı + sonuç + kanıt, açık engel, tek sonraki adım olsun.
3. **Commit:** `git status` ile yalnız bu işin dosyaları olduğunu doğrula. Başkasına ait kirli değişikliği commit'e alma. Türkçe commit: kısa başlık, boş satır, madde madde; sonuna ortamın verdiği yazar satırı.
4. **Gönderme onayı:** push ve `gelistirme`ye birleştirme dışarıya dönük adımlardır; Cem istemeden yapma. "Bekle" / "denemeye gönderme" dediyse burada dur, işin hazır olduğunu söyle.
5. **Denemeye gönder (Cem isteyince):**
   - Regresyon dondurması var mı: `git ls-remote --exit-code --heads origin regresyon` ve `durum.json`; "tamamlandi" değilse iş kendi dalında bekler, Cem'e söyle.
   - Yoksa konu dalını `gelistirme`ye `--no-ff` birleştir, çakışmayı iki işi de koruyarak çöz (ters yönde aynı satır varsa Cem'e sor), `git push origin gelistirme`. **Oyun değişikliğinde yama sürümü +1**; yalnız süreç/belge değişikliğinde sürüm artmaz.
   - Unity'de özellik PR'ları `gelistirme`yi hedefler.
6. **Doğrula:** yerel / push / CI / deneme adresi durumlarını ayrı ayrı doğrula ve ayrı raporla. CI kalırsa hatayı oku, kendi işinden geldiyse düzelt.
7. **Geri alma:** `git revert -m 1 <birleştirme-commit'i>`; konu dalında aynısını yap.
8. **Acil düzeltme:** yalnız Cem açıkça "canlıya acil düzeltme" derse (`docs/SUREC.md` → "Acil düzeltme").
