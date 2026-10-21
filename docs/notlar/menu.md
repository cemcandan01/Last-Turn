# menu dalı notu

- **Menü arka planı video değil, görsel akışı** (kullanıcı isteği: performans, boyut, videonun geliştirmelerde bozulması). `public/img/menu/NN.webp` (9 görsel, ~80 KB; önceki mp4 5,2 MB) oyunun sinematik çekimlerinden `npm run build && npm run menugorsel` ile üretilir; `tests/cikti/menu-gorsel/` önizleme.
- `arayuz/arka-gorsel.ts`: rastgele sıra, art arda aynı görsel yok, 6 sn kalma, CSS ile yavaş kayma + 1,4 sn çapraz geçiş. Görseller ekranı kaplarken 3B sahne çizilmez. Yüklenemezse canlı sinematik devreye girer (gecis testi bu yolu dener).
- Silindi: menu.mp4, scripts/menu-video.mjs, SW video (206) kodu, test webm'i.
- Pist ya da SHOTS değişince görselleri yeniden üret, önizlemede araçlara bak.
- Açık iş: yok.
