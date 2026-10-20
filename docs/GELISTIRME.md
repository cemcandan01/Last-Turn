# Geliştirme sohbetleri

Her alan için yeni bir sohbet aç ve aşağıdaki istemi yapıştır. Altına o gün ne istediğini ekle. Her sohbet `CLAUDE.md`'yi kendiliğinden okur, yani projeyi yeniden tanıtman gerekmez. Bir sohbette tek alan üzerinde çalışmak hem daha ucuz hem daha isabetli.

İpuçları:
- Küçük işlerde (metin, renk, tek ayar) daha hafif bir model ya da düşük düşünme seviyesi yeterli. Fizik ve tasarım gibi zor işlerde güçlü model kullan.
- Görmen gerekmeyen işlerde "ekran görüntüsü kontrolü yapma, sadece testleri çalıştır" de.
- İş bitince "push" de: değişiklik ne kadar büyük olursa olsun deneme sürümüne gider (https://cemcandan01.github.io/Last-Turn/dev/), sürüm numarası bir artar (0.1.4 → 0.1.5). Telefonda deneme uygulamasından bakarsın.
- Canlıya (telefondaki asıl oyun) konu sohbetlerinden gönderilmez. Bütün dallardaki işler denemeye gönderildiyse "regression" sohbeti gece 04:00'te bütün testleri koşar, hataları düzeltir ve sana dal dal rapor verip onay ister. Orada "push" deyince sürüm (ör. 0.1.37) canlıya çıkar, sonraki sürüm 0.2 başlar. Push demediğin bir iş varsa regresyon başlamaz, o dalı bekler.
- Testler hızlıdır: sohbet yalnız kendi alanının senaryolarını ve kısa bir duman turunu koşar; bütün testler regresyonda koşar.
- Her sohbet kendi dalında çalışır (HUD sohbeti `hud`, fizik sohbeti `fizik` gibi). "Push" dediğinde iş ortak deneme sürümüne eklenir; orada başka sohbetlerin işleri de görünür. Aynı anda birkaç sohbet çalışabilir; çakışma olursa sohbet iki işi de koruyarak birleştirir, karar gerekirse sana sorar.

---

## 1. Fizik ve sürüş hissi

```
Last Turn'ün fizik ve sürüş hissi üzerinde çalışacağız. Fizik src/fizik/ altında ve saf (three ve DOM yok). Motor yeni/model.ts (katı gövde, 4 teker, süspansiyon, lastik modeli, motor-vites); tek motor. Ortak drift penceresi DR ve drift puanı ortak.ts'te; veriler.ts zeminler, lastikler, ayarlar, yardım seviyeleri, önayarlar; simulasyon.ts sabit adım. Araç değerleri src/arac/araclar.ts (CARS: trq, pw, m, fb, rb, iz, awd, ff, hcg, dv...).
Kurallar: kayma ile drift ayrımını koru (drift modu yalnız bilinçli driftte açılır). Gerçekçi seviyede araç gazda kendi kendine spin atmamalı. Fizikte Math.random kullanma.
Her değişiklikten sonra `npm test` (spin, toprak, drift, titreşim, ~40 sn; yalnız fizik senaryoları: `npm run alan -- fizik`) ve gerekirse `npm run olcum` (0-100, fren, tur süreleri) çalıştır. Gerekirse tests/birim/'e yeni bir ölçüm ekle (fren mesafesi, viraj hızı gibi; tests/yardimci/surucu.ts gerçek pistte otomatik pilot kurar). Sonuçları sayılarla anlat.
Bugünkü isteğim:
```

## 2. Araçlar ve garaj

```
Last Turn'ün araçları ve garajı üzerinde çalışacağız. Araç değerleri ve gövde profilleri src/arac/araclar.ts'te (CARS), garaj çubukları src/arac/istatistik.ts'te. Araç modeli src/cizim/arac-modeli.ts (gövde, tekerler, araca özel parçalar EK), kokpit src/cizim/kokpit.ts. Garaj ekranı src/arayuz/garaj.ts, garaj sahnesi src/cizim/garaj-sahnesi.ts, stiller src/stil.css.
Araçlar yan profilin enine uzatılmasıyla kurulur. Marka adı ve logo kullanma, gerçek araçlardan yalnız esinlen. Yeni araç eklersen garaj çubukları için ölçülen değerleri (a100, lat, b100, t90) Node'da test sürücüsüyle ölç (tests/yardimci/surucu.ts).
Görsel değişiklikten sonra `npm run build && npm run test:goruntu` çalıştır ve tests/cikti/garaj.png ile kokpit.png'ye bak.
Bugünkü isteğim:
```

## 3. Pistler ve dünyalar

```
Last Turn'ün pistleri ve açık dünyaları üzerinde çalışacağız. Pist tanımları src/dunya/pist-tanimlari.ts'te (TDEF: kontrol noktaları, tema, yükseklik, rampa/çamur/su), pist kurucusu src/dunya/bolgeler.ts'te (mkReg, drag, Boş Otopark), dekorlar src/dunya/dekor.ts (PROPS), temalar src/dunya/temalar.ts, Çorak Topraklar src/dunya/corak.ts, yarış listesi src/oyun/yarislar.ts (TYP, EVENTS).
Kurallar: pistler kendini kesmemeli (kontrol noktası değiştirince kollar arası açıklığı ve en küçük viraj yarıçapını kontrol et). Bölge kutuları çakışmamalı. Yeni pist hedef süresi gerçekçi olmalı (Node'da otomatik pilotla ölç). Dekorda yalnız kurucu.ts'teki rnd() kullan (her pistin kendi tohumu var).
Değişiklikten sonra `npm run kontrol` ve `npm run test:goruntu` çalıştır, tests/cikti/pist_*.jpg görüntülerine bak.
Bugünkü isteğim:
```

## 4. Grafik, ışık ve hava

```
Last Turn'ün grafikleri, ışığı ve havası üzerinde çalışacağız. Saat ve hava src/cizim/ortam.ts'te (applyEnv, COND, yağış, gölge). Temalar src/dunya/temalar.ts. Renderer, kamera ve ışıklar src/cizim/sahne.ts. Three.js 0.186 (npm); renk yönetimi kapalı ve ışıklar ISIK (π) çarpanıyla, eski görünüm korunsun diye.
Açık konular: yağmur damlaları nokta şeklinde (çizgi olmalı), cama düşen damla yok, ıslak yolda yansıma yok, gece ışıkları sınırlı. WebGPU denemesi (Safari 26) yapılabilir.
Kural: iPhone 13'te akıcı kalmalı. Ağır bir efekt eklersen ayarlardan kapatılabilir yap (src/oyun/ayarlar.ts, TOG listesi). Performans göstergesiyle ölç (Ayarlar → Mekanikler → Performans göstergesi).
Değişiklikten sonra `npm run build && npm run test:goruntu` çalıştır ve görüntülere bak.
Bugünkü isteğim:
```

## 5. Menü, HUD ve akış

```
Last Turn'ün menüsü, HUD'ı ve oyuncu akışı üzerinde çalışacağız. Ana menü src/arayuz/menu.ts (showMenu, MV görünüm yığını), ayarlar ve duraklatma src/arayuz/ayarlar-ekrani.ts, menü arka planı src/oyun/sinematik.ts (SHOTS). HUD src/arayuz/hud.ts ve index.html'de (#hud yapısı). Stiller src/stil.css. Garaj src/arayuz/garaj.ts.
Kural: oyun yalnız yatay ekranda. Çentik boşlukları için --sat/--sar/--sab/--sal değişkenlerini kullan. HUD yazılarını yazi() ile güncelle (yalnız değişince DOM'a yazar).
Değişiklikten sonra `npm run build && npm run test:goruntu` çalıştır ve tests/cikti/menu.png, yaris_turu.png, pist_listesi.png, yaris.png görüntülerine bak.
Bugünkü isteğim:
```

## 6. Oyun modları ve ilerleme

```
Last Turn'e oyun modları ve ilerleme sistemi ekleyeceğiz: kariyer, kilit açma, para veya puan, araç geliştirme, rakip araçlar gibi. Yarış akışı src/oyun/yarislar.ts (startEvent, evTick, endEvent), sonuç ekranı src/arayuz/sonuc.ts, profil ve rekorlar src/oyun/profil.ts, menü src/arayuz/menu.ts.
Kayıtlar localStorage'da (lt_prof, lt_car, lt_ayar, sv_*). Yeni alan eklersen eski kayıtlarla uyumlu kalsın (src/cekirdek/depo.ts → okuJson varsayılanla birleştirir).
Rakip araçlar için fizik saf ve sabit adımlı: birden çok Simulasyon örneği aynı dünyada çalışabilir (src/fizik/simulasyon.ts).
Önce önerini kısaca anlat, onaylarsam yap. Değişiklikten sonra `npm run kontrol` çalıştır.
Bugünkü isteğim:
```

## 7. Ses

```
Last Turn'e ses ekleyeceğiz: motor sesi (devir ve gaza bağlı), lastik sürtünmesi ve drift, çarpışma, çakıl ve çamur, menü sesleri. Oyunda henüz hiç ses yok.
Web Audio API ile sentezle ya da küçük ses dosyaları kullan (public/ses/ klasörü; service worker derlemede kendiliğinden önbelleğe alır). Yeni bir modül aç: src/ses/. Devir ve vites src/arayuz/hud.ts'teki motor nesnesinden, kayma ve patinaj sim.d.D.beta ve sim.S.spin'den (src/oyun/surus.ts) okunabilir. Fizik olayları (spin, toz) src/oyun/surus.ts'teki baglam.olay'dan dinlenebilir.
iOS'ta ses ancak ilk dokunuştan sonra başlar, bunu ele al. Ayarlara ses seviyesi ekle (src/oyun/ayarlar.ts).
Bugünkü isteğim:
```

## 8. Performans ve iPhone uyumu

```
Last Turn'ün performansı ve iPhone uyumu üzerinde çalışacağız. Hedef: iPhone 13'te akıcı 60 fps.
Ölçüm: oyundaki performans göstergesi (Ayarlar → Mekanikler, ya da adrese ?perf ekle): kare hızı, kare süresi, en kötü kare, fizik ve çizim süresi, çizim çağrısı, üçgen. Kullanıcıdan telefonda ekran görüntüsü iste.
Bakılacak yerler: src/cizim/sahne.ts (renderer, piksel oranı), src/cizim/ortam.ts (gölge), src/dunya/ (dekor sayısı, arazi çözünürlüğü), src/oyun/dongu.ts (kare başına iş). Önce ölç, sonra en büyük kazancı veren değişikliği öner.
Değişiklikten sonra `npm run build && npm run test:goruntu` çalıştır, görüntü kalitesi düşmüş mü bak.
Bugünkü isteğim:
```

## 9. Çevrimiçi (ileride)

```
Last Turn'e çevrimiçi özellikler eklemeyi planlayacağız: dünya rekorları (WR), hayalet araç, sıralama tablosu. Oyun şu an GitHub Pages'te statik olarak yayınlanıyor, sunucu yok. Menüde WR alanları şimdilik boş (src/arayuz/menu.ts).
Fizik sabit adımlı ve tohumlu (belirlenimci): bir turun girişleri kaydedilip aynı sonuçla tekrar oynatılabilir; hayalet araç için bu kullanılabilir (src/fizik/simulasyon.ts).
Önce seçenekleri, maliyetlerini ve gereken servisleri kısaca anlat. Kod yazmadan önce benim onayımı al.
Bugünkü isteğim:
```

## 10. Altyapı

```
Last Turn'ün altyapısı üzerinde çalışacağız: derleme (Vite), testler (Vitest, Playwright), yayın (GitHub Actions → Pages, gelistirme → /dev/), PWA (service worker), fizik motoru çekirdeği, kod düzeni. Mimari docs/MIMARI.md'de.
Kural: tüm testler geçmeden yayınlama; riskli değişiklik önce deneme sürümüne (/dev/) gider.
Bugünkü isteğim:
```
