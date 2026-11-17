# MUTANT dolaşım ölçümü — 17 Kasım 2026

Kart: [sürükleyici döngü](../isler/2026-11-16-surukleyici-dongu.md). Başlangıç kaynak `8e1a4f8`; üretici `Unity/Validation/MutantPacingValidation.cs`, ham rapor `tests/cikti/mutant-pacing-baseline.json` (yerel). Normal koşu, stok başlangıç araçları ve kaynak harita kullanıldı. Ödül, boss sayacı, fizik veya etkinlik konumu değiştirilmedi.

## Geometri: 64 tohum × 3 bölge

| Bölge | İlk etkinlik en az / ortalama / en çok (m) | Başlangıçta en yakın işaretin gizli sandık olması |
| --- | --- | --- |
| 1 | 71,0 / 91,7 / 182,0 | 0 / 64 |
| 2 | 78,0 / 216,8 / 486,3 | 8 / 64 |
| 3 | 78,0 / 225,7 / 720,4 | 12 / 64 |

Mesafeler **kuş uçuşu alt sınırdır**. 50 km/sa varsayımıyla ham rapordaki süre dönüşümü yol bulmayı, ivmelenmeyi, engelleri veya sürücüyü temsil etmez. Her tohumda sekiz etkinliğin açgözlü mesafe zinciri de kaydedildi; bu oyuncunun mecburi rotası değildir.

## Gerçek fizik yaklaşmaları

7, 53 ve 83 tohumları × 3 bölge: aynı başlangıç noktası, kaynaktan seçilen başlangıç aracı, gaz/fren/direksiyon üreten basit bir nokta takipçisi; 1/60 sn, en çok 90 sn. Yol bulma, yarış tamamlama, beceri kullanımı veya insan pilot yoktur. Bölge 2/3 başlangıçları test kurulumu olarak hazırlanır; boss'ların doğal oynayarak geçildiği iddia edilmez.

- 8 / 9 yaklaşma etkinlik kapısına doğal fizik ve 0,5 sn duruşla ulaştı: yaklaşık 7,9–31,7 sn.
- Tohum 83 / bölge 2'de RX takipçisi şehir engelinde kaldı; 90 sn sonunda hedefe 313,7 m vardı. Konum yazılarak geçirilmedi. Bu, şehirde yol bulmayan bu ölçüm pilotunun sınırıdır; etkinliğin insan için ulaşılamaz olduğunu kanıtlamaz.
- Beş yaklaşmada yol görevi başladı; görev aktifken mesafe satırını örten eski HUD bu yaklaşmaların yaklaşık %9–69'unda etkinlik bilgisini kaybediyordu. Kısa yaklaşmalarda tamamlanan yol görevi olmadı; bundan görevlerin genel başarı oranı çıkarılamaz.
- 393 ölçüm kontrolü geçti. Ayrı saf yönlendirme testi 2.304 kontrolde 64 tohum / 3 bölgeyi sınar.

## Karar

Bu örnek süre/ödül/konum ayarı için yeterli değil. Doğrulanmış ürün hataları giderildi: gizli sandıklar hem HUD hedefinden hem miniharitadan çıkarılır; dünyadaki 3B sandıklar kalır. Yol görevi ve yakın etkinlik mesafesi ayrı satırda gösterilir. Görev sayıları kısaltılarak mesafe ve ilerleme birlikte okunur. Sonraki iş, gerçekten kazanılan yol görevi ödülünün bildirimi ve koşu özetine katkısıdır; denge sayıları korunur.
