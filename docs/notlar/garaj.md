# garaj dalı notu
- Garaj paneli (yatay 844x390) kaydırmasız: ad/tür/önerilen, araç şeridi, 4 temel değer (azami hız, hızlanma, yol tutuşu, arazi), hp·kg·çeker satırı, altta sabit Geri + Seç butonları. Fren/çeviklik/güç çubukları ve önayar kaldırıldı (gereksiz).
- Kokpit kamerası: kameraya 5 m içindeki parçacıklar kokpitte çizilmez (`cizim/parcaciklar.ts`); dış kamera aynı.
- Test: `tests/e2e/bolumler/garaj.mjs` bütün araçlarda kaydırma yok + butonlar ekranda.
- 0.3.4: showcase panel dışındaki boşluğa ortalı (kameraya setViewOffset, `dongu.ts`); anahtar ışık gölgeli (512 harita) + soğuk dolgu + turuncu arka ışık + zemin gölge lekesi (`garaj-sahnesi.ts`); garajda güneş kapalı. Panel sağ boşluğu 22 px.
- Sürükleme: garajda araç parmakla aynı yöne döner (`kamera.ts`, yarışta bakış yönü eskisi gibi). Testte doğrulanır.
- 0.3.5: panel 470 px (araç adları sıkışmaz, kaydırma yok), sağ boşluk 12 px. Garaj kamerası: sürükle = döndür + dikey eğim (0.03–1.3 rad, 90° olmaz), iki parmak/tekerlek = zoom, kısa dokunuş = kendiliğinden dönmeyi durdur/başlat. Dönme açısı tek yerde (`kamera.ly`, `garajKameraTick`): eski `tt*0.3 + ly` kaynaklı geri sıçrama bitti.
- 0.3.6: panel 410 px (vitrin büyüdü). Sürükleyince açı eski yerine dönüyordu: dongu.ts takip kamerasının "bir süre sonra arkaya dön" sönümü garajda da çalışıyordu, garajda kapatıldı. Vitrin sağ altında tam ekran düğmesi; dokununca dönme durur ve seç/geri tuşları çıkar (garaj.ts `#gvit`), aynı yapı yarış, serbest sürüş ve menü garajında.
- 0.3.7: seç/geri tuşları yalnız tam ekranda dokunup bırakınca çıkar, tekrar sürüklemeye başlayınca kaybolur (`kamera.gBtn`).
- Açık: yok.
