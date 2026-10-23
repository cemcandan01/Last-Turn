# grafik dalı notu
- Araç modelleri: src/cizim/arac-modeli.ts (ek parçalar `EK`), govde.ts (profil, kemer).
- Son iş: garaj vitrininde görülen kopuk/havada parçalar düzeltildi. Tampon, ayırıcı, far, stop artık gövde profiline
  göre (uc/ust/tampon/serit yardımcıları) yerleşir: gövde genişliğinde, yüzeye gömülü, eğime yatık.
  Kor RX kanat ayakları gövdeye bağlandı; Gece Mavisi şeritleri kaput/tavanı izler, kompresör kaputa gömülü.
- Karar: ek parçalara sabit koordinat yazma; ust(d,z) / uc(d,y,on) ile profilden türet.
- Test: tests/birim/govde.test.ts "ek parçalar gövdeye oturur" (senaryo ek-parcalar).
- Görsel kontrol: garajda tam ekran (#gvtam), LT.kamera.ly/gp/gz (gz küçük = yakın), 5 araç x 4 açı.
- Açık: kullanıcı yeni hata görürse aynı yöntemle bak; kokpit dışı tekerlek/jant ayrıntısı elden geçmedi.
