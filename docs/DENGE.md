# Last Turn: kariyer ve ekonomi tasarımı

25 Ekim 2026. Sahip: Codex. Kaynak oyun: `f41728c601fe28633f5e4ed229a5a513d1d80e73`, deneme 0.7.1.

Durum: ilk kariyer entegrasyonu uygulandı; [uygulama ve kanıt](isler/2026-10-25-kariyer-uygulama.md). Aşağıdaki ilk araştırma ile öneriler tarihsel tasarım gerekçesidir; güncel uygulama özeti burada ve görev kartındadır.

Uygulama: 40 yarışta D200/D250/D400/C500/B600/açık999 bütçesi, ayrı ödülsüz deneme, süre bazlı para/XP, kategori yatırım kredisi, otomatik bileşikte K1/K2/K3 kalite ve tek türde yıldızlarla erişim. XP eğrisi/eski erişim korunur; aynı piste birden çok kupa eklenmedi. Fiyat ve parça parametreleri değişti; 40 hedef gerçek fizik ile yeniden ölçüldü. Normal motor +%8/+%16/+%28; büyük turbo +%70 pahalı proje olarak korunur. Yeni içerikte `tests/birim/kariyer.test.ts` ölçüm imzasını doğrular.

Araştırma: mevcut sistem incelendi; aşağıdaki model uygulama için tasarım temelidir. Hedef aralıklar ilk kalibrasyon önerileridir, oyuncu ölçümü veya bitmiş denge iddiası değildir. Araştırmanın kendisi oyun sayılarını değiştirmedi; sonraki kullanıcı talimatıyla yukarıdaki ilk entegrasyon yapıldı. İş kartı: [denge modeli](isler/2026-10-25-denge-modeli.md). Yeni araç/pist/parça/ödül çalışması önce bu belgeyi okumalı; modelle çelişkiyi görev kartında açıkça çözmelidir. Önceki kullanıcı kararları sessizce değiştirilemez.

## 1. Amaç ve korunacak kararlar

Oyuncu pist öğrenerek ve aracındaki belirli bir zayıflığı gidererek ilerler. Aynı bütçeyle mevcut aracı geliştirme ve başka bir araç edinme anlamlı alternatiflerdir. Birinci seçenek her zaman, ikinci seçenek de her zaman üstün olamaz. Her araç her yarışa girip parkuru tamamlayabilir yaklaşımı serbest etkinliklerde korunabilir; kariyer kupasının ödüllü katılım kuralları ayrıca tanımlanır. Parkuru bitirmek, yıldız almak ve sonraki kupayı açmak ayrı başarılar olarak görünür.

- Sınıf görünür altı özelliğin toplamından gelir. Aynı fizik değerine aynı puan; araç adına, yarış türüne veya yardıma göre gizli katsayı eklenmez.
- Sınıf tavanları D400/C500/B600/A700/S800/X999; stok tavanları D200/C450/B550/A650/S750/X900 korunur. Yeni puan modeli önermek bu kararları sessizce değiştirme yetkisi değildir.
- Tür uzmanlığı gerçek güç eğrisi, kütle, aktarma, süspansiyon, fren, açı ve lastikten doğar. Aynı zeminde yalnız yarış etiketi değişti diye fizik değişmez.
- Yarış sırasında lastik elle seçilmez; etkinlik otomatik takar. Bu kararla satın alınan lastiklerin rolü açıkça uzlaştırılmalıdır (§6).
- Beş ücretsiz başlangıç aracı ve eski kayıtların kazanımları korunur. Denge değişince araç, parça, bakiye ve yıldız silinmez.
- Hiçbir sayı sonsuza dek doğru kalmaz. Kalıcı olan sayının nasıl türetildiği, kabul sınırı ve yeniden ölçme zorunluluğudur.

## 2. Gerçek oyunlardan alınan yöntem

| Resmî örnek | Açıklanan mekanizma | Last Turn için çıkarım |
| --- | --- | --- |
| Gran Turismo 7 | Bazı etkinlikler PP sınırı koyar; aynı PP'deki araçlar farklı pistlerde farklı davranır. BoP bazı yarışlarda güç/ağırlığı ayrıca düzenler. | Performans bütçesi yarışta uygulanmalı; aynı sınıf aynı tur süresi demek değildir. Kariyer parça yatırımını anlamlı tutmak için her yarışta BoP ile yatırımı sıfırlamak uygun değil. |
| NFS Heat | REP erişimi, Bank satın almayı yönetir; yol/arazi ve yarış/drift karakteri için farklı yapılar önerilir. | XP, para ve sürüş başarısı farklı görevler üstlenmeli; oyuncunun her şey için aynı kısa etkinliği tekrarlaması önlenmeli. |
| Forza Motorsport, 2024 revizyonu | Parçaların araç seviyesi kilitleri kaldırıldı; krediyle Car Points alma alternatifi getirildi. | Daha fazla kilit otomatik olarak daha iyi ilerleme değildir. Last Turn'e ikinci parça parası veya zorunlu araç XP'si eklemek ilk çözüm olmamalı. |

Bunlar yayımlanan mekanizmalardır; stüdyoların gizli ekonomi tabloları veya başarı oranları değildir. Aşağıdaki oranlar Last Turn önerisidir, bu oyunlardan alınmış evrensel formüller değildir.

Kaynaklar, 25 Ekim 2026 erişimi:

- [GT7 PP ve BoP](https://www.gran-turismo.com/us/gt7/manual/tips/05)
- [GT7 pistin ihtiyacına göre ayar](https://www.gran-turismo.com/gb/gt7/apex/how_to_get_started/in_game/02)
- [NFS Heat resmî kılavuz: Bank, REP, handling ve etkinlikler](https://www.ea.com/able/resources/need-for-speed/need-for-speed-heat/xbox-one/text-manual)
- [Forza Car Progression Updates, 7 Şubat 2024](https://forza.net/news/forza-motorsport-car-progression-updates)
- [Forza Update 6, değişikliğin yayını](https://forza.net/news/forza-motorsport-update-6)

## 3. Mevcut kodda doğrulanan açıklar

Tam veri dökümü: [envanter](denge/2026-10-25-envanter.json). Sayılar gerçek saf oyun fonksiyonlarından çıkarıldı; tüm kombinasyonlarda sürüş sonucu ölçülmedi.

1. **15 araç / 42 parça / 40 pist; stok dağılımı 7 D, 7 C, 1 B, 0 A/S/X.** Pahalı araçların hepsi bir üst sınıf değildir: Kızıl Ok C448/6000, Gri Atmaca C443/8000; Mavi Yıldız C427/4000, Sarı Arı C417/12000. Bu tek başına hata değildir; pahalı platformun pistte üstün bir kullanım alanı veya gelişim farkı kanıtlanmış değilse fiyatının gerekçesi eksiktir. Eski yorumların B dediği Kızıl Ok artık C'dir.
2. **Ödüllü yarışa sınıf sınırı uygulanmıyor.** `startEvent` yalnız pist/araç erişimini denetliyor. Alt sınıf yıldızlarını güçlü araçla toplama yolu açık. Sınıf rozeti kariyerin performans bütçesi olarak çalışmıyor.
3. **Parça fiyatı etkiden bağımsız.** `sv × kategori` tablosuyla Serçe'de 85→148,75 HP yarış motoru ile 85→350 HP motor değişimi aynı 2350 para. İkinci işlem kütleyi %5 artırıyor; güç yaklaşık 4,12 katına çıkıyor. Serçe puanı sadece 181→264 olduğu için ikisi de D'de kalıyor. Motor yarış +%75, büyük turbo +%70; birlikte nominal güç çarpanı 2,975. Bunun tur kazancı aynı oranda değildir, çekiş/vites/tutuşla ölçülmelidir.
4. **Parçada erişim basamakları yok.** Sahip olunan araca bakiye yeterse en üst parça alınabiliyor. Bunu yalnız sert seviye kilidiyle kapatmak yerine fiyat, kurulum bütçesi ve etkinlik sınırları birlikte kurulmalı.
5. **Ödül zaman maliyetini dikkate almıyor.** İlk Çaylak drag 1★ hedefi 11 sn, asfalt 151 sn; ikisi de ilk 1★ için 300 para/25 XP. Menü ve tekrar süresi hariç, eşik süresi başına kazançta yaklaşık 13,7 kat fark var. Bu gerçek oyuncu gelir ölçümü değil, normalizasyon açığının göstergesidir.
6. **XP'de pist kimliği/zorluk karışıyor.** `yarisBitti`, XP'ye `sv` (pist numarası), paraya `pistSev` gönderiyor. Drag 7 Çaylak olduğu hâlde ilk 3★ 365 XP; zorluk 1 karşılığı 65. Bütün 40 pisti tek bitirişte 3★ sayan muhasebe mevcut kodla 9600, gerçek zorlukla 7350 XP çıkar. Mevcut kilitler nedeniyle bu toplamlar erişilebilir kariyer simülasyonu değildir.
7. **Yıldızı bölerek alma muhasebeyi değiştiriyor.** Çaylakta doğrudan 3★: 700 para/65 XP. Önce 1, sonra 2, sonra 3★: 900 para/75 XP; üç bitiriş tabanı kazanılıyor. Ek sürüşün ödülü olabilir, fakat yıldız ilerleme bonusunun toplamı yol bağımsız olmalı.
8. **Otomatik yarış lastiği, satın alınan lastiği eziyor.** `yarisLastigiTak` tür başına tek sabit indeks veriyor. Lastik parçası puanı/önizlemeyi etkileyebilirken yarışta bileşik kullanılmayabiliyor. Yarış için lastik satın alan oyuncu bunun ne işe yaradığını bilmelidir.
9. **Yıldız kalibrasyonu kariyer aşamasına bağlı değil.** Zaman ölçümü `CARS.findIndex(c.ty == tür)` ile ilk tür aracını kullanıyor. Bu araç ne her aşamanın stok aracı ne de her aşamanın hedef modifiyeli kurulumu. Pilotun en iyi koşusu tek başına iPhone'daki acemi/orta/usta oyuncuyu temsil etmez.
10. **Mevcut ekonomi benzetimi gerçek seçimleri kapsamıyor.** Test aracı en ucuzdan pahalıya alıyor, parçaya harcamıyor, sürüşte yıldız kazanmayı varsayıyor. Yeni pistlerde XP'ye pist numarasını vermeyi de tekrar ediyor. Alım sayısı testinin geçmesi kariyer dengesi kanıtı değil. Bazı ilerleme testleri yalnız ilk 30 pisti kullanıyor.

## 4. Önerilen kariyer yapısı

Üç ayrı eksen:

- **XP/seviye:** yeni içerikle tanıştırır; otomatik güç kazandırmaz.
- **Para:** oyuncunun araç/parça yatırımı arasında seçim yapmasını sağlar.
- **Kupa başarısı:** ilgili disiplindeki ilerlemeyi kanıtlar. Başka türde XP kasmak tek başına o disiplinin finalini bitirmiş saydırmaz.

Her disiplin kendi kupalarına sahip olur; tüm türleri oynamak zorunlu değildir. Bir sonraki kupa için önceki kupadaki yıldızların yaklaşık %60'ı başlangıç önerisidir. 3★ isteğe bağlı ustalık hedefidir; ana kariyeri açmak için bütün pistlerde 3★ şartı konmaz. Bir disiplini seven oyuncunun erişim/gelir açığı yüzünden diğerlerine zorlanmadığı benzetimle gösterilir.

Mevcut içerik için aday performans basamakları: D200 tanışma → D300 kurulum → D400 gelişmiş D → C500 → B600 → açık ustalık. Bunlar pistin zorluk seviyesiyle birebir eşlenmez. Teknik olarak zor bir D400 etkinliği olabilir. A/S/X kupaları, her disiplinde en az iki uygun platform ve iki rekabetçi kurulum yolu ölçülmeden eklenmez; boş sınıflara zorunlu kariyer kapısı konmaz.

Pist ve etkinlik ayrılır: aynı pist D300 kupasında, C500 kupasında ve serbest zaman denemesinde kullanılabilir. Her kupanın sabit üst puanı, varsa açık araç/aktarma kuralı, hedef kurulumu, yıldızları ve ödülü bulunur. Oyuncuya bunlar yarış öncesi gösterilir. Oyuncu geliştirdikçe aynı etkinliğin hedefi otomatik zorlaşmaz. Fazla güçlü araç serbest etkinliğe girebilir; sınırlı kupanın ilerleme ödülünü alamaz. Düşük puanlı araca sırf düşük puanlı diye yapay giriş yasağı konmaz.

`<tür>_<lv>` mevcut pist kimliği değiştirilmez. Bir piste birden fazla kupa eklendiğinde ayrıca etkinlik kimliği gerekir; eski yıldızların hangi etkinliğe taşındığı sürümlü kayıt geçişiyle tanımlanır. Yeni içerik eklenince eski kupanın gereken yıldız sayısı geriye dönük artırılmaz.

## 5. Araç değiştirme ile geliştirme arasındaki denge

Her platformun rol kartı gerekir: stok sınıf/puan, fiyat, erişim aşaması, doğal güçlü/zayıf yön, hedef uzmanlık, iki örnek kurulum ve bu kurulumların toplam maliyeti. En pahalı aracın her pistte daha iyi olması şart değildir; en az bir anlamlı senaryoda tercih edilmesi gerekir.

Mevcut aracı aynı sınıf içinde geliştirmek, stok yeni platformla benzer hedefe ulaşmaktan genellikle daha hesaplı olmalı. Yeni platform daha iyi aktarma/kütle dağılımı/şasi veya gelişim olanağı verir; alınır alınmaz eski platformu her koşulda değersiz kılmaz. Seviye, stok fiyat ve tüm gerekli parçalar dahil toplam kurulum bedeli karşılaştırılır.

Önerilen ilk ekonomi örneği: hedef B için eski araçtaki ek yatırım 7000, yeni platformun alımı + gereken parçalar 9000 olabilir. Eski araç bir parkur ailesinde, yeni araç diğerinde rekabetçi olur. Bu örnek mevcut fiyat tablosu değildir; iki yolun nasıl değerlendirileceğini gösterir. Normal satın alma rotasında birinin hedefe ulaşma maliyeti sürekli diğerinin yarısından azsa yeniden tasarlanır. Koleksiyon/ustalık projeleri bu sınırın dışında açıkça etiketlenebilir.

Tek motor parçasıyla her türün ileri kupalarının bütün yıldızlarını ortalama sürüşle almak kabul edilmez. Ancak güçlü oyuncunun alt sınıfla zor yarış kazanması engellenmez. Tek arabayla farklı türlere girebilmek korunur; her türde optimum olmak için fiziksel kurulum ve sürüş tekniği değişmelidir. Aynı otomobili dönüştürmek mümkün, bunun maliyeti ve ödünleşimi görünür olmalıdır.

## 6. Parça tasarımı ve otomatik lastik

Normal motor basamakları için +%8 / +%16 / +%25–30 ilk adaydır. Mevcut +%75 sıradan üçüncü basamak gibi fiyatlanmamalı; korunacaksa büyük dönüşüm olarak diğer parçalar ve üst kupa ekonomisiyle kalibre edilir. 350 HP motor değişimi ve büyük turbo ayrı proje yatırımıdır. Hangi motora ne kadar kazandırdığı, kütle/ısı değil mevcut gerçek fizik modelindeki çekiş ve vites sınırlamalarıyla değerlendirilir. Oyunda olmayan ısı/aşınma mekaniği varmış gibi fiyat gerekçesi yazılmaz.

Her üst seviye parça her pistte daha iyi olmak zorunda değildir: uzun vites düzlükte, kısa vites dar pistte; sert yay asfaltta, uzun süspansiyon tümsekte; büyük kanat hızlı virajda değer kazanır. Parça fiyatı yalnız HP veya puan farkına bağlanmaz. Açı kiti puanı az değiştirse de driftte önemli olabilir.

Fiyat kalibrasyonu: hedef aşamanın dakika geliri × hedef edinme dakikası; sonra ilgili pistlerde gerçek tur/puan kazancıyla kontrol. Üst kademelerde son küçük kazancın para maliyeti artar. Alt kademeden üst kademeye geçerken önceki parçanın satın alınmış bedeli kredi sayılmalıdır; eski parça sahipliği kaybolmaz, sat-sök döngüsüyle para üretilemez. Bu değişiklik kayıt muhasebesi/bulut birleşmesi tasarımı gerektirir.

Lastik kararı için öneri: **türü etkinlik, kaliteyi sahip olunan geliştirme belirler.** Yarışta seçim ekranı yok; sistem asfalt/toprak/drift/drag bileşiğini otomatik seçer. Stok/sokak/spor/yarış kalite basamağı satın alınabilir ve otomatik takılan lastiğin gerçekten kullandığı tutuş eğrisini belirler. Bu, mevcut tek indeks davranışından farklıdır; uygulamadan önce bileşik × kalite matrisi ve altı puanın sabit referansla kaliteyi nasıl yansıttığı tanımlanır. Her yarış için doğrudan en iyi lastiği ücretsiz vermek seçilirse lastik satışları açıkça yalnız serbest sürüşe ait olur; kariyer yatırımı diye sunulmaz. İki davranış birlikte varsayılmaz.

## 7. Kazanç ve ilerleme hızı: ilk hedefler

Önerilen hedefler aktif sürüş ve zorunlu sonuç/menü dönüşünü kapsar; parkta beklemek süre kazancı değildir. İlk parça hedefi başlangıç disiplininde, diğerleri önceki basamaktan itibaren ölçülür. Toplam kariyer süresi henüz belirlenmedi; 40 pistin gerçek süreleri ve kupa tekrar sayısı ölçülmeden saat vaadi verilmez.

| Karar | İlk kalibrasyon hedefi |
| --- | --- |
| İlk anlamlı parça | 2–4 dakika geçerli oyun |
| İlk uzmanlık kurulumu (2–3 tamamlayıcı parça) | 10–18 dakika |
| İlk ücretli alternatif araç, para biriktiren rota | 20–35 dakika |
| Mevcut sınıfta rekabetçi gelişmiş kurulum | 40–70 dakika; bütün 42 parçayı alma zorunluluğu yok |
| Eşdeğer aşama/başarıdaki türlerin para ve XP/dakikası | Referans akışta yaklaşık ±%15 |
| Sonraki zorunlu ilerleme adımı | Yanlış alımdan sonra erişilebilir tekrar rotası; ilk hedef en çok 15 dakika telafi |

Ödülün temeli etkinliğin ölçülmüş referans süresidir; oyuncunun o koşudaki geçen zamanı değildir. Drag için ışık/sonuç/yeniden giriş de referansa katılır. `taban = referans dakika × aşama oranı × başarı katsayısı`. Puan/bitiriş geçerliliği kontrol edilir; restart, yarışı bırakma veya aynı bitiş olayının yeniden işlenmesi ödeme üretmez.

İlerleme bonusu birikimli olur: `yeni bonus = F(yeni en iyi yıldız) − F(eski en iyi yıldız)`. 1→2→3 ve doğrudan 3 aynı toplam yıldız bonusunu verir; aradaki geçerli yarışların normal bitiriş ödülleri ayrıca gelir. 0★ geçerli bitiriş küçük katılım ödülü alabilir, bitmeyen/ters/istismar koşusu yeni yıldız ödülü alamaz.

İlk keşif bonusu açıkça gösterilir; tekrar ödülü sıfırlanmaz. Tek kısa drag, diğer türlere göre kalıcı en iyi para/XP kaynağı olamaz. Ekonomi oranı oyuncunun hangi aracı seçtiğine göre keyfî düşürülmez.

XP eğrisi, önce hedef ilerleme dakikaları ve kupaların erişim grafiği seçilerek türetilir. Mevcut `40 + 30(n−1)` formülünü korumak amaç değildir. İyi oyuncunun erken açması normaldir; orta oyuncunun bütün pistleri 3★ yapması veya ilgilenmediği türlerde kasması gerekmez.

## 8. Yıldızların kalibrasyonu

Her etkinlik için iki uygun referans platformu, hedef puan aralığı, takılı parça/lastik kalitesi, yardım seviyesi, hava, fizik sürümü ve ölçüm tohumu kaydedilir. Asıl referans o aşamada normal bütçeyle ulaşılabilir kurulumdur. Stok tanışma yarışında stok araç, gelişmiş kupada gelişmiş kurulum kullanılır.

1★ temel aracı kontrol ederek bitirme, 2★ doğru kurulum + tutarlı sürüş, 3★ iyi çizgi/fren/gaz ve az hata anlamına gelir. Driftte aynı mantık puan/süreklilik/açıyla uygulanır; yalnız ham güç yeterli olmamalıdır. Sabit hedefler kullanılır; oyuncu parçayı alınca hedef yükselmez.

İlk otomatik aralık önerisi: zamanlı yarışta hedef kurulumun temiz referansına göre 3★ +%3–5, 2★ +%10–15, 1★ +%25–35 tolerans. Bunlar tüm pistlere yapıştırılmaz; kısa dragde tepki süresi için mutlak saniye payı, rallide hata/toparlanma süresi gerekir. Driftte mevcut x6 bonusuyla birlikte gerçek sürüş dağılımı ölçülür; zamandaki çarpan puana kopyalanmaz.

Pilot regresyonu yakalar; insan zorluğunu tek başına kanıtlamaz. iPhone 13 yatayda acemi/orta/usta profillerinde 5'er denemelik ilk küçük örneklem alınır. Hedeflenen orta profil, aşamaya uygun kurulumla çoğu koşuda 1★, yaklaşık 2–5 denemede 2★ görebilmeli; 3★ ustalıkta ayrışmalıdır. Bu küçük örneklem istatistiksel garanti değildir; gerçek oyuncu dağılımıyla yeniden değerlendirilir.

## 9. Yeni içerik için zorunlu denge kanıtı

Her yeni pistte düz/viraj/yükseklik/zemin ihtiyaçları, hedef kupa ve iki referans kurulum; her araçta rol, stok değerler ve edinme maliyeti; her parçada hedef darboğaz, gerçek etki, dezavantaj ve hedef edinme süresi belirtilir. Yeni mekanik bu dört şeye etkisini açıklamalı: performans bütçesi, başarı eşiği, kazanç hızı ve kayıt uyumu.

Uygulamada şu kontroller otomatikleştirilir (bugün hepsi mevcut değildir):

1. Bütün 40 pist ve sonraki ekler: kimlik ≠ zorluk; ödül doğru alandan türetilir.
2. Sınıf sınırı gerçek yarış girişinde ve restartta uygulanır; stok/sınıf puanı sözleşmesi değişmez.
3. Stok, her tek parça, paketler ve maliyet bakımından güçlü kombinasyonlar; hedef kupada tek motorla çok tür hâkimiyeti ve çok ucuz üst sınıf yolu aranır. Bütün kombinasyonların tarandığı iddia edilmez.
4. Sadece modifiye eden, sadece araç alan, dengeli harcayan, tek disiplin oynayan, 1–2★ alan, hatalı alışveriş yapan ve en iyi farm yolunu seçen oyuncu rotaları dakika bazında benzetilir. Sürüşte başarı olasılığı varsayım olarak açıkça kaydedilir.
5. Her zorunlu kupaya en az iki makul araç/kurulum rotası vardır. Bir pahalı araç bütün ölçülen pist ailelerinde daha ucuz seçeneğe yeniliyorsa rolü/fiyatı düzeltilir; gizli tür bonusu verilmez.
6. Otomatik takılan lastik ile satılan geliştirme ve puan önizlemesi tutarlıdır. Etkisiz kariyer alışverişi yoktur.
7. Yıldız bonusu yol bağımsız, ödeme tekil; restart/bırakma para üretmez. Referans süresiyle park ederek farm yapılamaz.
8. Eski kayıt geçişi, bulut birleşmesi, ödenmiş parça bedelleri ve kazanılmış yıldızlar korunur. Kalibrasyon sürümü değişince eski rekor yeni fizik için doğrulanmış koşu sayılmaz; başarı geçmişi ayrıca korunur.

Her sayı değişikliği için önce/sonra fiyat, edinme dakikası, puan ve gerçek tur/puan kazancı aynı raporda tutulur. Başarılı birim testleri, ekonominin eğlenceli veya insan için dengeli olduğunu kanıtlamaz. Her yeni pistte bütün oyun regresyonu geliştirme sırasında tekrarlanmaz; etkilenen referans matrisi ölçülür, canlı öncesi tam regresyon korunur.

## 10. Uygulama sırası

1. **Muhasebe ve ölçüm:** XP kimlik/zorluk hatası, bonus ayrımı, süre envanteri; tüm 40 pist ve tek disiplin rotaları. Mevcut kazanımları geriye dönük azaltma.
2. **Kariyer sözleşmesi:** etkinlik/pist kimliği ayrımı, kupa giriş sınırı ve başarım kapıları, eski kayıt eşlemesi. İlk D kupası uçtan uca örnek olarak hazırlanır.
3. **Kurulum ekonomisi:** otomatik lastik kalite kararı, motor/turbo/swap maliyet ve etki eğrisi; eski araç/yeni araç rotaları. Önce beş başlangıç platformu ve yakın alternatifler, sonra bütün 15 araç/42 parça.
4. **Hedefler:** aşamaya uygun kurulumlarla 40 pistin yıldız ve ödüllerini yeniden ölç; iPhone insan denemeleri; uçtan uca kariyer simülasyonu.
5. **Koruma:** veri sözleşmesi/ölçüm raporu CI kontrolü; yeni içerik görevlerinin bu belgeye bağlanması; deneme yayını ve kullanıcı geri bildirimi, ardından onaylı regresyon/canlı.

Bu araştırmanın bitmesi 1–5'in uygulandığı anlamına gelmez. Sonraki somut iş, mevcut sayıları körlemesine değiştirmek yerine ilk D kupası üzerinde iki yatırım rotasının ve üç yıldız basamağının birlikte doğrulandığı ölçülebilir örnektir.
