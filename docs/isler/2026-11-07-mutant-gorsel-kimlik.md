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

- Durum:
- Üretilen dosyalar:
- Doğrulama:
- Açık sorular:
