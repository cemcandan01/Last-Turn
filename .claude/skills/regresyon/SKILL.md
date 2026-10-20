---
name: regresyon
description: Last Turn sürüm regresyonu ve canlıya çıkış. "regression" sohbetinde her gece 04:00'te koşulları denetler; sürümün geliştirmeleri bitmişse (denemeye gelen yeni iş var, hiçbir dalda push bekleyen iş yok) bütün dalların senaryolarını önem sırasıyla en fazla 55 dk koşar, hataları sahibi dalın adıyla düzeltir, denemeye gönderir, 0 hata kalana kadar tekrarlar, dal dal rapor verip canlıya çıkış için kullanıcıdan onay ister; onay gelince sürümü canlıya çıkarır ve sonraki sürümü (0.x+1.0) açar. Gece koşumunda, kullanıcı "regresyon koş", "regresyon raporu" dediğinde ya da regresyon sonrası "push" / "onay" dediğinde kullan.
---

# Regresyon ve canlıya çıkış

Bu sohbetin dalı `regresyon`. Başka bir sohbetin konu dalına yazılmaz. Düzeltmeler yalnız `regresyon` dalına yapılır, oradan `gelistirme`'ye (deneme) gider, kullanıcı onaylayınca `master`'a (canlı).

Sürüm düzeni (`CLAUDE.md` → "Sürümler"): `gelistirme`'ye her gönderim yamayı artırır (0.1.1, 0.1.2, …). Regresyon sürümü dondurur, canlıya o sırada denemede olan sürüm (ör. 0.1.37) çıkar, ardından `gelistirme` 0.2.0'a geçer.

## 1. Başlasın mı?

```
git fetch origin --prune
git ls-remote --exit-code --heads origin regresyon      # açık regresyon var mı
git rev-list --count --no-merges origin/master..origin/gelistirme   # canlıda olmayan yeni iş
for b in $(git branch -r --format='%(refname:short)' | grep -vE '^origin/(HEAD|master|gelistirme|regresyon)$'); do
  n=$(git rev-list --count --no-merges origin/gelistirme..$b); [ "$n" != 0 ] && echo "$b: $n commit push bekliyor"
done
```
- **Açık regresyon var** (`origin/regresyon` duruyor): yeniden başlatma. Onay bekliyorsa tek satır hatırlat ("0.1.37 canlıya çıkış için onayını bekliyor"), yarıda kaldıysa kaldığı adımdan devam et.
- **Yeni iş yok** (sayı 0): tek satır yaz ("Denemede yeni iş yok, regresyon koşulmadı.") ve bitir.
- **Push bekleyen dal var:** sürümün geliştirmeleri bitmemiş demektir; başlama. Tek satırda hangi dalda kaç commit beklediğini yaz ("menu: 2 commit push bekliyor; o sohbette 'push' de ya da 'beklemesin' de"). Kullanıcı bir dal için "beklemesin" derse o dalı bu sürümde yok say.
- Koşullar tamamsa başla. Kullanıcı elle "regresyon koş" dediyse yalnız açık regresyon denetimi geçerlidir.

## 2. Sürümü dondur

```
git checkout -B regresyon origin/gelistirme
npm ci
git push -u origin regresyon       # dondurma işareti: bu dal durdukça konu sohbetleri denemeye gönderemez
```
Sürüm adı `package.json`'daki sürümdür (ör. 0.1.37); raporlarda bu adı kullan. Sürüme hangi dalların hangi işlerle girdiğini çıkar: her dal için `git log --no-merges --format='%h %s' origin/master..origin/<dal>`.

## 3. İlk koşum

```
node tests/kosucu.mjs regresyon --sure 55
cp tests/cikti/rapor.json tests/cikti/rapor-ilk.json
```
Senaryolar `tests/senaryolar/<dal>.mjs`'te, önem sırasıyla (P1 → P2 → P3) koşar; süre dolunca kalanlar "koşulmadı" olur. `kayitsiz` satırı hiçbir senaryoya bağlanmamış testtir: dosyanın hangi dala ait olduğuna bakıp o dalın senaryo dosyasına ekle.

## 4. Hataları çöz

Her hata, onu yakalayan senaryonun dalına aittir (raporda `dal / senaryo`). P1'lerden başla.
1. Sebebi bul: kod mu bozuk, test mi eskimiş? Hatayı getiren commit'i `git log -p` / `git bisect` ile bul; hangi dalın işi olduğunu not al.
2. Kodu düzelt. Test yalnız kullanıcı kararıyla değişmiş bir davranışı denetliyorsa güncellenir; bunu raporda açıkça yaz. Test atlanmaz, kapatılmaz.
3. Commit başlığı sahibi dalla başlar: `[fizik] Drift yarışında kombo sayacı sıfırlanmıyordu`.
4. O dalın senaryolarını ve dumanı koş: `node tests/kosucu.mjs alan <dal>`. Düzeltme başka bir dalın dosyalarına dokunduysa o dalı da ekle (`alan fizik,hud`).

## 5. Denemeye gönder, tekrar koş

```
npm run kontrol
git push origin regresyon
git checkout gelistirme && git pull origin gelistirme && git merge --no-ff --no-edit regresyon
npm version patch --no-git-tag-version && git commit -am "Deneme x.y.z: regresyon düzeltmeleri" && git push origin gelistirme
git checkout regresyon && git merge --ff-only gelistirme && git push origin regresyon
node tests/kosucu.mjs regresyon --sure 55 --ilk tests/cikti/rapor-ilk.json
```
Yeni hata varsa 4'e dön. **0 hata** kalana kadar sürdür. Aynı hata üç denemede çözülemezse dur ve kullanıcıya sor.

## 6. Rapor ve onay isteği

0 hata olunca sohbete Türkçe rapor yaz (bildirim aracı varsa kısa bir bildirim de gönder) ve **canlıya çıkış için onay iste**. Onay gelmeden `master`'a hiçbir şey gönderme.

1. **Sürüm:** ad (ör. 0.1.37), deneme adresi https://cemcandan01.github.io/Last-Turn/dev/ ("telefonda deneyebilirsin").
2. **Her dalda neler oldu:** dal dal, oyuncunun göreceği dille 1-3 madde (2. adımdaki commit listesinden).
3. **Test tablosu** (`tests/cikti/rapor.md`): her dal için senaryo sayısı, ilk koşumda hata, düzeltme sonrası geçti/kaldı.
4. **Hatalar ve çözümleri:** her hata için bir satır: dal / senaryo, ne bozuktu, sebebi (hangi dalın hangi işi), nasıl çözüldü (commit), düzeltme sonrası sonuç.
5. **Soru:** "0.1.37 canlıya çıksın mı? Onaylıyorsan 'push' de."

## 7. Onay → canlı

Yalnız kullanıcı bu sohbette "push" / "onay" / "canlıya al" deyince:
```
git checkout master && git pull origin master && git merge --no-ff --no-edit regresyon
```
- `README.md` "İçerik" bölümüne bu sürümde oyuncunun göreceği özellikleri ekle.
- Sürüm numarası değişmez (canlıya denemede denenen sürüm çıkar). `npm run kontrol`; merge commit başlığı ya da ek commit `Yayın 0.1.37: …` olsun (sürümün kalıcı kaydı budur); `git push origin master`. Sonra etiketi dene: `git tag v0.1.37 && git push origin v0.1.37`; bulut ortamı etiket gönderimini reddederse (403) bırak, kayıt "Yayın" commit'idir.
- GitHub Actions'ta "Yayın" iş akışının `canli-duman` adımını izle (`mcp__github__actions_list`). Kalırsa açılan "Canlı duman hatası" kaydını oku, düzelt ve kullanıcıya bildir (acil düzeltme: `CLAUDE.md` → "Acil düzeltme").
- Sonraki sürümü aç:
  ```
  git checkout gelistirme && git pull origin gelistirme && git merge --no-edit master
  npm version minor --no-git-tag-version          # 0.1.37 → 0.2.0
  git commit -am "Sürüm 0.2 başladı" && git push origin gelistirme
  git push origin --delete regresyon              # dondurma kalkar
  ```
- Kullanıcıya kısa yaz: canlıya çıkan sürüm, canlı duman sonucu, "0.2 geliştirmeleri başladı, konu sohbetlerinde 'push' diyebilirsin".

Rebase ve force-push yok. Tek istisna bu sohbetin kendi `regresyon` dalı: her regresyonda yeniden kurulur (`checkout -B`), gerekirse `--force-with-lease`.
