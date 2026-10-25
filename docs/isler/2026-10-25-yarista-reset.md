# Yarışta yeniden başlatma ve pist dışından dönüş

- İstek (aynen): Last Turn projesine devam edelim. oyuna yarış sırasında restart butonu yok. yeniden başlatma özelliğini ekleyelim. eğer pistin dışında 5 saniyeden fazla kalırsam oyun otomatik reset atıp beni pistten ilk çıktığım yerin hizasında pistin ortasında başlatsın
- Sahip: Codex; dal: `codex/yarista-reset`; temel: `27f0af1` (gelistirme 0.6.2).
- Tek uygulayıcı; risk: yarış ilerlemesi, zaman ve drift kombosu. Gerçek oturum modeli arayüzden belirlenir.
- Kabul: yarış duraklatma menüsünde açıkça “Yeniden başlat”; aynı araç/parçalar/pist ile 3 sn geri sayım ve temiz yarış sayaçları.
- Kabul: kesintisiz pist dışında tam 5 sn'de dönüş yok; sonraki sabit adımda ilk çıkış hizasındaki merkez çizgiye, pist yönünde ve durarak dönüş.
- Kabul: piste erken girince sayaç silinir; ikinci çıkış yeni konumu tutar. Pause/geri sayım/sonuç sırasında sayaç ilerlemez.
- Kabul: otomatik/manüel dönüş süreyi ve tamamlanan turları/puanı korur; açık drift kombosu temizlenir; ışınlanma tur/bitiş kazandırmaz. Serbest sürüş aynı kalır.
- Test planı: saf geometri/zaman sınırları + tarayıcıda gerçek yarış entegrasyonu, yeniden başlatma, duraklama ve iPhone 13 yatay ekran görüntüsü. Fizik motoruna dokunulmadığı için geniş fizik ölçümü gerekmiyor.
- Durum: uygulama sürüyor. Revize: 0; ajan: 1; kota telemetrisi yok.

## Tamamlama ve engel

- Uygulama kaynağı: `09db251`; lock dosyası değişmedi. Yerel Node v24.22.1, aynı depodaki mevcut bağımlılıklar kullanıldı.
- `npm run kontrol`: tip/ESLint/biçim temiz. `vitest` piste-donus + yildiz: 17/17 geçti. `npm run build` geçti; `git diff --check` temiz.
- Beş tür + pause/restart + iPhone 13 yatay ekran senaryosu yazıldı; yerel Chromium yürütülebilir dosyası olmadığından çalışmadı. Önceden bilinen indirme engeli tekrar denenmedi. Görsel doğrulama yapılmış sayılmaz.
- Otomatik onay denetimi `git push -u origin codex/yarista-reset` işlemini reddetti: public GitHub deposuna içerik yayınlamak için kullanıcının açık yetkisi olmadığı gerekçesi. Uzak dal oluşmadı; PR/CI/deneme yayını yok. Aynı işlemi alternatif araçla tekrarlama girişimi yapılmadı.
- Sonraki tek adım: Cem açık push onayı verince konu dalını gönder, PR CI'ında tarayıcı ve ekran kanıtını doğrula; başarılıysa mevcut süreçle gelistirme denemesine al. Canlıya çıkış ayrı onay/regresyondur.
- Revize: 0; tek uygulayıcı; geniş regresyon ve tekrar kurulum yok; token/kota ölçümü mevcut değil.

## Ek istek: yarış lastiği

- İstek (aynen): ayrıca oyun içinde lastik değiştirme sadece serbest sürüşte olsun. yarış içinde otomatik o yarışa uygun lastik takılsın
- Kabul: lastik kısayolu ve lastik seçim listesi yalnız serbest sürüşte; işlev çağrısı da yarışta değişim yapmaz.
- Kabul: asfalt → Yarış, rallikros → Karışık, ralli → Toprak, drift → Drift, drag → Drag. Araç türü ve garajda takılı lastikten bağımsız, yarış türü belirleyicidir.
- Kabul: yarışta yardım seviyesi değiştirme ve yeniden başlatma uygun lastiği korur; çıkış önceki lastik/parça kurulumunu geri getirir. Satın alınmış/takılı parçaların kaydı değiştirilmez.
- Kapsam: kurulumun saf testi + mevcut yarış tarayıcı senaryosuna kısayol/ayar/başlat/yardım/yeniden başlat/çıkış kontrolleri. Önceki push engeli sürer; bu mesaj gönderim onayı değildir.
- Ek isteğin doğrulaması: tip/ESLint/biçim temiz; yaris-lastigi + piste-donus + yildiz 23/23 geçti. Derleme başarılı. Beş türe ait tarayıcı bağlantı kontrolleri yazıldı; mevcut Chromium eksikliği ve push engeli nedeniyle çalıştırılmadı. Gönderim/yayın yapılmadı.

## Gönderim yetkisi

Cem: “sadece regresyonda push onayı bekleyecek benden, bu işi gönderebilmen lazım”. Konu dalı ve gelistirme deneme gönderimi açıkça yetkili; canlıya çıkış regresyon sonunda kullanıcı onayına bağlıdır. Önceki otomatik onay engeli bu açık yetkiyle yeniden değerlendirilir.
