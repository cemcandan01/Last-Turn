# Mutant görsel kimliği ve ikon seti — F taslağı 2. tur (7 Kasım 2026)

- **Sahip:** Codex (görsel üretim + HTML). Görevi açan ve denetleyen: Claude. Dal `codex/unity-p7-garaj`, başlangıç `930f8f8`. Push/merge/yayın yok.
- **Tür:** tasarım taslağı + görsel varlık. Unity kodu, oyun verisi, kural ve denge **değişmez**.

## Cem'in kararı (7 Kasım)

- Seçimler: **1B 2A 3B 4A 5A 6A 7A 8A** (`docs/tasarim/mutant-f.html`). Yerleşim bu seçeneklerden alınır; diğer seçenekler bırakılır.
- "Çok sade oldu, göze hitap etmiyor." Mutant özel güçlü, gerçekte olmayan şeyler barındıran bir mod; menüsü **daha havalı, uçarı** olmalı ve **normal yarışlardan farklı olduğu hemen belli olmalı**.
- **Boss'ların, upgrade'lerin (pasif/ek/skill) ve modifiyelerin (parçalar) logosu/ikonu olmalı**; yalnız yazıyla bilgi verilmemeli, görselleştirilmeli.
- "Bu işlerde iyi olan AI'lardan destek alalım": Codex'in yerleşik görsel üretimi (ChatGPT planı, ek kredi/paket yok) kullanılır.

## İstenen

1. **Görsel yön (Mutant kimliği):** F ailesinden kopmadan (Barlow, eğik tuşlar, sağ altta tuş ipuçları, aynı yerleşim mantığı) ayrı bir kimlik: kırmızı/mor enerji tonu, parlama, enerji çatlakları/kıvılcım, eğik kırık şerit/kristal kenarlar, nadirlik çerçeveli "kart" görünümü, boss için tehdit havası. Yarış F'nin turuncu sade cam dilinden ilk bakışta ayrılmalı. Kısa bir renk/doku/çerçeve kılavuzu (paleti, nadirlik renkleri, çerçeve türleri).
2. **İkon seti** (tek tutarlı stil, şeffaf arka plan, en az 256 px PNG; mümkünse SVG kaynak):
   - 5 boss amblemi (daha ayrıntılı, portre/arma niteliğinde): Toprak Kurdu (rl), Drift Kraliçesi (dp), Drag Canavarı (dg), Gece Şahini (gp), Çamur Baronu (rx).
   - 5 skill: grappling-hook, flying-dutchman, risk-taker, slipstream-engine, volt-kanat.
   - 31 pasif (`passives` id'leri), 6 ek (`addons`), 2 skill eki (`skillAddons`).
   - 12 parça kategorisi (`parts[].kat`: motor, turbo, sanziman, lastik, suspansiyon, diferansiyel, fren, agirlik, aero, cekis, direksiyon, koruma); parça başına değil kategori başına ikon, ayrımı nadirlik/çerçeve rengi verir.
   - Sandık kaynakları (3), lanetler (`curses`: sure, govde, para), risk seviyeleri (3), para / XP / gövde / enerji / nitro küçük HUD ikonları.
   - Dosya adı = katalog id'si (ör. `ikon/pasif/guc.png`, `ikon/parca/turbo.png`, `boss/toprak-kurdu.png`).
3. **Arka planlar:** Mutant menü/olay ekranları için 1–3 adet 16:9 atmosfer görseli (araç/marka logosu yok, gerçek marka benzeri yok).
4. **Taslak sayfası** `docs/tasarim/mutant-f2.html`: yalnız seçilen sekiz yerleşim (1B 2A 3B 4A 5A 6A 7A 8A), yeni kimlik ve ikonlarla; mevcut örnek durum düğmeleri korunur. Sonunda ikon galerisi (her ikon + id + Türkçe ad).
5. **Unity uygulanabilirliği:** UI Toolkit'te CSS filtre, backdrop blur, box-shadow, blend mode yok. Parlama, çerçeve ve dokular **görsele gömülü** olmalı (9-dilim çerçeve PNG'leri, parlama sprite'ları); HTML'de bu etkiler CSS ile taklit edilmez, aynı PNG'lerle gösterilir. Animasyon yalnız konum/ölçek/saydamlık/renk geçişi.

## Kurallar

- Metinler Türkçe; emoji ve gerçek marka logosu/benzeri yok. Katalogdaki İngilizce skill adları olduğu gibi kalır.
- Oyunda olmayan özellik/düğme eklenmez; gerekirse "Öneri" kutusu.
- Yalnız `docs/tasarim/mutant-f2.html`, `docs/tasarim/mutant/**` (görseller) ve bu kartın Sonuç bölümü değişir. Unity/TypeScript/oyun verisi/`_Recovery` dokunulmaz. Commit atılamazsa Claude atar.

## Kabul ölçütleri

1. `mutant-f2.html` tek başına açılır; sekiz seçili ekran 16:9, 1440 ve 800 px genişlikte taşma yok; tuş ipuçları güvenli alanda.
2. Yan yana bakıldığında Mutant ekranları yarış F ekranlarından (`ekranlar-f.html`) ilk bakışta ayrılır; boss/skill/pasif/ek/parça bilgisi olan her satırda ikon var.
3. İkon galerisi katalogdaki bütün öğeleri kapsar (5+5+31+6+2+12+3+3+3 ve HUD ikonları); eksik id yok, aynı stil, şeffaf arka plan.
4. Çerçeve/parlama/doku görselleri ayrı PNG olarak durur ve sayfa bunları kullanır (Unity'ye taşınabilir).
5. Sonuç bölümünde üretilen dosya listesi, görsel üretim aracı, kontrol sonucu ve açık sorular yazılı.

## Sonuç (Codex dolduracak)

- **Durum:** F2 tasarım teslimi hazır. Yalnız **1B 2A 3B 4A 5A 6A 7A 8A** gösteriliyor; ilk taslağın örnek durum düğmeleri ve mevcut işlem metinleri korundu. Yeni oyun komutu/kuralı eklenmedi. Atölye B'de Geri düğmesi, tuş ipuçlarıyla aynı banda girmemesi için sol servis sütununa alındı. Sahip tek Codex; alt ajan/Claude/API/ek kredi kullanılmadı. Oturum modeli ve tüketim/kota telemetrisi doğrulanamıyor. Dal `codex/unity-p7-garaj`, devralınan gerçek HEAD **`c54e784`** (kartın açılış commit'i; taslak tabanı `930f8f8`).
- **Üretilen dosyalar:** [mutant-f2.html](../tasarim/mutant-f2.html); tüm varlıklar `docs/tasarim/mutant/` altında. Tam dosya listesi, boyutlar ve SHA256: [varlik-manifestosu.json](../tasarim/mutant/varlik-manifestosu.json). Üretim teslimi **80 PNG + 70 SVG**:
  - `boss/{toprak-kurdu,drift-kralicesi,drag-canavari,gece-sahini,camur-baronu}.png`: beş ayrı, alfalı boss arması.
  - `arka/enerji-yarigi.png`: 1600×900 (16:9), araç/marka içermeyen atmosfer.
  - `doku/cerceve-{enerji,nadir,efsane}.png`: üç ayrı 1024×1024 alfalı 9-dilim çerçeve; dört kenar dilimi 192 px. `doku/parlama-yarik.png`: alfalı enerji/kıvılcım sprite'ı. Sayfa aynı PNG'leri kullanır; çerçeve ışıkları görsele gömülüdür.
  - `ikon/{skill,pasif,ek,skill-eki,parca,sandik,lanet,risk,hud}/`: her küçük ikonun **256×256 alfa PNG'si ve SVG kaynağı**. 5 skill, 31 pasif, 6 ek, 2 skill eki, 12 parça kategorisi, 3 sandık kaynağı, 3 lanet, 3 risk, 5 HUD. Kimlikler ve Türkçe adlar: [ikon-envanteri.json](../tasarim/mutant/ikon-envanteri.json); sayfa sonundaki galeri **75/75** öğeyi gösterir. Katalogda risk id'si bulunmadığından dosya adları `guvenli/riskli/olumcul`; HUD dosyaları `para/xp/govde/enerji/nitro`.
  - Görsel üretim: yerleşik **`image_gen.imagegen`**, 11 üretim/düzenleme çağrısı. Beş boss, atmosfer, çerçeve ve parlama bu araçla üretildi; puslu ilk çerçeve elendi, temiz şeffaf merkez yeniden üretildi, kızıl/altın varyantlar aynı araçla düzenlendi. Küçük ikonlar ortak SVG çizim sistemiyle hazırlandı, Edge Canvas ile PNG'ye çevrildi. Üretim istemleri/yöntemi: [uretim.json](../tasarim/mutant/uretim.json). Boyutlandırma dışında görsel içerik için farklı üretim aracı kullanılmadı.
- **Doğrulama:** Playwright + yerel Microsoft Edge **çevrimdışı `file://`**, 1440 ve 800 px görünüm genişliğinde **65/65 kontrol geçti**. Kapsam: sekiz seçili varyant; 16:9 oranı; sayfa/ekran sınırları ve kaydırma taşması; dokuz örnek durum düğmesinin iki genişlikte çalışması; boss süresi dolunca Geri'nin kalkması; kart/skill satırlarında ikon; katalog id kapsamı; 75 PNG'nin en az 256 px olması ve gerçek şeffaf alfa taşıması; 9-dilimlerin 1024 px ve orta/dış alanlarının şeffaf olması; CSS filtre/backdrop/gölge/blend yasağı. F2 tarayıcı çalışma hatası/başarısız kaynak isteği yok. `prettier --check docs/tasarim/mutant-f2.html` ve `git diff --check` geçti. Tasarım işi olduğu için Unity/oyun regresyonu koşturulmadı.
  - Makine kanıtı: [kabul-sonucu.json](../tasarim/mutant/kanit/kabul-sonucu.json); son HTML SHA256 ve varlık hash'leri kayıtlı. İlk tur atölye işlem alanı/ipuçları kesişimini buldu; ilk boşluk azaltması 800 px'de yetmedi; düğmenin sol servis sütununa taşınmasıyla iki genişlikte çözüldü. Başarısız turlar `kanit/kabul-ilk-tur.json` ve `kanit/kabul-ikinci-tur.json` içinde korundu.
  - Ajan görüntüleri **kendisi inceledi**: [1440 px sekiz ekran](../tasarim/mutant/kanit/sekiz-ekran-1440.png), [800 px sekiz ekran](../tasarim/mutant/kanit/sekiz-ekran-800.png), [iki genişlikte örnek durumlar](../tasarim/mutant/kanit/ornek-durumlar.png), [ikon galerisi](../tasarim/mutant/kanit/ikon-galerisi.png), [yarış F karşılaştırması](../tasarim/mutant/kanit/yaris-f-referans.png). Uzun skill açıklamaları, dolu yuva, lanet bedeli, zorunlu boss ve başarısız sonuç incelendi; kesilme/çakışma görülmedi. Yarış F'nin turuncu ve sakin yüzeylerinden mor/kızıl kristal atmosferi ve boss portresiyle belirgin ayrım var. İnsan görsel beğeni onayı ayrıca beklenir.
- **Açık sorular / sınırlar:** Barlow/Barlow Condensed ailesi CSS'te korunuyor ancak makinede kurulu değil; font sunucusuna erişim başarısız. Dış ağ gerektirmeyen teslim, **Arial Narrow / Segoe UI yedeğiyle** doğrulandı; özgün Barlow ile son görsel kontrol açık. Nadirlikte standart ametist / nadir kızıl / efsane altın eşlemesi sayfada **Öneri** olarak işaretli; yeni oyun nadirliği tanımlamaz. UI Toolkit aktarımı ve gerçek Unity font/9-dilim testi yapılmadı; bu kart HTML + görsel teslimidir.
- **Korunan kapsam ve devir:** Unity, TypeScript, katalog/oyun verisi, önceki taslaklar ve mevcut izlenmeyen `_Recovery` dosyalarına dokunulmadı. Yalnız izinli F2, `mutant/**` varlık/üretim-kontrol kayıtları ve bu Sonuç bölümü değiştirildi; `docs/DEVIR.md` kapsam dışında olduğundan değiştirilmedi. `fetch` worktree `FETCH_HEAD` yazma izninde, yalnız izinli yolları içeren `git add` ise **`index.lock: Permission denied`** ile durdu; commit oluşturulamadı. Dosyalar yerelde hazır, **push/merge/yayın yok**. Tek sonraki adım: Cem'in F2 görsel turu ve uygun görürse Claude'un izinli ortamdan yerel commit'i oluşturması.
- **Eşzamanlı dış değişiklik:** Kapanış durumunda `docs/isler/2026-11-07-mutant-gorsel-alternatifler.md` adlı yeni, izlenmeyen kart görüldü. Bu oturum oluşturmadı, okumadı veya değiştirmedi; korunarak bırakıldı.

### Gönderim hazırlığı — 7 Kasım 2026

Kullanıcı 317 yerel değişikliği kontrol edip gerekenleri gönderme izni verdi. Bu kartın tamamlanmış F2 teslimi, B/C alternatifleriyle birlikte taslak olarak kaydediliyor; görsel yön seçimi veya Unity uygulaması yapılmıyor. F2'nin65 başarılı kontrol kaydı, güncel HTML SHA-256 ve150 üretim/33 kanıt varlığının hash'leri doğrulandı. JSON belgelerine yalnız depo biçimi uygulandı; PNG/SVG/HTML varlık içeriği değiştirilmedi. Önceki commit izin engeli bu oturumun yetkili Git işlemiyle gideriliyor; `_Recovery`nin5 dosyası teslim dışında. Uzak teslim sonucu DEVIR'de ayrıca izlenir.
