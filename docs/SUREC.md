# Geliştirme süreci: dallar, yayın, sürümler

`surum-yayinla` ve `regresyon` skill'leri buna göre çalışır. Özet `CLAUDE.md` → "Dallar ve yayın".

## Dallar ve yayın

```
konu dalı ──testler geçince──► gelistirme (0.1.1, 0.1.2, … her gönderim +1) ──► /Last-Turn/dev/ ──► kullanıcı telefonda dener
                                     │
   00:00: denemede yeni oyun işi var ──► bildirim "testlere hazır" ──► "başlat" ya da 04:00 ("bu gece başlama" bekletir)
                                     ▼
                                regresyon (sürüm dondurulur, ör. 0.1.37)
                                     │   hatalar sahibi dalın adıyla düzeltilir, denemede 0 hata olana kadar tekrar
                                     ▼
              rapor + onay isteği ──"push"──► master ──► /Last-Turn/ (canlı, v0.1.37) ──► canlı duman
                                     └──► gelistirme 0.2.0: sonraki sürüm başlar
```

1. **Konu dalı:** her sohbet kendi dalında çalışır, `gelistirme`'den açılır ve onunla güncel tutulur (`git merge origin/gelistirme`). Commit'ler o dala gönderilir: `git push -u origin <konu>` (Denetim alan testini koşar).
2. **Denemeye gönderim** (`surum-yayinla`): konu sohbeti işi bitirip testler geçince, işin boyutu ne olursa olsun, kullanıcıya sormadan konu dalını `gelistirme`'ye birleştirir, yama numarasını artırır (`npm version patch --no-git-tag-version`), `npm run kontrol`, `Deneme 0.1.5: …` commit'i, `git push origin gelistirme`; yayın bitince "<dal>: 0.1.5 denemede, kontrol edebilirsin" bildirimi. Kullanıcı beğenmezse aynı sohbette düzeltilip tekrar gönderilir, "geri al" derse geri alınır. Kullanıcı "bekle" / "denemeye gönderme" dediyse iş konu dalında kalır ("bekletilen iş") ve "push" deyince gider.
3. **Dondurma:** `origin/regresyon` dalı durdukça sürüm regresyondadır ya da canlı onayı bekler; konu sohbetleri `gelistirme`'ye göndermez, işi kendi dalında tutar ve kullanıcıya bir sonraki sürüme gireceğini söyler. Dal canlıya çıkışla silinir.
4. **Regresyon** ("regression" sohbeti, `regresyon` skill'i): her gece 00:00'da denetlenir. Denemede canlıda olmayan oyun işi varsa kullanıcıya "testlere hazır" bildirimi gider; kullanıcı regression sohbetinde "başlat" derse hemen, demezse 04:00'te başlar, "bu gece başlama" derse beklenir. Bekletilen dallar regresyonu durdurmaz, bu sürüme girmez. Onay öncesi kullanıcı bir dalın işini sürümden çıkarabilir ("<dal> bu sürüme girmesin": regression sohbeti geri alır, iş sonraki sürüme kalır). Her hata onu yakalayan senaryonun dalına yazılır, düzeltme commit'i o dalın adıyla başlar (`[fizik] …`), ama düzeltmeleri yalnız regression sohbeti, yalnız `regresyon` dalında yapar: düzeltmeler birbiriyle çakışmaz. Düzeltmeler denemeye gider (yama +1), 0 hata kalana kadar tekrarlanır.
5. **Canlıya çıkış:** regresyon bitince regression sohbeti dal dal rapor verir (her dalda ne geliştirildi, hangi hatalar çıktı, nasıl çözüldü, son test tablosu) ve onay ister. Kullanıcı o sohbette "push" deyince `regresyon` → `master` (`Yayın 0.1.37` commit'i), canlı duman; `gelistirme` 0.2.0'a geçer, dondurma kalkar. **Konu sohbetleri `master`'a yazmaz.**
6. **Acil düzeltme** (yalnız kullanıcı açıkça "canlıya acil düzeltme" / "hemen canlıya" derse): `duzeltme` dalı `origin/master`'dan açılır, düzeltilir, `npm run alan -- <dal>`, yama artırılır (0.1.37 → 0.1.38), kullanıcı onaylayınca `master`'a `Yayın 0.1.38: …` commit'iyle birleştirilir; sonra `master` `gelistirme`'ye birleştirilir (`package.json` sürüm satırında `gelistirme`'ninki kalır).
7. GitHub Actions dumanı tekrar koşar, yayınlar, sonra canlı ve deneme adreslerinde duman koşar (~5 dk). Sonucu `mcp__github__actions_list` ile kontrol et; kalırsa açılan "Canlı duman hatası" kaydına bak, kendi işinden geldiyse hemen düzelt.
8. **Çakışmalar:** sonra birleştiren çözer, iki işi de koruyarak; dokunduğu diğer dalın senaryolarını da koşar (`npm run alan -- <konu>,<diğer>`). Aynı satırı ters yönde değiştiren iki iş varsa kullanıcıya sorar. Konu dalı uzun yaşıyorsa ara ara `git merge origin/gelistirme` (çakışmalar küçükken çözülsün).
9. Commit, rebase ya da force-push ile başka sohbetin dalının geçmişi değiştirilmez; yalnız kendi dalında çalışılır.

## Sürümler

- Biçim `0.SÜRÜM.YAMA`. **0.1.0** kilometre taşıdır: bu geliştirme süreci kurulup denemeye ve canlıya çıktığı an (önceki 3.x numaraları eski düzendendi). Oyun 0.x boyunca geliştirme aşamasındadır.
- **Yama:** `gelistirme`'ye her gönderim (konu sohbetinin gönderimi ya da regresyon düzeltmesi) +1: 0.1.1, 0.1.2, … 0.1.221 olabilir. Sürüm numarasını yalnız `gelistirme`'ye birleştiren değiştirir; konu dalları değiştirmez (çakışma olmasın).
- **Sürüm:** regresyon, o sırada denemede olan numarayı dondurur; canlıya aynı numara çıkar (denenen neyse o) ve `master`'da `Yayın 0.1.37` commit'iyle kaydedilir (ortam izin verirse ayrıca `v0.1.37` etiketi). Ardından `gelistirme` 0.2.0 olur.
- Güncelleme kontrolü sürümün **farklı** olmasına bakar, büyüklüğüne değil (`src/pwa/kayit.ts`); 3.2.1'den 0.1.0'a geçiş kurulu uygulamaları bozmaz.
