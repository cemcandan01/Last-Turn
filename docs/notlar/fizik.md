# fizik dal notu

- 0.6.2: Cem örnek Serçe üzerinden bütün araç dengesini istediğini netleştirdi. Tüm 15 araç ortak altı özellik toplamıyla sınıflanır (`ozellikler.ts`); tur/pilot PI belirlemez. Stok tavan D200/C450/B550/A650/S750/X900; mevcut sınıf sınırları korunur. Yardım seviyesi sınıfı değiştirmez.
- Beş ücretsiz başlangıcın motorları 85/95/85/120/195 HP; tutuş/fren/aktarım da mütevazı. Bütün D stoklar ≤200; parçalarla tavan aşılırsa sınıf yükselir. Sadece etiket değiştirilmez. Yeni araç/ayar için stock sınırı ve modifiye alanı `denge.test.ts`te korunur.
- Garaj altı satırda puan + fiziksel değer ve toplam/sınıf tavanı gösterir. Gerçek hız/ivme/fren stok ölçümleri yenilendi; fizik ayarı değişince `olcum -- surus-inceleme` ile referans yenile.
- 350 HP motor değişimi, yarış motoru +%75 / büyük turbo +%70; 5 başlangıçta 300+ D yapıları ve en az birinde 380+ mümkün. Motor değişimi eski turboyu sıfırlar; yeni turbo sonradan uygulanır. İlk beş yarışın yıldız hedefleri ölçülen zayıf stoklara uyarlandı. Kayıt sahipliği korunur.
- 0.6.1 el freni korunur: `dbr` eski giriş/ayar yuvası; arka fren/tahrik/merkez bağını ayırma, basılıyken vites sabit. Yapay debriyaj tork vuruşu yok. Ayrıntı aynı görev kartında.
