# MUTANT rakip bitiş ölçümü — 17 Kasım 2026

Kart: [sürükleyici döngü](../isler/2026-11-16-surukleyici-dongu.md). Üretici: `Unity/Validation/MutantCompetitionValidation.cs`, ham rapor `tests/cikti/mutant-competition.json`. Oyun/rakip parametreleri değiştirilmedi.

7, 53, 83 tohumları; bölge 1 asfalt/rallikros/ralli ve bölge 2 blok turu/A→B/kovalamaca. Gerçek kaynak etkinliği, Güvenli/Çaylak kişiliği, kaynak araç/parça/pasif/lastik ve dünya çarpışmalarıyla tam yarış. Her deneme en fazla 360 sn simülasyon; manuel konum müdahalesi yok. Kaynak runner'ın otomatik dönüşü varsa ayrıca sayılır.

| Tür | Tamamlanan örnek | Bitiş aralığı (sn) |
| --- | --- | --- |
| Asfalt | 3 | 96,65–106,68 |
| Rallikros | 3 | 49,78–53,97 |
| Ralli | 1 | 59,63 |
| Şehir blok turu | 3 | 64,78–112,75 |
| Şehir A→B | 3 | 66,23–66,57 |
| Şehir kovalamaca | 3 | 67,33–122,47 |

**Sonuç:** 16 doğal bitiş, 0 süre sınırı, 2 kaynakta rakipsiz rampa/pist istisnası. Toplam 0 otomatik dönüş ve 0 çevre teması; 73.885 gaz/fren/direksiyon sınır kontrolü. İki istisna yeni bir başarısızlık gibi veya bitmiş yarış gibi sayılmadı.

Ayrıca mevcut `--opponent-drive` kabulü: ilk asfalt 142,53; rallikros 155,28; ralli 69,70; drag 9,43 sn, her birinde dönüş/temas 0. Bunlar kariyerin farklı tur sayısı/araç kurulumu olduğu için yukarıdaki MUTANT süreleriyle hız yarışı kıyaslaması yapılmaz. `--mutant-opponents` kaynak eşdeğerliği 85.711 koşul / 27 sokak planı / 165 kurulumda geçti; en büyük fark 9,09e-13.

**Sınır ve sonraki karar:** Bu ölçümde oyuncu aracıyla yan yana etkileşim yoktur; bitiş tutarlılığını kanıtlar, geçiş/savunma kalitesini veya insan için zorluğu kanıtlamaz. `OpponentPilot.Step` yalnız kendi pozunu ve planı okur, rakip/oyuncu trafik bağlamı almaz. Dinamik savunma veya güvenli geçiş geliştirilecekse önce iki araçla kontrollü düzlük/viraj karşılaşmaları eklenmeli; gizli güç veya rubber-band ile süreler değiştirilmemeli. Kaynakta takılma dönüşü mevcut; bu 16 örnekte tetiklenmemesi bütün pistlerde hiç olmadığı anlamına gelmez.
