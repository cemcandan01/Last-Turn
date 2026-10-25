# Claude + Codex devir

- Cem Claude ve Codex arasında kota durumuna göre geçer; ortak bellek bu repo, `CLAUDE.md` ve görev kartlarıdır.
- Claude gece 0.5.28 regresyonunu tamamladı ve canlıya çıkardı (`a103508`); `gelistirme` 0.6.0'a geçti (`eb89753`). Güncel durum Git'ten doğrulanır.
- Aktif iş: Codex / `codex/surus`, `docs/isler/2026-10-25-surus.md`, PR #10. Cem son isteğin güncel sürüm üzerinden bitirilmesini istedi. Eski sürüş dalı geceki yayına girmedi; 0.6.0 ve katlanır ekran düzeltmeleri korunarak 0.6.1'e taşındı.
- Serçe: gerçek düz asfalt 236,4 → 167,7 km/sa, 0–100 3,23 → 7,63 sn; görünüm korunur. Garaj 15 stok ölçümüne dayanır; modifiye oranları yaklaşık modelden. Debriyaj yerine arka el freni; eski giriş/ayar anahtarları korunur.
- İlk kaynak `afaa70b75c0d8ddb3a2ea6dfec90628177ae5cb4`: [CI](https://github.com/cemcandan01/Last-Turn/actions/runs/40137401600) 12/12 başarılı. Güncel `3663f4f` kaynak [CI 40171573466](https://github.com/cemcandan01/Last-Turn/actions/runs/40171573466): 12/12 başarılı; 0.6.1 deneme aktarımı PR #10 / görev kartında tutulur; telefonda sürüş hissi Cem'in denemesini bekler.
- Yerel Chromium indirmesi ZIP yerine HTML veriyor; tekrar deneme. GitHub Actions tarayıcıları çalışıyor. Context7 iki tarafta bağlı (Claude kurulumu Cem tarafından bildirildi).
- Test/model politikası `docs/ORTAK-CALISMA.md`: dar kapsam, aynı kaynakta başarılı kanıtı tekrar üretmeme, küçük işte ajan zinciri kurmama. Sonraki adım: PR #10'un deneme yayınını doğrula; ardından Cem'in sürüş geri bildiriminden devam et. Canlıya çıkış ayrı regresyon/onay ister.

- Güncel revize: Cem örneğin bütün araçları kapsadığını belirtti. `codex/denge` / 0.6.2; aynı görev kartında “Revize” bölümü. 15 stokta ortak altı özellik toplamı, tüm stok D ≤200, üst sınıflar alt yarıda; beş başlangıç 85–195 HP. Motor değişimiyle gerçek modifiye alanı ve ilk yarış hedefleri güncellendi. Yerel sayısal kontroller geçti; CI/yayın takip edilecek. Önceki “0.6.1 tamamlandı” yalnız ilk isteğin dar yorumuna aittir.
