# Last Turn: geliştirici rehberi

iPhone'da ana ekrana kurulan (PWA) 3D yarış oyunu. **TypeScript + Vite + Three.js 0.186**. Kaynak `src/` altında modüllerdir; derleme çıktısı (`dist/`) GitHub Actions ile GitHub Pages'e yüklenir.

- `master` → https://cemcandan01.github.io/Last-Turn/ (kullanıcının telefonundaki oyun)
- `gelistirme` dalı → https://cemcandan01.github.io/Last-Turn/dev/ (deneme sürümü; ayrı ad, ayrı önbellek)

Her iki yayında da testler geçmezse yayın yapılmaz. Kullanıcı uygulamayı internet varken açınca yeni sürüm iner.

Kullanıcı Türkçe konuşur, iPhone 13'te yatay oynar, kod okumaz. Arayüz metinleri, kod yorumları, commit mesajları ve kullanıcıya yazılan özetler Türkçe. Kod tanımlayıcıları İngilizce ya da Türkçe olabilir; çevredeki kodla aynı olsun.

## Her oturumun başında

1. `git pull origin master` (deneme dalında çalışıyorsan `git pull origin gelistirme`).
2. Bağımlılıklar oturum başında kendiliğinden kurulur (`.claude/oturum-basi.sh`). Kurulmadıysa: `npm ci`.
3. Bu dosyayı ve "Kullanıcının kararları" bölümünü oku. Önceki işler: `git log --oneline -20`. Mimari: `docs/MIMARI.md`.
4. İş bitince `surum-yayinla` skill'iyle yayınla. Push öncesi `git pull --rebase`. Çakışma olursa diğer sohbetin işini koruyarak birleştir.
5. Kalıcı bir karar alınırsa (kullanıcı "bundan sonra hep şöyle olsun" derse) "Kullanıcının kararları" bölümüne bir satır ekle.

## Komutlar

```
npm run kontrol       # hepsi: tip denetimi, ESLint, birim testleri, derleme, tarayıcı testi (~1 dk)
npm test              # birim ve fizik testleri (Node, ~2 sn)
npm run build         # dist/ (ana sürüm)
npm run test:e2e      # derlenmiş oyun başsız Chromium'da (önce build)
npm run test:goruntu  # + ekran görüntüleri tests/cikti/ (menü, garaj, yarış, kokpit, 15 pist)
npm run typecheck     # tip denetimi
npm run lint          # ESLint
npm run format        # Prettier ile biçimlendir
npm run altin-iz      # klasik fizik izini yeniden yaz (yalnız fizik bilerek değiştirildiyse)
npm run olcum         # fizik ölçümleri: 0-100, azami hız, fren, tur süreleri (klasik ve yeni), adım maliyeti
npm run dev           # geliştirme sunucusu (bilgisayarda: anında yenileme)
```

## Dosya haritası

| Klasör / dosya | İçerik |
|---|---|
| `index.html` | HTML iskeleti. `window.APP_VERSION='…'` satırı derlemede doldurulur |
| `src/main.ts` | Giriş: modülleri sırayla kurar, döngüyü başlatır |
| `src/stil.css` | Tüm stiller: menü, HUD, garaj, alt paneller, kontrol tuşları, performans göstergesi |
| `src/cekirdek/` | Saf yardımcılar: `matematik` (cl, sm, ad), `rastgele` (tohumlu üreteçler), `ekran` (yön kilidi, `toApp`), `dom`, `depo` (localStorage), `bicim`, `performans` (FPS paneli) |
| `src/fizik/` | **Saf fizik** (three ve DOM yok): `veriler` (SURF, TIRES, TUNE, AST, LEVELS, PRESETS), `tipler` (arabirimler), `ortak` (iki modelin ortak drift penceresi DR, drift puanı, çamur, toz), `klasik` (bisiklet modeli), `simulasyon` (sabit adım, motor seçimi), `carpisma` (ızgara) |
| `src/fizik/yeni/` | Yeni fizik motoru: `model` (katı gövde, 4 teker, süspansiyon, örtük teker çözücüsü, yardımlar, çarpışma), `lastik` (birleşik kayma lastik modeli), `arac-fizigi` (araç verisinden kütle, atalet, yay, motor, vites, aerodinamik) |
| `src/arac/` | `araclar` (CARS: 5 aracın fizik değerleri ve gövde profilleri), `istatistik` (garaj çubukları) |
| `src/dunya/` | `pist` (Catmull-Rom pist, en yakın nokta, kerb, rampa), `pist-tanimlari` (TDEF: 15 pist), `bolgeler` (mkReg, drag, Boş Otopark, REG), `corak` (Çorak Topraklar), `dekor` (orman, tabela, duvar, PROPS), `kurucu` (bölge kurma, toplu çizim, çarpışma kaydı), `temalar` (TH), `dunya` (yükseklik/zemin sorgusu, WORLDS, kurulum) |
| `src/cizim/` | three.js: `sahne` (renderer, kamera, ışık), `ortam` (saat, hava, yağış, gölge), `arac-modeli`, `kokpit`, `garaj-sahnesi`, `parcaciklar`, `kamera` (takip ve bakış durumu), `zemin`, `dokular`, `malzemeler`, `yardimci` |
| `src/arayuz/` | DOM: `menu` (ana menü, `startWorld`), `ayarlar-ekrani` (ayarlar, duraklatma), `garaj`, `sonuc`, `hud`, `kontroller` (dokunmatik tuşlar), `surus-tuslari`, `mini-harita`, `bildirim` |
| `src/oyun/` | Oyun akışı: `durum` (mod, kamera, araç, `setCar`), `kurulum` (önayar, yardım, `applyPreset`), `ayarlar` (set, CT, kalıcı), `girdi` (I, eğim, klavye), `surus` (simülasyonu oyuna bağlar, `reset`, tur sayacı), `yarislar` (EVENTS, startEvent, evTick), `sinematik` (menü arka planı), `bolge` (setActive), `dongu` (ana döngü), `profil`, `api` (testler için `window.LT`) |
| `src/pwa/` | `kayit` (service worker, yeni sürüm kontrolü), `sw-sablon.js` (derlemede `dist/sw.js` olur) |
| `public/` | Olduğu gibi kopyalanır: `icons/`, `img/` (menü görselleri) |
| `tests/birim/` | Vitest: `klasik-iz` (altın iz), `surus` (klasikte spin ve drift dengesi), `yeni-fizik` (yeni motor: kararlılık, hızlanma, fren, spin, drift, kalkış, atlama, çarpışma, rastgele sürüş) |
| `tests/olcum/` | Ölçüm koşuları (`npm run olcum`): iki motorun 0-100, azami hız, fren, tur süreleri, adım maliyeti |
| `tests/e2e/duman.mjs` | Playwright: derlenmiş oyunda menü, 15 yarış, dünyalar, garaj, sürüş |
| `tests/veri/` | Senaryolar ve kayıtlı fizik izi |
| `tests/yardimci/` | Node'da sürüş: senaryo çalıştırıcı, test sürücüsü (`surucu`, iki motor), otomatik pilot (`pilot`), sahte tuval |
| `.github/workflows/` | `denetim` (her dalda testler), `yayin` (master ve gelistirme → Pages), `deneme-tetik` |
| `docs/` | `MIMARI.md` (katmanlar, veri akışı), `GELISTIRME.md` (sohbet başlangıç istemleri) |

## Kurallar ve tuzaklar

- **Katmanlar:** `fizik/` ve `cekirdek/` saf kalır: three.js, DOM ve oyun durumu içe aktarılmaz. Fizik dünyayı `DunyaSorgusu`, kurulumu `SurusKurulumu`, olayları `FizikOlaylari` üzerinden görür (`fizik/tipler.ts`). Böylece fizik Node'da test edilir.
- **Ortak durum:** Modüller arası durum dışa aktarılan nesnelerde tutulur (`oyun.mode`, `kurulum.pk`, `sim.S`, `yaris.EV`, `dunya.cur`, `ipucu.ti`). Nesnenin kendisini değiştirme (`sim.S = …` yok), alanlarını değiştir.
- **Yükleme sırası:** Modüller yüklenirken yan etki yapmaz; kurulum `main.ts`'teki `…Kur()` çağrılarıyla olur. Döngüsel içe aktarma serbest ama yalnız çalışma anında (fonksiyon içinde) kullanılmalı.
- **Sabit adım:** Fizik 1/60 sn'lik sabit adımla ilerler (`fizik/simulasyon.ts`, `ADIM`); klasik model içeride 8'e böler. Çizim her karede, iki adım arası ara değerle. Oyun mantığı (yarış, tur) fizik adımında çalışır (`oyun/surus.ts → surusAdimi`), kare süresine bağlanmaz.
- **Belirlenimcilik:** Fizikte `Math.random` kullanılmaz; fizik içi rastgelelik `cx.rng`, yalnız görsel olan (toz) `cx.gorselRng`. Aynı girişler aynı sonucu vermeli (tekrar izleme, hayalet araç, testler).
- **İki fizik motoru:** Klasik (varsayılan, oyunun ayarlı hissi) ve Yeni (deneysel; Ayarlar → Fizik motoru, `set.fiz`). İkisi de aynı `AracDurumu` (S), drift penceresi (`fizik/ortak.ts`) ve olaylarla çalışır; oyun ve çizim hangisinin çalıştığını bilmek zorunda değil (yalnız çizim, yeni motorda gövde yönelimini ve süspansiyonu `sim.yeni`'den okur). Yeni motor oyun ölçeğinde: yerçekimi 24 (klasikle aynı), tutuş katsayıları gerçekçi × `TUTUS`. Yeni motoru değiştirince `npm test` ve `npm run olcum` (tur süreleri klasikle karşılaştırılır).
- **Klasik fizik dokunulmaz:** `fizik/klasik.ts` değişirse altın iz testi kırılır. Bilerek değiştirildiyse `npm run altin-iz` ile izi yenile ve commit mesajında yaz.
- **Dekor tohumu:** Her bölge kendi tohumuyla kurulur (`dunya/dunya.ts → ensureBuilt`); ağaçlar her açılışta aynı yerde. `kurucu.ts`'teki `rnd()` dışında rastgele kullanma.
- **Görünüm:** Renk yönetimi kapalı, çıktı doğrusal (Three r128 görünümü). Işık şiddetleri `ISIK` (π) çarpanıyla verilir (`cizim/sahne.ts`). Yeni ışık eklerken aynı çarpanı kullan.
- **Koordinatlar:** Yer düzlemi x-z, y yukarı. Araç yönü `S.h`, ileri `(sin h, cos h)`. Pist yapısı `Pist`: `P` noktalar, `T` teğetler, `S` birikimli uzunluk, `N`, `len`, `hw` yarı genişlik, `open` (ralli/drag A'dan B'ye).
- **Bölgeler:** Her pist dünyada kendi kutusunda (`box`), kutular çakışmaz. Pist yalnız seçilince kurulur (`ensureBuilt`), yalnız etkin bölge görünür. Yükseklik `Hw(x,z)`, zemin `surfW(x,z)` (`SURF` indeksi).
- **Ayar durumu:** `setCar` aracı değiştirir. `startEvent` yarıştan önceki kurulumu `EV.sv`'ye kaydeder, `leaveEvent` geri yükler. Menü arka planı çalışırken (sinematik) araç ve koşullar geçicidir; testlerde yarışı başlatmadan önce `LT.demoStop()` çağır.
- **Drift ve kayma:** Drift modu (`DR.on`) yalnız bilinçli driftte açılır (açı eşiği + gaz + 0,25 sn). Eşik drift önayarlarında düşük, yarışlarda yüksek. Bu ayrımı bozma.
- **Kokpit:** Gövde içeriden görünmez (tek yüzlü), iç mekân `cock` grubunda. `userData.pan` taşıyan parçalar (renk panelleri, yan camlar) kokpitte gizlenir. Ön cam `glassQM` kokpitte şeffaflaşır.
- **Sürüm:** Sürüm numarası `package.json` → `version`. Her yayında artır (`npm version patch --no-git-tag-version`). `index.html`'deki `window.APP_VERSION='%APP_VERSION%'` satırının tek tırnakları değişmemeli: kurulu eski uygulamalar güncellemeyi bu kalıpla bulur (Prettier bu dosyayı biçimlendirmez).
- **Service worker:** Derlemede dosya listesiyle üretilir; elle liste tutulmaz. Ana sürüm `last-turn-…`, deneme sürümü `last-turn-dev-…` önbelleğini kullanır.
- **Kayıtlar:** localStorage anahtarları: `lt_prof`, `lt_car`, `lt_ayar`, `sv_<yarış>`. Yeni alan eklersen eski kayıtlarla uyumlu kalsın (`okuJson` varsayılanla birleştirir).

## Test

- Fizik veya sürüş değişikliğinde `npm test` (altın iz + spin/drift). Yeni bir ölçüm gerekiyorsa `tests/birim/`'e ekle; `tests/yardimci/surucu.ts` gerçek pistte otomatik pilot kurar.
- Görsel değişiklikte `npm run build && npm run test:goruntu`, sonra `tests/cikti/` görüntülerine bak.
- Başsız tarayıcı yavaş çizer (~14 fps); beklemeleri simülasyon saatiyle (`LT.sim.d.zaman`) yap, gerçek zamanla değil.
- WebGL karesini almak için `LT.R.render(LT.scene, LT.cam); LT.R.domElement.toDataURL()`.
- Yeni özellik eklersen onu deneyen bir test ekle.

## Yayın

1. `npm run kontrol` geçsin.
2. `package.json` sürümünü artır, gerekirse `README.md`'yi güncelle.
3. Türkçe commit: kısa başlık + maddeler. `git pull --rebase origin master`, sonra `git push origin master`.
4. GitHub Actions testleri tekrar çalıştırır ve yayınlar (~3 dk). Sonucu `mcp__github__actions_list` ile kontrol et.
5. Büyük ya da riskli değişiklik önce `gelistirme` dalına gider: kullanıcı `/dev/` adresinde dener, onaylarsa `master`'a birleştirilir.

## Kullanıcının kararları (bozma, değiştirmeden önce sor)

- Oyun yalnız yatay ekranda; dikey düzen için emek harcanmaz.
- Direksiyon tuşu hassasiyeti varsayılan 0,5 (tüm önayarlarda `sens:.5`).
- Gerçek marka adı ve logo yok; araçlar gerçek araçlardan esinlenir, kendi adları vardır (Kızıl Ok, Kor RX, Beyaz Kurt, Mavi Yıldız, Gece Mavisi).
- Drift ile kayma ayrı: küçük kaymalar drift duruşuna geçmez. Drift yarışı açık dünyadaki ayarlarla aynı çalışır, ayrı bir drift ayarı yoktur.
- Gerçekçi seviyede drift zor ama mümkün olmalı. Arcade'de bile denge kurmak gerekir; abartan ya da direksiyonu bırakan spin atar.
- Kalkış patinajı hızı az düşürür. Tuşla gazda patinaj araca özgü sabit ve düşüktür; analog pedalda gazın ne kadar açıldığına bağlıdır.
- Analog pedal: ortası sıfır, yukarı gaz, aşağı fren.
- Çamur: içindeyken etki %100; dışarıda hızla orantılı temizlenir; araç dururken temizlenmez.
- Her yarıştan önce garajda araç seçilir; türe uygun araç "Önerilen" olarak gelir.
- Menü PES tarzı: solda Yarış, Serbest sürüş, Garaj, Profil, Ayarlar; arkada her yarış türünden sinematik çekimler rastgele akar, art arda aynı çekim gelmez.
- Yarış türü kartlarındaki görseller kullanıcının seçtikleridir (`public/img/tur_*.jpg`). Değiştirmeden önce aday çekip seçtir.
- Görseller internetten alınmaz; oyunun kendi sahnelerinden çekilir.
- Altyapı: TypeScript + Vite + Three.js (npm), derleme ve yayın GitHub Actions'ta. Kod okunur biçimde yazılır (Prettier), eski sıkıştırılmış tek satır stili bırakıldı.
- Riskli değişiklikler önce deneme sürümünde (`/dev/`) denenir.
