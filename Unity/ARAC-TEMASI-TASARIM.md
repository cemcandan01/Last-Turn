# Araç–araç teması: ayrı yeni mekanik taslağı

Cem'in P2 sırasında verdiği **“Ayrı yeni mekanik tasarla”** kararının taslağıdır. TS 0.8.18 eşdeğerlik aktarımı veya uygulanmış özellik değildir. P2'ye yeni kuvvet, zorluk ya da hasar dengesi eklemez.

## Önerilen sınır

Saf Core'da bir `VehicleContactWorld` tüm fiziksel araçları aynı sabit adımda toplar. Her araç önce mevcut motor/teker/gövde adımını hesaplar; ardından aday çiftler kararlı araç kimliği sırasıyla bir kez çözülür. Hayalet ve görsel tekrarlar aday değildir. Sunum araçları birbirinin Transform'undan fizik okumaz. Çevre çözümüne ikinci Unity Rigidbody sistemi eklenmez.

Mevcut araç genişliği/aks aralığı ve kütle merkeziyle yatay temas hacimleri kurulur. Farklı yükseklikteki araçlar için dikey örtüşme kontrolü gerekir; köprü/çatı altındaki araçlara uzak temas uygulanmaz. Nokta temasındaki bağıl hız ve mevcut kütle/atalet kullanılarak iki araca eşit ve ters dürtü verilir; yalpa/yaw momenti aynı temas noktasından hesaplanır. Ayrıştırma iki aracın ters kütlesine bölünür. Aynı çifti iki araç adımında tekrar çözmek yasaktır.

Sekiz alt adımlı mevcut sözleşme korunur. Uygulama önce çevre ve araç temasının sırasını sabitlemeli; hızlı yaklaşmada tünelleme senaryosu ölçülmeli, gerekirse sürekli temas sorgusu eklenmelidir. Çözücü tamamen saf ve belirlenimci kalmalıdır; kare hızı veya çizim sırası sonuç değiştirmemelidir.

## Denge ve Mutant bağlantısı

Sekme/sürtünme, yanal hacim, temas toleransı ve ayrıştırma sınırları henüz denge kararı değildir; çevrenin sayıları araç çiftlerine ölçümsüz kopyalanmamalıdır. İlk prototip bu parametreleri ayrı yapılandırmada sunmalı, ölçümlerden sonra kullanıcı kararıyla sabitlenmelidir. Hasar/ödül/ceza formülü bu taslakta belirlenmez. P3/P4 kaynak Mutant hasar hizmetine kararlı tek temas olayı gönderilmeli; aynı darbe çevre/araç/skill tarafından iki kez hasar üretmemelidir. Kariyere rakip ya da hasar kuralı ayrıca kararlaştırılmadan eklenmez.

YZ'nin araç algısı/kaçınması da kaynakta yoktur; temas çözümünden ayrı yeni davranıştır. İlk temas prototipi mevcut pilotu korumalı ve davranış değişikliklerini ölçümlerle ayrı ele almalıdır.

## Gelecek uygulamanın kabulü

Eş kütleli kafa kafaya, farklı kütleli arkadan, yandan ve köşe teması; sabit araca darbe; üst üste başlangıç; üç araç yığını; aynı XZ'de farklı yükseklik; yüksek hızda temas; duvar ve araç arasında sıkışma ölçülür. Dış kuvvet yokken toplam doğrusal momentum, simetrik başlangıçta simetrik tepki, enerji artmaması, sonlu durum ve tekrar eşitliği kontrol edilir. 30/60/120 çizim FPS'sinde aynı sabit girdilerin sonucu eşleşmelidir. Gerçek Editor Play'de oyuncu–rakip ve iki rakip teması gösterilmeden tamamlandı denmez.
