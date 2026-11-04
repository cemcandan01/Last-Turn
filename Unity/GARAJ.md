# Unity garaj — manuel test rehberi

Garaj, TS 0.8.18 ilerleme/modifiye kurallarını katalog üstünden çalıştırır (`GarageState`). Kayıt tek dosyadır:
`Application.persistentDataPath/LastTurnGarage/garage-v1.json` (+ `.bak`, işlem sırasında `.tmp`). Geliştirici profili
ayrı dosyadır (`developer-v1.json`) ve oyuncu ekonomisine para aktarmaz.

## Açma

1. **Last Turn → Garaj Sahnesini Aç**, sonra Play.
2. Üst satır: bakiye, seviye, Kaydet / Yeniden yükle / profil değiştir, son işlem mesajı.
3. Sol: Garaj (sahip olunan) / Mağaza (alınabilir) araçlar. Orta: sınıf+puan, hız/ivme/tutuş/fren/arazi, güç, kütle,
   lastik, takılı parçalar. Sağ: kategori, parçalar, paketler.

## Kontrol listesi

| Adım | Beklenen |
|---|---|
| Yeni oyuncu profili | Bakiye 0, seviye 1, seçili araç kaynak başlangıç aracı (Gümüş Serçe, araç 10). Mağazadaki araçlar alınamaz. |
| **Ayrı test profilini aç** | Etiket “GELİŞTİRİCİ TEST PROFİLİ”; 60.000 para, seviye 15. Oyuncu profili değişmez. |
| Araç al (iki dokunuş, 3 sn onay) | Bakiye fiyat kadar düşer, araç Garaj listesine geçer. Yetersiz para / seviye mesajı verir, bakiye değişmez. |
| Parça al | Aynı kategoride önceden ödenen bedel kredi olur; alınan parça takılır. |
| Takılı parçada **Sök** | Yalnız o kategori stoka döner; para iadesi yok, sahiplik/kredi kalır. Tekrar **Tak** ücretsizdir. |
| Paket al / **Paketi tak** | Paket parçaları tek işlemde alınır ve takılır. |
| **Tüm parçaları sök** | Araç stoka döner, satın alınan parçalar kalır. |
| İki araç | A aracına parça takıp B'ye geçin: B'nin takılı listesi ve parça sahipliği ayrıdır. |
| Play'i kapat → aç | Bakiye, araçlar, seçili araç ve her aracın takılı parçaları aynen gelir. |
| **GTTest'te sür** / **TerrainTest'te sür** | Sağ üstte “kayıtlı garaj kurulumu” ve takılı parçalar görünür; araç gövdesi/kütlesi değişir. Alt satırdaki yarış türü seçilirse o türün yarış lastiği kullanılır. **Garaja dön** garaja getirir. |
| Garajdan gelmeden GTTest/TerrainTest | Eski kabul edilmiş GT ve arazi profili aynen çalışır. |

## Kayıt hataları (dosyayla deneme)

- Ana dosyayı bozun → doğrulanmış `.bak` yüklenir; ilk kayıtta bozuk dosya `.corrupt-…` adıyla saklanır.
- Ana ve yedek bozuk → başlangıç garajı salt okunur açılır, dosyalara dokunulmaz.
- Daha yeni biçim/veri/ilerleme sürümü ya da bilinmeyen katalog kaynağı → salt okunur, üzerine yazılmaz.
- Eski katalog nesli (`catalogGeneration` güncelden küçük) → yazılabilir açılır; bilinmeyen takılı parçalar düşer, alım
  defteri ve bakiye korunur; ilk kayıtta eski dosya `.bak` olur. Katalog yeniden üretildiğinde
  `GarageState.CatalogGeneration` artırılır ve eski SHA `KnownBaselines`e eklenir.
- TS ilerleme sürüm 1 kaydı içe aktarılmaz (yıldız/rekor geçmişi gerekir). Sürüm 2→3 geçişinde “oynanmış” yalnız bulut
  alanlarına (XP, kazanç, alım, ek açık) bakar; TS yerel `lt_prof` kullanım/yarış sayısı Unity'de yoktur.

## Otomatik kontroller

```
node Unity/Validation/export-garage.mjs --check
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj -c Release -- --garage
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj -c Release -- --garage-storage
dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj -c Release -- --garage-drive
```

Editor: **Last Turn → Garaj Kısa Play Doğrulaması**, ardından `node Unity/Validation/check-garage-proof.mjs`.
