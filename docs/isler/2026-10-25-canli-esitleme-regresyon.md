# Canlı ve denemeyi hayalet sürüş dahil eşitleme

- Kullanıcının isteği: “o kadar kurallar dosyasını oku dedim ona. neyse bundan sonra geminiyi sadece fikir işlemleri için belki kullanırım. şimdi bir regrsyon başlatıp canlıya geçelim. canlıda testte olmayan bir şey uzun süre kalmasın”.
- Sahip Codex; tek uygulayıcı, dal regresyon. Başlangıç: gelistirme 784b73d / 0.6.6; master 5073499 / hayalet PR #14; eski regresyon tamamlandı.
- Yetki: kullanıcı bu mesajda regresyon sonrası canlıya çıkışı açıkça istedi. Testler geçince yeniden aynı onay istenmez; hata/koşulmamış senaryo varken canlıya çıkılmaz.
- Kabul: hayalet kodu ve bütün güncel deneme özellikleri aynı kaynakta; tam regresyonda 0 hata ve 0 koşulmamış; duman başarılı; deneme ve canlıda aynı test edilen oyun kodu/sürüm; canlı duman başarılı; sonraki geliştirme sürümü açılır.
- Canlıdaki eski sürüm etiketiyle hayalet eklenmesi ve başarısız Jules alan eşlemesi doğrulandı. 0.6.7 ile gerçek sürüm değişimi yapılacak. Eski tamamlanmış regresyon dalı geçmişi ek ebeveynle korunur; force-push yapılmaz.
- Önce merge çakışmaları çözüldü: kurulum/lastik ve hayalet importları birlikte korundu; devir notları korundu. Diğer bekletilmiş konu dalları bu sürüme ayrıca alınmaz; master ve gelistirme toplamı kapsamdır.
- Test ortamı: yerel Node 24 mevcut bağımlılıklar ile birim kontrolü; tarayıcı/tam cihaz/ses kontrolleri Ubuntu/Node22/Chromium GitHub Actions'ta. Tam regresyon için ayrı 70 dk iş, test bütçesi 55 dk; hiçbir alan daraltılmaz.

## İlk hata tekrarı ve düzeltmeler

- Yerel ilk birim turu: 285 geçti / 2 kaldı (287). Modifiye testi eski %27 yarış motoru beklentisi taşırken kullanıcının 0.6.2 kararı %75 idi; test yeni parça değerine uyarlandı. Kor RX AWD testinde gövdenin 30° yanlaması zorunlu tutulmuştu; araç önden kayarken lastikler zaten tutuş sınırını aşıyordu. Oyun fiziği değiştirilmeden gerçek 80 km/sa başlangıç ve lastik kayma açısı >30° ölçülür; gövde ile lastik açısının ayrımı korundu.
- Hayalet hata tekrarı: 85 HP kaydı oynatılırken bağlamdaki araç 480 HP çıktı. Araç/parça/lastik/yardım kurulumu ve hava kaydedilip geri yüklenir; hayalet parçacık/SPİN üretmez ve oyuncunun pist ipucunu/bölgesini değiştirmez. Konum aynı girdilerle 1e-7 hassasiyetle eşleşir.
- Yarışta piste dönüş, kayıt başlangıcını keser: eksik sürüş rekor diye saklanmaz; mevcut hayaletin zamanı başa alınmaz. Serbest tur kaydı tur başlangıç indeksini taşır ve başlangıç öncesi girdileri yükleyerek doğru yerden oynar; bozuk/eski kurulumsuz kayıt oynatılmaz, ilerleme/para/yıldız silinmez.
- Tarayıcı sürüş testi önceki ekranın bıraktığı araçla 2 sn/10 m bekliyordu. Zayıflatılan başlangıç araçlarından bağımsız, ölçülü test aracı açıkça kurulur; hız/mesafe eşikleri gevşetilmez.
- Dar doğrulama: hayalet + modifiye 11/11, hayalet sınırları eklenince 5/5 hayalet testi; fizik 80 km/sa testi geçti; tip/lint/biçim temiz. Gerçek yarışta farklı araç/aynı kayıt/bağımsız sorgu/yarım kayıt engeli tarayıcı senaryosu tam regresyona eklendi.
