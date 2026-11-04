# Fiziksel dünya ve kaynak rakip — P2

Geçici geliştirici görünümü; nihai dünya tasarımı değildir. Kaynak TS 0.8.18, `df3549e709469f0b519ebfbeaa9f63c1040fee05`.

## Kullanım

1. Garage sahnesini açıp Play'e gir. Garajda aracını ve yardım seviyeni seç.
2. **Test / Geliştirici** bölümünden **Çorak Topraklar**, **Boş Otopark** veya **Kule Şehri** aç. Dünya panelindeki kaynak konum düğmeleriyle dolaş. W/S gaz-fren, A/D direksiyon, Boşluk el freni, R sıfırlama. Esc ile duraklatıp garaja dön.
3. Kaynak solid/kutu hacimlerine sür: konum ve hız tepki verir, dünya panelindeki darbe sayacı artar. Kırmızı sınır çizgisinde araç alan içinde tutulur. Çalı yavaşlatır, su ıslaklık ve hız kaybı üretir. Koniler TS'de olduğu gibi görseldir.
4. Aynı bölümde **gp_1 / rx_1 / rl_1 / dg_1 • fiziksel YZ yarışı (ödülsüz)** düğmeleri asfalt, rallikros, ralli ve Drag açar. Mavi rakip kendi motor/teker/gövde fiziği ve TS pilotuyla sürer. HUD sıralama/farkı, sonuç önce bitireni gösterir. Bu denemeler kariyer parasını, XP'yi, rekoru ve sayacı değiştirmez. Kaynak YZ Drag'de otomatik viteslidir; normal kariyer Drag'inin kabul edilmiş manuel vitesi korunur.
5. Normal **Yarışlar** bölümünden kariyer yarışı aç: TS'deki gibi rakipsizdir, mevcut kilit/ödül/rekor/kayıt hizmetleri çalışır.

## Kısa doğrulama

- `node Unity/Validation/export-world.mjs --check`, `export-collisions.mjs --check`, `export-opponents.mjs --check`: sabit TS'den yeniden üretip katalog/iz farkını reddeder. TypeScript dosyalarını değiştirmez.
- `dotnet run --project Unity/Validation -c Release -- --world`: 43 bölge, 19.578 nesne, 2.580 zemin örneği, 516 gerçek TS ızgara sorgusu ve 12×35 çarpışma adımı.
- `--opponents`: 120 çizgi/hız planı, 10.800 algı ve 4.800 gerçek fizik adımı. `--opponent-drive`: dört temsilci pistte gerçek çevrede bitiş.
- Unity **Last Turn → P2 Dünya ve Rakip Kısa Play Doğrulaması**: ayrı geçici profilde dört oyuncu/rakip yarışı, üç dünya/ışınlanma/gerçek engel/sınır ve normal kariyer ödülü-yükleme. Oyuncu dosyaları hash ile korunur. Sonuç `Logs/p2-play.json`, görüntüler `Logs/p2-race-*.png`, `Logs/p2-world-*.png`. Editor küçültülmüşken mevcut oturumu korumak için ayrı proje kopyasında `-batchmode -executeMethod LastTurn.EditorValidation.WorldOpponentPlayValidation.StartBatch` kullanılabilir; kaynaklar birebir kopyalanır, sonuç ve kaynak hash'leri `node Unity/Validation/check-p2-proof.mjs` ile doğrulanır.
- Batch görüntüleri gerçek Unity kamerasından alınır; IMGUI/Editor arayüzünü içermez. Etkileşimli menü/odak/yerleşim kabulü ve insan sürüşü manuel denemede yapılmalıdır. Bilinen Unity `SearchDatabase` başlangıç istisnası ayrı `editorDiagnostics` alanında tutulur; oyun çalışma hataları testi başarısız kılar.
- Otomatik sürücü ile bitiş, gerçek kişinin klavye/fare oynanış kabulü değildir. Kaynak hash denetimi eski kanıtı reddeder.

## Sınırlar ve P3 devri

Araç–araç fizik teması kaynakta bulunmaz; ayrı tasarım aşağıdaki belgededir, uygulanmadı. Kaynak YZ başka araçları algılayıp kaçınmaz. Gövde sağlığı/armor/pert ve güç kaybı Mutant koşu/skill kurallarıdır; P2'de yeni kariyer hasar hesabı yok. Fizik darbesi ve hit zamanı hazırdır. Şehirde dokuz kaynak sokak rotası `WorldCatalog.Streets` içindedir; A→B/kovalama/oda işaretleri ve etkinlik ödülleri P3 run yürütücüsüne bağlanmalıdır. Açık dünya seçimleri kaynak bölgeleri ayrı test girişleriyle açar; birleşik dünya kapılarının oyun akışı P3'tedir. Hava seçimi, skill/kanca/uçuş ve ses sonraki paketlerdir. GTTest/TerrainTest normal girişinde kaynak engelleri kendiliğinden etkinleşmez.

Üretim hattı: gerçek TS bölge kurucuları ve RNG → collider ekleme çağrıları/koniler → `world-catalog.json`. Fizik hacimleri Core'da çözülür; primitive görsellerde Unity Collider/Rigidbody çözümü yoktur. Rakip `OpponentRacer.CreateParameters`, `OpponentPilot`, `OpponentRacer`, `TrackWorld` ile mevcut motor/teker çekirdeğini kullanır. Mutant rakip kurulumu aynı fabrikayı kullanabilir; ödül ve profil yazımı yarış denemesinde kapalıdır.
