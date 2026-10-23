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
- Pist sayısı (0.4.23): her türde 8 pist, toplam 40. `lv` artık pist numarası (türde benzersiz; rekor/yıldız anahtarı `<tür>_<lv>` eskisi gibi), `sev` zorluk seviyesi 1-6 (`pistSev`; arayüz sıralaması sev, sonra lv). Yeni pist: sona eklenir (lv 9…), `sev` verilir, `ACILMA.pist[tür]` sonuna açılma seviyesi, eşikler `LV=9 npm run olcum -- pistler | drift-puan`.
- Yeni pistler (lv 7 sev 2 / lv 8 sev 4): gp Çöl Otoyolu, Kar Dağı; rx Plaj Kros, Kar Kros; dp Çöl Drifti, Taş Ocağı Drifti; rl Kıyı Etabı, Dağ Etabı; dg Çeyrek Kilometre 250 m (sev 1), Bir Kilometre 1000 m (sev 5). Açılma: 3/9 (gp, rx), 4/11 (dp, rl), 2/16 (dg).
- Açık: menü arka plan görselleri yeni pistler için yeniden çekilmedi.
- Drift puanı (0.4.25+): `driftPuanHizi` = 3 × hız (m/s, birimden bağımsız) × min(açı, 60°) × düşük hız yumuşatması (4-12 m/s); 60° kullanıcı kararı (ötesinde spin riski fizikten). Bonuslar `yaris-kurallari.ts → bonusAdimi`: uzun drift +100/sn, direksiyonsuz +100/sn, tek yön +250/sn (koşul ≥1 sn); kombo yanarsa bonus da yanar; hud için `EV.driftOlay` dizisi {ad,puan,t}. Eşikler bonuslar dahil yeniden ölçüldü (~3 kat büyüdü). Çöl Drifti tarifi kısaltıldı (137 → ~93 sn, tur sayısı 2).
