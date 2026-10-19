# Geliştirme sohbetleri

Her alan için yeni bir sohbet aç ve aşağıdaki istemi yapıştır. Altına o gün ne istediğini ekle. Her sohbet `CLAUDE.md`'yi kendiliğinden okur, yani projeyi yeniden tanıtman gerekmez. Bir sohbette tek alan üzerinde çalışmak hem daha ucuz hem daha isabetli.

İpuçları:
- Küçük işlerde (metin, renk, tek ayar) daha hafif bir model ya da düşük düşünme seviyesi yeterli. Fizik ve tasarım gibi zor işlerde güçlü model kullan.
- Görmen gerekmeyen işlerde "ekran görüntüsü kontrolü yapma, sadece testleri çalıştır" de.
- İş bitince "yayınla" demen yeterli. `surum-yayinla` skill'i sürümü artırıp gönderir.

---

## 1. Fizik ve sürüş hissi

```
Last Turn'ün fizik ve sürüş hissi üzerinde çalışacağız. İlgili dosyalar js/fizik.js (phys, sub, drift durumu DR), js/temel.js (lastikler, önayarlar, yardım seviyeleri) ve js/araclar.js'teki araç fizik değerleri (CARS: trq, pw, m, fb, rb, iz, awd...).
Kurallar: kayma ile drift ayrımını koru (drift modu yalnız bilinçli driftte açılır). Gerçekçi seviyede araç gazda kendi kendine spin atmamalı.
Her değişiklikten sonra `cd tools && node test.mjs --tam` çalıştır. Gerekirse tools/test.mjs'e yeni bir ölçüm ekle (fren mesafesi, viraj hızı gibi). Sonuçları sayılarla anlat.
Bugünkü isteğim:
```

## 2. Araçlar ve garaj

```
Last Turn'ün araçları ve garajı üzerinde çalışacağız. Araç modelleri ve değerleri js/araclar.js'te (CARS, body0, buildCar, kokpit buildInterior). Garaj ekranı js/garaj.js'te (STAT özellik çubukları, openGarage), stiller css/stil.css'te.
Araçlar yan profilin enine uzatılmasıyla kurulur. Marka adı ve logo kullanma, gerçek araçlardan yalnız esinlen. Yeni araç eklersen garaj çubukları için ölçülen değerleri (a100, lat, b100, t90) test botuyla ölç.
Görsel değişiklikten sonra `cd tools && node test.mjs --goruntu` çalıştır ve tools/out/garaj.png ile kokpit.png'ye bak.
Bugünkü isteğim:
```

## 3. Pistler ve dünyalar

```
Last Turn'ün pistleri ve açık dünyaları üzerinde çalışacağız. Pist tanımları js/pistler.js'te (TDEF: kontrol noktaları, tema, yükseklik, rampa/çamur/su; temalar TH; dekorlar PROPS). Pist kurucusu, yarış listesi ve açık dünyalar js/bolgeler.js'te (mkReg, EVENTS, WORLDS, Boş Otopark).
Kurallar: pistler kendini kesmemeli (kontrol noktası değiştirince kollar arası açıklığı ve en küçük viraj yarıçapını kontrol et). Bölge kutuları çakışmamalı. Yeni pist hedef süresi gerçekçi olmalı.
Değişiklikten sonra `cd tools && node test.mjs --goruntu` çalıştır ve tools/out/pist_*.jpg görüntülerine bak.
Bugünkü isteğim:
```

## 4. Grafik, ışık ve hava

```
Last Turn'ün grafikleri, ışığı ve havası üzerinde çalışacağız. Saat ve hava js/ortam.js'te (applyEnv, COND, yağış parçacıkları, gölge). Temalar js/pistler.js'te (TH). Renderer ve sahne js/sahne.js'te.
Açık konular: yağmur damlaları nokta şeklinde (çizgi olmalı), cama düşen damla yok, ıslak yolda yansıma yok, gece ışıkları sınırlı.
Kural: iPhone 13'te akıcı kalmalı. Ağır bir efekt eklersen ayarlardan kapatılabilir yap (Mekanikler bölümü, TOG listesi).
Değişiklikten sonra `cd tools && node test.mjs --goruntu` çalıştır ve görüntülere bak.
Bugünkü isteğim:
```

## 5. Menü, HUD ve akış

```
Last Turn'ün menüsü, HUD'ı ve oyuncu akışı üzerinde çalışacağız. Ana menü, profil, ayarlar ve sinematik arka plan js/menu.js'te (showMenu, MV görünüm yığını, SHOTS). HUD js/dongu.js'te (HUD güncellemesi) ve index.html'de (#hud yapısı). Stiller css/stil.css'te. Garaj js/garaj.js'te.
Kural: oyun yalnız yatay ekranda. Çentik boşlukları için --sat/--sar/--sab/--sal değişkenlerini kullan.
Değişiklikten sonra `cd tools && node test.mjs --goruntu` çalıştır ve tools/out/menu.png, yaris_turu.png, pist_listesi.png, yaris.png görüntülerine bak.
Bugünkü isteğim:
```

## 6. Oyun modları ve ilerleme

```
Last Turn'e oyun modları ve ilerleme sistemi ekleyeceğiz: kariyer, kilit açma, para veya puan, araç geliştirme, rakip araçlar gibi. Yarış akışı js/yarislar.js'te (startEvent, evTick, endEvent, rekorlar). Profil ve menü js/menu.js'te (PROF, showMenu). Yarış listesi js/bolgeler.js'te (TYP, EVENTS).
Kayıtlar localStorage'da tutuluyor (lt_prof, sv_*). Yeni alan eklersen eski kayıtlarla uyumlu kalsın.
Önce önerini kısaca anlat, onaylarsam yap. Değişiklikten sonra `cd tools && node test.mjs` çalıştır.
Bugünkü isteğim:
```

## 7. Ses

```
Last Turn'e ses ekleyeceğiz: motor sesi (devir ve gaza bağlı), lastik sürtünmesi ve drift, çarpışma, çakıl ve çamur, menü sesleri. Oyunda henüz hiç ses yok.
Web Audio API ile sentezle ya da küçük ses dosyaları kullan (img/ gibi ses/ klasörü, sw.js CORE listesine ekle). Motor devri js/araclar.js'teki engine() fonksiyonundaki RPM ve GEAR'dan, kayma ve patinaj js/fizik.js'teki D.beta ve S.spin'den okunabilir.
iOS'ta ses ancak ilk dokunuştan sonra başlar, bunu ele al. Ayarlara ses seviyesi ekle.
Bugünkü isteğim:
```

## 8. Performans ve iPhone uyumu

```
Last Turn'ün performansı ve iPhone uyumu üzerinde çalışacağız. Hedef: iPhone 13'te akıcı 60 fps.
Bakılacak yerler: js/sahne.js (renderer, piksel oranı), js/ortam.js (gölge), js/pistler.js ve js/bolgeler.js (dekor sayısı, arazi çözünürlüğü), js/dongu.js (kare başına iş). Önce ölç: bölge kurma süreleri, sahnedeki çizim çağrısı ve üçgen sayısı (R.info). Sonra en büyük kazancı veren değişikliği öner.
Değişiklikten sonra `cd tools && node test.mjs --goruntu` çalıştır, görüntü kalitesi düşmüş mü bak.
Bugünkü isteğim:
```

## 9. Çevrimiçi (ileride)

```
Last Turn'e çevrimiçi özellikler eklemeyi planlayacağız: dünya rekorları (WR), hayalet araç, sıralama tablosu. Oyun şu an GitHub Pages'te statik olarak yayınlanıyor, sunucu yok. Menüde WR alanları şimdilik boş (js/menu.js).
Önce seçenekleri, maliyetlerini ve gereken servisleri kısaca anlat. Kod yazmadan önce benim onayımı al.
Bugünkü isteğim:
```
