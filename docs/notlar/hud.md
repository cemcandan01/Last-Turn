# hud dal notu
- 0.4.3: ekran uyumu (25 sanal cihaz). HUD düzenleyici paneli kısa ekranda (≤380 px yükseklik) sıkılaştı (`stil.css`, `@media (max-height: 380px)`); iPhone 13 (390 px) aynı.
- `npm run cihaz -- --ekran hud --hepsi`: 0 hata. İlk koşuda iphone-se yaris-drift `#drX`/`#cm` örtüşmesi bir kez çıktı, tekrarlanmadı (izlenmeli).
- Dokunmatik tuşlar CSS px ile sabit (DPR'den bağımsız), `min(96px, aw*.22)` vb.; tablette büyümez.
- Açık: kayıtlı HUD yerleşimi kenara göre (değişmedi).
