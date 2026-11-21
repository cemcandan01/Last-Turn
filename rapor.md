# Kanca yeniden tasarımı hazır, test sende (21 Kasım 2026)

Commit `7de5b10` (`mutant-dilim`, push yok). Plan kutuları güncellendi: Görev 1-2 ve düzeltme (1)-(3) işaretli, (3) için "Cem testi bekliyor" notu var. Kanca (4) ve ayrı "Kanca yeniden tasarımı" adımı da işaretli. Görev 3 başlamadı.

## Yapılan (yalnız dilim modunda; bayrak kapalıyken eski davranış aynı)
- Tuş basılı kaldıkça bağlı, süre sınırı yok. Bırakınca araç o anki hız ve yönle devam eder, ceza yok.
- Gerilim = teğet hız² / yarıçap ÷ seviye dayanımı (Sv1 45, Sv2 52, Sv3 60). Yeşil <0,6, sarı <1, kırmızı ≥1. HUD slotunda "GERİLİM %nn" çubuğu.
- Kırmızıda 0,25 sn kalırsa kopar, bekleme x2,5 (Sv1: 6 sn → 15 sn). Kırmızıdan çıkınca sayaç aynı hızda söner, sınırda gidip gelerek aşılamaz.
- Yalnız köşe/çıpa hedefi, rakip hedefi kapalı.
- Önce saf model `MutantHookRope` ve `--mutant-slice-hook` (32 kontrol), sonra `MutantSkills` ve HUD bağlandı.

## Doğrulama
- Geçti: `--mutant-slice-hook` 32, `--mutant-hook` (TS 12078 kontrol), `--mutant-slice-cars` 25, `--mutant-hud`, `--mutant-summary`, `--garage-f`, `validate-project.mjs`.
- Kırmızı, ama bu işten önce: `--mutant-ability` (powertrain downshift-gt, tick 573) ve `--opponents` (rx_1 direksiyon farkı). 96ab3ed'de de aynı hatayı veriyorlar (HEAD'de ayrı kopyada doğrulandı). Şüphe 96ab3ed'in `PowertrainVehicle`/`RaceDrift` değişikliği; ayrıca bakılacak.
- Unity Editor derlemesi ve Play koşulmadı. Sayılar (dayanım, 0,25 sn) benim başlangıç tahminim, ölçüm değil.

## Nasıl denersin
1. MUTANT'ı başlat, Bordo Tilki veya Bozkır Tavşanı ile gir, F2 geliştirici modunda Grappling Hook'u yuvaya tak.
2. Köşeli bir pistte köşeye yaklaş, kanca tuşunu (yuva numarası) basılı tut: bağlanınca slotta "GERİLİM %" çubuğu görünür.
3. Yavaş dön: yeşil kalır, istediğin kadar tutabilirsin. Bırak: hızını ve yönünü korur.
4. Hızlı ve dar dön: sarıdan kırmızıya geçer, ~0,25 sn kırmızıda kalırsan kopar, slot "BEKLE · 15 sn" gösterir.
5. Bak: yeşil/sarı/kırmızı sınırları doğru yerde mi, kopma haksız hissettiriyor mu, 15 sn bekleme uygun mu.

Not: Unity derlemesi yoksa ilk açılışta hata olursa bana yaz, düzeltirim.
