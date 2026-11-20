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

## İlk tam rapor (CI 40196021549)

- 18,9 dk: 101 senaryoda 91 geçti / 10 kaldı / 0 koşulmamış. Çoklu dal aynı garaj/sürüş testini raporladığından 10 satır aynı sayıda bağımsız oyun hatası değildir. İlk rapor docs/regresyon/ilk-rapor.json.
- Garaj düzeni testinin mağaza kontrolü ilerlemeyi sıfırlıyor ve geri yüklemiyordu; sonrasındaki drift önayar/40 yarış/hud minimap testlerinde kilitli yarış hiç başlamıyordu. Teste try/finally ilerleme geri yükleme ve temiz çıkış eklendi. Gerçek oyuncu kaydı etkilenen bir hata değildir.
- Garaj zoom testi artık açıklama/motor düğmesi bölgesinin altında kalıyordu; boş vitrin merkezinde aynı tekerlek girdisi ve aynı yakınlaşma ölçütü kullanılır.
- iPhone 15 Pro Max (932 px) 900 px kompakt menü eşiğinin hemen dışında kalıyordu; masaüstü boyundaki metin ve simgeler dar karttan taşıyordu. Kompakt eşik 1100 px'e alındı, çakışma kontrolü kaldırılmadı.
- Tam koşum öncesine bu hataların kritik tekrarları ve iphone-15-pro-max/menu-ana denetimi eklendi; kritik kontrol kalırsa uzun koşum başlamaz. Tam koşumun kapsamı/bütçesi aynıdır. Yalnız tamamlanmış rapor/devir belgelerinin güncellenmesi yeni bir tam regresyon tetiklemez.

## Kritik tur (CI 40197944854)

Hayaletin kayıt/kurulum/konum/bölge bağımsızlığı/piste dönüş/yarım kayıt/çıkış kontrollerinin tümü geçti. İlerleme yalıtımı ile önayar ve zoom da geçti. Tek kalan: 4× CPU yavaşlatılmış garaj geçişinde en uzun senkron tıklama 118 ms (sınır 60 ms), program/geometri artışı yok. Araç açıklaması eski DOM ve yeni DOM için iki kez senkron yerleşim ölçüyordu; eski ölçüm kaldırıldı ve son ölçüm çizim karesine taşındı. Eşikler aynıdır; görünüm testleri boyut ölçmeden önce çizim karesini bekler. Kritik tur başarısız olduğu için gereksiz uzun tam tur başlamadı. Menü cihaz denetimi, başka kritik test kalsa da sonuç üretecek.

## Son doğrulama ve yayın yetkisi

- Son kaynak `126f03d1e80f96e6c1b4415e7210f7d8a189411d`, CI 40198483398: kritik tekrarlar başarılı; tam regresyon 104/104 geçti, 0 hata / 0 koşulmamış (23,2 dk). Ardından duman 10/10 geçti (5,6 dk). Ham kanıt artifact 12601154719; kritik kanıt 12600823333.
- 12 sanal cihazdaki kontrollerde 62 ekran hücresi hatasız; iPhone 15 Pro Max menü görseli ve iPhone 13 garaj görüntüsü incelendi. Fizik değerleri bu regresyonda değiştirilmedi.
- Garaj 4× CPU ölçümü: senkron tıklama 118 ms → 6 ms; program/geometri sayısı değişmez. Test eşikleri gevşetilmedi.
- Node22/Ubuntu/Chromium ortamı; bağımlılık kilidi son kaynakla aynı. Deneme 0.6.8, merge e92fe898bc70b0c32a4b03d41b09f64a42725a78, Yayın 40198851372 adreste sürüm kontrolü geçti.
- Kullanıcı “regresyon başlatıp canlıya geçelim” diyerek test sonrası canlı çıkışını açıkça yetkilendirdi. Aynı onay yeniden istenmeden, test edilen oyun kodu ve sürüm canlıya taşınır; son ekler yalnız README/kanıt/devir belgeleridir. Canlı dumanı ayrıca izlenecek; bu adım geçmiş sayılmadı.

## Canlı çıkışı ve kapanış

- Yayın 0.6.8 commit `147ea038eaf81eab10511c222b358402eb60586f`; master'a kullanıcı onayı ve geçmiş korunarak gönderildi. Canlı/deneme `src`, test ve bağımlılık kilidi ağaçları aynıydı.
- Yayın CI 40201273989: master ve dev 0.6.8 adreste doğrulandı; canlı adreste duman 10/10 geçti. Böylece yalnız derleme değil gerçek yayın adresi de doğrulandı.
- Regresyon durumu tamamlandi; rapor/devir belgeleri oyun kodunu değiştirmez ve yeni tam koşum tetiklemez. Gelistirme 0.7.0, aynı oyun koduyla sonraki sürüme açılır; canlı 0.6.8 kalır. Canlıda olup denemede olmayan hayalet özelliği kalmadı.
- Uygulayıcı 1; kullanıcı revizesi 0, hata tekrarları ve düzeltmeler yukarıda kaydedildi. Aynı başarılı oyun kodu için kaynak kanıtı kullanıldı; sürüm/devir eklerinde fizik regresyonu tekrar edilmedi. Platform token/TL telemetrisi yok; süreler CI raporlarında.
