---
name: merkez
description: Last Turn durum özetini (dallar, push bekleyen işler, sürüm, regresyon aşaması) git'ten çıkarıp gösterir. Yalnız Cem "merkez", "durum", "ne bekliyor" dediğinde kullan; otomatik tazeleme ve telefon bildirimi yoktur.
---

# Durum özeti

Otomatik Merkez tazelemesi, rol bazlı bildirim ve yönetmene haber verme kaldırıldı. Yalnız Cem isteyince:

1. `git fetch origin --prune && node tests/surec/merkez-durumu.mjs` → `tests/cikti/merkez.json` (aşama, dallar, son olaylar).
2. Sonucu terminalde kısa özetle: bekleyen/bekletilen dallar, `gelistirme` ve `master` farkı, açık regresyon (`origin/regresyon:docs/regresyon/durum.json`), açık kartlar (`docs/DEVIR.md` ilk giriş).
3. Merkez sayfasını (Artifact) yalnız Cem isterse güncelle; `PushNotification` yalnız Cem açıkça isterse gönderilir.

Betik web dönemi dallarına göre yazılmıştır; Unity dallarını eksik gösterebilir. Eksikse `git branch -r` ve kartlardan tamamla, varsayım yapma.
