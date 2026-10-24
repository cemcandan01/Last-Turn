# Last Turn: Codex çalışma rehberi

Bu projede `CLAUDE.md` geliştirici kurallarının ortak kaynağıdır; Codex de bu kuralları uygular. Oynanış, tasarım, test ve yayın kararlarını burada tekrar kopyalama. Kullanıcının güncel talimatlarını ve ortamın üst düzey kurallarını öncelikli tut.

## Oturum başlangıcı ve iş akışı

- `CLAUDE.md` dosyasını, çalışılan alanın `docs/ALANLAR.md` bölümünü ve `docs/notlar/<alan>.md` notunu oku. İlgili `.claude/skills/` yönergelerini uygula.
- Konu dalında çalış; Codex dalları `codex/<alan>` biçiminde olabilir. Test alanı öneksiz addır: `codex/altyapi` için `npm run alan -- altyapi`.
- Türkçe arayüz, yorum, commit ve kısa kullanıcı özetleri kurallarını koru. Kalıcı kararların ortak kaynağı `CLAUDE.md` içindeki “Kullanıcının kararları” bölümüdür.
- Testleri atlama veya kapatma. İlgili kontroller geçince denemeye gönderme ve sürüm artırma akışını uygula; canlı çıkış için regresyon ve kullanıcı onayı gerekir. Tamamlanamayan testi geçmiş sayma.
- İş bitince alan notunu güncelle; değişiklikleri kendi dalına kaydet. Başka konu dalına yazma, rebase veya force-push yapma.

## Ortama uyarlama

- Claude'a özgü araç adlarını işin amacına göre mevcut GitHub, terminal ve ajan araçlarıyla karşıla. Kullanılamayan bir işlemi gerçekleşmiş gibi bildirme.
- Projedeki keşif, test ve denetim rollerini desteklenen yardımcı ajanlarla uygula; küçük işleri doğrudan tamamla. Claude model adları bu ortamda model seçimi anlamına gelmez.
- Claude uygulamasında sohbet açma/silme, Last Turn Merkezi'ni güncelleme ve Claude telefon bildirimi gönderme yeteneklerinin burada bulunduğunu varsayma.
- Gece regresyonunu, ayrı bir zamanlanmış görev gerçekten kurulmadıkça otomatik çalışacakmış gibi vaat etme. Test sonucu, gönderim ve yayın durumunu doğrulayarak bildir.
