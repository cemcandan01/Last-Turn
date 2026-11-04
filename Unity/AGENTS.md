# Last Turn Unity ek kuralları

Önce kök rehber, güncel görev kartı ve `docs/UNITY-GECIS.md` okunur. Ortak görev/devir/koordinasyon sistemi `docs/ORTAK-CALISMA.md`dir; burada ikinci sistem kurulmaz.

- Kaynak referans `typescript-baseline-0.8.18` → `df3549e709469f0b519ebfbeaa9f63c1040fee05`; etiketi taşıma, TypeScript davranışını sessizce yeniden tasarlama.
- Saf C# kuralları `Assets/LastTurn/Scripts/Core/` içinde; UnityEngine, girdi, kamera, sahne ve arayüz adaptörleri dışarıda tutulur. TypeScript sayısal modeli ve 1/60 sn + 8 alt adım sözleşmesiyle karşılaştırma kanıtı bağlanır; motorlar arası bit eşitliği varsayılmaz.
- Ekranlar/HUD/primitive modeller geçicidir. Görünüm yalnız saf görünüm modelini çizer ve komut çalıştırır; satın alma, ekonomi, ödül, fizik ve kayıt kuralı içermez, katalog JSON anahtarı okumaz. Ayrıntı `docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı”.
- Aynı sahne/prefab/ScriptableObject için tek yazan sahip vardır. Yerel Input System ayarları ve Editor'ın mevcut değişiklikleri başlangıçta kaydedilip korunur. Paket/Editor ayarlarına kapsam dışı toplu düzenleme yapılmaz.
- Codex ve Claude Code eşit yetkili uygulayıcılardır; sahip göreve göre seçilir. Küçük işte tek ajan; bağımsız geliştirme/inceleme/testte ikinci ajan gerekçesi ve ayrı dosya sahipliği kartta tutulur. Plan/devir betiği model oturumu veya yazma yetkisi açmaz; kaynak worktree'deki gönderilmemiş kodun diğer worktree'de bulunduğu varsayılmaz. Kota devrinde önceki uygulayıcı durur, aynı kart/commit/değişiklik/test kanıtıyla devam edilir.
- Her taşınan davranış için kaynak TS test/senaryosu, C# karşılığı ve tolerans karta yazılır. Kısa proje/.NET kontrolü Editor derlemesi veya gerçek cihaz testinin yerine sunulmaz. Tam regresyon ve canlı geçiş için önceden Cem onayı gerekir.
