# pist dalı notu

- Yıldız sistemi (0.4.13): her yarışta 3 eşik, `oyun/yildiz.ts` (`yildizEsikleri`, `enIyiYildiz`, `yildizSay`, `yildizKaydet`; kayıt `lt_yildiz`). 1★ = `tg`/`hp` (hedef), 2★/3★ = `ys` (pist-tanimlari.ts).
- Eşikler ölçümle: `npm run olcum -- pistler` (~11 dk, `TUR=gp` ile tek tür), `-- drift-puan` (~2 dk). Çarpanlar ölçüm dosyalarında (`YILDIZ_PAY`, `DRIFT_PAY`); eşik yukarı yuvarlanır.
- Ölçüt: pilotun en iyi hatasız sürüşü 3★, orta cesaret 2★, düşük 1★; drag'de 0,15 sn geç kalkış 3★, 0,3 sn 2★; driftte açılı/abartan 3★, olağan 2★, çekingen 1★.
- Karar: tg artık 1★ "rahat bitiriş" (eskisinden gevşek; eski tg üst seviyede pilotun bile altındaydı). PROF.wins hâlâ 1★ (limit) ile sayılır.
- Drift yarışı 2 tur (`DRIFT_TUR`; 3 tur ~2,5 dk sürüyordu, 2 tur eski 90 sn'ye yakın). Turlar bitince komboyu bankalayıp biter.
- Ters sürüş: `EV.ters` 1 sn ters gidince kalkar, 0,5 sn doğru gidince iner, 3 m/s altında durum korunur; hız pist yönünden 90°+ saparsa anında drift puanı birikmez.
- Drift puan kuralı tek yerde: `oyun/yaris-kurallari.ts` (oyun evTick ve test `PuanSayaci` aynısını kullanır).
- Dokunulan başka dal dosyaları: hud.ts (drift satırı "Tur x/N · Hedef"), menu.ts (drift metni, "Süre" yerine "Tur"), sonuc.ts (metin olarak yıldız ve eşikler).
- Açık: "Geri dön" gösterimi hud dalında; pist listesi/sonuçta yıldız görseli menu dalında.
