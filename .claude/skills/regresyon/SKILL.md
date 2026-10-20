---
name: regresyon
description: Last Turn gece regresyon koşumu. Geliştirme yapılan günlerin gecesi (04:00) "regression" sohbetinde çalışır; bütün dalların senaryolarını önem sırasıyla en fazla 55 dk koşar, hataları sahibi dalın adıyla düzeltir, denemeye gönderir, 0 hata kalana kadar tekrarlar, dal dal rapor verir ve kullanıcı "push" deyince canlıya gönderir. Kullanıcı "regresyon koş", "regresyon raporu", gece koşumu ya da regresyon sonrası "push" dediğinde kullan.
---

# Regresyon

Bu sohbetin dalı `regresyon`. Başka bir sohbetin konu dalına yazılmaz; düzeltmeler yalnız `regresyon` dalına, oradan `gelistirme`'ye (deneme) ve kullanıcı onaylayınca `master`'a gider.

## 1. Gerekli mi?

Konu dallarında (`master`, `gelistirme`, `regresyon` dışındaki bütün dallar) son 24 saatte commit yoksa hiçbir şey yapma; sohbete tek satır yaz ("Bugün geliştirme yok, regresyon koşulmadı.") ve bitir.

```
git fetch origin --prune
for b in $(git branch -r --format='%(refname:short)' | grep -vE '^origin/(HEAD|master|gelistirme|regresyon)$'); do
  git log -1 --since="24 hours ago" --format="$b %h %s" "$b"
done
```

Kullanıcı elle "regresyon koş" dediyse bu denetimi atla.

## 2. Regresyon dalını kur

Bütün dalların işi birlikte denenir:
```
git checkout -B regresyon origin/gelistirme
git merge --no-edit origin/master
# master ve gelistirme'de olmayan commit'i bulunan her konu dalı:
git merge --no-ff --no-edit origin/<dal>
npm ci
```
Çakışmayı iki işi de koruyarak çöz. Çözülemiyorsa (iki dal aynı satırı ters yönde değiştirmiş) o dalı birleştirmeden geç ve raporda "birleştirilemedi" diye yaz. Hangi dalların, hangi commit'lerle girdiğini not al: raporda ve canlıya gönderirken gerekir.

## 3. İlk koşum

```
node tests/kosucu.mjs regresyon --sure 55
cp tests/cikti/rapor.json tests/cikti/rapor-ilk.json
```
Senaryolar `tests/senaryolar/<dal>.mjs`'te, önem sırasıyla (P1 → P2 → P3) koşar; süre dolunca kalanlar "koşulmadı" olur. `kayitsiz` satırı hiçbir senaryoya bağlanmamış testtir: dosyanın hangi dala ait olduğuna bakıp o dalın senaryo dosyasına ekle.

## 4. Hataları çöz

Her hata, onu yakalayan senaryonun dalına aittir (raporda `dal / senaryo`). P1'lerden başla.
1. Sebebi bul: kod mu bozuk, test mi eskimiş? Hatayı getiren commit'i `git log -p` / `git bisect` ile bul; hangi dalın işi olduğunu yaz.
2. Kodu düzelt. Test yalnız kullanıcı kararıyla değişmiş bir davranışı denetliyorsa güncellenir; bunu raporda açıkça yaz. Test atlanmaz, kapatılmaz.
3. Commit başlığı sahibi dalla başlar: `[fizik] Drift yarışında kombo sayacı sıfırlanmıyordu`.
4. O dalın senaryolarını ve dumanı koş: `node tests/kosucu.mjs alan <dal>`. Düzeltme başka bir dalın dosyalarına dokunduysa o dalı da ekle (`alan fizik,hud`).

## 5. Denemeye gönder, tekrar koş

```
npm run kontrol
git push -u --force-with-lease origin regresyon   # dal her gece yeniden kurulur
git checkout gelistirme && git pull origin gelistirme && git merge --no-ff --no-edit regresyon && git push origin gelistirme
git checkout regresyon
node tests/kosucu.mjs regresyon --sure 55 --ilk tests/cikti/rapor-ilk.json
```
Yeni hata varsa 4'e dön. **0 hata** kalana kadar sürdür. Aynı hata üç denemede çözülemezse dur ve kullanıcıya sor.

## 6. Rapor

Bitince sohbete Türkçe rapor yaz (bildirim aracı varsa kısa bir bildirim de gönder):
- Son tablo (`tests/cikti/rapor.md`): her dal için senaryo sayısı, ilk koşumda hata, düzeltme sonrası geçti/kaldı.
- Her hata için bir satır: dal, senaryo, sebep (hangi commit), düzeltme (commit), düzeltme sonrası sonuç.
- Regresyona giren dallar ve işleri; birleştirilemeyen dal varsa sebebi.
- **Canlıya gidecekler:** `git log --oneline origin/master..regresyon` özetinden, telefondaki oyunda neyin değişeceği (dal dal, bir iki cümle). Kullanıcı onaylamadığı bir işi canlıya göndermek istemeyebilir; açıkça göster.
- Deneme adresi: https://cemcandan01.github.io/Last-Turn/dev/ ("telefonda deneyip 'push' de").

## 7. "push" → canlı

Yalnız kullanıcı bu sohbette "push" deyince:
```
git checkout master && git pull origin master && git merge --no-ff regresyon
npm version patch --no-git-tag-version   # yeni özellik giriyorsa minor
npm run kontrol
git commit -am "Yayın x.y.z: regresyon <tarih>" && git push origin master
git checkout gelistirme && git pull origin gelistirme && git merge master && git push origin gelistirme
```
GitHub Actions'ta "Yayın" iş akışının `canli-duman` adımını izle (`mcp__github__actions_list`). Kalırsa açılan "Canlı duman hatası" kaydını oku, 4'ten devam et. Konu dalları düzeltmeleri bir sonraki oturum başında `git merge origin/master` ile alır; onların dalına yazma.

Rebase ve force-push yok; tek istisna bu sohbetin kendi `regresyon` dalı (her gece yeniden kurulduğu için `--force-with-lease`).
