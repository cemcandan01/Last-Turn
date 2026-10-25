# 2026-10-25-drift-bonus-denge

- Durum: görünürlük tamam (0.7.3); denge önerisi Cem'in onayını bekliyor. Sahip: Claude; dal: `drift-bonus-denge`.

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
3. [ ] Denge: Cem'in onayıyla yeni bonus kuralı + drift yıldız eşikleri + rekor uyumu.

## Kanıt

`npm run kontrol` temiz; `yildiz`+`surus` birim 17/17; `alan hud` 4/4. Görüntü `tests/cikti/bonus-panel.png`.
