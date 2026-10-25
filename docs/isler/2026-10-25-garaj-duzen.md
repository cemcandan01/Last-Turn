# Garaj sağ panelini sadeleştirme

- İstek: “sağ taraf çok kalabalık oldu. motoru dinleyi araç seviyesinin altına al araç seviyesi biraz küçük kaldı onu büyüt. durum ve çekiş alanını kaldır”. Referans: IMG_0924.jpeg.
- Sahip: Codex, tek uygulayıcı; dal `codex/garaj-duzen`; temel `00cfa5e`, deneme 0.6.5.
- Kabul: Motoru dinle sol üstte sınıf/puan satırının altında; sınıf harfi ve puan belirgin daha büyük.
- Kabul: garajda Durum ve Çekiş/Seçim bilgi kutusu kaldırılır; mağaza Fiyat/Bakiye/Kilit korunur.
- Kabul: motor dinleme, araç değiştirme, modifiye ve yarış/serbest sürüş seçimi çalışır; açık araç açıklaması yeni sol blokla çakışmaz.
- Kanıt: ilgili tarayıcı kontrolleri ve üç cihazda garaj uyumu; iPhone 13 yatay ekran görüntüsü incelenecek. Fizik değişmez, birim/fizik regresyonu gerekmiyor.
- Gönderim: konu ve deneme yetkili; canlıya çıkış regresyon sonu onaylı.

## Kanıt ve sonuç

- PR #13, CI 40189533545 başarılı: odaklı garaj senaryosu + 3 cihaz × 5 ekran (15 görünüm); tip/ESLint/biçim/derleme temiz. Motor dinleme/modifiye tıklaması, tüm araçların büyük sınıfı ve konum, serbest sürüş garajı ve mağaza Fiyat/Bakiye doğrulandı.
- iPhone 13 yatay görüntüsü ilk koşunun artifact 12597503383 üzerinden incelendi: sınıf/puan büyüdü, motor düğmesi altında, sağ panelde yalnız süzgeç/modifiye ve alt eylemler kaldı. İkinci koşuda oyun kodu aynıdır.
- İlk koşuda yalnız test, CSS büyük harf dönüşümünü `innerText` ile okuduğu için mağaza etiketini eşleyemedi. `textContent` ile gerçek etiket doğrulandı; test kaldırılmadı/eşik gevşetilmedi. İlk koşuda cihaz uyumu zaten 15/15 geçti, CI ikinci kez tamamlandı. Yerel tarayıcı indirilmedi; ayrı birim/fizik regresyonu gerekmedi.
- Tek uygulayıcı, kullanıcı revizesi yok; ilk test düzeltmesi bir tur; token/kota telemetrisi mevcut değil.
- 0.6.6 denemesine aktarım: yalnız sürüm + kanıt/devir belgeleri eklenir; oyun kodu CI'dakiyle aynı kalır. Konu/deneme yetkili, canlı master'a yazılmaz. Son adım yayın ve adreste sürüm doğrulaması.
