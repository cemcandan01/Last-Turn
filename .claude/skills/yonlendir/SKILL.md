---
name: yonlendir
description: Last Turn'de çok parçalı ya da riskli bir işi alanlara bölmek, görev kartı açmak ve gerekirse bağımsız keşif/test/denetim rolleri planlamak için kullan. Kalıcı yönetmen sohbeti yoktur; küçük işte kullanma.
---

# İşi böl ve yönlendir

Codex ve Claude Code eşit yetkilidir; kalıcı yönetmen, alt sohbet açan hiyerarşi ya da "yönetmen sohbeti" yok. Kural ve yordam: `AGENTS.md` → "Ajan kullanımı" ve `docs/ORTAK-CALISMA.md` → "Yerel koordinatör". **Küçük işe ajan zinciri kurma.**

1. İsteği al, `docs/ALANLAR.md`'den alanı seç (emin değilsen `AskUserQuestion` ile tek turda sor). Aynı görevde tek aktif uygulayıcı olur.
2. `docs/isler/`de tek kart aç ya da var olanı revize et: 3–5 gözlenebilir kabul ölçütü, başlangıç dal/SHA, korunacak değişiklikler.
3. Bağımsız ya da riskli parçada sınırlı rol kullan: `kasif` (keşif), `testci` (test), `denetci` (diff denetimi). Aynı dosyayı eşzamanlı düzenletme; dosya sahipliği kartta yazılır. Ana bağlama tam log değil sonuç al.
4. Plan/devir gerekirse `npm run koordinator -- --kart <kart> --gorev "<...>" --dosya <...>` yerel plan üretir (varsayılan yalnız plandır). Kapasite verisi yoksa "bilinmiyor" yaz; açık onay olmadan API/ek krediye geçme.
5. Bitirirken kartı ve `docs/DEVIR.md`yi güncelle; Cem'e kısa sonuç ver.
