# Unity geçişi — dal notu

## Güncel özet — 9 Kasım 2026

- Tek kaynak [DEVIR başı](../DEVIR.md). `codex/unity-p7-garaj`: M1 hasar kimliği ve M2 ödül modeli/kartları tamam;94 tanım/64 B sembolü (`a6be53c`, devir `12cd26b`). B görsel yönü Cem tarafından onaylandı; yeniden yön seçimi sorma.
- B /5A ödül ve skill değiştirme (`3001f70`), B /6A boss (`20ec0b2`), B /7A sonuç (`dd85772`) tamam. Son sonuç:181 gerçek grafik Play/.NET435.641,208 kaynak hash'i ve10 Game View. Boss çağrısı kabulde tüketilir; sonraki bölgede kalmaz. Kanıtlar yerel/ignore; ayrıntı DEVIR'de.
- Ödül ikonlarının yeniden kabulü `678f230`:94 eşleme/64 simge/27 PNG korunur; bozuk veri güvenliği eklendi. .NET740, gerçek grafik Play459/459,208 kaynak hash'i,8 Game View; ayrıntı DEVIR başında. Yeni görsel üretilmedi.
- B sürüş HUD `c1fb9ca`: gerçek koşu/nitro/skill/görev/işaret ve geri bildirim; .NET870+ödül740, Unity301/301,8 Game View/212 hash. Runtime hata0; yerel UnityEditor.Search tanısı1 açık ve gizlenmedi. Kanıt/fixture sınırı DEVIR başında. Önceki10 commit konu dalına push edildi; merge/yayın yok.
- B /2A etkinlik/risk `59ef048`: gerçek iki/üç risk, hedef birimleri, tek başlatma ve güvenli iptal; .NET818+4311+12952, Unity373/373,12 Game View/215 güncel kaynak. Runtime0/yerel Search tanısı1. Önceki HUD212/ödül208 proof'ları artık kaynak kapsamından reddedilir; değiştirilmedi/güncel sayılmadı. Bu görev yalnız yerel commit; push/merge/PR/yayın yok.
- Sonraki tek öneri **B /3A atölye ekranı**. Diğer3 koşu içi ekran, insan kabulü ve sonraki M2–M4 işleri açık; başlanmadı. `_Recovery` ve gerçek kayıtlar korunur.

## 7 Kasım notları — tarihsel kayıt

- Dal `codex/unity-p7-garaj`; 0.8.24 sonrası hasar kimliği ve312 görsel dosyası0.8.25 gönderim paketinde (7 Kasım).
- P1–P5 ve P7 F menü/HUD, Garaj/Modifiye, Mağaza, Mutant başlangıcı, hazırlık, Profil, Ayarlar, duraklatma/sonuç tamam.
- Game View kanıtları ve dar testler `docs/DEVIR.md` ve P7 kartında; Logs yerel/ignore.
- M0 `64d7b02`; ayrı M1 pilotu `5fa4190`; normal hasar→enerji kimliği `e4b125c` (22.NET/33Play), devir `17aec71`.
- M1 15.811, eski mekanik 589.426 ve enerji 971.504 koşul geçti; M2–M4 başlamadı.
- Claude devir kartı hazır; çalışan Claude oturumu başlatılmadı. Diğer uygulamadaki etkinlik/kota bilinmiyor.
- Sonraki tek geliştirme: hasar→enerji kök/ebeveyn/türev kimliği ve cross-step replay güvenliği.
- F2/B/C taslakları `755e51c`; F2 hash/65 kontrol kaydı doğrulandı, B/C62 varlık/6 ekran yeniden geçti; insan seçimi açık.
- Yayın/adreste sürüm kontrolü başarılı: Actions 42404353840, `/dev/` 0.8.24. Master hâlâ6785044.
- Tamamlanmış görsel taslaklar dahil; `_Recovery`nin5 dosyası gönderim dışında. Ayrı worktree ve npm kontrol kullanıldı.
- Unity Windows sürümü web `/dev/` içinde çalışmaz; Windows build/Play bu gönderimde yapılmadı.
- Canlı Firebase/Google giriş kabulü, koşu içi F UI ve eski CI race-all hatası açık; yeni 3B/MCP yok.
