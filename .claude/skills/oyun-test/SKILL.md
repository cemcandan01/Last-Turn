---
name: oyun-test
description: Last Turn oyununu test eder. Değişen işin kapsamındaki testleri koşar (tip denetimi, ESLint, biçim ve dalın senaryoları); duman testi yalnız regresyonda; istenirse ekran görüntüleri. Kodda bir değişiklik yaptıktan sonra, yayından önce ya da kullanıcı "test et", "çalışıyor mu", "bozuldu mu" dediğinde kullan.
---

# Oyunu test et

Kullanıcı her değişikliği canlıya göndermeden önce kendi eliyle de dener. Otomatik test burada **yalnız kendi işinin kapsamı** kadardır (hata bulursan düzeltip yeniden koşarsın); bütün dalların bütün senaryoları ve ardından duman regresyonda koşar (`regresyon` skill'i). Tam koşumu (`npm run kontrol:tam`) yalnız kullanıcı isterse çalıştır.

1. Bağımlılıklar yoksa kur: `npm ci` (`node_modules` varsa atla).
Uzun test çıktısını ana sohbete alma: komutları `testci` ajanına koşturup kısa sonucu kullan (birkaç saniyelik tek komutu doğrudan koşabilirsin). Göndermeden önce oynanış ya da görsel değişiklikte `denetci` ajanından gözden geçirme iste.

2. Değişikliğin dokunduğu dalları bul: sohbetin konu dalı ve düzenlenen dosyaların ait olduğu alanlar (`tests/senaryolar/<dal>.mjs`; ör. `src/fizik/` → fizik, `src/arayuz/hud.ts` → hud, `src/arayuz/menu.ts` → menu, `src/dunya/` → pist, `src/arayuz/garaj.ts` → garaj).
3. Çalıştır:
   - Kod yazarken, sık sık: `npm run alan -- <dal>[,<dal>]` (yalnız o dalların senaryoları). Yalnız fizikte hızlı tur: `npx vitest run -t "<describe adı>"`.
   - Göndermeden önce: `npm run typecheck && npm run lint && npm run format:check && npm run alan -- <dal>` (~30-60 sn).
   - Görsel değişiklik (model, pist, ışık, menü, HUD): ayrıca `npm run test:goruntu`, sonra `tests/cikti/` içindeki ilgili görüntülere bak.
   - Fizik değişikliği: ayrıca `npm run olcum` (tur süreleri hedeflerle karşılaştırılır).
4. Biçim hatası varsa `npm run format` çalıştır.
5. Başarısız test varsa önce sebebi bul. Test mi yanlış, oyun mu? `CLAUDE.md`'deki tuzaklara bak (katmanlar, sabit adım, `demoStop`, `leaveEvent` geri yüklemesi, `APP_VERSION` tırnakları).
   - Fizik testi kırıldıysa sürüş hissi değişmiştir: hangi kullanıcı kararını (spin, drift, toprak, titreşim) bozduğuna bak. Bilerek değiştirildiyse testin eşiğini kullanıcıya söyleyerek güncelle; bilerek değilse değişikliği geri al.
   - Test atlanmaz, kapatılmaz.
6. Yeni bir özellik eklendiyse onu deneyen bir senaryo ekle ve kendi dalının senaryo dosyasına kaydet (`tests/senaryolar/BENIOKU.md`): birim testi `tests/birim/`, tarayıcı testi `tests/e2e/bolumler/<ad>.mjs` (ve `tests/e2e/duman.mjs` → `BOLUMLER` listesi). Önemini (`p: 1|2|3`) doğru ver; gece regresyonu bu sırayla koşar. `duman: true` yalnız birkaç saniyelik, oyunun temelini denetleyen P1 senaryolara.
7. Sonucu kullanıcıya Türkçe ve kısa bildir: hangi dalların senaryoları koştu, kaçı geçti, ne kaldı. Ölçülen sayılar varsa (spin, drift yüzdesi, pistte ilerleme) yaz.
