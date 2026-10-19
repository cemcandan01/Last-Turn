---
name: surum-yayinla
description: Last Turn'de yapılan değişiklikleri yayınlar. Sürüm numarasını artırır, testleri çalıştırır, Türkçe commit atar ve master'a push eder; GitHub Pages yayını kendiliğinden günceller. Bir geliştirme bittiğinde ya da kullanıcı "yayınla", "gönder", "telefona gelsin" dediğinde kullan.
---

# Sürümü yayınla

1. `oyun-test` skill'ini uygula. Testler geçmeden yayınlama.
2. `index.html` içindeki `APP_VERSION`'ı artır: küçük düzeltme `x.y.Z`, yeni özellik `x.Y.0`.
3. Yeni dosya eklendiyse ya da silindiyse `sw.js`'teki `CORE` listesini güncelle ve `CACHE` adını bir artır (`last-turn-vN`).
4. Oyuncunun göreceği bir özellik eklendiyse `README.md` "İçerik" bölümüne bir satır ekle.
5. `git status` ile istenmeyen dosya olmadığını kontrol et (`tools/out/` ve `tools/node_modules/` yok sayılır).
6. Türkçe commit: kısa başlık, boş satır, değişiklikleri madde madde. Sonra `git push origin master`.
7. Kullanıcıya Türkçe ve kısa yaz: yeni sürüm numarası, ne değişti, telefonda nasıl görüleceği (uygulamayı kapatıp internet varken açınca iner). Telefonda denenmemiş şeyleri belirt.
