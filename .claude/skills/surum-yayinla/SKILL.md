---
name: surum-yayinla
description: Last Turn konu sohbetinde yapılan işi gönderir. Alan testi ve dumanı koşar, Türkçe commit atar; kullanıcı "push" deyince konu dalını deneme sürümüne (gelistirme, /dev/) birleştirir ve sürümün yama numarasını artırır (0.1.4 → 0.1.5). Regresyon açıksa (sürüm dondurulmuşsa) bekletir. Canlıya (master) konu sohbetinden gönderilmez; canlı çıkış regression sohbetinde onayla olur, yalnız kullanıcının açıkça istediği acil düzeltme istisnadır. Bir geliştirme bittiğinde ya da kullanıcı "push", "pushla", "gönder", "telefona gelsin", "denemeye gönder" dediğinde kullan.
---

# Konu dalından gönder

Akış (`CLAUDE.md` → "Dallar ve yayın"): konu dalı → **"push"** → `gelistirme` (deneme, https://cemcandan01.github.io/Last-Turn/dev/) → gece regresyonu → onay → `master` (canlı). Konu sohbeti yalnız kendi dalına ve `gelistirme`'ye yazar.

1. `oyun-test` skill'ini uygula: tip denetimi, ESLint, biçim, `npm run alan -- <dal>` (konu dalı ve dokunulan dallar). Testler geçmeden gönderme.
2. `git status` ile istenmeyen dosya olmadığını kontrol et (`dist/`, `tests/cikti/`, `node_modules/` yok sayılır). Türkçe commit: kısa başlık, boş satır, değişiklikler madde madde. Konu dalına gönder: `git push -u origin <konu>`.
3. Kullanıcı henüz "push" demediyse burada dur: ne yapıldığını kısaca yaz ve "denemeye göndermem için 'push' de" diye bitir. Dal denemenin gerisinde kalmışsa push bekleyen iş sayılır ve gece regresyonunu bekletir; bunu kullanıcıya söyle.
4. **"push" → deneme**
   - **Dondurma var mı?** `git fetch origin && git ls-remote --exit-code --heads origin regresyon`. Varsa bir sürüm regresyonda ya da canlı onayı bekliyor: `gelistirme`'ye gönderme. Kullanıcıya yaz: "0.1 regresyonda; işin hazır ve kendi dalında duruyor. Regresyon canlıya çıkınca 0.2'ye girer, o zaman tekrar 'push' de." (Kullanıcı ısrar ederse bunun regresyondaki sürüme gireceğini söyle ve regression sohbetiyle çakışmaması için sor.)
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
6. Kullanıcıya kısa yaz: sürüm numarası (ör. 0.1.5), ne değişti, "telefonda deneme uygulamasından bakabilirsin". Canlıya çıkışın gece regresyonundan sonra onayla olacağını hatırlat.
7. **Acil düzeltme** (yalnız kullanıcı açıkça "canlıya acil düzeltme" / "hemen canlıya" derse): `CLAUDE.md` → "Acil düzeltme" adımları. Başka hiçbir durumda konu sohbeti `master`'a yazmaz.
8. Hiçbir dalda rebase ya da force-push yok; başka sohbetin konu dalına yazılmaz.
