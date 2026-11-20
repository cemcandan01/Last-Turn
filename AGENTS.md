# Last Turn: ortak geliştirici rehberi (tek doğruluk kaynağı)

Claude Code, Codex ve diğer ajanlar bu dosyayı okur. `CLAUDE.md` yalnız buraya yönlendirir. Cem projeyi Claude ve Codex ile dönüşümlü geliştirir; kota bitince diğerine geçilir. **Ortak bellek sohbet değil bu repodur.** Kullanıcının güncel talimatları ve ortamın üst düzey kuralları her zaman önceliklidir.

## Okuma düzeni (token tasarrufu)

1. Bu dosya → `docs/DEVIR.md` (yalnız en üstteki güncel giriş) → işin görev kartı (`docs/isler/`).
2. Yalnız işin alanına ait belgeyi aç: `docs/ALANLAR.md` içindeki kendi bölümü, `docs/notlar/<alan>.md`, gerekli kod. Bütün rehber, skill ve geçmişi topluca yükleme.
3. `node scripts/calisma.mjs baglam <alan>` kısa başlangıç özeti verir.
4. **`docs/archive/` klasörünü istenmedikçe okuma.** Eski görev kartları, tarihli tasarım/ölçüm raporları ve eski rehberler orada; geçerli kural içermezler. Yalnız kullanıcı ya da görev kartı açıkça bir arşiv dosyasına işaret ederse oku.
5. `docs/DEVIR.md` uzun bir günlüktür; baştan sona okuma, ilk giriş yeter.

## Proje özeti

Last Turn: iPhone 13 için yatay ekranda oynanan 3D sürüş ve yarış oyunu. Asfalt, rallikros, ralli, drift ve drag yarış türleri; kariyer, garaj/modifiye, mağaza, hayalet, bulut kaydı ve MUTANT (roguelite) modu var. 15 araç, 40 pist.

- **Web dönemi (canlı, TypeScript + Vite + Three.js, `master`)**: `src/`, `tests/`, `README.md`, `docs/HARITA.md`, `docs/MIMARI.md`. Bu belgeler **web/TS dönemini** anlatır; Unity'yi içermez ve bazı sayıları güncel değildir (örn. `HARITA.md` “10 araç” der, gerçek sayı 15). Unity işinde TS belgeleri yalnız davranış referansıdır.
- **Unity geçişi (aktif geliştirme)**: Unity 6.3 LTS, `Unity/`. Hedef TS 0.8.18'in **işlevsel aktarımıdır**; görsel tasarım sonra baştan yapılacak. Kaynak referans `typescript-baseline-0.8.18` → `df3549e709469f0b519ebfbeaa9f63c1040fee05` (etiketi taşıma).
- Kullanıcı metni, kod yorumu ve commit mesajları Türkçe. Oyun arayüzünde emoji ve gerçek marka logosu yok.

## Unity mimarisi (kesin kararlar: `docs/UNITY-GECIS.md`, `Unity/AGENTS.md`)

Katmanlar yukarıdan aşağıya bağımlıdır, görünüm alt katmanları okur:

1. **Core**: saf C# kural/veri/kayıt/fizik (`GarageState`, `GarageSaveStore`, katalog, tekerlek/lastik çözücüsü). UnityEngine, girdi, kamera, sahne, arayüz yok.
2. **Komut + görünüm modeli**: saf C# (`GarageCommand`, `GarageViewModel`).
3. **Oturum/servis**: Unity yaşam döngüsü, dosya yolu, sahne geçişi (`GarageSession`).
4. **Görünüm**: UI Toolkit/IMGUI, HUD, primitive modeller. **Geçicidir**, nihai tasarım sayılmaz, beğeni kanıtı olarak sunulmaz.

Kurallar:
- Görünüm satın alma, fiyat, ödül, erişim, fizik veya kayıt kuralı içermez; katalog JSON anahtarı okumaz; yalnız görünüm modelini çizer ve komut verir.
- Yeni ekran önce saf görünüm modeli ve komutlarıyla .NET'te sınanır, sonra geçici görünüme bağlanır. TS ekranındaki her bilgi/işlem görünüm modelinde bulunur; gösterilmiyorsa kartta yazılır.
- Fizik sabit adımlı (1/60 sn, 8 alt adım) ve belirlenimcidir. TS sayısal modeli referanstır; motorlar arası bit eşitliği varsayılmaz, tolerans kartta yazılır. Taşınan kural için kaynak TS testi/ölçümü, C# karşılığı ve tolerans bağlanmadan davranış yeniden tasarlanmaz.
- Manuel vites yalnız Drag'da; asfalt, ralli, drift ve serbest sürüş otomatiktir.
- Aynı sahne/prefab/ScriptableObject'te tek yazan vardır. Yerel Input System ayarları ve Editor'ın mevcut değişiklikleri korunur; paket/Editor ayarlarına kapsam dışı toplu düzenleme yapılmaz.

## Klasör yapısı

| Yol | İçerik |
|---|---|
| `Unity/Assets/LastTurn/Scripts/Core/` | Saf C# çekirdek (kural, veri, kayıt, fizik) |
| `Unity/Assets/LastTurn/Scripts/{Garage,Ui,Prototype}/` | Garaj oturumu, ekranlar, prototip sürüş |
| `Unity/Assets/LastTurn/Editor/` | Editor doğrulamaları (`*PlayValidation.cs`) |
| `Unity/Assets/LastTurn/Resources/UI/` | UI Toolkit UXML/USS |
| `Unity/Validation/` | .NET/Node doğrulama projeleri ve kanıt denetçileri (`check-*-proof.mjs`) |
| `Unity/*.md` | Unity alan notları (YARIS, GARAJ, ARAC-KATALOGU, KARIYER-AKISI, TEST-PANELI, OYUNCU-TEST-REHBERI…) |
| `Unity/Builds/`, `Unity/Logs/` | Üretilen paketler ve kanıt raporları (git dışı) |
| `src/`, `tests/`, `index.html` | Canlı web/TS oyunu (referans) |
| `scripts/` | `calisma.mjs` (bağlam), `koordinator.mjs`/`ajan-yonlendirme.mjs` (plan/devir) |
| `docs/` | Kurallar ve aktif belgeler (aşağıda); `docs/archive/` eski kayıtlar |
| `docs/isler/` | Aktif görev kartları ve `LT-SYS-*` tasarım kartları |
| `docs/notlar/` | Alan başına kısa not (en çok 15 satır) |
| `docs/denge/` | Denge ölçümleri (kod/testler yollarına bakar, yerinde kalır) |
| `docs/tasarim/` | Aktif tasarım taslakları (menü, HUD, ekranlar) |
| `docs/regresyon/` | Regresyon durumu/raporları (`durum.json` iş akışlarınca okunur) |
| `.claude/skills`, `.claude/agents` | Claude'a özgü yordamlar ve alt ajanlar |

Kök dışı bilgi aranacak yer: `docs/HARITA.md` (web dosya haritası), `docs/MIMARI.md` (web mimarisi), `docs/ALANLAR.md` (alan kuralları ve tuzaklar), `docs/HUD.md`, `docs/DENGE.md`, `docs/UNITY-GECIS.md`, `docs/ORTAK-CALISMA.md`, `docs/SUREC.md`, `docs/CIHAZ.md`, `docs/FIREBASE.md`.

## Çalışma kuralları

### Her işe başlarken
- `git fetch origin`; görevde belirtilen konu dalını ve son commit'i doğrula. Yeni iş `origin/gelistirme`den konu dalına açılır. Başka ajanın işini ezme; aynı görevde tek aktif uygulayıcı olur. Kirli çalışma ağacındaki başkasına ait değişiklikleri commit'e alma.
- İstekten 3–5 gözlenebilir kabul ölçütü çıkar, `docs/isler/`de tek kart tut; revize aynı karta eklenir. Teknik ayrıntıyı kullanıcıya yazdırma. Sonucu değiştiren eksik bilgi varsa soruları tek turda topla; açık küçük işte onay bekleme.

### Değişmez kurallar
- Oynanış, tasarım, mimari ve kayıt uyumu kararları korunur. Ayrıntı: `docs/GELISTIRICI-AYRINTILARI.md` → “Genel kurallar ve tuzaklar”, “Kullanıcının kararları” (yalnız işe değen kısım). Fizik/çekirdek saf ve belirlenimci kalır.
- Cem “mesela/örneğin” diyerek bir sorun gösterdiğinde bunu genel davranışın örneği say; aynı sorunu bütün ilgili araç/ekran/türlerde araştır; kapsananları kartta ve testte belirt.
- İş kapsamı dışında oynanışı değiştirme. Büyük/öznel tasarımda önce referansı ve beklenen örnek davranışı netleştir; test geçmesi görsel beğeninin kanıtı değildir.
- Araç, parça, pist, XP/para, yıldız veya yeni oynanış mekaniği değişecekse önce `docs/DENGE.md`yi oku; rolü, hedef kupa/kurulumu, edinme süresini ve gerçek performans etkisini karta yaz. Tasarım önerisini ölçülmüş sonuç sanma, kullanıcı kararını sessizce değiştirme.
- Kod ve yorum disiplini: değişiklik yalnız gerekeni kapsar, çevredeki kodun stiline uyar.
- Test atlama, bozuk testi kapatma, boş test koşumunu başarı sayma yok. Aynı commit/ortam/kapsamın başarılı doğrulamasını yeniden kullan; kod, bağımlılık veya hedef dal değişince etkilenen kontrolleri yenile. Ağ engelini tekrar indirerek çözmeye çalışma; kanıtı kaydet.

### Ajan kullanımı
- Codex ve Claude Code eşit yetkilidir; kalıcı hiyerarşi yok, görev sahibi göreve göre seçilir. Küçük işe ajan zinciri kurma. Bağımsız/riskli işte sınırlı keşif/test/denetim rolleri kullan; aynı dosyayı eşzamanlı düzenletme. Ana bağlama tam log yerine sonuç ve hata satırlarını al.
- Plan/devir yordamı: `docs/ORTAK-CALISMA.md` → “Yerel koordinatör”. Kapasite verisi yoksa “bilinmiyor” yaz; açık onay olmadan API/ek krediye geçme. Yeni görev/devir sistemi kurma.
- Claude'a özgü araçlar (skill, alt ajan, merkez, bildirim, sohbet) yalnız o ortamda varsa kullanılır; olmayan aracı yapılmış sayma. Zamanlanmış görev gerçekten kurulmadıkça gece regresyonu vaat edilmez.

### Dallar ve yayın (özet; ayrıntı `docs/SUREC.md`)
Konu dalı → ilgili kontroller → `gelistirme` (deneme yayını) → regresyon → `master` (canlı). Oyun değişikliği denemeye girerken yama +1; yalnız süreç/belge değişikliğinde oyun sürümü artmaz. `master`a canlı çıkış regresyon ve kullanıcı onayı ister; konu dalları `master`a yazmaz. Rebase ve force-push yok. Unity'de özellik PR'ları `gelistirme`yi hedefler; tam regresyon ve canlı geçiş için önceden Cem onayı gerekir.

## Test ve regresyon

- **Kapsam değişikliğe göre belirlenir**: normal durum + kritik sınır + önceki hata. Kabul ölçütlerini erken tasarla. Küçük revizede tam alanı tekrarlama. Risk bazlı kapsam: `docs/ORTAK-CALISMA.md`.
- **Tam regresyon yalnız Cem istediğinde** koşulur; kendiliğinden başlatma, “biraz da regresyon koşayım” deme.
- **Oyunu görünür pencerede açma.** Unity doğrulamasında gerekiyorsa `-batchmode` kullan; Editor küçültülmüşken mevcut oturumu korumak için ayrı proje kopyasında `-batchmode -executeMethod LastTurn.EditorValidation.<Sınıf>.StartBatch` çalıştır ve sonucu ilgili `Unity/Validation/check-*-proof.mjs` ile doğrula. Ekran görüntüsü gerekiyorsa batchmode ya da headless yolu kullan.
- Unity dosyası değişince önce: `node Unity/Validation/validate-project.mjs`, `export-*-reference.mjs --check` betikleri, `dotnet run --project Unity/Validation/LastTurn.Core.Validation.csproj --configuration Release` (tam liste `docs/UNITY-GECIS.md` → “Doğrulama”). Bunlar Editor derlemesi veya gerçek cihaz testi yerine geçmez; sahne/oynanış değişikliğinde ilgili Play doğrulaması da gerekir.
- Web/TS: `npm run kontrol` (tip+ESLint+biçim), `npm test` (vitest), `npm run alan -- <alan>` (alan senaryoları), `npm run duman` yalnız regresyonda. İş akışları ve yordamlar: `.claude/skills/oyun-test/`, `surum-yayinla/`.
- Kanıt kaydı: kapsam, sonuç ve ham kanıt yolu görev kartında; ham log ana bağlama kopyalanmaz.

## Bitirme ve devir

Bitirirken görev kartına sahip, dal, son SHA, test kapsamı + sonuç + kanıt, açık engel ve tek sonraki adımı yaz; `docs/DEVIR.md`yi güncelle (yeni giriş en üste). Yerel / push / CI / deneme adresi / canlı durumlarını ayrı doğrula. Kullanıcıya kısa sonuç ver.

## Açık sorunlar ve bekleyen kararlar

- Çalışma ağacında (`codex/unity-p7-garaj`) Pit menü tasarımı ve diğer UI/Recovery dosyaları commit edilmemiş; kart `docs/isler/2026-11-14-profesyonel-menu.md`. Başkasının yarım işini commit'e alma.
- Son paketler (atölye, rota, kupa, sürüş tepkileri) için **insan görsel/sürüş/eğlence/zorluk kabulü açık**; rota ödül dengesi ve ses beğenisi ölçülmemiş. Kart: `docs/isler/2026-11-16-surukleyici-dongu.md`.
- Dış ayar ve cihaz kabul maddeleri: `docs/FIREBASE.md`, `docs/CIHAZ.md` (9 Kasım devir kaydına göre gerçek Google girişi tek dış ayar bekliyordu; güncelliği doğrulanmadı).
- Skill'ler (`.claude/skills/yonlendir`, `regresyon`, `merkez`, `surum-yayinla`) “yönetmen sohbeti” ve gece 00:00/04:00 otomasyonunu varsayar; bu varsayımlar bu belgedeki kurallarla çelişir ve ayrıca ele alınacaktır (şimdilik değiştirilmedi).
- `docs/notlar/` bazı dosyaları 15 satır sınırını aşıyor (`modifiye.md`, `unity.md`).
- `SUREC.md` “Özet CLAUDE.md → Dallar ve yayın” der; bu özet artık yukarıdaki “Dallar ve yayın” bölümündedir.
