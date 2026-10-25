# Son devir: 0.6.8 canlıda

- Codex regresyonu tamamladı. Cem bu sohbette tam regresyon sonrası canlıya çıkışı açıkça yetkilendirdi; aynı onay tekrar istenmedi. Gelecekte konu/deneme gönderimi onaysız, yeni canlı çıkışı kullanıcı onaylıdır.
- Canlı master 0.6.8: 147ea038eaf81eab10511c222b358402eb60586f. Yayın 40201273989: adres doğrulaması ve canlı duman 10/10 geçti. Gelistirme 0.7.0 aynı oyun koduyla açıldı; regresyon durumu tamamlandi, dondurma kalkar.
- Test edilen kaynak 126f03d1e80f96e6c1b4415e7210f7d8a189411d, CI 40198483398: tam regresyon 104/104, ardından duman 10/10; 12 sanal cihazda 62 ekran hatasız. Son ekler README/kanıt/devir belgeleridir, oyun kodu değişmedi.
- Hayalet kayıtlı araç/parça/lastik/yardım/havayla oynar; başka araç seçimi kaydı bozmaz, oyuncunun pist ipucunu etkilemez. Yarım/bozuk kayıt oynatılmaz; serbest turun başlangıcı doğru indeksle yüklenir. Canlıdaki Jules PR #14 ile denemedeki bütün geliştirmeler aynı sürümdedir.
- Garaj testinin ilerleme sızıntısı yalıtıldı; iPhone 15 Pro Max menüsü düzeldi. Garaj senkron tıklaması 4× CPU'da 118→6 ms. Fizik davranışı değiştirilmedi; eski motor/gövde kayması beklentileri güncel kararlarla doğrulandı.
- Görev ve ham kanıt: docs/isler/2026-10-25-canli-esitleme-regresyon.md; docs/regresyon/ilk-rapor.json, son-rapor.json, duman-rapor.json, canli-duman.md. Yerel Chromium yok; tarayıcı kanıtı CI'da. Başka bekleyen konu dalı bu sürüme ayrıca eklenmedi.
