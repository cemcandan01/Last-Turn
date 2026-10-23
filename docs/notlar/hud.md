# hud dal notu
- Mini harita eğik perspektif (Forza tarzı, 0.4.12): araç yukarı bakar, kamera 55° aşağı bakar (`EGIM`, `CH`, `CB`, `GK`; `yerProj`), imleç yüksekliğin %68'inde (240px tuvalde 120,164), ileri ~1,6×, geri ~0,45× görünen genişlik; yol 4 derinlik kuşağında uzaklaştıkça daralır. Hız yakınlaştırması 180→260 m korundu. Çizgisiz bölgeler (test alanı) 28 şeritte çizilir. Rakip/hayalet `LT.mmDonustur` ile aynı dönüşüm (kameranın arkasındaysa -999). Eski sabit harita seçeneği yok. Test: `hud-minimap`.
- 0.4.3: ekran uyumu (25 sanal cihaz). HUD düzenleyici paneli kısa ekranda (≤380 px yükseklik) sıkılaştı (`stil.css`, `@media (max-height: 380px)`); iPhone 13 (390 px) aynı.
- `npm run cihaz -- --ekran hud --hepsi`: 0 hata. İlk koşuda iphone-se yaris-drift `#drX`/`#cm` örtüşmesi bir kez çıktı, tekrarlanmadı (izlenmeli).
- Dokunmatik tuşlar CSS px ile sabit (DPR'den bağımsız), `min(96px, aw*.22)` vb.; tablette büyümez.
- Açık: kayıtlı HUD yerleşimi kenara göre (değişmedi).
