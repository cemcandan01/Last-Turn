# Unity geçişi — dal notu

## Güncel özet — 9 Kasım 2026

- Tek kaynak [DEVIR başı](../DEVIR.md). `codex/unity-p7-garaj`: M1 hasar kimliği ve M2 ödül modeli/kartları tamam;94 tanım/64 B sembolü (`a6be53c`, devir `12cd26b`). B görsel yönü Cem tarafından onaylandı; yeniden yön seçimi sorma.
- B /5A ödül ve skill değiştirme (`3001f70`), B /6A boss (`20ec0b2`), B /7A sonuç (`dd85772`) tamam. Son sonuç:181 gerçek grafik Play/.NET435.641,208 kaynak hash'i ve10 Game View. Boss çağrısı kabulde tüketilir; sonraki bölgede kalmaz. Kanıtlar yerel/ignore; ayrıntı DEVIR'de.
- Ödül ikonlarının yeniden kabulü `678f230`:94 eşleme/64 simge/27 PNG korunur; bozuk veri güvenliği eklendi. .NET740, gerçek grafik Play459/459,208 kaynak hash'i,8 Game View; ayrıntı DEVIR başında. Yeni görsel üretilmedi.
- B sürüş HUD `c1fb9ca`: gerçek koşu/nitro/skill/görev/işaret ve geri bildirim; .NET870+ödül740, Unity301/301,8 Game View/212 hash. Runtime hata0; yerel UnityEditor.Search tanısı1 açık ve gizlenmedi. Kanıt/fixture sınırı DEVIR başında. Önceki10 commit konu dalına push edildi; merge/yayın yok.
- B /2A etkinlik/risk `59ef048`: gerçek iki/üç risk, hedef birimleri, tek başlatma ve güvenli iptal; .NET818+4311+12952, Unity373/373,12 Game View/215 güncel kaynak. Runtime0/yerel Search tanısı1. Önceki HUD212/ödül208 proof'ları artık kaynak kapsamından reddedilir; değiştirilmedi/güncel sayılmadı. Bu görev yalnız yerel commit; push/merge/PR/yayın yok.
- B /3A atölye `338b976`: gerçek stok/alım/araç yenileme ve tam/kısmi saf tamir önizlemesi, yenileme/Geri, klavye/fare/odak/stale/tek işlem. Ekonomi aynı; ortak panel girdisinde nitro/skill kuyruğu engellenir. .NET11.282 (57 TS işlem, fark<1e-9)+menü4.311; Unity564/564,12 Game View/218 kaynak, Runtime0/Search1. Önceki2A215 proof eski kapsam diye reddedildi, checker değişmedi; etkilenen2A input/HUD/pause bağı yeni Play'de yenilendi. Kaynaklar ve fixture/insan kabulü sınırı DEVIR'de. Önceki iki commit dahil hiçbir şey push edilmedi.
- B4A sandık `4cdb5ae` (.NET220+menü4311, Unity89/8 görüntü/221 hash) ve B8A özet `a4e65c8` (.NET7, Unity69/10 görüntü/224 hash) tamam. Sonraki kaynaklarla bu eski checker'lar tarihsel kapsam diye reddedilir, değiştirilmez. Teklif üretme/tüketme ve salt rekor okuma korunur.
- Gerçek sürüş `be51a76`: aynı53/Kara Boğa koşusunda sürerek gate, `rx_1`/rakipli `gp_1` gerçek bitişleri ve gerçek seviye seçimi, `rl_1` boss kaybı/özet. Giriş/setup fixture sınırları raporda; bitiş/timer enjeksiyonu yok.98 kontrol/667 telemetri/30 Game View/225 güncel hash, Runtime0/Editor0;20 sn normal klavye örneklemi ayrıca ölçüldü. Pist kimliği ve nitro durum metni dar düzeltildi; HUD.NET870 geçti, fizik/denge aynı.
- [Kalite raporu](../2026-11-09-mutant-b-kalite-raporu.md) ve DEVIR başı güncel. **Sonraki tek öneri kanca hedef/ret bilgisini HUD'da netleştirip başarılı bağlanmayı kanıtlamak**; başlanmadı. İnsan kabulü/iniş ve sonraki M2–M4 işleri açık. Push/merge/yayın yok; `_Recovery` ve gerçek kayıtlar korunur. Harici bildirim kanalı yok.

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
