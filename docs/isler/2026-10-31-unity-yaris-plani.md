# Unity yarış sistemi aktarım planı — 31 Ekim 2026 (yalnız plan, kod yok)

Kaynak TS 0.8.18 `df3549e709469f0b519ebfbeaa9f63c1040fee05`. Hazırlayan Claude (garaj görevinin devamında). Oyun kuralları yeniden tasarlanmaz; her kural TS kaynağından otomatik dışa aktarılır ya da TS testi/oracle ile eşlenir. Görsel kalite kapsam dışıdır (`docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı”).

## 1. Modül envanteri

| TS modülü | Satır | İçerik | Saflık | Unity durumu |
|---|---|---|---|---|
| `oyun/yarislar.ts` | 492 | `TYP` 5 tür (tur, önayar, hız `v`), `EVENTS`/`SOKAK_ETKINLIKLERI`, `startEvent`, `evTick` (tur sayma, A→B bitiş, drag tuzak hızı), `endEvent`, yeniden başlat/piste dön/çık | **Karışık**: kural + DOM (`note`, `gizle`, `sonucGoster`) + profil + hayalet + MUTANT | Yok. Kural kısmı saf durum makinesine ayrılarak taşınır |
| `oyun/yaris-kurallari.ts` | 209 | Drift kombo/çarpan/bankalama, x6, ters sürüş | Saf | Yok — birebir taşınır |
| `oyun/piste-donus.ts` | 101 | Pist dışı sayacı (1 sn), pist kesme (15/10 m) | Saf | Yok — birebir |
| `oyun/yildiz.ts` | 56 | Tür→anahtar, eşikler (`tg`/`hp` + `ys`), yıldız sayma, `DRIFT_TUR=2` | Saf (+ `lt_yildiz` depo) | Anahtar eşlemesi `GarageState`te var; eşik/sayma yok |
| `oyun/kariyer.ts` | 105 | Aşama, bütçe, hedef kurulum, yıldız kapısı, dakika başı para/XP | Saf | **Var**: katalog `career` + `CareerRule/WithinBudget/CareerEligible/StarGate/Reward` (640 ödül, 160 kapı doğrulandı) |
| `oyun/ekonomi.ts` / `ilerleme.ts` | 88 / 529 | Yarış ödülü, `yarisBitti` (yıldız→XP/para) | Saf | Ödül formülü var; `yarisBitti` defter işlemi `GarageState`e eklenecek |
| `dunya/pist-tanimlari.ts` | 816 | 40 pist (`TDEF`): tür, lv, sev, tarif/kontrol noktası, rampa, çamur, su, asfalt aralığı, `tg`/`hp`/`ys` | Veri | Yok — otomatik dışa aktarım |
| `dunya/pist-ciz.ts`, `pist.ts` | 139 / 361 | Tariften nokta, Catmull-Rom, `nearest`, kerb, rampa yüksekliği, `onTrack` | Saf matematik | Yok — örneklenmiş geometri dışa aktarılır, sorgular taşınır |
| `dunya/bolgeler.ts`, `dunya.ts`, `kurucu.ts` | 540 / 94 / 215 | Pist başına bölge, ofset, yükseklik `Hw`, yüzey, çarpışma ızgarası, başlangıç `g` | Karışık (THREE) | `TerrainTestWorld` örneği var; gerçek bölge dünyası yok |
| `oyun/hayalet-kayit.ts`, `uzak.ts` | 119 / 157 | En iyi tur girdi kaydı, rekor hayaleti | Saf kayıt + çizim | Belirlenimci girdi kaydı Unity fiziğinde var; hayalet yok |
| `yz/*`, `oyun/rakip.ts` | 664 / 152 | YZ rakip (pilot, çizgi, kişilik); yalnız MUTANT/düello | Saf YZ + oyun bağı | Yok — kariyer yarışını etkilemez, sonraki aşama |
| `oyun/surus.ts`, `dongu.ts` | 206 / 404 | Sabit adım → `evTick` sırası, tur sayacı | Karışık | `PowertrainFixedStepRunner` var; yarış bağı yok |
| `arayuz/sonuc.ts`, HUD | — | Sonuç ekranı, tur/puan göstergesi | Sunum | Geçici görünüm, görünüm modeliyle |
| MUTANT, sokak (Kule Şehri), sinematik | 2000+ | Ayrı mekanikler | Karışık | Bu planın dışında; ayrı görev |

## 1b. Bağımlılık grafiği (sabit SHA'daki `import`lardan)

```
cekirdek/matematik ─┬─ dunya/pist-ciz ── dunya/pist-tanimlari ─┬─ oyun/kariyer ── oyun/ekonomi
                    ├─ dunya/pist ───────── oyun/piste-donus    ├─ oyun/yildiz (+ cekirdek/depo)
                    │                                           └─ oyun/ilerleme (+ kariyer, yildiz, profil, parcalar)
oyun/yaris-kurallari  (bağımsız, import yok)
oyun/hayalet-kayit ── fizik/girdi-kaydi, fizik/tipler, depo
oyun/yarislar ── yukarıdakilerin hepsi + DOM (cekirdek/dom, arayuz/bildirim|kontroller|sonuc), dunya/bolgeler,
                 surus, profil, uzak, rakip, mutant-denge, cizim/sokak-kapilari
```

Sonuç: yaprak modüller (`yaris-kurallari`, `pist-ciz`, `pist`) önce taşınır ve bağımsız test edilir. `pist-tanimlari` → `yildiz`/`piste-donus` ikinci katmandır; `kariyer`/`ekonomi` Unity'de zaten var (`araclar` + `performans` katalog içinde). `ilerleme`nin yarış kısmı (`yarisBitti`) `GarageState`e eklenir; `profil` (yarış/kazanma sayaçları) yeni saf alan olarak aynı kayıt zarfına girer. `yarislar` en son ve **tek parça taşınmaz**: kural kısmı `RaceSession`a, DOM/bildirim kısmı olay listesine, `uzak`/`rakip`/`mutant-denge`/`sokak-kapilari` bağları ilk dilimde dışarıda kalır (açıkça “yok” olarak yazılır). `dunya/bolgeler` (THREE bağımlı) ilk dilimde yalnız pist ofseti/başlangıç noktası olarak dışa aktarılır.

## 2. Otomatik dönüştürme

`Unity/Validation/export-races.mjs` (katalog dışa aktarıcısının deseni: sabit SHA'dan modül yükleme + SHA256 kaynak manifesti + `--check`):

1. `TYP`, `TDEF` ham alanları ve `EVENTS` sırası (indeks = TS etkinlik no) → `Resources/race-catalog.json`.
2. Her pist için TS'nin kendi `pistNoktalari → recenter → off → mkTrack` zinciri Node'da çalıştırılır; `P/T/S/N/len/hw/open/kb`, rampalar ve yüzey aralıkları **örneklenmiş** olarak yazılır. C# eğri üretimini yeniden yazmaz, yalnız sorgular (`nearest`, `pistKonumu`, `onTrack`, `jumpH`) taşınır ve TS çıktısıyla karşılaştırılır.
3. Yıldız eşikleri (`yildizEsikleri`), sınır/hedef süre (`limit`) ve başlangıç noktası `g` TS fonksiyonlarından hesaplanmış değer olarak yazılır.
4. Bölge yükseklik/yüzey sorgusu (`Hw`, `surfW`) için pist başına ızgara örneği + kaynak fonksiyonun C# karşılığı; ızgara yalnız oracle'dır.

## 3. Aktarım sırası

1. **[Tamamlandı 31 Ekim — `docs/isler/2026-10-31-unity-pist-aktarimi.md`, dal `claude/unity-pist-aktarimi`; tolerans 1e-9, bölge yüksekliği/yüzey sonraki aşamaya kaldı]** **Veri + geometri:** `export-races.mjs`, `RaceCatalog` (saf), pist sorguları. Ölçüt: 40 pist, her pistte N nokta/uzunluk/en yakın nokta TS ile 1e-9 m.
2. **Saf kurallar:** `yaris-kurallari` (drift/ters), `piste-donus` (pist dışı/kesme), `yildiz`. Ölçüt: TS birim testlerinin girdileriyle aynı olay dizisi ve puan.
3. **Yarış durum makinesi:** `RaceSession` (saf) = `startEvent` kural kısmı (kilit, kariyere uygunluk → `deneme_` anahtarı, yarış lastiği, geri sayım 3 sn) + `evTick` (tur/armed/prev, A→B ve drag bitişi, tuzak hızı) + `endEvent` (yıldız, ödül, kazanma). DOM/not çağrıları olay listesine dönüşür (`RaceEvent`: TUR, KOMBO YANDI, x6, PİSTE DÖNDÜN, PİST KESME); sunum bunları gösterir.
4. **Ekonomi bağı:** `GarageState.RaceFinished(tür, lv, yıldız)` = TS `yarisBitti` (önceki en iyi yıldız, `yildizKaydet`, para+XP). Kariyer dışı (`kariyer=false`) ödülsüz. Kayıt `GarageSaveStore`'un aynı zarfı; yeni alan yoksa sürüm artmaz.
5. **Sürüş bağı:** nötr `DriveRequest` (araç kurulumu + yarış türü + pist) — `GtPrototype`'ın `GarageSession` bağımlılığı burada kalkar. Pist dünyası `IVehicleWorld` olarak, önce düz/örneklenmiş yükseklikle.
6. **Geçici sunum:** etkinlik listesi, geri sayım, tur/puan HUD'ı, sonuç ekranı — yalnız görünüm modelleri.
7. Sonra: hayalet/rekor, YZ rakip (MUTANT), sokak yarışları, MUTANT.

## 4. Test stratejisi

- **Oracle:** sabit SHA'dan TS modüllerini doğrudan çalıştıran `export-races.mjs --check`; sonuç JSON'u `Validation/Reference/race-*-0.8.18.json`. TS kaynağı değiştirilmez.
- **Saf kural matrisi (.NET `--race`)**: TS `yaris-kurallari`, `piste-donus`, `kesme`, `yildiz`, `pistler`, `kariyer`, `ekonomi` birim testlerinin girdileri + üretilmiş sınır vakaları (tur eşiği N·0.4/0.6/0.8/0.2, drag `N−1`, A→B `N−4`, eşik tam değerleri, x6 oranı, 1 sn pist dışı, 15 m kesme).
- **Durum makinesi izi:** kayıtlı sentetik konum/hız dizileri (fizikten bağımsız) TS `evTick` ve C# `RaceSession`a verilir; olay sırası, tur zamanları, puan, bitiş anı eşit. Ardından gerçek fizikle kısa tur, 30/60/120 FPS bit eşitliği.
- **Ekonomi:** `endEvent` → ödül → defter, mevcut garaj işlem matrisine yeni adım türü olarak (`export-garage.mjs`); tekrar yarışta önceki yıldız kuralı.
- **Editor:** kısa Play — bir asfalt yarışı (gerçek 3 tur kuralı, ilerleme sentetik konumla hızlandırılır), bir A→B ralli, bir drag; sonuç ekranı ve kayıt yeniden açma.
- Tolerans: geometri 1e-9 m, süre/puan tam eşit (aynı adım sayısı), sınıf/para/XP tam eşit.

## 5. Riskler / açık sorular

- `yarislar.ts` kural ile DOM'u karıştırıyor; ayırırken davranış değişmemeli (özellikle `endEvent` içindeki `PROF.races/wins` ve hayalet kaydı sırası).
- `Hw` yükseklik fonksiyonu ve bölge dekor çarpışması büyük; ilk aşamada çarpışma yok sayılırsa bu açıkça yazılmalı.
- Drift yarışı `driftYarisProfili` ve otomatik drift kurulumu fizik tarafında; Unity'de yok.
- Drag için manuel vites kararı (`docs/UNITY-GECIS.md`) ayrı tasarım işidir; ilk aktarım TS otomatik drag davranışını korur.
- **Karar gerekirse Cem'e:** ilk dilimde hangi tür (öneri: asfalt `gp_1`, sonra `rl`, `dg`, `rx`, `dp`).
