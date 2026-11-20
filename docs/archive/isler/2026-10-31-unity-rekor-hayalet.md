# Unity rekor, profil ve hayalet — 31 Ekim 2026

## İstek ve kabul

Cem: TS rekor, en iyi tur ve hayalet veri yapısını incele; yarış sonuçları profil kayıtlarına doğru geçsin; hayalet oyuncu fiziğinden ayrı ve belirlenimci oynasın; zaman ve pist bağlamı korunsun.

1. Rekor kuralı ve biçimi TS `sonucGoster` (`sv_<anahtar>`) ile aynı; profil sayaçları (`lt_prof` yarış, galibiyet, km, araç kullanımı) TS `startEvent`/`endEvent` ile aynı.
2. Girdi kaydı TS `girdi-kaydi.ts` gibi nicemlenir; fiziğe nicemlenmiş girdi gider; hayalet kaydetme kuralı TS `hayaletKaydet` ile aynı.
3. Hayalet ayrı araç + ayrı pist dünyasıyla oynar; oyuncuyla eş adımlı, geri sayımda bekler; aynı girdi → bit düzeyinde aynı yol.
4. Kayıt garaj profilinin yanında, oyuncu kaydından ayrı dosyalarda; bozuk dosya oyunu durdurmaz.

## Sahiplik / Git

Sahip ve uygulayıcı Claude; dal `claude/unity-yaris-turleri`, önceki commit `a3fc416` (yarış türleri). Yalnız yerel commit.

## TS veri yapısı (incelenen)

- `profil.ts`: `sv_<k>` rekor metni (`best = +(metin)||0`); `lt_prof` {races, wins, km, use{araç: sayı}}. `k` = `kariyer1_<tür>_<lv>` (kariyer dışı `deneme_…`).
- `sonuc.ts`: zamanlıda rekor yalnız hedef süre içinde ve daha hızlıysa, `t.toFixed(dg ? 3 : 2)`; driftte daha yüksek puan. Satır: “Rekor: süre · YENİ / önceki / —”.
- `hayalet-kayit.ts`: `lt_hayalet_<k>` {k, arac, surum 3, baslangicAdimi, hava, sure, girdiJson, kurulum}; kaydetme: sonlu, ≥ 0, kayıt kesik/taşmış/boş değil, var olanı iyileştirir (driftte büyük). Rekordan bağımsız (hedef dışı da kaydedilir).
- `girdi-kaydi.ts`: adım başına 4 × int16 (direksiyon, gaz, fren ×32767, bayrak 1/2/4), base64; 60 dk sınırı; piste dönüş kaydı keser.
- `uzak.ts`: rekor hayaleti ayrı `Simulasyon`, oyuncunun her fizik adımında bir kayıtlı girdi.

## Yapılan

- Core `RaceRecords.cs`: `RaceProfile` (rekor, sayaçlar, km; sürümlü anlık görüntü), `InputRecording` (nicemleme, okuma, base64, bozuk veri reddi), `GhostRecord` (kural + anlık görüntü; Unity'de kurulum = araç + takılı parçalar + yarış türü + yardım seviyesi, katalogdan yeniden kurulur), `GhostPlayer` (ayrı `PowertrainVehicle` + ayrı `TrackWorld`), `RaceProfileStore` (geçici dosya + yerine koyma). `RaceRun`: girdiyi kaydedip nicemlenmiş girdiyle sürer, taşınmada kaydı keser, yarış adımından sonra hayaleti ilerletir, bitişte olay.
- `RaceViewModel.Result`: TS “Rekor” satırı. HUD: rekor ve hayalet satırı, sonuçta kayıt mesajı. `GarageRace`: başlangıç sayacı, bitişte rekor/profil/km/hayalet, hayaleti kendi kurulumuyla açma. `GtPrototype`: hayalet kutusu (geçici görsel).
- Dosyalar: `<garaj profili dizini>/races-<profil>/races.json` ve `ghost-<anahtar>.json`. Salt okunur garajda yazılmaz.

## Kanıt

- `--race-session` (TS oracle'ı genişletildi): 10 senaryodan sonra TS `sv_` rekor metni (`106.80`, `42.53`, `5.033`, drift `2504`; hedef dışı/kötü sonuç güncellemez; `deneme_` ayrı), yarış/galibiyet (deneme galibiyet saymaz), araç kullanım sayaçları C# ile aynı; TS `girdiyiKaydet` 14 girdi (sınır dışı kırpma, ±1, 1e-6, yuvarlama) birebir; TS `hayaletKaydet` 15 adımlık kabul/ret dizisi (iyileşme, eşitlik reddi, kesik, taşma, boş, NaN, negatif, başlangıç adımı sınırı, drift) birebir. 293.455 koşul.
- `--race-drive` (gerçek fizik): kayıt kesintisiz (adım sayısı = sürüş), gidiş-dönüş, yanlış anahtar reddi, hayalet ayrı fizikle oynatılınca oyuncunun bitiş konumu ve hızı **bit düzeyinde aynı**; ikinci yarışta hayalet oyuncuyla eş adımlı, geri sayımda bekler, aynı noktada biter; piste dönüş kaydı keser (hayalet kaydedilmez). 203 koşul.
- Unity Play (UTC 12:57–12:58), son kodla: **Yarış 69/69** — her pistte profil sayaçları ve rekor dosyası; kesintisiz koşularda hayalet dosyası (adım sayısı ve sonuç); gp_1 yeniden kurulunca hayalet yüklendi, geri sayımda bekledi, 300. adımda ilk sürüşle **bit düzeyinde aynı konum**; piste dönüş kaydı kesti. Aynı koşuda GT 28/28, Arazi 23/23, Garaj 20/20; editor (34 Core), katalog, pist kanıtları geçti.
- `--race-all` nicemlenmiş girdiyle yeniden: 40/40 pist bitti.

## Açık / bilinçli farklar

- TS hayaleti tam `kurulum` nesnesi ve hava saklar; Unity araç/parça/tür/yardım seviyesi saklar ve katalogdan kurar (katalog değişirse hayalet farklı sürebilir; sürüm alanı var). Hava (tutuş) Unity'de sabit 1.
- TS ve Unity hayaletleri birbirine taşınmaz (fizik motorları ayrı).
- Geliştirici hayaleti (gecikmeli kopya) ve ağ “uzak araçlar” taşınmadı. Hayalet görseli geçici kutu.

## Sonraki tek adım

Sürüş yardımları ve yardım seviyesi kararı (`2026-10-31-unity-surus-yardimlari.md`); drift yarışının yıldızlara ulaşabilirliği bununla ölçülür.
