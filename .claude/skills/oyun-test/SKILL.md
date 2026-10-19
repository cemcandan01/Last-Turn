---
name: oyun-test
description: Last Turn oyununu başsız tarayıcıda test eder (yükleme, menü, 15 yarış, garaj; istenirse fizik ve ekran görüntüleri). Kodda bir değişiklik yaptıktan sonra, yayından önce ya da kullanıcı "test et", "çalışıyor mu", "bozuldu mu" dediğinde kullan.
---

# Oyunu test et

1. Bağımlılıklar yoksa kur: `cd tools && npm install` (`tools/node_modules` varsa atla).
2. Sözdizimi: `for f in js/*.js sw.js; do node --check $f || echo HATA $f; done`
3. Değişikliğin türüne göre çalıştır (`tools` klasöründe):
   - Her değişiklik: `node test.mjs`
   - Fizik, sürüş, araç değerleri, drift: `node test.mjs --tam`
   - Görsel değişiklik (model, pist, ışık, menü, HUD): `node test.mjs --goruntu`, sonra `tools/out/` içindeki ilgili görüntülere bak.
4. Başarısız test varsa önce sebebi bul. Test kodu mu yanlış, oyun mu? `CLAUDE.md`'deki tuzaklara bak (yükleme sırası, `demoStop`, `leaveEvent` geri yüklemesi). Düzeltip tekrar çalıştır.
5. Yeni bir özellik eklendiyse onu deneyen bir satırı `tools/test.mjs`'e ekle.
6. Sonucu kullanıcıya Türkçe ve kısa bildir: kaç test geçti, ne başarısız oldu. Ölçülen sayılar varsa (spin, drift yüzdesi) yaz.
