# Canlı ve denemeyi hayalet sürüş dahil eşitleme

- Kullanıcının isteği: “o kadar kurallar dosyasını oku dedim ona. neyse bundan sonra geminiyi sadece fikir işlemleri için belki kullanırım. şimdi bir regrsyon başlatıp canlıya geçelim. canlıda testte olmayan bir şey uzun süre kalmasın”.
- Sahip Codex; tek uygulayıcı, dal regresyon. Başlangıç: gelistirme 784b73d / 0.6.6; master 5073499 / hayalet PR #14; eski regresyon tamamlandı.
- Yetki: kullanıcı bu mesajda regresyon sonrası canlıya çıkışı açıkça istedi. Testler geçince yeniden aynı onay istenmez; hata/koşulmamış senaryo varken canlıya çıkılmaz.
- Kabul: hayalet kodu ve bütün güncel deneme özellikleri aynı kaynakta; tam regresyonda 0 hata ve 0 koşulmamış; duman başarılı; deneme ve canlıda aynı test edilen oyun kodu/sürüm; canlı duman başarılı; sonraki geliştirme sürümü açılır.
- Canlıdaki eski sürüm etiketiyle hayalet eklenmesi ve başarısız Jules alan eşlemesi doğrulandı. 0.6.7 ile gerçek sürüm değişimi yapılacak. Eski tamamlanmış regresyon dalı geçmişi ek ebeveynle korunur; force-push yapılmaz.
- Önce merge çakışmaları çözüldü: kurulum/lastik ve hayalet importları birlikte korundu; devir notları korundu. Diğer bekletilmiş konu dalları bu sürüme ayrıca alınmaz; master ve gelistirme toplamı kapsamdır.
- Test ortamı: yerel Node 24 mevcut bağımlılıklar ile birim kontrolü; tarayıcı/tam cihaz/ses kontrolleri Ubuntu/Node22/Chromium GitHub Actions'ta. Tam regresyon için ayrı 70 dk iş, test bütçesi 55 dk; hiçbir alan daraltılmaz.
