# Garaj sağ panelini sadeleştirme

- İstek: “sağ taraf çok kalabalık oldu. motoru dinleyi araç seviyesinin altına al araç seviyesi biraz küçük kaldı onu büyüt. durum ve çekiş alanını kaldır”. Referans: IMG_0924.jpeg.
- Sahip: Codex, tek uygulayıcı; dal `codex/garaj-duzen`; temel `00cfa5e`, deneme 0.6.5.
- Kabul: Motoru dinle sol üstte sınıf/puan satırının altında; sınıf harfi ve puan belirgin daha büyük.
- Kabul: garajda Durum ve Çekiş/Seçim bilgi kutusu kaldırılır; mağaza Fiyat/Bakiye/Kilit korunur.
- Kabul: motor dinleme, araç değiştirme, modifiye ve yarış/serbest sürüş seçimi çalışır; açık araç açıklaması yeni sol blokla çakışmaz.
- Kanıt: ilgili tarayıcı kontrolleri ve üç cihazda garaj uyumu; iPhone 13 yatay ekran görüntüsü incelenecek. Fizik değişmez, birim/fizik regresyonu gerekmiyor.
- Gönderim: konu ve deneme yetkili; canlıya çıkış regresyon sonu onaylı.
