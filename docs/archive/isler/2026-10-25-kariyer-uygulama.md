# Kariyer gelişimi: uygulama

Kullanıcı: “değiştirilmesi gereken fiyatlar ve fizikler varsa yapalım. oyuncuyu oyunda tutmak için gelişim hissiyatını verip daha fazlasını almasını istememiz lazım o yüzden bu mekaniği şimdiden entegre edersek sonraki eklenen her şeyde bunun sıkıntısını yaşamayız”.

- Sahip Codex; dal codex/kariyer; temel a62833cc2f7223bb722657629a732ab5b8fd9ef9 (0.7.1). Araştırma docs/DENGE.md. Oyun-test yordamının istediği bağımsız denetci yalnız read-only inceleme yapar.
- Kabul 1: 40 pistte tek merkezden performans bütçesi, hedef kurulum ve süre bazlı ödül; pist kimliği/zorluk karışmaz; bütçe üstü deneme kariyer kaydını/ödülünü değiştirmez.
- Kabul 2: 15 araç/42 parçada fiyat ve etki eğrisi; normal motor ve büyük dönüşüm ayrılır; kategori yatırımı üst parçaya sayılır; otomatik lastiğin kalitesi alınan parçayı gerçekten kullanır.
- Kabul 3: beş türün tamamında aşamaya uygun gerçek fizik ölçümüyle yıldızlar; stok/tek motor/paket ve yeni platform rotaları karşılaştırılır. Aynı sabit yarış hedefi oyuncuyla beraber yükselmez.
- Kabul 4: yalnız bir türde 1–2 yıldızla ilerleme mümkün; diğer türde farm zorunlu değil; mevcut para, sahiplik, yıldız ve açık içerik korunur.
- Kabul 5: oyuncu yarıştan önce sınırı/uygunluğu, modifiye alırken net bedeli görür; sonraki içerik aynı veri/denetim sözleşmesini kullanır. İlgili birim/fizik/arayüz kanıtı, ardından 0.7.2 veya güncel sürümün bir sonraki yaması denemede doğrulanır. Canlı değişmez.
- Sınır: bütün davranışı yeniden yazan fizik motoru değişikliği yok; gerçek fizik üzerinde parça parametreleri kalibre edilir. İnsan oyuncu keyfi/başarı dağılımı otomasyonla kanıtlanmış sayılmaz.
- Durum: tamamlandı; 0.7.6 deneme adresinde doğrulandı.

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
- CI/tarayıcı ve deneme yayın kanıtları aşağıda tamamlandı. Canlı sürüm değişmedi.

## Güncel dal birleştirmesi

- Çalışma sürerken başka oturumun 0.7.2–0.7.5 işleri geldi. 0871a3b ile yerelde birleştirildi; yeni drift bonusu, drift2 rekoru, kerb/çim ve 1 sn sonrası sayaç korunur. Oyun hedefleri çatışmasında eski öneriyi körlemesine tutmak yerine 8 drift hedefi ve 3 drift yatırım örneği yeniden ölçüldü.
- Ortak model farkı yalnız cimTeker çıktı sayacıdır; kuvvet/kinematik kaynakları normalleştirilip birebir aynı olduğu doğrulandı. Bu nedenle 32 zamanlı pist ve 12 zamanlı yatırım koşusu yeniden sürülmedi; başarılı aynı kurulum/aynı fizik kanıtı kullanıldı. Drift imzası puan kurallarını ve çim çıktısını ayrıca kapsar.
- Birleştirme sonrası yeni deneme yaması en az 0.7.6 olacaktır; kaynak CI sonrası güncel dal tekrar doğrulanır.

- Yeni sınırlı kariyerin rekorları `kariyer1_<önceki anahtar>` içindedir; eski sınırsız/önceki fizik rekorları profil geçmişinde ayrıca görünür ve bulutta korunur. Böylece eski hızlı aracın ulaşılamayan rekoru yeni kupanın hayaletiyle karışmaz. Firestore üst şeması değişmez; mevcut rekor haritası kullanılır. Yeni/süre/drift/eski/deneme ayrımı birim testiyle doğrulanır.

- İlk kaynak CI c26b66b, Denetim 40225697823: yalnız ESLint regex boşluk biçimi; düzeltildi. E3ccfd2 CI 40225873539: 88/88 birim geçti, 30 alan senaryosundan 25'i geçti. Eksik debug leaveEvent cleanup'ı, yeni yıldızlı erişim metninin eski beklentisi ve modalın geç sonuç zamanlayıcısının garaj/yeniden başlatmayı kapatması düzeltildi. Gelen HUD bonus satırı direksiyon dokunma alanına taşıyordu; kalan bilgi koridorunun ortasına alındı. Test zayıflatılmadı; aynı akışlar tekrar koşulacak.

- 964931e / CI 40226693351: 90/90 birim ve 31 alan senaryosunun 29'u geçti. Son iki bulgu: direksiyonla bonus koridoru Kadran düzeninde de uygulanmalıydı; rallikrosun Toprak lastiği için eski tarayıcı beklentisi Karışık idi. Tüm direksiyon düzenlerine aynı koridor kuralı ve yeni doğru bileşik beklentisi uygulandı. Yeni içerikte eksik araç fiyatı ve ucuz büyük güç dönüşümü de sözleşme testine bağlandı.

## Kaynak tamamlandı

- Test edilen kaynak: 1fb87cdeb7a64d32373618e439c757947c1668e6; Denetim https://github.com/cemcandan01/Last-Turn/actions/runs/40227251363, job 121271129008: başarılı. 31/31 alan senaryosu, 91 seçilen birim ve 11 tarayıcı bölümü; kapsam dışı 8 bulut testi Vitest filtrelidir, koşuldu denmez.
- iPhone 13 kariyer garajı görseli ve sonradan açılan modalın engellenmesi doğrulandı; tüm HUD/kontrol kombinasyonları çakışmasız. RX Toprak/restart/yardım/serbest sürüş geri dönüşü geçti. Tam regresyon veya insan başarı dağılımı iddiası yok.
- Yayın tabanı gelistirme 0871a3b (0.7.5); sürüm dondurma yok. Deneme 0.7.6: aynı oyun/test kodu, yalnız sürüm kökleri ve belge kanıtı eklenir. Canlı 0.6.8 değişmez.
- Sonraki adım: Cem'in iPhone sürüş geri bildirimiyle gerekirse ince ayar; teknik yayın adımı tamamlandı.

## Teslim

- Deneme birleştirmesi: 95ba863b69694a8a6b45cc43a247198e6cae66d1, 0.7.6. Kaynak CI 1fb87cd ile src/tests/scripts/.github farkı yok; yalnız sürüm kökleri ve Markdown kanıt eklendi. Yerel yayın kontrolü (tip/ESLint/biçim) geçti.
- Yayın https://github.com/cemcandan01/Last-Turn/actions/runs/40227752816 başarılı; derle 121272669381, yayınla 121272937236, adres kontrolü 121272987653 başarılı. Adres kanıtı: kök → 0.6.8, /dev/ → 0.7.6 (25 Ekim 2026, 19:50 UTC). Canlı sürüm aynı olduğu için canlı duman bu deneme yayınında çalışmaz.
- Oynama adresi: https://cemcandan01.github.io/Last-Turn/dev/
- Son kanıt/devir commit'i yalnız bu kart, devir ve alan notu Markdown'ıdır. Oyun/bağımlılık/sürüm değişmez; aynı başarılı CI/yayın kanıtı yeniden kullanılır. Gereksiz ikinci Pages yayını tetiklenmesin diye belge commit'inde [skip ci] kullanıldı; oyun doğrulaması atlanmadı.
