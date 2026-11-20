# 2026-10-25-ortak-calisma

- Durum: tamamlandı; kaynak PR #7 ve ortak geliştirme geçmişinden doğrulanır
- Aktif sahip: yok; son uygulayıcı Codex
- Alan/dal: kurallar / codex/kurallar
- Temel: origin/gelistirme 61dfb6fede5c3b822e6f9cb1b4910629fdb5f350 (0.5.26)

## Kullanıcının özgün isteği

“claude da seninle ortak çalıştığını bilsin. birinizde hakkım bitince diğerine geçicem. Sonrasında senden istediğim şey nasıl daha verimli olabileceğimiz. şu anda bir geliştirmenin denemeye gönderilmesinde en çok maliyet neyden kaynaklanıyor nasıl daha düşük maliyetle aynı veya daha kaliteli iş yapabiliriz. claud dan istediğim bir geliştirmenin tam istediğim gibi olması için 4-5 kere promt yazmam gerekiyor. hem senin hem onun performansını arttırmak için neler yapabiliriz, bu konuda sana ekleyebileceğimiz eklentiler var mı? dışardan insanların geliştirdiği açık kaynak ai verimliliği üzerine geliştirilmiş projeler oluyor bunlar işimize yarar mı? bu oyunu gerçekten yapmak istiyorum ve gereken her türlü kurulumu yapalım optimum çalışma ortamını kuralom”

## Kabul ölçütleri

- [x] Claude ve Codex aynı ortak çalışma/devir sözleşmesini repo girişinde görür.
- [x] Eski oyun/tasarım kararları silinmeden kök rehber kısalır; ayrıntılar seçilerek okunur.
- [x] Tek kartta kabul ölçütü, aktif sahip, SHA, test/kanıt, engel, sonraki adım ve revize kaydı vardır.
- [x] Küçük işte zorunlu ajan zinciri ve aynı kapsamın gereksiz tekrar testleri kaldırılır; canlı onayı korunur.
- [x] Yeni yardımcı komutun dosya ezme, yol güvenliği ve bağlam sınırı testleri geçer: 14/14 test.
- [x] Değişiklikler GitHub PR #7 üzerinden erişilebilir; ortak dala aktarım Git geçmişinden doğrulanır. Context7 bağlantısı sorguyla doğrulandı.

## Bulgular ve ölçüm sınırı

- Önceki CLAUDE.md: 21.972 bayt. Rehber/skill/harita paketi denetimde 74.788 bayt; tamamı her görevde gerekli değil.
- Başlıca adaylar: yeniden yorumlama/revize; büyük bağlam; küçük işte yeni sohbet/ajan hazırlığı; tekrarlanan kanıt/log.
- Kurulum/derleme/CI dakikası ile model tokeni ayrı ölçülerdir. Tam kullanım telemetrisi olmadan kesin maliyet yüzdesi yok.
- PWA örneğinde yerel Chromium'a tekrar indirme denemeleri ve uzun log okuma önlenebilirdi. CI asıl tarayıcı kapsamını çalıştırınca 18/18 senaryo geçti.
- Dondurma çelişkisi düzeltildi: regresyon dalı kalmış olsa da asama=tamamlandi dondurmayı kaldırır.

## Eklenti kararı

- GitHub: bağlı ve doğrulandı.
- Context7: ChatGPT'de bağlandı; Three.js /mrdoob/three.js/r186 için belge çözümleme ve sorgu başarılı. Claude tarafına kurulmuş sayılmaz.
- Playwright: mevcut test/CLI ve Actions kullanılıyor, ikinci tarayıcı katmanı eklenmedi.
- Serena ve Superpowers incelendi; ölçülen ihtiyaç olmadan mevcut sürecin üzerine ikinci zorunlu sistem kurulmadı.
- Kullanıcının bilgisayarında kurulum yapma erişimi yok; gerektiği anda yalnız gerekli yerel adım istenir.

## Devir

- Yerel kontroller: tip/ESLint/biçim temiz; kurallar alanı 1/1 senaryo, 14/14 test.
- CI kaynak SHA: d3ea46901259f7b17a95d6844910676e62dce7a0; test edilen merge SHA: 33388491f11d4cbfb722ee3065c10da7ae251a5a; hedef SHA: 61dfb6fede5c3b822e6f9cb1b4910629fdb5f350.
- Kanıt: https://github.com/cemcandan01/Last-Turn/actions/runs/40133242132 (Denetim, başarı); tip/lint/biçim ve kurallar alanı 14/14 test.
- Ortam: GitHub-hosted ubuntu-latest, Node 22; package-lock SHA256 ea3a7a4bd8277ef09d132831d3fd060482f0e41056a42fcc0642c8ec0455e590.
- Son ekler yalnız devir/eklenti doğrulama metnidir; test edilen kod/bağımlılık değişmedi.
- Sonraki adım: yeni oyun geliştirmesine yeni kart aç; bu süreç işini yeniden başlatma.
- Oyun kodu, kayıt biçimi ve sürüm numarası bu görevde değişmez.

## Maliyet kaydı

- Revize turu: henüz yok; ilk kabul: kullanıcı değerlendirmedi.
- Ajanlar: 1 uygulayıcı + 1 dar kapsamlı keşif/denetim ajanı (bu süreç araştırması için).
- Token/kota/TL: ölçülmedi. İlk beş geliştirmede kabul edilmiş iş başına revize/süre/kullanım kaydı tutulacak.
