---
name: merkez
description: Last Turn Merkezi'ni (kullanıcının dalları, push bekleyen işleri, sürümü ve regresyonu tek yerde gördüğü sayfa) git'ten yeniden üretip yükler; telefon bildirimini yalnız yönetmen ve regression sohbeti gönderir. Konu sohbeti denemeye gönderince ya da iş bekletilince Merkez'i tazelemek için; yönetmen konu sohbeti haber verince; regression sohbeti 00:00/04:00 denetiminde, regresyonun her aşamasında, onay gerekince ve canlıya çıkınca kullan. Kullanıcı "merkez", "durum", "ne bekliyor" dediğinde de.
---

# Last Turn Merkezi

Sayfa: https://claude.ai/artifact/MNacFzHf5D2kibH1MEyXkq (Claude uygulamasında açılır). Bütün veri tek bir dosyadan gelir; dosya git'ten üretilir, böylece hangi sohbet tazelerse tazelesin aynı gerçeği gösterir.

## Tazele

1. `git fetch origin --prune && node tests/surec/merkez-durumu.mjs` → `tests/cikti/merkez.json` (aşama, ne yapılacağı, dallar, son olaylar, son regresyon tablosu).
2. Yükle: `Artifact` aracı, `url` yukarıdaki sayfa, `file_path` = `tests/cikti/merkez.json`, `asset: true`. Yanıttaki `/_blob/<id>` adresini al.
3. `ArtifactData` `get` → `datasets` / `durum` (sürümünü ve eski `source.url`'yi not al), sonra `update` aynı belge, `if_version` ile: `{"source": {"kind": "file", "url": "<yeni /_blob adresi>", "name": "merkez.json"}, "updated": {"at": "<ISO zaman>", "by": "<dal> sohbeti"}}`. Sürüm çakışırsa (başka bir sohbet de tazeledi) yeniden `get` ve tekrar dene.
4. Eski dosyayı **silme**: sistem her silmeyi kullanıcıya onaylatır, sohbetler bunu kendi başına yapamaz. Eski dosyalar küçüktür (~5 KB; sayfanın sınırı 5000 dosya, 1 GB); yer sorunu yoktur. Toplu temizliği kullanıcı yanındayken `kurallar` sohbeti yapar.
5. Bir adım reddedilirse (izin, ağ) işi durdurma: kullanıcıya tek satırla söyle, yönetmene haber / bildirim adımını yine yap.

## Bildir

**Telefon bildirimini (`PushNotification`, `status: "proactive"`) yalnız yönetmen ve regression sohbeti gönderir; konu sohbetleri göndermez** (Merkez'i tazeler, yönetmene `send_message` ile haber verir). Tek satır, 200 karakterden kısa. Kullanıcı o an sohbetteyse araç göndermez; sorun değil. Yalnız aşağıdaki durumlarda bildir, ara adımlarda bildirme:

| Kim | Ne zaman | Metin |
|---|---|---|
| Yönetmen (konu sohbeti haber verince) | İş denemeye gönderildi, deneme adresinde yayında | `<dal>: <sürüm> denemede, kontrol edebilirsin (<iş, birkaç kelime>)` |
| Yönetmen (konu sohbeti haber verince) | Kullanıcı "bekle" dedi ya da sürüm dondurulmuş, iş dalda kaldı | `<dal>: iş hazır, senin "push"unu bekliyor (<iş>)` |
| Regression | 00:00, denemede yeni oyun işi var | `<sürüm> canlı geçişi öncesi testlerine hazır. "başlat" dersen hemen, demezsen 04:00'te başlar; "bu gece başlama" dersen beklerim.` (bekletilen dal varsa sona: ` Bekleyen: hud (bu sürüme girmez).`) |
| Regression | Regresyon bitti, 0 hata, onay bekleniyor | `<sürüm> canlıya hazır: <n> dal, <m> hata çözüldü. Rapor regression sohbetinde; onay için "push" de.` |
| Regression | Kullanıcı kararı gereken her durum (çözülemeyen hata, çakışma, birleştirilemeyen dal) | `Regresyon kararını bekliyor: <neden, kısa>` |
| Regression | Canlıya çıktı | `<sürüm> canlıda, canlı duman geçti. <sonraki sürüm> başladı.` (kaldıysa: `<sürüm> canlıda ama canlı duman kaldı: <neden>`) |

Bildirimden önce merkezi tazele: kullanıcı bildirime dokunup merkeze baktığında aynı durumu görmeli.
