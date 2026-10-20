---
name: surum-yayinla
description: Last Turn'de yapılan değişiklikleri yayınlar. Testleri çalıştırır, Türkçe commit atar, sohbetin konu dalını denemeye (gelistirme) ya da onaylanınca ana sürüme (master, sürüm artırılarak) birleştirir; GitHub Actions testleri tekrar çalıştırıp GitHub Pages'e yayınlar. Bir geliştirme bittiğinde ya da kullanıcı "yayınla", "gönder", "telefona gelsin", "denemeye gönder" dediğinde kullan.
---

# Sürümü yayınla

Her sohbet kendi konu dalında çalışır (`hud`, `fizik`, … ; ayrıntı `CLAUDE.md` → "Dallar ve yayın"). `gelistirme` ortak deneme alanı, `master` telefondaki oyun.

1. `oyun-test` skill'ini uygula (`npm run kontrol`). Testler geçmeden gönderme.
2. `git status` ile istenmeyen dosya olmadığını kontrol et (`dist/`, `tests/cikti/`, `node_modules/` yok sayılır). Türkçe commit: kısa başlık, boş satır, değişiklikler madde madde. Konu dalına gönder: `git push -u origin <konu>`.
3. Nereye?
   - Kullanıcı "denemeye gönder" dediyse ya da değişiklik büyük/riskliyse: deneme (adım 4).
   - Kullanıcı denemedeki işi onayladıysa, "yayınla" / "pushla" dediyse ya da küçük bir düzeltmeyse: ana sürüm (adım 5).
4. **Deneme** → https://cemcandan01.github.io/Last-Turn/dev/
   `git checkout gelistirme && git pull origin gelistirme && git merge --no-ff <konu>`; çakışmayı iki işi de koruyarak çöz; `npm run kontrol`; `git push origin gelistirme`; `git checkout <konu>`. Sürüm artırılmaz.
5. **Ana sürüm** → telefondaki oyun. `gelistirme`'yi değil konu dalını birleştir (başka sohbetlerin onaylanmamış işleri girmesin):
   `git checkout master && git pull origin master && git merge --no-ff <konu>`; sürümü artır (küçük düzeltme `npm version patch --no-git-tag-version`, yeni özellik `minor`); oyuncunun göreceği bir özellik eklendiyse `README.md` "İçerik" bölümüne bir satır; `npm run kontrol`; Türkçe commit (`Yayın x.y.z: …`); `git push origin master`.
   Sonra denemeyi ana sürümle eşitle: `git checkout gelistirme && git pull origin gelistirme && git merge master && git push origin gelistirme`; `git checkout <konu> && git merge master && git push origin <konu>`.
6. Hiçbir dalda rebase ya da force-push yok; başka sohbetin konu dalına yazılmaz.
7. Aynı satırlara iki sohbet dokunduysa ve hangisinin kalacağı açık değilse kullanıcıya sor.
8. Yayını izle: `mcp__github__actions_list` (method `list_workflow_runs`, owner `cemcandan01`, repo `Last-Turn`) ile "Yayın" çalışmasının bitmesini bekle (~3 dk). Başarısızsa `mcp__github__get_job_logs` ile sebebi bul, düzelt, tekrar gönder.
9. Kullanıcıya Türkçe ve kısa yaz: yeni sürüm numarası, ne değişti, nerede görüleceği (ana uygulama: kapatıp internet varken açınca iner; deneme: /dev/ adresi). Telefonda denenmemiş şeyleri belirt.
