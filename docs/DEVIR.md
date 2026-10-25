# Son devir: 0.6.8 regresyonu

- Sahip Codex; dal regresyon. Cem bu sohbette tam regresyon ardından canlıya çıkışı açıkça istedi; yeniden aynı push onayı sorulmaz. İleride konu/deneme gönderimi onaysız, canlı çıkışı kullanıcı onaylıdır.
- Canlıdaki hayalet PR #14 (master 5073499) güncel denemeyle birleştirildi. Son kaynak 126f03d1e80f96e6c1b4415e7210f7d8a189411d; CI 40198483398: tam regresyon 104/104 ve ardından duman 10/10 geçti. Kritik tekrarlar ve 12 sanal cihaz/62 ekran temiz.
- Hayalet kayıtlı araç/parça/lastik/yardım/havayla oynar; başka araç seçimi kaydı bozmaz, oyuncunun pist ipucunu etkilemez. Yarım/bozuk kayıt oynatılmaz; serbest tur başlangıcı doğru indeksle yüklenir.
- Eski modifiye/gövde kayma testleri güncel kullanıcı kararlarıyla doğrulandı. Garaj testinin ilerleme sızıntısı yalıtıldı, iPhone 15 Pro Max menüsü düzeldi. Garaj senkron tıklaması 4× CPU'da 6 ms.
- 0.6.8 denemede, Yayın 40198851372 başarılı. Bu kaynak canlıya aktarılıyor; sonraki adım canlı Yayın/adres/duman kanıtı, sonra gelistirme 0.7.0 ve regresyon tamamlandi kaydı.
- Görev ve ham raporlar: docs/isler/2026-10-25-canli-esitleme-regresyon.md; docs/regresyon/ilk-rapor.json, son-rapor.json, duman-rapor.json. Yerel Chromium yok; kanıt GitHub Actions'ta. Gemini/Jules'un başka bekleyen dalı bu sürüme eklenmedi.
