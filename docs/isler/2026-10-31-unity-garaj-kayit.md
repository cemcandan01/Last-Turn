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

## Kanıt

- `node Unity/Validation/export-garage.mjs --check`: 5 akış, 69 işlem, 4 kayıt geçişi, 360 sürüş profili.
- `--garage` TS–C# **17.947** koşul (önce 17.787; yeni alan ölçüldü), `--garage-storage` **66** (önce 53; +13 nesil/sürüm koşulu), `--garage-drive` **14.761**, `--catalog` **983.569** koşul. Çıktılar `tests/cikti/unity-garaj/` (ignore).
- **Açık:** Unity Editor kanıtları kaynak değiştiği için güncel değil. Codex'in son Play'i 18/18 idi; Play doğrulamasına sonradan kontrol ekledi (denetleyici ≥20 ister). GT, Arazi ve Garaj Play doğrulamaları ile Core/katalog derleme kanıtı yeniden alınmalı. Claude'un Editor menüsünü tetikleyecek aracı yok.

## Sonraki tek adım

Unity'de pencereye odaklanıp derlemeyi bekle; sırasıyla **Last Turn → GT Kısa Play Doğrulaması**, **Arazi Kısa Play Doğrulaması**, **Garaj Kısa Play Doğrulaması**; sonra `check-editor/catalog/prototype/terrain/garage-proof.mjs`. Sonra `Unity/GARAJ.md` manuel listesi.
