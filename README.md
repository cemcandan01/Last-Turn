# Last Turn (Son Viraj)

Telefonda oynanmak üzere tasarlanmış, tarayıcıda çalışan bir yarış oyunu projesi. Kurulum gerekmez: dosyayı tarayıcıda açman yeterli.

## Dosyalar

- **`index.html` — Son Viraj** (ana oyun): Kuşbakışı 2D eleme yarışı. Her gün tarihe göre üretilen yeni bir parkur, 5 eleme turu; her yarışta son sıradaki araç elenir. Turlar arasında sınırlı parça değiştirme hakkıyla motor (Dengeli / Turbo / Tork) ve lastik (Slik / Arazi / Karışık) seçilir; zemin (asfalt, toprak, ıslak) lastik seçimini etkiler.
- **`surus-laboratuvari.html` — Sürüş Laboratuvarı**: Three.js ile 3D sürüş fiziği test alanı. Açık dünya; merkezde test arazisi ve yollarla bağlı asfalt pist, toprak pist, drift parkı ve ralli etabı. Lastik/araç ayarları, sürüş yardımları, farklı kontrol modları (tuş, ekran direksiyonu, telefonu yatırma) ve kamera seçenekleri içerir. Buradaki mekanikler oturunca ana oyuna bağlanması planlanıyor.

## Kontroller

- **Dokunmatik:** ekrandaki ◀ / ▶, FREN (ve laboratuvarda GAZ) tuşları
- **Klavye:** ← / → direksiyon, ↓ fren, ↑ gaz (laboratuvar)

## Çalıştırma

`index.html` veya `surus-laboratuvari.html` dosyasını doğrudan tarayıcıda aç. Sürüş Laboratuvarı Three.js'i CDN'den yüklediği için internet bağlantısı ister.
