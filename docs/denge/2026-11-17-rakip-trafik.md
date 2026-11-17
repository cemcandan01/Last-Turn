# MUTANT yakın trafik — iki araçlı ölçüm

Kart: [sürükleyici döngü](../isler/2026-11-16-surukleyici-dongu.md). Üretici `Unity/Validation/OpponentTrafficValidation.cs`, ham kanıt `tests/cikti/opponent-traffic.json`. Fizik, güç, tutuş, ödül/fiyat/XP ve kayıt şeması değişmedi; yalnız sabit adımda direksiyon/gaz/fren hedefi. Kariyer, drag/drift ve null trafik TS yolu korunur.

## Rol ve sınır

MUTANT gp/rx/rl ve şehir yarışında yakındaki aynı yönde araç için geçiş/takip/yan yana çizgi koruma. Agresif geç kapatma yok. Uzakta veya farklı yükseklikte/ters yönde/pist dışında oyuncu tempo katsayısı değildir. Bakış aralığında yeterli yan koridor ve hafif eğrilik varsa tek taraf seçilir; dar/sert virajda frenle takip edilir. Yan yana başlangıçta hedef mevcut yana hizalanır, oyuncu yanındayken merkeze dönüş yapılmaz. Bilinçli trafik duruşu eski takılma/geri manevra/kurtarma sayacını tetiklemez.

Yeni edinme bedeli/kapısı yok. Yerel trafik freni yarış sonucunu etkileyebilir; küresel tur/sıra farkından hızlandırma/yavaşlatma yoktur. Aynı fiziğin girdi tepkisi ölçülür. Araç-araç fiziksel çarpışma/hasar eklenmedi; kutu ayrışması bağımsız geometrik gözlemdir.

## Kontrollü iki araç

Kaynak GT parametreleri, aynı fizik ve nicemlenmiş girdi. Başlangıç yerleşimi/hızı test kurulumu; döngüde yalnız `Vehicle.Step`, konum/hız yazımı yok. Yavaş ikinci aracın hedef profili yalnız testte düşürülür; oyundaki oyuncu girdisi veya rakip profili değiştirilmez.

| Karşılaşma | Eski yol kutu çakışma adımı | Trafik yolu | Yeni davranış |
| --- | ---: | ---: | --- |
| Geniş düzlük | 44 | 0 | Tek yandan geçer, ayrışınca çizgiye döner |
| Dar düzlük | 44 | 0 | 12,02 m son takip farkı, yan değiştirmez |
| Sert viraj | 103 | 0 | 10,87 m son takip farkı, geçiş zorlamaz |

İki geçiş yönü ayrı geçer. 30/60/120 FPS'de aynı sabit adım izi. Oyuncu 200 m uzaktayken komut/fizik/sayaç null yolla birebir aynı. Dikiş, ayrı yükseklik, ters yön, geçersiz bağlam, yan yana taraf kilidi ve dar kesitte uygun yan koridor bulunmaması sınandı. 12 sn durmuş araç takibinde hız 0, dönüş 0, pilot yarış modunda kaldı.

Kaynak gp_1 / rx_1 / şehir kuzey koşusu kısa karşılaşmalarında kutu çakışması 0; bütün gövde pist genişliği içinde. RX kenar payı ilk ölçümde yetersizdi; yalnız merkez yerine gövde genişliği kontrolü eklenerek güvenlik payı artırıldı. Geçiş hedefi takip koridorunun sınırında kaldığı için ilk denemede geçiş tamamlanmıyordu; hedefe ek ayrışma payı konuldu. Başarısız ilk denemeler son başarı gibi sayılmadı.

## Doğal tam yarış çiftleri

Gerçek MUTANT kurulum/başlangıç/etkinlik ve kaynak Çaylak planı. Kontrol aracının test profili kaynak hızın %70'i; oyuncu becerisi/zorluk dağılımı değildir. Başlangıçta yan yana, tam bitişe kadar fizik.

| Pist | Eski / trafik bitişi (sn) | Eski / trafik kutu çakışma adımı |
| --- | --- | --- |
| gp_1 | 104,22 / 104,40 | 171 / 0 |
| rx_1 | 49,87 / 49,85 | 473 / 0 |
| sokak_capraz | 66,30 / 66,27 | 225 / 0 |

Üç yeni çiftte doğal bitiş, sıfır otomatik dönüş ve sıfır çevre teması. ±0,18 sn bu üç örneğin farkıdır; bütün boss/araç/pistlerde aynı etki garantisi değildir. Mevcut kaynak pilot/yarış altın izi 139.374 ve MUTANT kaynak izi 85.711 koşulla ayrıca korunur. İnsan rekabet/keyif ve bütün içerik kalibrasyonu ayrı kalır.
