# 2026-10-25-drift-bonus-denge

- Durum: tamamlandı (0.7.3 görünürlük, 0.7.4 denge; Cem "onayla"). Sahip: Claude; dal: `drift-bonus-denge`.

## İstek

"driftte kazanılan ekstra puanlar toplam puana yansımıyor gibi görünüyor ve ekstra puanları çok kolay kazanıyoruz"

## Tespit

- Bonus `E.bonus`ta birikir, yalnız kombo bankaya geçince (0,8 sn driftsiz) toplam puana eklenir; kombo yanarsa bonus da yanar (kullanıcı kararı). Kombo paneli bonusu göstermiyordu: yazı çıkıyor ama hiçbir sayı değişmiyordu.
- Bonus koşulları drift kalitesinden bağımsız: her drift 1 sn'yi geçince "uzun" (+100/sn) ve tarafı değişmediği sürece "tek yön" (+250/sn) neredeyse otomatik. Taban puan ~40/sn × çarpan.

## Ölçüm (drift pilotu, 90 sn, `driftPuani`; Bordo Tilki / Beyaz Kurt)

| Kural | lv1 | lv2 | lv5 | lv6 |
|---|---|---|---|---|
| Bugün (1 sn; 100/100/250) | 8718 / 7415 | 8134 / 8128 | 7876 / 9152 | 11751 / 18343 |
| Bonus yok | 1668 / 1715 | 1684 / 2128 | 1426 / 2652 | 3601 / 6493 |
| Hepsi 2 sn | 2368 / 1715 | 1784 / 2478 | 2826 / 3352 | 5001 / 11043 |

Pilot puanının ~%80'i bonus. 1★ eşikleri (5500, 12700, 25100, 9100) bonusla kalibre; bonus küçülürse eşikler yeniden ölçülmeli (DENGE.md §8), eski drift rekorları (sv_) yeni kuralla aşılamaz hâle gelebilir (kayıt uyumu).

## Kabul ölçütleri

1. [x] Bankaya geçmemiş bonus kombo panelinde "+N BONUS" olarak görünür (`hud-cakisma`).
2. [x] Bonus kuralı bonus başına `bas`/`puan` ile ayarlanabilir; değerler değişmedi (birim testleri aynı).
3. [x] Yeni bonus kuralı: uzun drift 3 sn'den sonra artan +100/+200/+300…; tek yön 3 sn'den sonra +150/sn; direksiyonsuz 2 sn'den sonra +100/sn (`yildiz` birim testleri).
4. [x] Drift yıldız eşikleri mevcut yöntemle yeniden ölçüldü (`npm run olcum -- drift-puan`, pilot P0 × DRIFT_PAY). lv sırasıyla 1★/2★/3★: 1050/2700/3700, 1350/3350/4550, 1750/4300/5750, 1750/4450/5800, 3150/7950/10250, 2650/6550/8300, 1350/3350/4600, 1550/3950/5200. Bordo Tilki ilk drift yarışında 1★ alabilir (`surus` birim testi). Ham çıktı `tests/cikti/drift-puan-yeni.txt` (yerel).
5. [x] Rekor uyumu: drift rekoru/hayaleti `drift2_<lv>`; eski kural rekoru `drift_<lv>`de kalır, profil listesinde "eski kural" diye görünür, bulutta ikisi de eşitlenir (`bulut` birim testi). Yıldızlar ve yıldız anahtarı değişmedi; kazanılmış yıldız silinmez.

## Denge notu (DENGE.md)

- Rol: drift bonusu kaliteli (uzun, tek yönlü, dengeli) drifti ödüllendirir; kısa drift bonus almaz. Edinme süresi/ekonomi değişmedi; yalnız drift puan ölçeği ve yıldız eşikleri.
- Sınır: eşikler pilotla kalibre; pilot 3 sn'yi nadiren geçer, insan uzun driftte artan bonusla daha yüksek puan alır. 1★ insan için kolay kalabilir; iPhone'da gerçek oyuncu denemesiyle yeniden bakılmalı (§8).

## Kanıt

0.7.3: `npm run kontrol` temiz; `yildiz`+`surus` 17/17; `alan hud` 4/4; görüntü `tests/cikti/bonus-panel.png`.
0.7.4: `npm run kontrol` temiz; `npm test` 290/290; `alan pist,hud,hayalet,yarista-reset` 17/17.
