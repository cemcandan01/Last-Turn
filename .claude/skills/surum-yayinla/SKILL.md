---
name: surum-yayinla
description: Last Turn'de yapılan değişiklikleri yayınlar. Testleri çalıştırır, sürüm numarasını artırır, Türkçe commit atar ve master'a (ya da denemeye: gelistirme dalına) gönderir; GitHub Actions testleri tekrar çalıştırıp GitHub Pages'e yayınlar. Bir geliştirme bittiğinde ya da kullanıcı "yayınla", "gönder", "telefona gelsin", "denemeye gönder" dediğinde kullan.
---

# Sürümü yayınla

1. `oyun-test` skill'ini uygula (`npm run kontrol`). Testler geçmeden yayınlama.
2. Nereye?
   - Kullanıcı "denemeye gönder" dediyse ya da değişiklik büyük/riskliyse: `gelistirme` dalı → https://cemcandan01.github.io/Last-Turn/dev/
   - Aksi halde: `master` → telefondaki oyun.
3. `package.json` sürümünü artır: küçük düzeltme `npm version patch --no-git-tag-version`, yeni özellik `npm version minor --no-git-tag-version`. (Deneme dalında artırmak gerekmez; master'a birleştirirken artır.)
4. Oyuncunun göreceği bir özellik eklendiyse `README.md` "İçerik" bölümüne bir satır ekle.
5. `git status` ile istenmeyen dosya olmadığını kontrol et (`dist/`, `tests/cikti/`, `node_modules/` yok sayılır).
6. Türkçe commit: kısa başlık, boş satır, değişiklikleri madde madde.
7. Gönder:
   - master: `git pull --rebase origin master && git push origin master`
   - deneme: `git pull --rebase origin gelistirme && git push origin gelistirme`
   - Denemedeki iş onaylandıysa: `git checkout master && git pull origin master && git merge --no-ff gelistirme`, sürümü artır, `git push origin master`.
8. Yayını izle: `mcp__github__actions_list` (method `list_workflow_runs`, owner `cemcandan01`, repo `Last-Turn`) ile "Yayın" çalışmasının bitmesini bekle (~3 dk). Başarısızsa `mcp__github__get_job_logs` ile sebebi bul, düzelt, tekrar gönder.
9. Kullanıcıya Türkçe ve kısa yaz: yeni sürüm numarası, ne değişti, nerede görüleceği (ana uygulama: kapatıp internet varken açınca iner; deneme: /dev/ adresi). Telefonda denenmemiş şeyleri belirt.
