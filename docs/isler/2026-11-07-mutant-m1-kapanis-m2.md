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
