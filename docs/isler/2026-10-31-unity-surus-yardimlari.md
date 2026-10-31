# Unity sürüş yardımları ve drift oynanışı — 31 Ekim 2026

## İstek ve kabul (Cem)

TS 0.8.18 yardım seviyeleri ve davranışları Unity'ye; `norm` varsayılan, `real` seçilebilir, TS'deki diğerleri korunur; yardımlar veri/fizik katmanında; tercih kalıcı; GT/Arazi kabul edilmiş davranışı sessizce değişmez; drift fiziği + yardım + puan bağlı, drift otomatikleşmez, eşikler düşmez; basit geliştirici ayarı; sayısal rapor.

1. TS tam simülasyonuyla aynı girdi → aynı yol (yardımsız ve üç seviye).
2. Tercih garaj kaydında; eski kayıt `norm`; bozuk değer reddedilir.
3. GT/Arazi prototipi (yardım parametresi yok) bit düzeyinde aynı.
4. Drift puanı ve yıldız gerçek fizik + gerçekçi girdiyle ölçülür ve raporlanır.

## Sahiplik / Git

Sahip/uygulayıcı Claude; dal `claude/unity-surus-yardimlari` (taban `74546cf`). Yalnız yerel commit.

## TS'de bulunanlar

- `LEVELS` (veriler.ts): **arc** (Eğlence), **norm** (Dengeli), **real** (Gerçekçi) — grip, str, stm, tcs, abs, dft, ini, acc, bra; önayar `ast`/`cap` ile sınırlanır. TS oyuncu varsayılanı `real`; Unity varsayılanı Cem kararıyla `norm`.
- Daha önce Unity'de olanlar: acc (güç), bra (fren), grip (lastik), ABS, TCS kayma sınırı.
- Bu işte taşınanlar: `ortak.ts driftPenceresi` (kariyer dalı: el freni / drift desteği / başlatma ile giriş, açı yönetimi, spin, `DR.k`), `driftSiniri`; model.ts lastik drift yumuşatması `kz` ve `ini` arka tutuş; direksiyonda `str` (+%12) ve drift desteğinin karşı direksiyon karışımı + yalpa hedefi `wd`; alt adımda viraj desteği (`kin`, `al`), denge (`esc`), drift yalpa desteği (`dw`); driftte hız koruma; TCS gövde açısıyla gaz kesme (yalnız yardımlı araçta, aşağıya bkz.). Kariyer drift algısı artık TS gibi `DR.on || |β| > 0,5`.

## Yapılan

- Core: `DrivingAssists` (PowertrainParameters.Assists; katalog kurulumundan), `DriftAssistState` + `PowertrainVehicle.DriftWindow`, `AssistCommand` (VehicleCommand), FourWheelVehicle lastik/kuvvet/hız koruma dalları. Yardım parametresi yoksa (GT/Arazi prototipi) hiçbir dal çalışmaz.
- **TCS gaz kesme kararı:** Cem'in `201d7b3` GT düzeltmesi TS'nin gövde açısıyla gaz kesmesini kaldırmıştı. Yardımsız GT/Arazi prototipinde bu düzeltme aynen kalır; TS yardımlarıyla kurulan garaj/yarış araçlarında TS davranışı (gaz kesme, drift ve el freni hariç) uygulanır. Kesmeden TS ile `norm`/`arc` 5,4–21 m sapıyor; kesmeyle 5e-12. Cem'e karar: yardımlı araçta da kaldırılsın mı.
- Kalıcılık: `GarageState.AssistLevel` (kökte `assistLevel`; kayıt sürümü değişmedi, alan yoksa `norm`), `GarageCommand.SetAssistLevel`, `GarageViewModel.AssistLevels`; garaj ekranı üstünde geçici seçici (Eğlence/Dengeli/Gerçekçi). Garaj sürüşü, yarış ve hayalet bu seviyeyle kurulur (hayalet kendi seviyesini saklar).
- Doğrulama sürücüsü: klavye kipi (direksiyon −1/0/1, gaz/fren 0/1) ve klavye drift tekniği (virajda tam direksiyon + gaz, kayma ~0,45–0,8 rad, aşınca karşı direksiyon). Yıldız eşikleri değiştirilmedi.
- Oracle `export-assists.mjs` → `Reference/assists-0.8.18.json` (TS `Simulasyon.adim` + gerçek `kurulumYap`, düz asfalt; araç 10 ve drift aracı 2 × yardımsız/real/norm/arc × 3 betik × 700 adım). `.NET --assists`, `--assist-levels`. CI'ye `export-assists --check` ve `--assists`.

## Kanıt

- `--assists`: **24 durum / 11.760 koşul, en büyük fark 5,1e-12** (konum, yön, hız, `DR.k`, `DR.on`); drift aracının el freniyle drift yardımına girdiği durumlar dahil. Kalıcılık: varsayılan norm, real/arc, gidiş-dönüş, eski kayıt norm, bozuk değer reddi.
- `--assist-levels` (gerçek fizik, `tests/cikti/unity-yaris/assist-levels.txt`):

| Seviye | Araç 10 0–100 | 100–0 | gp_1 | rx_1 | Drift analog | Drift klavye (8 pist) |
|---|---|---|---|---|---|---|
| real | 12,97 sn | 18,5 m | 2:14.2 2★ | 2:27.7 2★ | 0★ | **1★** (dp_1 1129/700) |
| norm | 11,18 sn | 15,7 m | 2:11.8 2★ | 2:22.0 2★ | 0★ | 0★ (en iyi dp_8 887/5000, dp_3 456/1600) |
| arc | 9,83 sn | 14,0 m | 2:10.0 2★ | 2:19.7 2★ | 0★ | 0★ |

  Klavye drift puanları (real/norm/arc): dp_1 1129/325/243, dp_2 349/205/31, dp_3 362/456/12, dp_4 393/589/21, dp_5 327/177/140, dp_6 555/262/11, dp_7 261/231/34, dp_8 240/887/29. Yorum: `arc`/`norm`'daki denge ve viraj desteği (`stm`, `str`) kaymayı söndürür; drift desteği yalnız DR açıkken etkilidir; doğrulama sürücüsü basit olduğundan yüksek puan/yıldız gerçek oyuncu becerisine kalır. Eşikler ve TS yardımları değiştirilmedi.
- `--race-all` norm yardımlarıyla: **40/40 pist bitti** (gp 4, rx 4, rl 4, dg 8 yıldızlı; rl_3 TS'deki gibi araç 12 yokuşta kalır, araç 3 ile 3★).
- Regresyon: varsayılan teker/gövde/motor (18 PASS), `--gt-physics`, `--dirt-stability` (bit düzeyinde aynı), `--garage*` (garaj TS işlem matrisi 18.107 koşul, `assistLevel` alanıyla), `--catalog` **983.569 koşul** (katalog kodu değiştiği için koşuldu; önceki sonuçla aynı), `--tracks`, `--race-rules`, `--race-session`, `--race-types`, `--race-drive` (gp_1 2:11.8, hayalet bit eşitliği).
- Unity 6000.3.9f1 Play (UTC 13:43), son kodla: **Yarış 69/69** (gp_1 2:11.8, rx_1 2:23.3, rl_1 0:58.1, dp_1 1:51.5 klavye drift 529 adım / 110 puan, dg_1 0:11.3), **GT 28/28**, **Arazi 23/23**, **Garaj 20/20**; editor (34 Core), katalog, pist kanıtları geçti. Unity derlemesinde ilk denemede `System.Linq` eksikti (.NET örtük ekliyor); düzeltildi.

## Kayıt altına alınanlar / kapsam dışı

- `rl_3` içerik dengesi: `2026-10-31-rl3-icerik-dengesi.md` (değer değiştirilmedi).
- Drag manuel vites: ayrı kart, başlanmadı; diğer türlere eklenmedi.
- Dekor/bariyer çarpışması, rakipler, görsel yenileme: kapsam dışı.
- Ayar ekranı geçici (garaj üst satırı); kalıcı tercih garaj kaydında, ekrandan bağımsız.

## Cem kararları (31 Ekim)

- TCS: TS 0.8.18 eşdeğer davranış korunur (yardımlı araçta gaz kesme); GT/Arazi düzeltmesi geri alınmaz. Gaz tepkisi manuel sürüşte değerlendirilecek; katsayı/yardım değişmez.
- Drift: yıldız eşikleri değişmez. **Tasarım inceleme konusu:** Gerçekçi seviyede driftin daha kolay sürdürülmesi; Dengeli/Eğlence drift deneyimi manuel oynanış testinde değerlendirilecek.

## Sonraki tek adım

Cem kararı: yardımlı araçta TCS gaz kesme (TS) korunsun mu; ardından drift oynanışını gerçek oyuncuyla elle değerlendirme (`Unity/YARIS.md`).
