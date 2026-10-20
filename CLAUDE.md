# Last Turn: geliştirici rehberi

iPhone'da ana ekrana kurulan (PWA) 3D yarış oyunu. **TypeScript + Vite + Three.js 0.186**. Kaynak `src/` altında modüllerdir; derleme çıktısı (`dist/`) GitHub Actions ile GitHub Pages'e yüklenir.

- `master` → https://cemcandan01.github.io/Last-Turn/ (kullanıcının telefonundaki oyun)
- `gelistirme` dalı → https://cemcandan01.github.io/Last-Turn/dev/ (deneme sürümü; ayrı ad, ayrı önbellek). Ortak deneme alanıdır: içinde çalışılmaz, konu dalları buraya birleştirilir.
- **Konu dalları:** her sohbet kendi dalında çalışır (`hud`, `fizik`, `garaj`, `menu`, `pist`, `ses`, `altyapi` gibi; sohbetin alanının kısa adı). Ayrıntı: "Dallar ve yayın".
- **Özel sohbetler:** `kurallar` dalı (bu dosyanın, skill'lerin ve geliştirme sürecinin yönetimi), `regresyon` dalı ("regression" sohbeti: gece regresyonu, `regresyon` skill'i).

Her iki yayında da duman testi geçmezse yayın yapılmaz; yayından sonra canlı adreste duman koşar. Kullanıcı uygulamayı internet varken açınca yeni sürüm iner.

Kullanıcı Türkçe konuşur, iPhone 13'te yatay oynar, kod okumaz. Arayüz metinleri, kod yorumları, commit mesajları ve kullanıcıya yazılan özetler Türkçe. Kod tanımlayıcıları İngilizce ya da Türkçe olabilir; çevredeki kodla aynı olsun.

## Her oturumun başında

1. Kendi konu dalına geç: `git fetch origin`; dal varsa `git checkout <konu> && git pull origin <konu> && git merge origin/master`, yoksa `git checkout -b <konu> origin/master`. Ortamın atadığı bir dal adı varsa onu konu dalı olarak kullan. `master` ya da `gelistirme` üzerinde doğrudan çalışma.
2. Bağımlılıklar oturum başında kendiliğinden kurulur (`.claude/oturum-basi.sh`). Kurulmadıysa: `npm ci`.
3. Bu dosyayı ve "Kullanıcının kararları" bölümünü oku. Önceki işler: `git log --oneline -20`. Mimari: `docs/MIMARI.md`.
4. İş bitince `surum-yayinla` skill'iyle denemeye ya da (kullanıcı "push" deyince) ana sürüme gönder ("Dallar ve yayın"). Çakışma olursa diğer sohbetin işini koruyarak birleştir.
5. Kalıcı bir karar alınırsa (kullanıcı "bundan sonra hep şöyle olsun" derse) "Kullanıcının kararları" bölümüne bir satır ekle.

## Komutlar

```
npm run kontrol       # yayın öncesi: tip denetimi, ESLint, biçim, duman (~30 sn)
npm run alan -- fizik # duman + bir dalın (ya da fizik,hud gibi birkaçının) bütün senaryoları
npm run duman         # hızlı tur: derleme, temel birim testleri, tarayıcıda açılış/yarışlar/garaj/sürüş (~15 sn)
npm run regresyon     # bütün dalların bütün senaryoları önem sırasıyla (en fazla 55 dk); gece koşumu
npm run kontrol:tam   # eskisi gibi her şey: bütün birim testleri + bütün tarayıcı bölümleri (~2 dk)
npm test              # bütün birim ve fizik testleri (Node, ~40 sn)
npm run build         # dist/ (ana sürüm)
npm run test:e2e      # derlenmiş oyun başsız Chromium'da (önce build)
npm run test:goruntu  # + ekran görüntüleri tests/cikti/ (menü, garaj, yarış, kokpit, 15 pist)
npm run typecheck     # tip denetimi
npm run lint          # ESLint
npm run format        # Prettier ile biçimlendir
npm run olcum         # fizik ölçümleri: 0-100, azami hız, fren, tur süreleri, toprakta sınır, drift pisti, adım maliyeti
npm run dev           # geliştirme sunucusu (bilgisayarda: anında yenileme)
```

## Dosya haritası

| Klasör / dosya | İçerik |
|---|---|
| `index.html` | HTML iskeleti. `window.APP_VERSION='…'` satırı derlemede doldurulur |
| `src/main.ts` | Giriş: modülleri sırayla kurar, döngüyü başlatır |
| `src/stil.css` | Tüm stiller: menü, HUD, garaj, alt paneller, kontrol tuşları, performans göstergesi |
| `src/cekirdek/` | Saf yardımcılar: `matematik` (cl, sm, ad), `rastgele` (tohumlu üreteçler), `ekran` (yön kilidi, `toApp`), `dom`, `depo` (localStorage), `bicim`, `performans` (FPS paneli) |
| `src/fizik/` | **Saf fizik** (three ve DOM yok): `veriler` (SURF, TIRES, TUNE, AST, LEVELS, PRESETS), `tipler` (arabirimler), `ortak` (drift penceresi DR, drift puanı, çamur, toz), `simulasyon` (sabit adım), `carpisma` (ızgara) |
| `src/fizik/yeni/` | Fizik motoru (tek motor; klasör adı geçmişten): `model` (katı gövde, 4 teker, süspansiyon, örtük teker çözücüsü, yardımlar, çarpışma), `lastik` (birleşik kayma lastik modeli), `arac-fizigi` (araç verisinden kütle, atalet, yay, motor, vites, aerodinamik) |
| `src/arac/` | `araclar` (CARS: 5 aracın fizik değerleri ve gövde profilleri), `istatistik` (garaj çubukları) |
| `src/dunya/` | `pist` (Catmull-Rom pist, en yakın nokta, kerb, rampa), `pist-tanimlari` (TDEF: 15 pist), `bolgeler` (mkReg, drag, Boş Otopark, REG), `corak` (Çorak Topraklar), `dekor` (orman, tabela, duvar, PROPS), `kurucu` (bölge kurma, toplu çizim, çarpışma kaydı), `temalar` (TH), `dunya` (yükseklik/zemin sorgusu, WORLDS, kurulum) |
| `src/cizim/` | three.js: `sahne` (renderer, kamera, ışık), `ortam` (saat, hava, yağış, gölge), `arac-modeli`, `kokpit`, `garaj-sahnesi`, `parcaciklar`, `kamera` (takip ve bakış durumu), `zemin`, `dokular`, `malzemeler`, `yardimci` |
| `src/arayuz/` | DOM: `menu` (ana menü, `startWorld`), `ayarlar-ekrani` (ayarlar, duraklatma), `garaj`, `sonuc`, `hud` (göstergeler; düzen `#app[data-hud]`), `kontroller` (dokunmatik tuşlar), `surus-tuslari`, `mini-harita`, `bildirim` |
| `src/oyun/` | Oyun akışı: `durum` (mod, kamera, araç, `setCar`), `kurulum` (önayar, yardım, `applyPreset`), `ayarlar` (set, CT, kalıcı), `girdi` (I, eğim, klavye), `surus` (simülasyonu oyuna bağlar, `reset`, tur sayacı), `yarislar` (EVENTS, startEvent, evTick), `sinematik` (menü arka planı), `bolge` (setActive), `dongu` (ana döngü), `profil`, `api` (testler için `window.LT`) |
| `src/pwa/` | `kayit` (service worker, yeni sürüm kontrolü), `sw-sablon.js` (derlemede `dist/sw.js` olur) |
| `public/` | Olduğu gibi kopyalanır: `icons/`, `img/` (menü görselleri) |
| `tests/birim/` | Vitest `fizik`: kararlılık, hızlanma, fren, spin, toprakta sınır (frensiz tur yok, abartan spin), drift dengesi, drift yarışı (%80 tek kombo), asfaltta titreşim yok (5 araç × 9 asfalt pist, kerb sarsıntısı), kalkış, atlama, çarpışma, rastgele sürüş |
| `tests/olcum/` | Ölçüm koşuları (`npm run olcum`): araç değerleri, tur süreleri (eski klasik motorla karşılaştırma), `ralli` (toprakta tam gaz + tam direksiyon), `drift` ve `drift-izgara` (drift pistlerinde tek kombo oranı), `titresim` (her araç her asfalt pistte poz sıçraması ve kerb sarsıntısı), adım maliyeti |
| `tests/kosucu.mjs` | Test koşucusu: `duman`, `alan <dal>`, `regresyon`, `liste`; dal dal rapor `tests/cikti/rapor.md` |
| `tests/senaryolar/` | Her dalın senaryoları kendi dosyasında (`<dal>.mjs`): önem (P1-P3), duman, birim grubu ya da tarayıcı bölümü (`BENIOKU.md`) |
| `tests/e2e/duman.mjs` | Playwright: derlenmiş oyunu (ya da `--adres` ile canlıyı) açar, `tests/e2e/bolumler/` bölümlerini koşar (açılış, yarışlar, garaj, sürüş, kerb, HUD); `goruntu` ekran görüntüleri |
| `tests/veri/` | Senaryolar ve kayıtlı fizik izi |
| `tests/yardimci/` | Node'da sürüş: test sürücüsü (`surucu`), otomatik pilot (`pilot`), drift pilotu ve drift yarışı puan kuralları (`drift-pilot`), sürüş denemeleri (`denemeler`: sanal düz zemin, frensiz tur), sahte tuval |
| `.github/workflows/` | `denetim` (konu dalında alan testi), `yayin` (duman → master ve gelistirme → Pages → canlı duman), `deneme-tetik` |
| `docs/` | `MIMARI.md` (katmanlar, veri akışı), `GELISTIRME.md` (sohbet başlangıç istemleri), `HUD.md` (HUD standardı) |

## Kurallar ve tuzaklar

- **Katmanlar:** `fizik/` ve `cekirdek/` saf kalır: three.js, DOM ve oyun durumu içe aktarılmaz. Fizik dünyayı `DunyaSorgusu`, kurulumu `SurusKurulumu`, olayları `FizikOlaylari` üzerinden görür (`fizik/tipler.ts`). Böylece fizik Node'da test edilir.
- **Ortak durum:** Modüller arası durum dışa aktarılan nesnelerde tutulur (`oyun.mode`, `kurulum.pk`, `sim.S`, `yaris.EV`, `dunya.cur`, `ipucu.ti`). Nesnenin kendisini değiştirme (`sim.S = …` yok), alanlarını değiştir.
- **Yükleme sırası:** Modüller yüklenirken yan etki yapmaz; kurulum `main.ts`'teki `…Kur()` çağrılarıyla olur. Döngüsel içe aktarma serbest ama yalnız çalışma anında (fonksiyon içinde) kullanılmalı.
- **Sabit adım:** Fizik 1/60 sn'lik sabit adımla ilerler (`fizik/simulasyon.ts`, `ADIM`); model içeride 8'e böler. Çizim her karede, iki adım arası ara değerle. Oyun mantığı (yarış, tur) fizik adımında çalışır (`oyun/surus.ts → surusAdimi`), kare süresine bağlanmaz.
- **Belirlenimcilik:** Fizikte `Math.random` kullanılmaz; fizik içi rastgelelik `cx.rng`, yalnız görsel olan (toz) `cx.gorselRng`. Aynı girişler aynı sonucu vermeli (tekrar izleme, hayalet araç, testler).
- **Fizik motoru:** Tek motor (`fizik/yeni/model.ts`): katı gövde, 4 teker, süspansiyon, lastik, aktarma. Eski klasik (bisiklet) motoru 3.1'de kaldırıldı; ayarlarda motor seçimi yok. Oyun ölçeğinde: yerçekimi 24, tutuş katsayıları gerçekçi × `TUTUS`. Gevşek zeminde (toprak, çim, çamur, kar) tutuş `GEVSEK_TUTUS`, tepe kayma açısı `GEVSEK_TEPE`, eğri `GEVSEK_C`, arka `GEVSEK_ARKA`: toprakta tam gaz + tam direksiyon yola tutunmaz, fren gerekir. Çizim gövde yönelimini ve süspansiyonu `sim.yeni`'den okur. Fiziği değiştirince `npm test` ve `npm run olcum` (tur süreleri hedeflerle karşılaştırılır).
- **Pist yüksekliği basamaksız:** `dunya/pist.ts → parcayaIzdusum` pist boyunca konumu teğeti sürekli dönen izdüşümle bulur; yükseklik (`bolgeler.ts`, Hb) ve kerb bundan hesaplanır. En yakın noktaya uzaklık ya da nokta teğetiyle hesaplamak milimetrik basamaklar yapar, sert yaylı araç titrer (asfaltta titreşim testi bunu yakalar). Kerb sarsıntısı (`S.kerb`, kamera) yalnız yere değen bir teker kerbin üstündeyken açılır (`DunyaSorgusu.kerb`, bölgenin `Hk`'si); toplam yükseklikle karar verilmez, yoksa yokuşlu pistte sürekli açık kalır.
- **Drift pisti:** Drift Parkı virajları otoparktaki doğal drift yarıçapında (35-70 m). Drift pistini değiştirince `npm run olcum -- drift-izgara`: gerçekçide sürüş tarzlarının yaklaşık yarısı turun %80'ini tek komboda geçmeli (adil zorluk).
- **Dekor tohumu:** Her bölge kendi tohumuyla kurulur (`dunya/dunya.ts → ensureBuilt`); ağaçlar her açılışta aynı yerde. `kurucu.ts`'teki `rnd()` dışında rastgele kullanma.
- **Görünüm:** Renk yönetimi kapalı, çıktı doğrusal (Three r128 görünümü). Işık şiddetleri `ISIK` (π) çarpanıyla verilir (`cizim/sahne.ts`). Yeni ışık eklerken aynı çarpanı kullan.
- **Koordinatlar:** Yer düzlemi x-z, y yukarı. Araç yönü `S.h`, ileri `(sin h, cos h)`. Pist yapısı `Pist`: `P` noktalar, `T` teğetler, `S` birikimli uzunluk, `N`, `len`, `hw` yarı genişlik, `open` (ralli/drag A'dan B'ye).
- **Bölgeler:** Her pist dünyada kendi kutusunda (`box`), kutular çakışmaz. Pist yalnız seçilince kurulur (`ensureBuilt`), yalnız etkin bölge görünür. Yükseklik `Hw(x,z)`, zemin `surfW(x,z)` (`SURF` indeksi).
- **Ayar durumu:** `setCar` aracı değiştirir. `startEvent` yarıştan önceki kurulumu `EV.sv`'ye kaydeder, aracın kendi önayarını yükler (yarışta önayar seçilmez), `leaveEvent` geri yükler. Menü arka planı çalışırken (sinematik) araç ve koşullar geçicidir; testlerde yarışı başlatmadan önce `LT.demoStop()` çağır.
- **Drift ve kayma:** Drift modu (`DR.on`) yalnız bilinçli driftte açılır (açı eşiği + gaz + 0,25 sn). Eşik drift önayarlarında düşük, yarışlarda yüksek. Bu ayrımı bozma.
- **HUD:** Göstergeler ve dokunmatik tuşlarla ilgili her değişiklik `docs/HUD.md` kurallarına uyar (bölgeler, kenar boşlukları, bilgi önceliği, görünüm, düzenler). Her gösterge (hız, sayaç, tuşlar, harita) Ayarlar → Göstergeler düzenleyicisinde önizlemeyle ayrı seçilir (`arayuz/hud-duzenleyici.ts`, `oyun/ayarlar.ts → HUD_PARCALARI`, `gorunum`); hazır düzenler Köşe, Kadran, Bant, Sade (`HUDLAR`). Yerleşim yalnız `stil.css`'te; `hud.ts` içerik yazar. Yeni öğe e2e çakışma testine eklenir.
- **Kokpit:** Gövde içeriden görünmez (tek yüzlü), iç mekân `cock` grubunda. `userData.pan` taşıyan parçalar (renk panelleri, yan camlar) kokpitte gizlenir. Ön cam `glassQM` kokpitte şeffaflaşır.
- **Sürüm:** Sürüm numarası `package.json` → `version`. Her yayında artır (`npm version patch --no-git-tag-version`). `index.html`'deki `window.APP_VERSION='%APP_VERSION%'` satırının tek tırnakları değişmemeli: kurulu eski uygulamalar güncellemeyi bu kalıpla bulur (Prettier bu dosyayı biçimlendirmez).
- **Service worker:** Derlemede dosya listesiyle üretilir; elle liste tutulmaz. Ana sürüm `last-turn-…`, deneme sürümü `last-turn-dev-…` önbelleğini kullanır.
- **Kayıtlar:** localStorage anahtarları: `lt_prof`, `lt_car`, `lt_ayar`, `sv_<yarış>`. Yeni alan eklersen eski kayıtlarla uyumlu kalsın (`okuJson` varsayılanla birleştirir).

## Test

Kullanıcı her değişikliği canlıdan önce kendi eliyle dener; otomatik test üç katmandır:

| Ne zaman | Ne koşar | Komut |
|---|---|---|
| Geliştirirken ve göndermeden önce | Değişen dalların senaryoları + duman (tip denetimi, ESLint, biçim ayrıca) | `npm run alan -- <dal>`, `npm run kontrol` |
| Yayında (GitHub Actions) | Duman; geçmezse yayın yok. Yayından sonra canlı adreste duman, kalırsa "Canlı duman hatası" kaydı | `yayin.yml` |
| Geliştirme yapılan günlerin gecesi 04:00 | Regresyon: bütün dalların senaryoları P1 → P2 → P3, en fazla 55 dk ("regression" sohbeti) | `npm run regresyon` |

- **Senaryo sahipliği:** her senaryo bir dala aittir (`tests/senaryolar/<dal>.mjs`) ve bir önemi vardır: P1 kritik (oyun açılmaz, sürülmez, yarış bitmez), P2 önemli (bir özellik bozulur), P3 ayrıntı. Her dal yalnız kendi senaryo dosyasını değiştirir. Yeni test yazan, onu kendi dalının dosyasına kaydeder; kayıtsız testler regresyonda `kayitsiz` satırına düşer.
- **Duman** (`duman: true`) yalnız birkaç saniyelik, oyunun temelini denetleyen P1 senaryolardır; yavaş senaryo dumana eklenmez.
- Fizik veya sürüş değişikliğinde `npm run alan -- fizik` (spin, drift, toprak, titreşim) ve `npm run olcum`. Yeni bir ölçüm gerekiyorsa `tests/birim/`'e ekle; `tests/yardimci/surucu.ts` gerçek pistte otomatik pilot kurar.
- Görsel değişiklikte `npm run build && npm run test:goruntu`, sonra `tests/cikti/` görüntülerine bak.
- Başsız tarayıcı yavaş çizer (~14 fps); beklemeleri simülasyon saatiyle (`LT.sim.d.zaman`) yap, gerçek zamanla değil.
- WebGL karesini almak için `LT.R.render(LT.scene, LT.cam); LT.R.domElement.toDataURL()`.
- Yeni özellik eklersen onu deneyen bir test ekle ve kendi dalının senaryo dosyasına önemiyle kaydet. Test atlanmaz, kapatılmaz.

## Dallar ve yayın

```
konu dalı (hud, fizik, …) ──merge──► gelistirme ──► /Last-Turn/dev/   (deneme: onaylanmamış işler birlikte)
        └──────── kullanıcı "push" deyince ──merge──► master ──► /Last-Turn/ (telefondaki oyun) ──► canlı duman
gece 04:00: gelistirme + bütün konu dalları ──► regresyon ──► düzeltmeler ──► gelistirme ──► (0 hata, "push") ──► master
```

1. Her sohbet kendi konu dalında çalışır ve commit'lerini o dala gönderir: `git push -u origin <konu>` (Denetim testleri çalıştırır).
2. **Denemeye gönder** (iş bitince kullanıcı telefonda denesin diye, ya da kullanıcı "denemeye gönder" derse): `npm run kontrol` ve alan testi geçsin; `git checkout gelistirme && git pull origin gelistirme && git merge --no-ff <konu>`, çakışmayı iki işi de koruyarak çöz, `npm run kontrol`, `git push origin gelistirme`, sonra konu dalına geri dön. Deneme sürümünde başka sohbetlerin onaylanmamış işleri de bulunabilir; bu normaldir.
3. **Ana sürüme yayınla** (kullanıcı "push" / "pushla" / "yayınla" deyince; değişikliğin boyutu ne olursa olsun, kullanıcı demeden asla): `gelistirme`'yi değil **konu dalını** birleştir, böylece başka sohbetlerin onaylanmamış işleri ana sürüme girmez: `git checkout master && git pull origin master && git merge --no-ff <konu>`, sürümü artır (`npm version patch|minor --no-git-tag-version`), `npm run kontrol`, Türkçe commit, `git push origin master`. Ardından `gelistirme`'yi güncel tut: `git checkout gelistirme && git pull origin gelistirme && git merge master && git push origin gelistirme`.
4. GitHub Actions dumanı tekrar koşar, yayınlar, sonra canlı adreste duman koşar (~5 dk). Sonucu `mcp__github__actions_list` ile kontrol et; canlı duman kalırsa açılan "Canlı duman hatası" kaydına bak, kendi işinden geldiyse hemen düzelt.
5. Konu dalı uzun yaşıyorsa ara ara `git merge origin/master` ile güncelle (çakışmalar küçükken çözülsün). Aynı dosyanın aynı satırlarına iki sohbet dokunduysa ve hangisinin kalacağı açık değilse kullanıcıya sor.
6. Commit, rebase ya da force-push ile başka sohbetin dalının geçmişi değiştirilmez; yalnız kendi konu dalında çalışılır.
7. **Gece regresyonu** ("regression" sohbeti, `regresyon` skill'i): o gün herhangi bir konu dalında commit olduysa 04:00'te `gelistirme` ve bütün konu dalları `regresyon` dalında birleştirilir, regresyon koşar. Her hata onu yakalayan senaryonun dalına yazılır ve düzeltme commit'i o dalın adıyla başlar (`[fizik] …`), ama düzeltmeleri yalnız regression sohbeti, yalnız `regresyon` dalında yapar: böylece düzeltmeler birbiriyle çakışmaz. Düzeltmeler denemeye (`gelistirme`) gider, 0 hata kalana kadar regresyon tekrarlanır, kullanıcıya dal dal rapor verilir; kullanıcı o sohbette "push" deyince `regresyon` ana sürüme birleştirilir.
8. **Çakışmalar:** gece düzeltmeleri bir konu dalının üzerinde çalıştığı dosyaya dokunduysa, o sohbet oturum başında `git merge origin/master` yaparken çakışmayı iki işi de koruyarak çözer ve dokunulan dalın senaryolarını da koşar (`npm run alan -- <konu>,<diğer>`). Kısacası: çakışmayı sonra birleştiren çözer; aynı satırı ters yönde değiştiren iki iş varsa kullanıcıya sorar.

## Kullanıcının kararları (bozma, değiştirmeden önce sor)

- Oyun yalnız yatay ekranda; dikey düzen için emek harcanmaz.
- Direksiyon tuşu hassasiyeti varsayılan 0,5 (tüm önayarlarda `sens:.5`).
- Gerçek marka adı ve logo yok; araçlar gerçek araçlardan esinlenir, kendi adları vardır (Kızıl Ok, Kor RX, Beyaz Kurt, Mavi Yıldız, Gece Mavisi).
- Drift ile kayma ayrı: küçük kaymalar drift duruşuna geçmez. Drift yarışında ayrı bir drift ayarı yoktur: aracın kendi önayarıyla, otoparktaki driftle aynı çalışır.
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
- Kullanıcı bir sohbette "push" deyince o sohbetin işi, değişikliğin boyutu ne olursa olsun ana sürüme (`master`, telefondaki oyun) gönderilir. Kullanıcı demeden ana sürüme hiçbir şey gitmez, küçük düzeltmeler dahil. Bitince iş konu dalına ve denemeye (`gelistirme`) gider.
- Test kapsamı: canlıdan önce yalnız değişen alanın senaryoları + duman (kullanıcı ayrıca elle dener). Canlıdan sonra canlı adreste duman. Bütün dalların bütün senaryoları yalnız gece regresyonunda.
- Gece regresyonu yalnız geliştirme yapılan günlerde (konu dallarında commit varsa) 04:00'te (İstanbul saati), "regression" sohbetinde koşar; en fazla ~1 saat, önem sırasıyla. Hatalar sahibi dalın adıyla o sohbette çözülür, 0 hata kalana kadar denemede tekrar koşulur; dal dal rapor (geçti/kaldı, hata sayısı, düzeltme sonrası sonuç) verilir; canlıya kullanıcı o sohbette "push" deyince gider.
- Her sohbet kendi konu dalında çalışır; deneme sürümü (`gelistirme`) konu dallarının birleştiği tek ortak deneme alanıdır (telefonda tek deneme uygulaması). Ana sürüme yalnız kullanıcının onayladığı konu dalı birleştirilir.
- Fizik motoru tek: yeni motor (katı gövde, 4 teker). Ayarlarda motor seçimi yok.
- Rallide ve toprakta tam gaz + tam direksiyon yola tutunmaz; virajdan önce fren gerekir. Dengeli ve gerçekçide abartan spin atar.
- Drift pistinde turun ~%80'i tek komboda geçilebilmeli; zorluk adil olmalı (gerçekçide ölçülü açı başarır, abartan yakar).
- Serbest sürüşe girmeden önce garajda araç seçilir. Önayar yalnız serbest sürüşte (duraklatma menüsünde) seçilir; yarışta aracın kendi önayarı kullanılır.
- Kokpit iç mekânı sıcak kahve/taba tonlarında: asfalttan kolayca ayrılmalı.
- HUD: aracı ve önündeki yolu hiçbir gösterge kapatmaz; hız ile devir göstergesi aynı anda olmaz (devir çubuğu yok). Drift yarışında kombo yalnız üst ortada, sol üstte toplam puan. Drift açısı gösterilmez (ileride yerine anlık XP). Göstergeler kenarlara yakın. HUD ayarı ayrı bir düzenleyicide, yarış başlatmadan önizlemeyle yapılır.
