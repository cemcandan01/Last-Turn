# Kariyer gelişimi: uygulama

Kullanıcı: “değiştirilmesi gereken fiyatlar ve fizikler varsa yapalım. oyuncuyu oyunda tutmak için gelişim hissiyatını verip daha fazlasını almasını istememiz lazım o yüzden bu mekaniği şimdiden entegre edersek sonraki eklenen her şeyde bunun sıkıntısını yaşamayız”.

- Sahip Codex; dal codex/kariyer; temel a62833cc2f7223bb722657629a732ab5b8fd9ef9 (0.7.1). Araştırma docs/DENGE.md. Oyun-test yordamının istediği bağımsız denetci yalnız read-only inceleme yapar.
- Kabul 1: 40 pistte tek merkezden performans bütçesi, hedef kurulum ve süre bazlı ödül; pist kimliği/zorluk karışmaz; bütçe üstü deneme kariyer kaydını/ödülünü değiştirmez.
- Kabul 2: 15 araç/42 parçada fiyat ve etki eğrisi; normal motor ve büyük dönüşüm ayrılır; kategori yatırımı üst parçaya sayılır; otomatik lastiğin kalitesi alınan parçayı gerçekten kullanır.
- Kabul 3: beş türün tamamında aşamaya uygun gerçek fizik ölçümüyle yıldızlar; stok/tek motor/paket ve yeni platform rotaları karşılaştırılır. Aynı sabit yarış hedefi oyuncuyla beraber yükselmez.
- Kabul 4: yalnız bir türde 1–2 yıldızla ilerleme mümkün; diğer türde farm zorunlu değil; mevcut para, sahiplik, yıldız ve açık içerik korunur.
- Kabul 5: oyuncu yarıştan önce sınırı/uygunluğu, modifiye alırken net bedeli görür; sonraki içerik aynı veri/denetim sözleşmesini kullanır. İlgili birim/fizik/arayüz kanıtı, ardından 0.7.2 veya güncel sürümün bir sonraki yaması denemede doğrulanır. Canlı değişmez.
- Sınır: bütün davranışı yeniden yazan fizik motoru değişikliği yok; gerçek fizik üzerinde parça parametreleri kalibre edilir. İnsan oyuncu keyfi/başarı dağılımı otomasyonla kanıtlanmış sayılmaz.
- Durum: uygulanıyor. Son SHA/kanıt gönderim sonunda yazılacak.

## Uygulanan davranış

- Bütün 40 yarış sabit D200/D250/D400/C500/B600/açık999 bütçesinde; sınır üstü araç ödülsüz deneme (`deneme_` rekor/hayalet anahtarı). Garaj önerisi sınırı gözetir; sonuç açıkça ödülsüzdür. Bitiriş run/pozitif süre/tekil olay şartlı.
- 40 pist gerçek 4 teker motor + Dengeli yardım + runtime otomatik lastikle ölçüldü. Rallikros toprak bileşiğine alındı; Toz Tepeleri ve D400 Taş Ocağı kurulum sorunu ölçümle yakalandı. Efsane asfalt Gri Atmaca'nın fren/aero/şasi projesi; Usta+ drift motor değişimi/uygun turbo/şasi projesi üzerinden kalibre edildi.
- Normal motor +8/+16/+28%; yarış motoru 3100, motor değişimi 9000, büyük turbo 5500. Büyük turbo +70% korunur; sıradan ucuz kademe değil büyük proje. Kategoriye ödenen bütün gerçek bedeller üst alıma kredi; eski alimlar değişmez.
- Otomatik bileşik + takılı parçanın K1/K2/K3 kalitesi: tutuş +3/+6/+9%; 0–6 eski indeksleri ve lastikten bağımsız puan korunur. Yarış önizlemesi gerçek otomatik bileşiği kullanır. Eski hayalet şeması oynatılmaz (yeni 3), başarı/XP/para/sahiplik silinmez.
- Para ve XP sabit ölçülmüş referans dakika + 12 sn sonuç/dönüş akışı üzerinden; ilk yıldız bonusu yol bağımsız, tekrar ödemesi var, bekleyerek büyütülemez. Kimlik/zorluk hatası kalktı. Tek türde 2★ bütün aşamaları açar; eski XP/ACILMA ve önceki erişim korunur, yeni yıldız yolu eklenir.
- Garajın sürekli mağazaya yönlendiren düğmesi mevcut aracı geliştirmeye yönelir. Hedef/uygunluk/net alım bedeli oyuncuya görünür.
- Yeni araç/pist/parça/fizik alanları kariyer sözleşmesini CI'da da koşar. Ölçüm imzası sadece ilgili araç/kurulum/geometri ve ortak fizik değişince geçersiz olur; yeni ilgisiz araç eklemek bütün eski hedefleri geçersiz kılmaz.

## Yerel kanıt

- Tip/ESLint/biçim kontrolü; temel 8 dosyada 68/68 birim geçti. Son drift hedefleri sonrası kariyer sözleşmesi 10/10 geçti.
- Geniş incelemede 290 birimden 281'i geçti; 7 süre aşımı (beş eşzamanlı fizik ölçümü altında 5 sn sınırı), 2 titreşim fixture sorunu bulundu. İlgili 3 dosya düşük paralellik/30 sn ile 22/22; titreşim/kararlılık hedefli kapsam 10/10 geçti. İlgisiz başarılı 281 test körlemesine yeniden koşulmadı. Titreşim testi asfalt bileşiğini yalıtır; kariyer ölçümü runtime lastiğini kullanır.
- tests/yardimci/uyum.ts bariyerde 10 sn hareketsiz kalan pilotu erken başarısız sayar; başarılı sürüşün süre/puanını değiştirmez. Zor başarısız referansı dakikalarca simüle etmeyi önler.
- 40 pistin ölçümleri ve kurulum/fizik/geometri imzaları docs/denge/2026-10-25-kariyer-olcum.json; 5 türde Usta pistinde 3 yatırım yolu (15 sürüş örneği) docs/denge/2026-10-25-yatirim-olcum.json. Bu pilot örneklemi, insan başarı oranı garantisi değildir.
- İlk bağımsız denetim bitişin tekilliği, deneme rekorlarının ayrılması, kredi muhasebesi ve kayıt uyumu risklerini belirledi; uygulamaya alındı. İkinci bağımsız denetim araç kotası nedeniyle tamamlanmadı; kalan doğrulama ana uygulayıcı ve ilgili testlerle yürütüldü.
- CI/tarayıcı/deneme yayın kanıtı: gönderim sonunda eklenecek. Canlı sürüm değişmez.

## Güncel dal birleştirmesi

- Çalışma sürerken başka oturumun 0.7.2–0.7.5 işleri geldi. 0871a3b ile yerelde birleştirildi; yeni drift bonusu, drift2 rekoru, kerb/çim ve 1 sn sonrası sayaç korunur. Oyun hedefleri çatışmasında eski öneriyi körlemesine tutmak yerine 8 drift hedefi ve 3 drift yatırım örneği yeniden ölçüldü.
- Ortak model farkı yalnız cimTeker çıktı sayacıdır; kuvvet/kinematik kaynakları normalleştirilip birebir aynı olduğu doğrulandı. Bu nedenle 32 zamanlı pist ve 12 zamanlı yatırım koşusu yeniden sürülmedi; başarılı aynı kurulum/aynı fizik kanıtı kullanıldı. Drift imzası puan kurallarını ve çim çıktısını ayrıca kapsar.
- Birleştirme sonrası yeni deneme yaması en az 0.7.6 olacaktır; kaynak CI sonrası güncel dal tekrar doğrulanır.
