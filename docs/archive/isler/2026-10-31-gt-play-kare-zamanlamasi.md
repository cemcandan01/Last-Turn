# Teknik borç: GT/Arazi/Garaj Play doğrulamalarının kare zamanlamasına bağlılığı — 31 Ekim 2026

Durum: **açık, kayıt** (yarış testlerini etkilemediği için düzeltilmedi). Sahip: atanmadı. Kaydeden Claude.

## Gözlem

- 31 Ekim 12:20: aynı kaynakla GT Play 1. koşu “Input System A → kaynakta sol dönüş”te kaldı, 2. koşu 28/28 geçti. 120 adım sonu hız 16,0 / 22,7 m/s, fren sonu 3,45 / 5,76 m/s. Kanıt `tests/cikti/unity-garaj/gt-play-ilk-kalan.json`.
- 31 Ekim 13:3x: Unity'de Game görünümünü örten bir Editor penceresi (Claude'un açtığı Pist Kataloğu) açıkken GT “Geri motor kesicisi 3000 RPM” kontrolünde kaldı. Başka koşularda GT, Arazi ve Garaj 60 sn zaman aşımına uğradı. Pencere kapanınca dördü de ilk koşuda geçti.

## Neden (ölçümle desteklenen yorum)

GT/Arazi doğrulayıcıları girdiyi Input System'e kuyruğa koyar. Fizik `GtPrototype.Update` içinde `Time.deltaTime` kadar ilerler (kare başına 0–6 adım, 0,1 sn sınırı). Kontroller ise `EditorApplication.update`te “en az N adım geçti” diye yapılır. Kare süresi değişince (odak, örtülen Game görünümü, Editor takılması) kontrol anındaki adım sayısı ve hız değişir; eşiğe yakın kontroller aralıklı kalır ya da süre dolar. Fizik belirlenimci kalır: aynı koşudaki 30/60/120 FPS tekrar bit düzeyinde eşit.

## Yarış testleri etkileniyor mu

Hayır. `RacePlayValidation` ve `--race-drive` sabit adımları kendisi verir (`GtPrototype.StepRace`, `RaceRun.Step`); her zincirde aynı sonucu verdi (2:14.6, 2★). Pist derleme kontrolünün Play'e girişte koşması kaldırıldı (dar düzeltme, Paket B).

## Önerilen dar düzeltme (ayrı iş)

Doğrulama süresince `Time.captureDeltaTime = 1/60` (kare başına tam bir adım), çıkışta 0. Kontroller “tam N adım”a bağlanır; zaman aşımı gerçek süre yerine adım sayısıyla. Gerçek oyuncu `Update` yolu (Input System → runner) korunur. Kabul: Game görünümü örtülüyken ve odak dışındayken 5 ardışık koşu aynı hız/kontrol değerleri.
