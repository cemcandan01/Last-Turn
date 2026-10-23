# hud dal notu
- Mini harita "araç yukarı bakar" (GTA tarzı): imleç sabit (240px tuvalde 120,160), dünya aracın konumuna göre kayar, yönüne göre döner; görünen genişlik 180 m (duruş) → 260 m (60 m/s+), yavaşça yumuşar. Pist çizgisi her karede Path2D ile (3 m'den sık noktalar atlanır), çizgisiz bölgeler (test alanı) 1536px görüntüden döndürülerek. Rakip/hayalet noktaları aynı dönüşümle. Eski sabit harita seçeneği yok (kullanıcı istemedi). Ölçülen maliyet ~0,012 ms/kare. Test: `hud-minimap` (viraj yönü harita = ön cam, `LT.mmDonustur`).
- 0.4.3: ekran uyumu (25 sanal cihaz). HUD düzenleyici paneli kısa ekranda (≤380 px yükseklik) sıkılaştı (`stil.css`, `@media (max-height: 380px)`); iPhone 13 (390 px) aynı.
- `npm run cihaz -- --ekran hud --hepsi`: 0 hata. İlk koşuda iphone-se yaris-drift `#drX`/`#cm` örtüşmesi bir kez çıktı, tekrarlanmadı (izlenmeli).
- Dokunmatik tuşlar CSS px ile sabit (DPR'den bağımsız), `min(96px, aw*.22)` vb.; tablette büyümez.
- Açık: kayıtlı HUD yerleşimi kenara göre (değişmedi).
