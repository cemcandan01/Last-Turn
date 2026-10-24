# Last Turn: geliştirici rehberi

iPhone'da ana ekrana kurulan (PWA) 3D yarış oyunu. **TypeScript + Vite + Three.js 0.186**. Kaynak `src/` altında modüllerdir; derleme çıktısı (`dist/`) GitHub Actions ile GitHub Pages'e yüklenir.

- `master` → https://cemcandan01.github.io/Last-Turn/ (canlı: kullanıcının telefonundaki oyun). Yalnız regresyondan geçmiş, kullanıcının onayladığı sürüm girer.
- `gelistirme` dalı → https://cemcandan01.github.io/Last-Turn/dev/ (deneme sürümü; ayrı ad, ayrı önbellek). Sürümün toplandığı ortak alan: içinde çalışılmaz, konu sohbetleri işi testler geçince buraya kendiliğinden birleştirir.
- **Konu dalları:** her sohbet kendi dalında çalışır (`hud`, `fizik`, `garaj`, `menu`, `pist`, `ses`, `altyapi` gibi; sohbetin alanının kısa adı). Ayrıntı: "Dallar ve yayın".
- **Last Turn Merkezi:** https://claude.ai/artifact/MNacFzHf5D2kibH1MEyXkq (Claude uygulamasında): aşama, push bekleyen dallar, sürümler, son olaylar, son regresyon. Sohbetler önemli her olayda tazeler ve telefon bildirimi gönderir (`merkez` skill'i).
- **Yönetmen sohbeti:** kullanıcı isteklerini buraya yazar (kurallar sohbetine giden istekler de dahil); yönetmen alanı (dalı) seçer, işi böler, her dal için temiz bir sohbet açar, bağımlı işleri sırayla başlatır (`yonlendir` skill'i). Konu sohbetleri işi bitirince yönetmene `send_message` (`@parent`) ile haber verir.
- **Özel sohbetler:** `kurallar` dalı (bu dosyanın, skill'lerin ve geliştirme sürecinin yönetimi), `regresyon` dalı ("regression" sohbeti: sürüm regresyonu ve canlıya çıkış, `regresyon` skill'i).

Yayında GitHub yalnız tip denetimi, kod denetimi ve derleme yapar (geçmezse yayın yapılmaz) ve yeni sürümün adreste göründüğünü denetler. Duman (tarayıcı) testi regresyonun son adımıdır; canlıya çıkıştan sonra da canlı adreste koşar. Kullanıcı uygulamayı internet varken açınca yeni sürüm iner.

Kullanıcı Türkçe konuşur, iPhone 13'te yatay oynar, kod okumaz. Arayüz metinleri, kod yorumları, commit mesajları ve kullanıcıya yazılan özetler Türkçe. Kod tanımlayıcıları İngilizce ya da Türkçe olabilir; çevredeki kodla aynı olsun.

## Her oturumun başında

1. Kendi konu dalına geç: `git fetch origin`; dal varsa `git checkout <konu> && git pull origin <konu> && git merge origin/gelistirme`, yoksa `git checkout -b <konu> origin/gelistirme`. Ortamın atadığı bir dal adı varsa onu konu dalı olarak kullan. `master` ya da `gelistirme` üzerinde doğrudan çalışma.
2. Bağımlılıklar oturum başında kendiliğinden kurulur (`.claude/oturum-basi.sh`). Kurulmadıysa: `npm ci`.
3. Bu dosyayı (dala geçtikten sonra diskteki güncel hâlini; oturum `master`'dan açılır, kurallar ise önce `gelistirme`'ye gelir) ve "Kullanıcının kararları" bölümünü oku. Skill'leri de daldaki `.claude/skills/` dosyalarından oku. Çalıştığın alanın kurallarını `docs/ALANLAR.md`'den oku. Gerektiğinde: dosya haritası `docs/HARITA.md`, mimari `docs/MIMARI.md`, süreç `docs/SUREC.md`. Önceki işler: `git log --oneline -10` ve dalın notu `docs/notlar/<dal>.md` (varsa; yeni sohbet önceki sohbeti hatırlamaz, bağlam buradan gelir).
4. İş bitince kendi dalına commit'le ve testler geçince `surum-yayinla` skill'iyle **kendiliğinden** denemeye gönder; kullanıcı "bekle" / "denemeye gönderme" dediyse dalda bırak ("Dallar ve yayın"). Çakışma olursa diğer sohbetin işini koruyarak birleştir.
5. Kalıcı bir karar alınırsa (kullanıcı "bundan sonra hep şöyle olsun" derse) "Kullanıcının kararları" bölümüne bir satır ekle.

## Verimlilik (her sohbette uy)

Maliyet kullanıcı için önemlidir; kaliteyi düşürmeden az token harca.
- **Kısa yanıt:** kullanıcıya en fazla 5 satır: ne değişti, sürüm, nasıl denenir, varsa tek soru. Ara adım anlatımı, tablo, kod yok (istenmedikçe). Ayrıntıyı commit mesajına yaz.
- **Tek seferde doğru:** istek belirsizse işe başlamadan tek soru sor (seçenekli, `AskUserQuestion`); küçük bir varsayım yapacaksan yanıtta tek satırla söyle. Görsel ya da oynanış değişikliğinde kanıt hazırla: ölçülen sayı ve kanıt tarifi (hangi ekran, hangi `LT.*` ifadesi); kullanıcıyla doğrudan yazışan sohbette ekran görüntüsü de (`SendUserFile`). Yönetmenin açtığı sohbet kullanıcıya hiçbir şey göndermez: tarifi yönetmene `send_message` ile verir, görüntüyü yönetmen çeker (`tests/surec/kanit.mjs`). Kullanıcı aynı şeyi yeniden istemek zorunda kalmasın.
- **Yardımcı ajanlar** (`.claude/agents/`, ucuz modeller): kod bulmak için `kasif` (haiku), test koşup kısa sonuç almak için `testci` (haiku), göndermeden önce gözden geçirme ve görsel denetim için `denetci` (sonnet). Büyük dosyaları ve uzun test çıktılarını ana sohbete alma; ajana yaptır, özetini kullan. Küçük işte (birkaç satır) ajan açma, doğrudan yap.
- **Bağlam:** dosyayı baştan sona okuma; `grep` ile ilgili yeri bul, o kısmı oku. Yalnız çalıştığın alanın kurallarını oku (`docs/ALANLAR.md`). Yalnız değişen alanın testini koş.
- **Dal notu:** işi denemeye gönderirken `docs/notlar/<dal>.md`'yi güncelle (en fazla 15 satır, Türkçe): son yapılanlar, alınan kararlar ve nedeni, denenip bırakılanlar, kullanıcının bu dal için söylediği tercihler, açık işler. Sohbet kapansa ya da temizlense bile bir sonraki sohbet işi sıfırdan kurmasın; kullanıcı revize isterse yeni sohbet açabilir.
- **Düşünme:** küçük işte uzun düşünme; zor tasarım ve fizik işlerinde düşün.
- **Kullanıcıya öneri** (gerektiğinde bir kez): konu sohbetini Sonnet ile aç, Opus'u yalnız zor işlerde (fizik modeli, mimari) kullan; her yeni özellik için yeni sohbet aç (uzun sohbette her mesaj pahalılaşır; dal aynı kalır).

## Komutlar

```
npm run kontrol       # göndermeden önce: tip denetimi, ESLint, biçim (~15 sn)
npm run alan -- fizik # yalnız bir dalın (ya da fizik,hud gibi birkaçının) bütün senaryoları; konu sohbetinin testi
npm run duman         # duman: derleme, temel birim testleri, tarayıcıda açılış/yarışlar/garaj/sürüş (~15 sn); regresyonun son adımı
npm run regresyon     # bütün dalların bütün senaryoları önem sırasıyla (en fazla 55 dk); gece koşumu
npm run kontrol:tam   # eskisi gibi her şey: bütün birim testleri + bütün tarayıcı bölümleri (~2 dk)
npm test              # bütün birim ve fizik testleri (Node, ~40 sn)
npm run build         # dist/ (ana sürüm)
npm run test:e2e      # derlenmiş oyun başsız Chromium'da (önce build)
npm run test:goruntu  # + ekran görüntüleri tests/cikti/ (menü, garaj, yarış, kokpit, 30 pist)
npm run typecheck     # tip denetimi
npm run lint          # ESLint
npm run format        # Prettier ile biçimlendir
npm run menugorsel    # menü arka plan görsellerini oyundan çek: public/img/menu/*.webp (önce build; ~1 dk). Pist ya da sinematik çekim değişince
npm run ses           # sesleri kaydet: tests/cikti/ses/ (müzik, 5 motor, sürüş efektleri; .wav ve .m4a; önce build)
npm run olcum         # fizik ölçümleri: 0-100, azami hız, fren, tur süreleri, toprakta sınır, drift pisti, adım maliyeti
npm run dev           # geliştirme sunucusu (bilgisayarda: anında yenileme)
```

## Genel kurallar ve tuzaklar

- **Katmanlar:** `fizik/` ve `cekirdek/` saf kalır: three.js, DOM ve oyun durumu içe aktarılmaz. Fizik dünyayı `DunyaSorgusu`, kurulumu `SurusKurulumu`, olayları `FizikOlaylari` üzerinden görür (`fizik/tipler.ts`). Böylece fizik Node'da test edilir.
- **Ortak durum:** Modüller arası durum dışa aktarılan nesnelerde tutulur (`oyun.mode`, `kurulum.pk`, `sim.S`, `yaris.EV`, `dunya.cur`, `ipucu.ti`). Nesnenin kendisini değiştirme (`sim.S = …` yok), alanlarını değiştir.
- **Yükleme sırası:** Modüller yüklenirken yan etki yapmaz; kurulum `main.ts`'teki `…Kur()` çağrılarıyla olur. Döngüsel içe aktarma serbest ama yalnız çalışma anında (fonksiyon içinde) kullanılmalı.
- **Sabit adım:** Fizik 1/60 sn'lik sabit adımla ilerler (`fizik/simulasyon.ts`, `ADIM`); model içeride 8'e böler. Çizim her karede, iki adım arası ara değerle. Oyun mantığı (yarış, tur) fizik adımında çalışır (`oyun/surus.ts → surusAdimi`), kare süresine bağlanmaz.
- **Belirlenimcilik:** Fizikte `Math.random` kullanılmaz; fizik içi rastgelelik `cx.rng`, yalnız görsel olan (toz) `cx.gorselRng`. Aynı girişler aynı sonucu vermeli (tekrar izleme, hayalet araç, testler).
- **Koordinatlar:** Yer düzlemi x-z, y yukarı. Araç yönü `S.h`, ileri `(sin h, cos h)`. Pist yapısı `Pist`: `P` noktalar, `T` teğetler, `S` birikimli uzunluk, `N`, `len`, `hw` yarı genişlik, `open` (ralli/drag A'dan B'ye).
- **Sürüm:** Sürüm numarası `package.json` → `version`; artırma kuralı "Sürümler" bölümünde. `index.html`'deki `window.APP_VERSION='%APP_VERSION%'` satırının tek tırnakları değişmemeli: kurulu eski uygulamalar güncellemeyi bu kalıpla bulur (Prettier bu dosyayı biçimlendirmez).
- **Service worker:** Derlemede dosya listesiyle üretilir; elle liste tutulmaz. Ana sürüm `last-turn-…`, deneme sürümü `last-turn-dev-…` önbelleğini kullanır.
- **Kayıtlar:** localStorage anahtarları: `lt_prof`, `lt_car`, `lt_ayar`, `sv_<yarış>`, `lt_ilerleme`, `lt_yildiz`, `lt_bulut` (bulut kuyruğu). Yeni alan eklersen eski kayıtlarla uyumlu kalsın (`okuJson` varsayılanla birleştirir).

## Test (ayrıntı `oyun-test` skill'i)

- Geliştirirken ve göndermeden önce: tip denetimi, ESLint, biçim ve yalnız kendi işinin kapsamındaki testler (`npm run alan -- <dal>`; hata bulursan düzeltip yeniden koş). Denemede tarayıcı dumanı yok. Bütün dalların bütün senaryoları ve ardından duman yalnız regresyonda; yeni bir canlı çıkıştan sonra (canlıdaki sürüm değişince) canlı adreste duman.
- Her senaryonun sahibi bir dal ve önemi (P1-P3) vardır (`tests/senaryolar/<dal>.mjs`); yeni özellik için test ekle ve kendi dalının dosyasına kaydet. Test atlanmaz, kapatılmaz.
- Başsız tarayıcı yavaş çizer (~14 fps): beklemeleri simülasyon saatiyle (`LT.sim.d.zaman`) yap. WebGL karesi: `LT.R.render(LT.scene, LT.cam); LT.R.domElement.toDataURL()`.

## Dallar ve yayın (özet; ayrıntı `docs/SUREC.md`)

- Konu dalı `gelistirme`'den açılır; iş bitip testler geçince **kendiliğinden** `gelistirme`'ye (deneme, `/dev/`) gider, yama +1 (`surum-yayinla`). Kullanıcı "bekle" derse dalda kalır, "push" ile gider.
- Her gece 00:00 "regression" sohbeti denetler; denemede yeni oyun işi varsa "testlere hazır" bildirimi, "başlat" ya da 04:00'te regresyon: senaryolar, 0 hata olunca duman, sonra onay (`regresyon`). Hatalar sahibi dalın adıyla düzeltilir; rapor + kullanıcı "push" → `master` (canlı), sonraki sürüm başlar.
- Konu sohbetleri `master`'a yazmaz (tek istisna kullanıcının açıkça istediği acil düzeltme, `docs/SUREC.md`). Rebase ve force-push yok; başka sohbetin dalına yazılmaz. Çakışmayı sonra birleştiren iki işi koruyarak çözer.
- Sürüm `0.SÜRÜM.YAMA`; numarayı yalnız `gelistirme`'ye birleştiren değiştirir.

## Kullanıcının kararları (bozma, değiştirmeden önce sor)

- Yönetmen sohbeti yönlendirdiği işleri kullanıcıya önceden anlatmaz (maliyet); yalnız işler bitince kısa özet ve görsel kanıtla yazar. Yönetmenin açtığı konu sohbetleri kullanıcıya hiçbir şey göndermez (`SendUserFile` dahil): işi bitirince yönetmene `mcp__claude-code-remote__send_message` (`@parent`) ile "<dal>: <sürüm> denemede" ve kanıt tarifini yazar; görsel kanıtı yönetmen alır ve kendi sohbetinde gösterir.
- Drift puanı açı × hız (birimden bağımsız iç hız); puan açısı en az 10° (drift sürerken; yön değiştirirken kayma sürdükçe ≤0,6 sn kombo taban açıyla akar), en fazla 60°; drift yarışında 1. turun ≥%90'ı driftle geçilirse 2. turda çarpan x6; bonuslar (uzun drift +100/sn, direksiyonsuz +100/sn, tek yön +250/sn; koşul 1 sn sürünce başlar).
- Oyun yalnız yatay ekranda; dikey düzen için emek harcanmaz.
- Direksiyon tuşu hassasiyeti varsayılan 0,5 (tüm önayarlarda `sens:.5`).
- Gerçek marka adı ve logo yok; araçlar gerçek araçlardan esinlenir, kendi adları vardır (Kızıl Ok, Kor RX, Beyaz Kurt, Mavi Yıldız, Gece Mavisi).
- Drift ile kayma ayrı: küçük kaymalar drift duruşuna geçmez. Drift yarışında ayrı bir drift ayarı yoktur: aracın kendi önayarıyla, otoparktaki driftle aynı çalışır.
- Gerçekçi seviyede drift zor ama mümkün olmalı. Arcade'de bile denge kurmak gerekir; abartan ya da direksiyonu bırakan spin atar.
- Kalkış patinajı hızı az düşürür. Tuşla gazda patinaj araca özgü sabit ve düşüktür; analog pedalda gazın ne kadar açıldığına bağlıdır.
- Analog pedal: ortası sıfır, yukarı gaz, aşağı fren.
- Çamur: içindeyken etki %100; dışarıda hızla orantılı temizlenir; araç dururken temizlenmez.
- Her yarıştan önce garajda araç seçilir; türe uygun araç "Önerilen" olarak gelir.
- Ana menü: üstte logo ve profil, ekranın altında soldan sağa eğik yarış panelleri (Yarış, Serbest sürüş, Garaj, Mağaza, Profil, Ayarlar); her panelde ikon ve başlık (Yarış: dama bayrak, Serbest sürüş: harita, Garaj: yandan araba, Mağaza: dükkân (Tabler building-store; satın alınabilir araç varsa köşede küçük nokta), Profil: kask, Ayarlar: dişli); Yarış öne çıkan turuncu ana düğme; dikey liste ya da aşağı kaydırma yok. Arkada her yarış türünden sinematik çekimler rastgele akar, art arda aynı çekim gelmez. Alt ekranlar (yarış türü, pistler) de yatay dizilir.
- Yarış türü ekranı kapak akışıdır: ortada seçili tür büyük, yanlarda eğik kartlar; kaydırma, ok ya da yan karta dokunma. Her türün ikonu ve rengi var (Asfalt: pist, kırmızı; Rallycross: rampadan uçan araç, kahve; Ralli: dağ, yeşil; Drift: dönüş, mor; Drag: start ışıkları, sarı). Kartlar parmağı izler, fırlatma hızına göre ilerleyip ortaya yumuşakça oturur. "Toprak" adı kullanılmaz: rallycross pistleri asfalt ve toprak karışıktır; pist listesi ve yarış ayrıntısı o türün rengini taşır. Tür eklenince `menu.ts → TYPES`'a ikon ve renkle eklenir.
- Arayüzde emoji kullanılmaz; her şey oyunla uyumlu çizgi ikonlarla (Tabler Icons ya da aynı stilde kendi çizimimiz: stroke, yuvarlak uç, 24 grid; `src/arayuz/ikonlar.ts`) gösterilir.
- Görseller internetten alınmaz; oyunun kendi sahnelerinden çekilir. İstisna: arayüz ikonları açık lisanslı setlerden alınabilir (şimdilik Tabler Icons, MIT; `src/arayuz/ikonlar.ts`), lisans metni `public/lisanslar.txt`'e eklenir.
- Menü arka planı oyunun kendi sahnelerinden çekilmiş küçük görsellerdir (WebP, toplam ~80 KB; video yok, kullanıcı isteği: performans ve boyut): rastgele sırayla, art arda aynı görsel gelmeden, yavaş kayma ve çapraz geçişle akar; kararma yok. Gece yağmurda kokpit çekimi kullanılmaz.
- Sesler oyunun içinde üretilir (sentez). Başka oyunların ya da kaynakların ses dosyaları oyuna aktarılmaz (lisanslı da olsa); gerçek motor kayıtları yalnız incelenir, ölçülen özelliklerine göre kendi sesimiz üretilir.
- Menüde yarış oyunlarına uygun rock tarzı müzik çalar; sürüşte müzik yok.
- Altyapı: TypeScript + Vite + Three.js (npm), derleme ve yayın GitHub Actions'ta. Kod okunur biçimde yazılır (Prettier), eski sıkıştırılmış tek satır stili bırakıldı.
- Çevrimiçi hesap ve bulut kaydı Firebase'de (Auth: sessiz anonim + Google/e-posta bağlama; Firestore `users/{uid}`); ileride Unity sürümü de aynı hesapları kullanır. Yapılandırma `src/bulut/ayar.ts`; boşken oyun çevrimdışı, değişmeden çalışır. Adımlar `docs/FIREBASE.md`.
- Riskli değişiklikler önce deneme sürümünde (`/dev/`) denenir.
- Konu sohbeti işi bitirip testler geçince denemeye (`gelistirme`) kendiliğinden gönderir, işin boyutu ne olursa olsun; kullanıcı ayrıca "push" demez (maliyet: tek istek yeter). Kullanıcı "bekle" derse iş dalda kalır, "push" deyince gider. Her gönderim yama numarasını artırır. Canlıya (`master`) yalnız regression sohbeti, regresyon bittikten ve kullanıcı rapora bakıp onay verdikten sonra gönderir. Tek istisna kullanıcının açıkça istediği acil düzeltme.
- `kurallar` sohbeti yalnız süreç ve kural değişikliklerini (CLAUDE.md, `docs/`, `.claude/`, `tests/` altyapısı, `.github/workflows/`) gönderir; oyun kodu (`src/`, `public/`, `index.html`) bu yetkinin dışındadır. Kurallar yalnız denemeye (`gelistirme`) gider: konu dalları oradan alır, canlıya bir sonraki sürümle kendiliğinden çıkar; sürüm numarası değişmez ve tek başına regresyon başlatmaz (regresyon için "yeni iş" yalnız oyun dosyalarındaki değişikliktir: `src/`, `public/`, `index.html`, derleme ayarları). Bu dosya da öyle: oturum `master`'dan açılsa da dala geçince daldaki güncel hâli okunur. Tek istisna `master`'dan çalışan dosyalar: GitHub iş akışları (`.github/workflows/`; yayın `master`'daki iş akışıyla yapılır) ve oturum başı betiği (`.claude/oturum-basi.sh`, `.claude/settings.json`); bunlara dokunan değişiklik `master`'a da hemen gönderilir.
- Sürümler: 0.1.0 bu sürecin kurulduğu kilometre taşı. Denemeye her gönderim 0.1.1, 0.1.2, …; regresyon + onaylı canlı çıkıştan sonra 0.2.0 başlar.
- Test kapsamı: denemeye göndermeden önce yalnız kendi işinin kapsamındaki hata yakalayıcı testler (tip, ESLint, biçim, `alan`); hata bulan dal sahibi düzeltip yeniden test eder (kullanıcı ayrıca elle dener). Duman testi yalnız regresyonda: bütün dalların senaryoları 0 hata olunca koşar, sonra kullanıcıdan canlıya geçiş onayı istenir; canlıya çıkış yayınından sonra canlı adreste de koşar. Denemede (GitHub ve konu sohbetlerinde) duman yok.
- Regresyon her gece 00:00'da (İstanbul saati) "regression" sohbetinde denetlenir: denemede canlıda olmayan oyun işi varsa "<sürüm> canlı geçişi öncesi testlerine hazır" bildirimi gelir; kullanıcı "başlat" derse hemen, demezse 04:00'te başlar, "bu gece başlama" derse beklenir. Bekletilen dallar regresyonu durdurmaz. En fazla ~1 saat, önem sırasıyla. Hatalar sahibi dalın adıyla o sohbette çözülür, 0 hata kalana kadar denemede tekrar koşulur. Onay istemeden önce dal dal rapor: her dalda neler oldu, hangi hatalar çıktı, nasıl çözüldü, düzeltme sonrası test sonucu. Regresyon süresince sürüm dondurulur.
- Bildirimler ve merkez: telefon bildirimi (`PushNotification`) yalnız iki sohbetten gelir: yönetmen ("<dal>: <sürüm> denemede, kontrol edebilirsin" ya da "iş hazır, senin push'unu bekliyor", konu sohbeti ona haber verince) ve regression (testlere hazır, canlıya hazır, kullanıcı kararı gereken her durum). Konu sohbetleri bildirim göndermez: Merkez'i tazeler ve yönetmene `send_message` (`@parent`) ile haber verir; yönetmen açmadıysa yalnız kullanıcıya kısa yazar. Hepsi Last Turn Merkezi'nde de görünür.
- Her sohbet kendi konu dalında çalışır; deneme sürümü (`gelistirme`) konu dallarının birleştiği tek ortak deneme alanıdır (telefonda tek deneme uygulaması).
- Fizik motoru tek: yeni motor (katı gövde, 4 teker). Ayarlarda motor seçimi yok.
- Araç uyumu: her araç iyi sürülürse her yarışı bitirebilir. Kendi türü olmayan yarışta aracın normal performansı düşürülmez; yalnız türe uygun araç daha başarılıdır (ör. asfalt yarışını Kızıl Ok, Beyaz Kurt'tan daha kısa sürede bitirir). Fark yarış sonu süresinde görünür; ağır "bitiremez" testleri yazılmaz.
- Rallide ve toprakta tam gaz + tam direksiyon yola tutunmaz; virajdan önce fren gerekir. Dengeli ve gerçekçide abartan spin atar.
- Drift pistinde turun ~%80'i tek komboda geçilebilmeli; zorluk adil olmalı (gerçekçide ölçülü açı başarır, abartan yakar).
- Serbest sürüşe girmeden önce garajda araç seçilir. Önayar yalnız serbest sürüşte (duraklatma menüsünde) seçilir; yarışta aracın kendi önayarı kullanılır.
- Kokpit iç mekânı sıcak kahve/taba tonlarında: asfalttan kolayca ayrılmalı.
- Araçlar seviye + para ile açılır; yarışlar XP ve para verir (seviye gelince araç satın alınabilir olur, parayla alınır; ileride mağaza ve modifiye).
- HUD: aracı ve önündeki yolu hiçbir gösterge kapatmaz; hız ile devir göstergesi aynı anda olmaz (devir çubuğu yok). Drift yarışında kombo yalnız üst ortada, sol üstte toplam puan. Drift açısı gösterilmez (ileride yerine anlık XP). Göstergeler kenarlara yakın. HUD ayarı ayrı bir düzenleyicide, yarış başlatmadan önizlemeyle yapılır.
