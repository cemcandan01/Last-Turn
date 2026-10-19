# Last Turn: geliştirici rehberi

iPhone'da ana ekrana kurulan (PWA) 3D yarış oyunu. Three.js r128 (`vendor/three.min.js`), derleme adımı yok: dosyalar olduğu gibi yayınlanır. `master` dalına her push GitHub Pages'te yayına çıkar (https://cemcandan01.github.io/Last-Turn/), kullanıcı uygulamayı açınca yeni sürüm iner.

Kullanıcı Türkçe konuşur, iPhone 13'te yatay oynar, kod okumaz. Arayüz metinleri, kod yorumları, commit mesajları ve kullanıcıya yazılan özetler Türkçe.

## Dosya haritası

`index.html` yalnız HTML iskeleti ve `APP_VERSION`. Kod `js/` altında, aşağıdaki sırayla klasik `<script>` olarak yüklenir. Hepsi aynı global kapsamı paylaşır.

| Dosya | İçerik |
|---|---|
| `css/stil.css` | Tüm stiller: menü, HUD, garaj, alt paneller, kontrol tuşları |
| `js/temel.js` | Ekran yönü kilidi (içeriği döndürme, `toApp`), `$`, `cl/sm/ad`, `SURF`, `TIRES`, `TUNE`, `AST`, `LEVELS`, `PRESETS`, `applyPreset` |
| `js/sahne.js` | Renderer, sahne, `hemi`/`sun`, `ctex`, ağaç/kaya/çalı örnekleme (`INST`), çarpışma ızgarası (`colAdd/colNear`), `terrain`, `mkTrack` (Catmull-Rom), `ribbon`, Çorak Topraklar test arazisi, kerb ve rampa yardımcıları |
| `js/pistler.js` | `TDEF`: 15 pistin tanımı (tür, tema, kontrol noktaları, rampa/çamur/su, yükseklik). Drag pisti, temalar (`TH`), dekorlar (`PROPS`) |
| `js/ortam.js` | Günün saati ve hava (`COND`, `applyEnv`, `WX.g` tutuş çarpanı), yağış parçacıkları, gölge |
| `js/bolgeler.js` | `mkReg` (pist türüne göre kurucu), `REG`, `TYP`, `EVENTS`, Boş Otopark, `WORLDS`, zemin, `setActive` (bölgeyi kur, temayı uygula), mini harita |
| `js/araclar.js` | `CARS`: 5 aracın modeli ve fizik değerleri, `buildCar`, `setCar`, kokpit iç mekânı (`buildInterior`), göstergeler (`engine`, `gauges`) |
| `js/garaj.js` | Garaj sahnesi, özellik çubukları (`STAT`), `openGarage`/`closeGarage` |
| `js/fizik.js` | Araç durumu `S`, girişler (`I`, `CT`, tuş/direksiyon/telefon/pedal), `phys` ve `sub` (bisiklet modeli), drift durumu `DR`, çarpışma, tur sayacı |
| `js/dongu.js` | `loop`: fizik adımı, kamera modları, HUD güncellemesi, çizim |
| `js/yarislar.js` | `startEvent`, `evTick` (tur, drift puanı, bitiş), sonuç ekranı, rekorlar (`best/saveBest`) |
| `js/menu.js` | Ayarlar (`settingsHTML`, `bindSettings`), profil (`PROF`), sinematik arka plan (`SHOTS`, `CINE`, `demoStart/demoStop`), ana menü (`showMenu`, `MV` görünüm yığını) |
| `js/pwa.js` | Service worker kaydı, yeni sürüm kontrolü |
| `sw.js` | Çevrimdışı önbellek. `CORE` listesi yayınlanan tüm dosyaları içermeli |
| `img/` | Menüdeki yarış türü görselleri (oyunun kendi çekimleri) |
| `tools/` | Başsız tarayıcı testleri |

## Kurallar ve tuzaklar

- **Yükleme sırası:** Bir dosya, yükleme anında kendinden sonra gelen dosyadaki fonksiyonu çağıramaz. Çalışma anında (olay, döngü, `build`) çağırmak sorun değil. Örnek: `lam`, `V3`, `bx` `araclar.js`'te tanımlı, `pistler.js` bunları yalnız `R.build` içinde kullanabilir.
- **Kod stili:** Mevcut sıkıştırılmış tek satır stilini, kısa değişken adlarını ve Türkçe yorumları koru. Yeni dosya açmak serbest; açarsan `index.html` sırasına ve `sw.js` `CORE` listesine ekle.
- **Koordinatlar:** Yer düzlemi x-z, y yukarı. Araç yönü `S.h`, ileri `(sin h, cos h)`. Pist yapısı `TR`: `P` noktalar, `T` teğetler, `S` birikimli uzunluk, `N`, `len`, `hw` yarı genişlik, `open` (ralli/drag A'dan B'ye).
- **Bölgeler:** Her pist dünyada kendi kutusunda (`R.box`), kutular çakışmaz. Pist yalnız seçilince kurulur (`ensureBuilt`), yalnız etkin bölge görünür. Yükseklik `H(x,z)`, zemin `surf(x,z)` (`SURF` indeksi) ile okunur.
- **Ayar durumu:** `setCar` aracı değiştirir. `startEvent` yarıştan önceki durumu `EV.sv`'ye kaydeder, `leaveEvent` (ve onu çağıran `startWorld`, `showMenu`) geri yükler. Menü arka planı çalışırken (`DEMO`) araç ve koşullar geçicidir; testlerde yarışı başlatmadan önce `demoStop()` çağır.
- **Drift ve kayma:** Drift modu (`DR.on`) yalnız bilinçli driftte açılır (açı eşiği + gaz + 0,25 sn). Eşik drift önayarlarında düşük, yarışlarda yüksek. Bu ayrımı bozma.
- **Kokpit:** Gövde içeriden görünmez (tek yüzlü), iç mekân `cock` grubunda. Renk panelleri (`userData.pan`) kokpitte gizlenir. Ön cam `glassQM` kokpitte şeffaflaşır.
- **Sürüm:** Her yayında `index.html` içindeki `APP_VERSION`'ı artır. `sw.js`'teki `CACHE` adını yalnız dosya listesi değişince artır.

## Test

```
cd tools && npm install        # ilk seferde
node test.mjs                  # hızlı: yükleme, menü, 15 yarış, dünyalar, garaj (~1 dk)
node test.mjs --tam            # + fizik: gerçekçi seviyede spin, drift dengesi (birkaç dk)
node test.mjs --goruntu        # + ekran görüntüleri tools/out/ (menü, garaj, yarış, kokpit, 15 pist)
```

- Başsız tarayıcı yavaş çizer; beklemeleri oyun saatiyle (`tt`) yap, gerçek zamanla değil.
- WebGL karesini almak için ekran görüntüsü yerine `R.render(scene,cam); R.domElement.toDataURL()` daha güvenilir.
- Fizik veya sürüş değişikliğinde `--tam`, görsel değişiklikte `--goruntu` çalıştır ve görüntülere bak.
- Yeni özellik eklersen `tools/test.mjs`'e onu da deneyen bir satır ekle.

## Yayın

1. Testler geçsin.
2. `APP_VERSION`'ı artır, gerekirse `README.md`'yi güncelle.
3. Türkçe commit: kısa başlık + maddeler. Sonra `git push origin master`.
