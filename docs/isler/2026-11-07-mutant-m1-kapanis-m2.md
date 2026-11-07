# Mutant 2.0 — M1 kapanışı ve M2 ilk dilim

- Başlangıç: `codex/unity-p7-garaj` / `b465ec8`; mevcut çalışma ağacında yalnız5 `_Recovery` dosyası var. Tek Codex; yeni ajan/Claude/ücretli araç yok. Kota pencereleri bilinmiyor.
- Kullanıcının ekli “M1 KAPANIŞI VE M2 ÖDÜL SİSTEMİ” talebi. Önceki M0/M1/HasarAlindi/F2/B/C teslimleri yeniden yapılmaz.
- Kaynak kararları: `docs/tasarim/mutant-2-m0.md`, `mutant-2-matris.md`, önceki M1 kartı, DEVIR ve güncel Core. Sunum kuralları saf Core'da; UI yalnız modeli okur.

## Teslim A — kapı

1. Geçerli izi değişiklik öncesinde kaydet; gerçek skill hasarı ve sonraki-adım enerji geçişi.
2. Aynı HasarVerildi zarfı yeni Seq ile tekrar enerji vermez; ayrı gerçek vuruşlar/miktarı eşit olaylar bağımsızdır; clone/sonraki-adım kök/ebeveyn korunur.
3. Döngü sınırı/FPS30/60/120 ve eski TS karşılaştırmaları korunur; dar .NET ve gerçek izole Unity Play.
4. A kanıtı ve ayrı yerel commit tamamlanmadan M2 uygulanmaz.

## Teslim B — sınır

1. Mevcut katalogları okuyan ortak ödül tanım/sunum modeli; dört nadirlik, seviye/yükseltme/evrim ve lanet ayrı. Metadata eksik/eskiyse güvenli varsayılan.
2. Üretim RNG/ödül havuzları/ağırlık/fiyat/XP değişmez. Tohumlu küçük aday karşılaştırması ayrı laboratuvar testidir; sayılar üretim kararı değildir.
3. Modelden beslenen yeniden kullanılabilir UI Toolkit kartı: Türkçe, koyu/turuncu F, nadirlik çerçevesi+metin+sembol ve sayısal etki; kalan8 ekran taşınmaz. Game View kanıtı1280/1920.
4. Dolu yuva/havuz tükenmesi/tekrar ödül, eski/bozuk metadata, deterministik teklif ve gerçek veri/kart uyumu dar testlerle doğrulanır.
5. B kanıtı ve ayrı yerel commit; DEVIR güncel; sonra dur. Push/merge/yayın, uzun regresyon, yeni skill/denge/ödül ekonomisi, yeni paket ve oyuncu/Firebase kayıt işlemi yok.

## Teslim A sonucu

- Tamam: `MutantSkills.Context.Damage` ve yanma hasarı gerçek pozitif vuruş üretildiğinde ayrı `dealt/N` kimliği alır. Bildirimin clone'u kimliği korur; HasarVerildi enerji tüketicisinde olay kimliğiyle tekilleşir. HasarAlindi kök tekilleştirmesi korunur. Farklı gerçek vuruşlar aynı miktarda olsa da yeni kimlik alır. Ödül/hasar/bekleme parametreleri ve legacy JSON'a alan eklenmez.
- Önce `b465ec8` üzerindeki60 geçerli durum önceki tam fixture ile birebir karşılaştırıldı;4 kaynak ve60 durum hash'i `Unity/Validation/Reference/mutant-given-before.json` içine kaydedildi. Record seçeneği son test koşucusundan çıkarıldı; beklenen iz yeniden yazılmaz.
- .NET `--mutant-damage` **31**, enerji oracle **971.504**, skill oracle **181.774** koşul geçti. Eski60 durum30/60/120 FPS'de aynıdır; hem alınan hem verilen hasarın replay kimlik izleri de aynı. Skill vurduğu adımda enerji oluşmaz, sonraki adımda4 hasar→2 enerji; bekleme dolduktan sonra yeni Seq replay0, başka gerçek vuruş+2;60 tekrar enerji üretmez. Kök/ebeveyn/türev ve clone doğrulandı.
- Unity gerçek batch Play **41/41**,UTC `2026-11-07T19:54:07.2786280Z`, **0 çalışma hatası /0 Editor tanısı**.158 C#/USS/JSON hash'i ana kaynakla eşleşti. Başlangıç→açık dünya→normal adaptör→menü; gerçek skill çekirdeği ve Controller; kariyer/profil/kalıcı JSON koruması. İzole test ürünü ve bulut kapatma bayrağı, ana Editor'a Play/Stop yok. Kanıt `Unity/Logs/mutant-given-play.json` / `mutant-given-editor.log`; .NET `tests/cikti/mutant-damage-proof.json`. Bunlar yerel/ignore; senaryo ve önceki iz commit'te.
- Sınır: typed zarf ve kimlikli clone akışı korunmalıdır; ham JSON'dan kimlik yeniden türetilmez. Canlı koşu diskten devamı veya ağ anti-cheat sistemi değildir. Replay'nin başka skill tüketicilerine etkisi genel olarak yeniden tasarlanmadı; yalnız enerjiye ikinci ödül kapandı. UI/grafik kabulü yok.
- Bu satırlarla aynı yerel A commit'i alındıktan sonra yalnız M2 ilk dilimi uygulanacak. Diğer M1/P7 işleri tekrar edilmedi; `_Recovery` korundu.

## Teslim B sonucu — durma noktası

- A commit'i **`95e66b2`**, B kod/test/tasarım commit'i **`b06cf54`**. Son devir bu kartı güncelleyen kapanış commit'indedir. İkisi ayrı yerel commit grubudur; push/merge/yayın yapılmadı.
- `MutantRewards` ve `MutantRewardCard`:94 tanım, gerçek ad/açıklama/kind, kaynak, seviye/yükseltme/evrim/eklenti ayrımı; `VehicleCatalog/MutantVehicle/MutantSkills.Parameters/SkillOffers` servislerini kullanır. UI iş kuralı hesaplamaz; alma komutu/RNG üreticisi değildir.94 üyeli schema1 yan metadata dosyası, bozuk/eski/eksik içerikte Yaygın+tanı, ana TS üretilmiş kataloğa ve oyuncu kaydına alan eklemez.
- Yeniden kullanılabilir `Ui/RewardCard`: koyu/turuncu F, gri/mavi/mor/altın çerçeve, metin+Roma işareti, ayrı kırmızı lanet; sayısal etki ve araç farkı sabit görünür. Uzun açıklama ScrollView/fare tekerleği/PgUp/PgDn; native odak. `MutantRuntime.Reward` gerçek runtime katalog/metadata/araç bağlamından model üretir. Mevcut oyuncu ekranı değiştirilmedi, F2/B/C seçilmedi,8 ekran taşınmadı.
- **.NET646 kontrol** (`--mutant-rewards`):94 tanım, metadata eksik/yanlış sürüm/JSON/tür/değer, aynı seed/sonraki seçim, Common3/Legendary1, gerçek Choose ile araç HP önizlemesi, skill2→3 sayıları, evrim tekrar reddi, hedef skill eklentisi,3 dolu yuva/drop, sınırdaki pasif, boş seçim havuzu, kaynak fallback/3 gerçek kaynak kazancı, ikinci sandık reddi.128 başlangıç tohumu; üretim snapshot ve gerçek Choose sonuçları aynı. İki ağırlık adayı yalnız test fonksiyonundadır; [sözleşmedeki tablo](../tasarim/mutant-2-m2.md) gerçek frekansları ve örneklem sınırını kaydeder.
- **Unity grafik Play55/55**,UTC `2026-11-07T20:21:30.4540205Z`; **0 çalışma hatası/0 Editor tanısı**.163 kaynak hash'i ana kaynak kümesi ve baytlarıyla eşleşti. Kart adı/seviye/etki etiketi modelle aynı,4 rarity + kırmızı curse, gerçek araç artışı, dolu yuva bilgisi,1280/1920 sınırları/çakışma, uzun skill açıklaması ve PgDn odağı/kaydırma, snapshot ve kariyer/profil/kalıcı JSON koruması.
- **Üç gerçek Game View:** [1920×1080](../../Unity/Logs/m2-reward-cards-1920.png), [1280×720](../../Unity/Logs/m2-reward-cards-1280.png), [1280 uzun içerik/odak](../../Unity/Logs/m2-reward-details-1280.png). Ajan son üçünü açıp inceledi; sayısal bilgiler ve altlık kesilmiyor. Bunlar kontrollü katalog önizlemesidir, gerçek çekilmiş dört teklif veya alma akışı değildir. İnsan beğeni/fiziksel OS fare/klavye kabulü ayrıca açıktır.
- Kanıt: `Unity/Logs/m2-reward-card-play.json`, `Unity/Logs/m2-reward-editor.log`, `tests/cikti/mutant-reward-proof.json` (4 güncel kaynak hash'i),3 PNG. Logs/cikti ignore olduğu için commit ile taşınmaz; yeniden üretilebilir test sürücüleri commit'tedir. A'nın ayrı41kontrol kanıtı `Unity/Logs/mutant-given-play.json` A commit'ine aittir.
- **QA düzeltmeleri:** ilk Editor testinde Ui ad alanı/Align enum API derleme hatası giderildi. İlk görüntülerde beyaz scrollbar ve kaydırma altında kalan araç/etki bilgisi görüldü; yalnız açıklama kayacak biçimde düzeltildi. Sabit alanlar eklenince açıklama yüksekliği testi bir kez reddetti; boşluklar ve64birim açıklama alt sınırı düzenlendi, test gevşetilmedi. Başarısız ham kayıtlar `m2-reward-first-compile-error.log`, `m2-reward-first-layout.json`, `m2-reward-second-layout.json`, `m2-reward-pinned-layout-failure.json` olarak korundu; son tur55/55 geçti.
- `validate-project`, workflow Prettier ve `git diff --check` geçti. Yeni iki dar CI adımı tanımlandı; bu oturum CI çalıştırılmadı. Tam P1–P7 regresyonu, TS kaynağı/ana katalog/fizik/kariyer/ekonomi/Firebase işlemi, yeni paket veya ücretli API yok. Ayrı ürün/proje kullanıldı; ana Editor'a Play/Stop gönderilmedi. `_Recovery` dosyaları commit dışı korundu.
- **Açık işler:** üretim ödül havuz/ağırlık kararı, region/risk resolver, gerçek sürüş fayda ölçümü ve koşu içi8 ekran bu teslimde yapılmadı. Sonraki tek iş **onaylı F §5d başlangıç seçimine kart bağlama**; seçenekler/Choose/drop/RNG ve kayıt korunmalı. Bu oturum bu iki teslimde bitti.
