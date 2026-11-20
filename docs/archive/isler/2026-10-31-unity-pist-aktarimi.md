# Unity pist aktarımı (yarış planı 1. aşama) — 31 Ekim 2026

## İstek ve kabul

Cem: garaj doğrulandıktan sonra yarış planını uygula; ilk aşamada TS 0.8.18 pist tanımları, geometrisi ve pist sorguları otomatik ve tekrarlanabilir aktarılsın. İlk referans `gp_1`, altyapı bütün pistleri desteklesin. TS–C# karşılaştırması olsun; yeni geometri veya kural uydurulmaz. Plan: `docs/isler/2026-10-31-unity-yaris-plani.md`.

1. 40 pistin tanımı ve geometrisi sabit SHA'dan tek komutla üretilir; `--check` sapmayı reddeder; elle veri yok.
2. C# pist sorguları (`pist.ts`) ve tanımdan türeyen öğeler TS çıktısıyla 1e-9 içinde eşleşir; .NET ve Unity Mono'da.
3. `gp_1` ilk referans olarak ayrıca denetlenir; bütün türler (gp/rx/dp/rl/dg) aynı yoldan geçer.
4. Unity'de pistler geçici bir geliştirici görünümünde incelenebilir.
5. Oynanış, garaj, fizik değişmez; mevcut Play kanıtları yeniden geçer.

## Sahiplik / Git

- Sahip ve uygulayıcı: **Claude** (claude-opus-5-5). Codex kotası dolu; ikinci ajan çağrılmadı. Kota bilinmiyor; API/ek kredi yok.
- Dal `claude/unity-pist-aktarimi`, taban `62e5ba6` (garaj kapanışı). Yalnız yerel commit; push/merge/yayın/uzun regresyon yok.

## Yapılan

- `Unity/Validation/export-tracks.mjs`: katalog dışa aktarıcısının yükleyicisiyle `pist-tanimlari`, `pist-ciz`, `pist`, `matematik` sabit SHA'dan bellekte çalışır. THREE'ye bağlı `bolgeler.ts`/`yarislar.ts` yüklenmez; kullandığı 12 bileşim satırı (bölge merkezi `c`, `mkTrack(off(recenter(...)))`, açık pist, kerb/rampa/çamur/su/asfalt, başlangıç `tp`) kaynakta birebir aranır, değişirse dışa aktarım durur.
  - `Assets/LastTurn/Resources/track-catalog.json` (1,05 MB): 6 zorluk seviyesi, 40 pistin ham TS tanımı (tarif/p, tema, el/ep/ek, j/m/w/as, tg/hp/ys, odulSn…), bölge merkezi, açıklık, `mkTrack` çıktısı P/T/S/N/len/hw. 6 kaynak dosyanın SHA256'sı.
  - `Validation/Reference/track-queries-0.8.18.json`: pist başına türetilmiş öğeler ve 56 sorgu örneği (48 pist çevresi + uzak nokta + 7 sınır `s`).
- Core `TrackGeometry` (saf): `nearest` (ipucu/tam), `idxAt`, `tp`, `bbox`, `turnAt`, `straightF`, `autoApex`, `kerbs`, `kerbProf`, `parcayaIzdusum`, `Hkerb`, `onTrack`, `atTrack`, `clearOf`, `gridNear`, `trackAt`, `curvAt`, `jumpH`. TS'deki global `ipucu.ti` yerine ipucu parametredir. Eğri üretimi (Catmull-Rom, tarif) C#'a yazılmadı; geometri TS çıktısıdır.
- Core `TrackCatalog`/`TrackDefinition`/`TrackLayout`: katalog yükleme ve bozuk veri reddi; tanımdan kerb, fren tabelası, rampa, çamur, su, asfalt ve başlangıç noktası (TS `mkReg` ve `EVENTS.g` ile aynı).
- `Editor/TrackReferenceComparison.cs` (saf C#, .NET projesi de derler), `TrackCompilationCheck` (her derlemede Mono karşılaştırması → `Logs/track-compilation.json`), `check-track-proof.mjs`.
- Geçici geliştirici görünümü **Last Turn → Pist Kataloğu**: 40 pist listesi (`gp_1` açık gelir), üstten pist kenarı/çizgisi, kerb, fren tabelası, rampa, çamur, su, başlangıç yönü; fare altındaki noktada en yakın nokta, izdüşüm s/d, kerb/rampa yüksekliği, çamur, eğrilik. Nihai tasarım değil.
- CI: `export-tracks.mjs --check` ve `--tracks` adımları eklendi (çalıştırılmadı).

## Kanıt

- `node Unity/Validation/export-tracks.mjs --check`: 40 pist, 13.287 nokta, 2.240 sorgu örneği; `gp_1` “Yeşil Vadi” N=397, 1491,283 m.
- `.NET --tracks`: **70.761 koşul**; en büyük TS–C# farkı **1,14e-13** (dp_3 S), tolerans 1e-9 (göreli, |x|>1). Düzen (5 tür × 1–8, açık yalnız rl/dg), `gp_1` referansı, bozuk veri reddi (farklı SHA, eksik nokta, açık/kapalı tutarsızlığı).
  - `gp_1`: N 397, yarı genişlik 12 m, 181 kerb noktası, 3 fren tabelası, başlangıç (−4067,50; 3108,20) yön 0.
  - Duyarlılık (geçici bozma, geri alındı): kerb kesiti 0,09→0,091 → “gp_2 kerb yüksekliği”; ipucu penceresi 40→39 → “gp_1 ipuçlu en yakın indeksi”; kerb eşiği 0,12→0,125 → “gp_3 kerb noktaları”. 0,12→0,121 yakalanmadı: 40 pistte o aralıkta dönüş açısı yok.
  - Düzeltilen kendi hatam: bölge merkezini spline sınır kutusundan denetlemiştim (TS `recenter` kontrol noktalarına uygulanır, 2,7 mm fark); TS `c` formülü denetimine çevrildi.
- Unity 6000.3.9f1 (UTC 09:36): `check-track-proof` 40 pist / 2.240 örnek / 70.745 koşul, en büyük fark **3,58e-12** (rl_7, Mono sayı okuma); `check-editor-proof` 27 Core; `check-catalog-proof`; GT Play **28/28** (09:35:38), Arazi **23/23** (09:35:57), Garaj **20/20** (09:36:13). Play menüleri Claude'un geçici, commit dışı tetik betiğiyle çalıştırıldı; betik silindi.
- Kısa regresyon: `--garage` 17.947, `--garage-storage` 66, `--garage-ui` 117; `export-catalog --check`, `validate-project` geçti. `--catalog` (uzun) koşulmadı: katalog kodu/verisi değişmedi.
- Geliştirici penceresi ekran görüntüsüyle gözlendi (gp_1 çizimi; yerel, commit dışı).

## Kapsam dışı / açık

- Bölge yüksekliği (`hS`, `Hb`, ralli tepeleri), yüzey `surf`, dekor/çarpışma ve sokak rotaları (MUTANT) bu aşamada yok. `TrackGeometry.Kerbs` TS gibi açık pistte de sarmalı kullanır (TS yalnız gp/dp'de çağırır).
- Pist Unity sürüş sahnesine bağlanmadı; yarış oturumu yok.

## Sonraki tek adım

Yarış planı 2. aşama: `yaris-kurallari`, `piste-donus` (pist dışı/kesme), `yildiz` saf C#'a, TS birim testlerinin girdileriyle oracle (`export-races` genişletmesi, `--race`).
