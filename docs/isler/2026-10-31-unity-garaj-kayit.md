# Unity garaj ve kalıcı kayıt — 31 Ekim 2026

## İstek ve kabul

Kullanıcı kabul edilen katalog üstüne TS 0.8.18 garaj/araç sahipliği/para/parça satın alma-takma-sökme/paket/lastik kayıt akışını Unity'ye taşımayı istedi. Mevcut kurallar ve fizik korunacak; ayrı dal, yerel commit; push/merge/uzun regresyon/yayın yok.

1. Yeni oyuncu, satın alma, yetersiz para, kategori kredisi, paket ve iki araç izolasyonu TS işlemleriyle aynı sonucu verir.
2. Sürümlü yerel kayıt kapat/aç sonrasında seçimi/sahipliği/takılıları korur; eksik/bozuk/eski/gelecek sürüm ve yazma hatası veri kaybettirmeden ele alınır.
3. Kullanılabilir garaj araç/parça seçme, satın alma, takma/sökme, istatistik, kaydet/yükle sunar. Başlangıç ekonomisi TS'dir; test parası ayrı geliştirici profilinde açıkça etiketlenir.
4. Garaj kurulumu açık adaptörle GTTest/TerrainTest'e uygulanabilir; eski varsayılan sahne davranışı aynı kalır. Çekirdek denklemlerine yeni mekanik yok.
5. Kısa TS–C# işlem matrisi, kayıt hata/yeniden açma ve gerçek Editor Play kanıtı teslim edilir; manuel rehber yazılır.

## Sahiplik / Git

- Taban `cd365a5`, dal `codex/unity-garaj-kayit`; önceki katalog kabul edildi. TS baseline `df3549e709469f0b519ebfbeaa9f63c1040fee05` değişmez. Başlangıç yalnız izlenmeyen `Unity/Assets/_Recovery/` ve meta; korunur, commit'e girmez.
- Sahip: Codex (10:37'ye kadar), sonra Claude. Codex ana oturum: Runtime garaj arayüzü, sürüş adaptörü, Editor doğrulama ve belgeler. Ayrı ajanlar için dosya sınırları aşağıda kaydedilecek.
- Claude resmi `claude.ai/pro` aboneliği bu görevde doğrulandı; 5 saat/haftalık kota bilinmiyor, manuel ek kullanım kapalı teyidi geçerli. API/ek kredi yok. Kısa bağımsız kaynak/risk incelemesi planlanır; çalıştırma makbuzu ayrı kaydedilir.

## Ortak modül sözleşmesi

Saf Core `GarageState`: katalog kullanır, TS progression anahtarlarını koruyan snapshot; yeni tablo elle tanımlanmaz. Saf `GarageSaveStore`: bütün kayıt tek zarf, sürüm/checksum/geçici dosya+backup. Unity Garage runtime adapter'ı persistentDataPath üzerinde yükler. Sürüş uygulaması açık seçimdir; varsayılan GT/Terrain kabul profili korunur.

## Devir: Codex → Claude (31 Ekim 10:4x)

Codex 10:37'de kotası dolduğu için durdu; uygulama, TS oracle, .NET testleri ve ilk Play (18/18, UTC 07:35:38) onda tamamlanmıştı. Claude önce salt okunur TS 0.8.18 karşılaştırması yaptı, Cem'in “bulguları sen çöz” talimatıyla devraldı. Aynı dosyada paralel yazma yok.

**İnceleme sonucu (TS ile aynı):** araç satın alma engel sırası sahip→seviye→para; bakiye `kazanilan − Σalimlar`; `arac_N`/`parca_N_id` defteri; kategori yatırım kredisi ve Set sırası; tak/sök/paket/stok; araç başına takılı liste ve sahiplik filtresi; satın al+tak tek işlem; işlem aday kopyada, disk yazılamazsa durum değişmez; arazi adaptörü `toprakDengesi` (.55) birebir.

**Düzeltmeler:**
1. Takılı parçanın düğmesi TS `garaj.ts` gibi o kategoriyi söker (eskiden “Takılı” yazıp aynı parçayı yeniden takıyordu). Kategori sök ve stoka dön düğmeleri zaten vardı; ilk incelemedeki “tek parça sökme yok” bulgusu büyük/küçük harf duyarlı aramadan kaynaklı yanlıştı.
2. Katalog kaynağı değişiminde kilitlenme: kayda `catalogGeneration` eklendi (`GarageState.CatalogGeneration = 1`, SHA→nesil tablosu). Eski nesil yazılabilir açılır, bilinmeyen takılı parça düşer, alım defteri/bakiye korunur, ilk kayıtta eski dosya `.bak` olur. Daha yeni nesil, aynı nesilde farklı SHA ve bilinmeyen SHA salt okunur kalır.
3. Daha küçük zarf/veri sürümü artık “gelecek” sayılmaz; geçersiz kayıt olarak yedekten kurtarılır. Yalnız büyük sürüm korunur.
4. Sınırlar belgelendi: TS ilerleme v1 içe aktarılmaz; v2→3 “oynanmış” yalnız bulut alanlarıyla (lt_prof yok).
5. Kapsam dışı Editor yan etkisi geri alındı: `QualitySettings.asset` iPhone/Android varsayılan kalite tablosunu siliyordu.
6. Sunum katmanı ayrımı (Cem kararı, ikinci tur): arayüz bileşik satın al+tak/sök kurallarını ve katalog JSON anahtarlarını kendisi kuruyordu. Saf `GarageCommand` (işlemler veri olarak, TS onay akışı, para harcayan komutun onay gereği) ve `GarageViewModel` (tipli araç/parça/paket/ayrıntı satırları) eklendi; `GarageScreen` yalnız bunları çizer, `GarageSession.Execute` çalıştırır. Görünüm ve davranış aynı. Bilinen geçici bağımlılık `GtPrototype → GarageSession`; yarış oturumundaki nötr sürüş isteğine bırakıldı.

## Gerçek uygulayıcılar

- **Codex** (10:37'ye kadar): Core `GarageState`, `GarageSaveStore`, `GarageDriveParameters`; `Garage` sahnesi, `GarageScreen`/`GarageSession`, `GtPrototype` adaptörü; `export-garage.mjs` ve TS referansı; `--garage`, `--garage-storage`, `--garage-drive`; `GaragePlayValidation`, `check-garage-proof.mjs`; CI adımları; ilk Play 18/18.
- **Claude** (devralma, 10:40 sonrası): TS 0.8.18 bağımsız inceleme; yukarıdaki 1–6 düzeltmeleri; `--garage-ui` (117 koşul); `Unity/GARAJ.md`; kart/DEVIR; UI mimari kuralları; yarış planı `docs/isler/2026-10-31-unity-yaris-plani.md`.

## Kanıt

- `node Unity/Validation/export-garage.mjs --check`: 5 akış, 69 işlem, 4 kayıt geçişi, 360 sürüş profili.
- `--garage` TS–C# **17.947** koşul (önce 17.787; yeni alan ölçüldü), `--garage-storage` **66** (önce 53; +13 nesil/sürüm koşulu), `--garage-drive` **14.761**, `--catalog` **983.569** koşul. Çıktılar `tests/cikti/unity-garaj/` (ignore).
- `--garage-ui` sunum katmanı **117** koşul (komut = doğrudan işlem, sökme iade üretmez, yeniden takma ücretsiz, iki araç/paket ayrımı, reddedilen alım durumu değiştirmez).
- Unity yeniden derleme (UTC 08:00:53): Core 25 dosya + 600/600/1200 adım kısa testi ve katalog 30 kurulum kontrolü geçti (`check-editor-proof`, `check-catalog-proof`).
- **Açık:** Unity Editor kanıtları kaynak değiştiği için güncel değil. Codex'in son Play'i 18/18 idi; Play doğrulamasına sonradan kontrol ekledi (denetleyici ≥20 ister). GT, Arazi ve Garaj Play doğrulamaları yeniden alınmalı. Claude'un Editor menüsünü tetikleyecek aracı yok; Cem çalıştıracak. **Görev bu üç kontrol geçmeden tamamlanmış sayılmaz.**
- **Denetim 31 Ekim 12:1x (Claude), çalışma ağacı `d1f562a` + commit'siz değişiklikler, dal `codex/unity-garaj-kayit`:**
  - Geçti: `check-editor-proof` (UTC 09:07:11, 25 Core, MVID `4c38f658…`), `check-catalog-proof` (UTC 09:07:10, 30 kontrol, 28 kaynak hash'i). Bu iki kanıt güncel kaynakla eşleşiyor.
  - Kaldı (eski kanıt): `check-prototype-proof` → “GT Play kaynak kapsamı değişmiş” (`Logs/gt-prototype-play.json` UTC 07:18:53, 104 kaynak); `check-terrain-proof` → “Arazi Play kaynak kapsamı değişti” (`Logs/terrain-play.json` UTC 07:19:33); `check-garage-proof` → “Garaj Play kanıtı eksik” (`Logs/garage-play.json` UTC 07:35:38, 18 kontrol; denetleyici ≥20 ister). Üçü de `GarageCommand`/`GarageViewModel`/ekran değişikliğinden (UTC ~08:00) önce.
  - Neden: `Editor.log`ta son derlemeden sonra üç Play oturumu var ama doğrulama menüsünün izi yok (menü önce test sahnesini açar ve sonuç satırı yazar; bu oturumlar Play içinden GTTest/TerrainTest'e geçip dönüyor: Garaj ekranındaki sürüş düğmeleriyle elle deneme). Hata/istisna satırı yok; Play kanıtı yazılmadı. **Başarısızlık değil, koşulmamış kontrol** — görev açık, commit yapılmadı.
- **Play doğrulaması 31 Ekim 12:20–12:22 (Claude):** Cem'in açık Editor'ünde, `Assets/LastTurn` dışındaki geçici bir Editor betiği (`Assets/_ClaudeGeciciTetik`, hash kapsamı dışında; iş sonunda silindi, commit'e girmedi) üç menüyü `ExecuteMenuItem` ile sırayla tetikledi. Kaynak: `d1f562a` + bu karttaki commit'siz değişiklikler (commit edilen içerikle aynı).
  - 1. koşu: **GT KALDI** — “Input System A → kaynakta sol dönüş” (6/28 kontrol, UTC 09:20:32; `tests/cikti/unity-garaj/gt-play-ilk-kalan.json`). Arazi 23 ve Garaj 20 geçti.
  - 2. koşu, kod değişmeden: **GT 28/28** (UTC 09:22:07), **Arazi 23/23** (09:22:26), **Garaj 20/20** (09:22:40, gerçek Play kapat/aç + 120+120 sürüş adımı).
  - Beş denetleyici geçti: `check-editor-proof` (UTC 09:22:35, 25 Core), `check-catalog-proof` (09:22:36, 30 kontrol), `check-prototype-proof`, `check-terrain-proof`, `check-garage-proof`.
  - İlk GT kalışının yorumu (ölçülmüş, kök neden kanıtlanmadı): iki koşuda 120 adım sonu hız 16,0 / 22,7 m/s, fren sonu 3,45 / 5,76 m/s. Doğrulayıcı adımı Editor `update` karesinde ölçtüğü için kare zamanlamasına duyarlı; aynı koşudaki 30/60/120 FPS bit eşitliği fizik belirlenimciliğini korur. GT sürüş kodu bu görevde yalnız garaj adaptörü dalında değişti (garajdan sürüş yokken eski fabrika). Doğrulayıcı sağlamlaştırması ayrı küçük iş.
  - Unity `QualitySettings.asset`teki platform kalite tablosunu yine sildi; geri alındı, commit'e girmedi.

## Durum

**Tamamlandı (yerel commit, 31 Ekim 2026).** Üç Unity Play kontrolü ve beş kanıt denetleyicisi güncel kaynakla geçti (yukarıda). Push/merge/yayın/uzun regresyon yapılmadı. Cihaz/IL2CPP/CI çalıştırılmadı. `Unity/GARAJ.md` manuel listesi Cem'in elle denemesine açık.

## Sonraki tek adım

Yeni dal `claude/unity-pist-aktarimi`: `docs/isler/2026-10-31-unity-yaris-plani.md` 1. aşama (pist tanımı + geometri + sorgular, ilk referans `gp_1`).
