# garaj dalı notu
- Garaj paneli (yatay 844x390) kaydırmasız: ad/tür/önerilen, araç şeridi, 4 temel değer (azami hız, hızlanma, yol tutuşu, arazi), hp·kg·çeker satırı, altta sabit Geri + Seç butonları. Fren/çeviklik/güç çubukları ve önayar kaldırıldı (gereksiz).
- Kokpit kamerası: kameraya 5 m içindeki parçacıklar kokpitte çizilmez (`cizim/parcaciklar.ts`); dış kamera aynı.
- Test: `tests/e2e/bolumler/garaj.mjs` bütün araçlarda kaydırma yok + butonlar ekranda.
- 0.3.4: showcase panel dışındaki boşluğa ortalı (kameraya setViewOffset, `dongu.ts`); anahtar ışık gölgeli (512 harita) + soğuk dolgu + turuncu arka ışık + zemin gölge lekesi (`garaj-sahnesi.ts`); garajda güneş kapalı. Panel sağ boşluğu 22 px.
- Sürükleme: garajda araç parmakla aynı yöne döner (`kamera.ts`, yarışta bakış yönü eskisi gibi). Testte doğrulanır.
- Açık: yok.
