---
name: oyun-test
description: Last Turn oyununu test eder (tip denetimi, ESLint, Node'da fizik testleri, derleme, başsız tarayıcıda menü/15 yarış/garaj/sürüş; istenirse ekran görüntüleri). Kodda bir değişiklik yaptıktan sonra, yayından önce ya da kullanıcı "test et", "çalışıyor mu", "bozuldu mu" dediğinde kullan.
---

# Oyunu test et

1. Bağımlılıklar yoksa kur: `npm ci` (`node_modules` varsa atla).
2. Değişikliğin türüne göre çalıştır:
   - Her değişiklik: `npm run kontrol` (tip denetimi, ESLint, birim testleri, derleme, tarayıcı testi; ~1 dk)
   - Yalnız fizik, sürüş, araç değerleri, drift: önce `npm test` (~2 sn), sonra `npm run kontrol`
   - Görsel değişiklik (model, pist, ışık, menü, HUD): `npm run build && npm run test:goruntu`, sonra `tests/cikti/` içindeki ilgili görüntülere bak.
3. Biçim hatası varsa `npm run format` çalıştır.
4. Başarısız test varsa önce sebebi bul. Test mi yanlış, oyun mu? `CLAUDE.md`'deki tuzaklara bak (katmanlar, sabit adım, `demoStop`, `leaveEvent` geri yüklemesi, `APP_VERSION` tırnakları).
   - Altın iz testi (`klasik-iz`) kırıldıysa klasik fizik değişmiştir. Bilerek değiştirildiyse `npm run altin-iz` ile izi yenile ve kullanıcıya hangi hissin değiştiğini söyle; bilerek değilse değişikliği geri al.
5. Yeni bir özellik eklendiyse onu deneyen bir test ekle (`tests/birim/` ya da `tests/e2e/duman.mjs`).
6. Sonucu kullanıcıya Türkçe ve kısa bildir: kaç test geçti, ne başarısız oldu. Ölçülen sayılar varsa (spin, drift yüzdesi, pistte ilerleme) yaz.
