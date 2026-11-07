# Mutant görsel kimliği — B ve C alternatif yönleri (7 Kasım 2026)

- **Sahip:** Codex (ikinci oturum). Açan/denetleyen: Claude. Dal `codex/unity-p7-garaj`. Push/merge/yayın yok.
- **Bağlam:** Ana kart `2026-11-07-mutant-gorsel-kimlik.md` (Yön A) aynı anda başka bir Codex oturumunda üretiliyor: koyu fantastik, kırmızı/mor kristal + metal arma (`docs/tasarim/mutant/`). **O dosyalara ve o karta dokunma.**
- Cem (7 Kasım): "Bana birden fazla tasarımlar ve ikonlar oluşturun, ben seçim yapayım."

## İstenen

Yön A'dan belirgin biçimde farklı iki yön. Yerleşimler aynı: `docs/tasarim/mutant-f.html`deki 1B 2A 3B 4A 5A 6A 7A 8A. F ailesinin Barlow yazısı, eğik tuşları ve sağ alt tuş ipuçları korunur.

- **Yön B — Biyomekanik mutasyon:** asit yeşili + magenta, damar/organik doku, sıvı/kabuk çerçeveler, mutasyon geçirmiş makine hissi.
- **Yön C — Neon hologram:** camgöbeği + pembe/mor, hologram kartlar, ışık çizgisi, glitch/tarama çizgisi dokusu, düz neon çizgi ikonlar.

Her yön için:
1. 1 arka plan (16:9), çerçeve/parlama dokuları (9-dilim PNG), kısa palet + nadirlik renkleri.
2. **Örnek ikon seti** (tam set değil; seçimden sonra tamamlanacak): 5 boss amblemi (toprak-kurdu, drift-kralicesi, drag-canavari, gece-sahini, camur-baronu), 5 skill, 12 parça kategorisi, 6 pasif örneği (guc, hafif, zirh, tamirci, adrenalin, sert-nitro). Şeffaf arka plan, ≥256 px, dosya adı = katalog id'si.
3. Seçilen sekiz ekranın 3'ü bu yönle: **1B HUD, 5A ödül seçimi, 6A boss**.

Çıktılar: `docs/tasarim/mutant-b/**`, `docs/tasarim/mutant-c/**`, karşılaştırma sayfası `docs/tasarim/mutant-yonler.html` (B ve C yan yana; A hazırsa `docs/tasarim/mutant/` görselleri yalnız okunarak eklenebilir).

## Kurallar

- Unity/UI Toolkit'te CSS filtre/blur/gölge/blend yok: parlama ve çerçeveler PNG'ye gömülü.
- Türkçe metin; emoji, gerçek marka logosu/benzeri yok. Oyunda olmayan özellik eklenmez.
- Yalnız yukarıdaki çıktı yolları ve bu kartın Sonuç bölümü değişir. Unity/TypeScript/oyun verisi/`_Recovery` ve Yön A dosyaları dokunulmaz.

## Kabul ölçütleri

1. `mutant-yonler.html` tek başına açılır; her yönün 3 ekranı 16:9, 1440 ve 800 px'de taşmasız.
2. B ve C birbirinden ve Yön A'dan ilk bakışta ayrılır; her yönde örnek ikon setinin tamamı var, tek stil, şeffaf arka plan.
3. Sonuç bölümünde dosya listesi, kontrol sonucu ve açık sorular.

## Sonuç (Codex dolduracak)

- **Durum:** Tamamlandı; görsel yön seçimi Cem'i bekliyor. Sahip bu ikinci Codex oturumu; tek ajan, alt ajan veya ayrı API/CLI görsel çağrısı kullanılmadı. Yerleşik `image_gen` kullanıldı; üretici model adı ve kota pencereleri araçtan öğrenilemedi. Başlangıç ve kapanış dalı `codex/unity-p7-garaj`, HEAD `c54e784`. Yeni görev/devir sistemi kurulmadı.
- **Üretilen dosyalar:** [Karşılaştırma sayfası](../tasarim/mutant-yonler.html); B ve C yan yana, ayrıca her yönü tam genişlikte inceleme düğmeleri. Her yönde 1B HUD, 5A ödül seçimi ve 6A boss; Barlow dosyaları yerel, tuşlar eğik, ipuçları sağ altta. Örnek değerler ve katalog metinleri korunur; nadirlik paleti yalnız görsel öneridir.
  - `docs/tasarim/mutant-b/` ve `docs/tasarim/mutant-c/`: her birinde `arka-plan.png`, `dokular/cerceve.png`, `dokular/parlama.png`; dört kenardan %25 dilim oranı. Parlama PNG içinde hazırdır.
  - Her yönde **28 şeffaf örnek ikon**, toplam **56 ikon / 62 üretim PNG'si**: `ikonlar/boss/{id}.png` (5), `ikonlar/skill/{id}.png` (5), `ikonlar/parca/{kat}.png` (12), `ikonlar/pasif/{id}.png` (6). Pasifler `guc`, `hafif`, `zirh`, `tamirci`, `adrenalin`, `sert-nitro`; diğer kimlikler gerçek katalogdan gelir. Tam dosya/kimlik listeleri: [B manifesti](../tasarim/mutant-b/manifest.json), [C manifesti](../tasarim/mutant-c/manifest.json).
  - Her iki klasörde `palet.json`, `README.md`, `uretim-istemleri.json` (arka plan/doku istemleri), `ikon-istemleri.json` (tek tek ikon istemleri), `yazi/*.ttf`, `kanit/*.png`. Sayfayı hazırlayan `mutant-b/hazirla.cjs`, kontrolü tekrarlayan `mutant-b/dogrula.cjs` de teslimdedir.
- **Doğrulama:** `node docs/tasarim/mutant-b/dogrula.cjs` başarılı; **Edge 157.0.4341.42 / Playwright**, doğrudan `file://`, 7 Kasım 2026 18:28 TSİ. [Makine raporu](../tasarim/mutant-b/kanit/dogrulama.json).
  - 1440 ve 800 px'de altı ekranın tamamı tam 16:9; sayfa veya ekran dışına taşan içerik yok. 1440'ta ekranlar 680×382,5; 800'de yan yana 377×212,0625. B/C büyütme ve yan yana dönüş düğmeleri de denendi; büyütmede yatay taşma yok.
  - **62/62 PNG** boş değil, gerçek sıfır alfa pikselleri içeriyor ve iki boyutu da ≥256 px. Kırık görsel, sayfa hatası, HTTP isteği ve yasaklı CSS filtre/blur/gölge/blend bildirimi **0**; yerel fontlar yüklendi.
  - Ajan, B/C'nin 56 ikonunu kareli ve açık zeminde, altı ekranı iki genişlikte ve büyütülmüş örnekleri görüntüden inceledi. İlk incelemede küçük önizlemelerde incelen çerçeveler düzeltildi; son kontrol tekrar geçti. B organik kabuk/damar, C düz neon çizgi dilini tutarlı koruyor. C açık zeminde düşük kontrastlıdır; hedef kullanım koyu oyun zeminidir.
  - Yön A'nın mevcut boss kanıtı yalnız okunarak incelendi: kristal/metal arma görünümüne karşı B ve C ilk bakışta ayrılıyor. `mutant/`, `mutant-f2.html` ve diğer oturumun kartına yazılmadı. Unity/TypeScript/oyun verisi/`_Recovery` değiştirilmedi; ortak `docs/DEVIR.md` de bu kartın dar yazma sınırı gereği değiştirilmedi.
- **Yerel teslim:** Commit/push/merge/yayın yok. Git çalışma ağacı metadata dizinine yazma izni olmadığı için commit oluşturulmadı; başlangıç `fetch` denemesi `FETCH_HEAD: Permission denied` ile durdu. Global Git ayarı değiştirilmedi. Diğer oturumun ve `_Recovery`nin mevcut değişiklikleri korunuyor.
- **Açık sorular / tek sonraki adım:** Cem'in A/B/C yönünü seçmesi. Görsel beğeni ve insan kabulü açıktır; tam ikon kataloğu ve Unity uygulaması seçimden sonra ayrı iş olacaktır.

### Gönderim hazırlığı — 7 Kasım 2026

Kullanıcının yeni gönderim isteğiyle tamamlanmış B/C teslimi taslak olarak yerel commit'e alınıyor; önceki metadata izin engeli gideriliyor. HTML/JSON/CJS depo biçimine uyarlandı; iki CommonJS yardımcısı ESLint'i gevşetmeden dinamik import kullanıyor. `dogrula.cjs` yeniden çalıştı:1440/800 px'de6 ekran, B/C büyütme,62 PNG alfa/boyut, yerel font, taşma/kırık görsel/ağ/CSS denetimleri geçti. F2 veya Unity tasarımı yeniden uygulanmadı. Görsel yön seçimi ve insan kabulü açık; `_Recovery` gönderilmez.
