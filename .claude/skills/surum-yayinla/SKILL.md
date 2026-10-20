---
name: surum-yayinla
description: Last Turn'de yapılan değişiklikleri yayınlar. Alan testi ve dumanı koşar, Türkçe commit atar, sohbetin konu dalını denemeye (gelistirme) ya da kullanıcı "push" deyince değişikliğin boyutu ne olursa olsun ana sürüme (master, sürüm artırılarak) birleştirir; GitHub Actions dumanı tekrar koşup GitHub Pages'e yayınlar, yayından sonra canlı adreste duman koşar. Bir geliştirme bittiğinde ya da kullanıcı "push", "pushla", "yayınla", "canlıya al", "telefona gelsin", "denemeye gönder" dediğinde kullan.
---

# Sürümü yayınla

Her sohbet kendi konu dalında çalışır (`hud`, `fizik`, … ; ayrıntı `CLAUDE.md` → "Dallar ve yayın"). `gelistirme` ortak deneme alanı, `master` telefondaki oyun.

1. `oyun-test` skill'ini uygula: tip denetimi, ESLint, biçim, `npm run alan -- <dal>` (konu dalı ve dokunulan dallar). Testler geçmeden gönderme.
2. `git status` ile istenmeyen dosya olmadığını kontrol et (`dist/`, `tests/cikti/`, `node_modules/` yok sayılır). Türkçe commit: kısa başlık, boş satır, değişiklikler madde madde. Konu dalına gönder: `git push -u origin <konu>`.
3. Nereye?
   - Kullanıcı **"push"** (ya da "pushla", "yayınla", "canlıya al", "prod") dediyse: değişikliğin boyutu ne olursa olsun **ana sürüm** (adım 5). Ayrıca onay isteme.
   - Kullanıcı "denemeye gönder" dediyse ya da iş bitti ama kullanıcı henüz bir şey demediyse: **deneme** (adım 4) ve kullanıcıya "telefonda dene, beğenirsen 'push' de" yaz.
4. **Deneme** → https://cemcandan01.github.io/Last-Turn/dev/
   `git checkout gelistirme && git pull origin gelistirme && git merge --no-ff <konu>`; çakışmayı iki işi de koruyarak çöz; çakışma çözüldüyse `npm run kontrol`; `git push origin gelistirme`; `git checkout <konu>`. Sürüm artırılmaz.
5. **Ana sürüm** → telefondaki oyun. `gelistirme`'yi değil konu dalını birleştir (başka sohbetlerin onaylanmamış işleri girmesin):
   `git checkout master && git pull origin master && git merge --no-ff <konu>`. Çakışma çıkarsa (başka bir sohbet ya da gece regresyonu aynı dosyaya dokunmuş): iki işi de koruyarak çöz, dokunulan diğer dalın senaryolarını da koş (`npm run alan -- <konu>,<diğer>`); aynı satırı ters yönde değiştiren iki iş varsa kullanıcıya sor.
   Sürümü artır (küçük düzeltme `npm version patch --no-git-tag-version`, yeni özellik `minor`); oyuncunun göreceği bir özellik eklendiyse `README.md` "İçerik" bölümüne bir satır; `npm run kontrol`; Türkçe commit (`Yayın x.y.z: …`); `git push origin master`.
   Sonra denemeyi ana sürümle eşitle: `git checkout gelistirme && git pull origin gelistirme && git merge master && git push origin gelistirme`; `git checkout <konu> && git merge master && git push origin <konu>`.
6. **Canlı duman:** "Yayın" iş akışını izle (`mcp__github__actions_list`, ~3-5 dk). Son adım `canli-duman` yeni sürümün canlıya geldiğini bekler ve canlı adreste duman koşar. Kalırsa "Canlı duman hatası" kaydı açılır: hatayı oku, kendi işinden geldiyse hemen düzelt ve kullanıcıya söyle; başka bir alandaysa kullanıcıya bildir (gece regresyonu da yakalar).
7. Kullanıcıya kısa yaz: ne gitti, sürüm numarası, canlı duman sonucu.
8. Hiçbir dalda rebase ya da force-push yok; başka sohbetin konu dalına yazılmaz.
