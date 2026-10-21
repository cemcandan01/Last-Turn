---
name: surum-yayinla
description: Last Turn konu sohbetinde yapılan işi gönderir. Alan testi ve dumanı koşar, Türkçe commit atar ve işi kendiliğinden deneme sürümüne (gelistirme, /dev/) birleştirip yama numarasını artırır (0.1.4 → 0.1.5); kullanıcı "bekle" / "denemeye gönderme" dediyse iş kendi dalında kalır ve "push" deyince gider. Regresyon açıksa (sürüm dondurulmuşsa) bekletir. Canlıya (master) konu sohbetinden gönderilmez; yalnız kullanıcının açıkça istediği acil düzeltme istisnadır. Her geliştirme bitince ve kullanıcı "push", "gönder", "denemeye gönder" dediğinde kullan.
---

# Konu dalından gönder

Akış (`docs/SUREC.md`): konu dalı → testler geçince **kendiliğinden** `gelistirme` (deneme, https://cemcandan01.github.io/Last-Turn/dev/) → gece regresyonu → onay → `master` (canlı). Konu sohbeti yalnız kendi dalına ve `gelistirme`'ye yazar.

1. `oyun-test` skill'ini uygula: tip denetimi, ESLint, biçim, `npm run alan -- <dal>` (konu dalı ve dokunulan dallar). Testler geçmeden gönderme.
2. `git status` ile istenmeyen dosya olmadığını kontrol et (`dist/`, `tests/cikti/`, `node_modules/` yok sayılır). Türkçe commit: kısa başlık, boş satır, değişiklikler madde madde. Konu dalına gönder: `git push -u origin <konu>`.
3. **Bekletilen iş:** kullanıcı bu iş için "bekle", "denemeye gönderme" ya da "push etme" dediyse burada dur: `merkez` skill'iyle merkezi tazele ve bildir ("<dal>: iş hazır, senin "push"unu bekliyor (<iş>)"), ne yapıldığını kısaca yaz ve "denemeye göndermem için 'push' de" diye bitir. Bekletilen iş bu sürüme girmez ama regresyonu da durdurmaz. Diğer bütün durumlarda (varsayılan) 4'e geç.
4. **Denemeye gönder** (varsayılan; bekletilen iş için kullanıcının "push"u)
   - **Dondurma var mı?** `git fetch origin && git ls-remote --exit-code --heads origin regresyon` ve varsa `git show origin/regresyon:docs/regresyon/durum.json`. Dal duruyor ve durum "tamamlandi" değilse bir sürüm regresyonda ya da canlı onayı bekliyor: `gelistirme`'ye gönderme. Kullanıcıya yaz ve bildir: "<dal>: iş hazır, 0.1 regresyonda olduğu için kendi dalında bekliyor; regresyon canlıya çıkınca 0.2'ye girer, o zaman 'push' de." (Kullanıcı ısrar ederse bunun regresyondaki sürüme gireceğini söyle ve regression sohbetiyle çakışmaması için sor.)
   - Yoksa:
     ```
     git checkout gelistirme && git pull origin gelistirme && git merge --no-ff --no-edit <konu>
     npm version patch --no-git-tag-version          # 0.1.4 → 0.1.5
     npm run kontrol
     git commit -am "Deneme 0.1.5: <konu> — <kısa özet>"
     git push origin gelistirme
     git checkout <konu> && git merge --no-edit gelistirme && git push origin <konu>
     ```
   - Çakışma: iki işi de koruyarak çöz, dokunulan diğer dalın senaryolarını da koş (`npm run alan -- <konu>,<diğer>`). Aynı satırı ters yönde değiştiren iki iş varsa kullanıcıya sor.
   - Push reddedilirse (aynı anda başka bir sohbet de gönderdi): `git pull origin gelistirme`; `package.json` sürüm satırı çakışırsa ikisinin büyüğünün bir fazlasını yaz; `npm run kontrol`; tekrar gönder.
5. GitHub Actions "Yayın" iş akışını izle (`mcp__github__actions_list`, ~3-5 dk): duman → deneme sürümü yayını → canlı adreslerde duman. Kalırsa "Canlı duman hatası" kaydını oku; kendi işinden geldiyse hemen düzelt ve tekrar gönder.
6. Yayın bitince (deneme adresinde duman geçince) `merkez` skill'iyle merkezi tazele ve bildir: "<dal>: <sürüm> denemede, kontrol edebilirsin (<iş>)". Kullanıcıya kısa yaz: sürüm numarası (ör. 0.1.5), ne değişti, "telefonda deneme uygulamasından bakabilirsin; beğenmezsen söyle, düzeltip tekrar gönderirim, 'geri al' dersen geri alırım". Canlıya çıkışın gece regresyonundan sonra onayla olacağını hatırlat.
   - **"Geri al":** `gelistirme`'deki o işin birleştirme commit'ini `git revert -m 1 <commit>` ile geri al (konu dalında aynısını yap ki tekrar gönderilmesin), yama +1, kontrol, gönder.
7. **Acil düzeltme** (yalnız kullanıcı açıkça "canlıya acil düzeltme" / "hemen canlıya" derse): `docs/SUREC.md` → "Acil düzeltme" adımları. Başka hiçbir durumda konu sohbeti `master`'a yazmaz.
8. Hiçbir dalda rebase ya da force-push yok; başka sohbetin konu dalına yazılmaz.
