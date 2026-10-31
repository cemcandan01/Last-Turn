# Unity yarış — manuel test rehberi (5 tür, geçici görünüm)

Kural/veri TS 0.8.18'den aktarılır; ekran ve pist görselleri geçicidir (`docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı”).
Otomatik kanıt: **Last Turn → Yarış Kısa Play Doğrulaması (5 tür)** + `node Unity/Validation/check-race-proof.mjs`.

## Açma

- Garajdan: **Garaj** sahnesi → Play → alttaki **Yarışlar** → listeden etkinlik → **Yarış**. Seçili aracın kurulumu ve etkinlik türünün yarış lastiği uygulanır. Kilitli etkinlik başlamaz; “bütçe dışı” etkinlik ödülsüz denemedir.
- Doğrudan: **Last Turn → Yarış Test Sahnesini Aç** → Play (varsayılan gp_1).
- Ödül oyuncu kaydına yazılır. Gerçek kaydı değiştirmek istemiyorsan önce garajda **Ayrı test profilini aç**.

## Tuşlar

W/S gaz–fren, A/D direksiyon, Boşluk el freni, R yarışı yeniden başlat. Sağ üstte **Piste dön** (TS ↺): pist dışındaysan ilk çıktığın noktaya, değilse pistin en yakın noktasına; süre durmaz.

## Bakılacaklar (beklenen TS davranışı)

1. Açılışta araç başlangıç çizgisinin 6 nokta gerisinde, pist yüksekliğinde; ekranda 3‑2‑1 ve **BAŞLA!**. Geri sayımda araç kıpırdamaz.
2. Sol üstte süre `0:12.3` biçiminde, **Tur 1/3 · Hedef 2:41.3**. Hedef aşılınca **SÜRE AŞILDI**.
3. Pist yokuş iner ve çıkar (en fazla ~5 m). Kerbler (kırmızı/beyaz) pistten 9 cm yüksektir, üstünden geçince sarsar. Kerbin dışı çimdir; araç orada yavaşlar.
4. Başlangıç çizgisini ilk geçişte tur sayılmaz. Tur, pistin yarısına (%40–60) varıp çizgiyi ileri yönde geçince sayılır: **Tur 2/3 · 0:44.1**.
5. Geri geri 1 sn gidince **GERİ DÖN** çıkar; ileri yönde 0,5 sn gidince kaybolur.
6. Pistten (kerb dahil) çıkıp 1 sn sonra ortada **5…1 · PİSTE DÖNÜLÜYOR** görünür. 6 sn sonunda araç ilk çıkılan noktaya, pist yönünde konur (**PİSTE DÖNDÜN**). Süre durmaz, tur sayılmaz.
7. Virajı iç sahadan kestirince piste dönüşte **PİST KESME** çıkar. Kariyerde ceza yoktur (TS'de ceza yalnız MUTANT'ta).
8. 3. turda sonuç paneli görünür: Yarış tamamlandı/Süre aşıldı, Süren, Hedef, En iyi tur, 3 yıldız eşiği (2:41.3 / 2:20.2 / 2:09.0), En iyi: n / 3, +XP +para, kayıt mesajı. **Yeniden başlat** ve **Garaja dön** çalışır.
9. Garajda bakiye ve XP artmış olmalı. Aynı yarışı daha düşük yıldızla bitirmek önceki en iyiye göre daha az ödül verir.
10. Bütçeyi aşan araçla (ör. modifiyeli) sonuçta “Kupa kaydı değişmez”; ödül 0.

## Türlere göre (önerilen pistler)

- **Rallikros (rx_1):** toprak yol, kısmen asfalt aralığı (rx_3), çamur (koyu kahverengi; tutuş düşer, geçtikten sonra yavaş temizlenir), su birikintisi (mavi daire; içinden geçince araç yavaşlar ve bir süre ıslak kalır), rampalar (havalanma). 3 tur.
- **Ralli (rl_1):** A’dan B’ye, tepeli orman yolu; yol enine düz, kenarı tepeye karışır. rl_6 karlı (kar, yol dışı derin kar). rl_3 kariyer aracıyla (Haki Keçi) dik yokuşta durabilir: TS'de de aynı (bkz. kart); Mavi Yıldız ile biter.
- **Drift (dp_1):** 2 tur; puan yalnız gerçek kayarken (hız > 10 m/s, kayma > ~29°) birikir; çarpan x2…x5, tam çime çıkınca KOMBO YANDI, 1. turun %90'ı driftle geçerse ÇARPAN x6. Unity'de drift yardımı yok: TS'den zordur.
- **Drag (dg_1):** düz şerit, otomatik vites; sonuçta bitiş hızı. Manuel vites ayrı görev.

## Sürüş yardımı (geçici geliştirici ayarı)

- Garaj üst satırında **Sürüş yardımı:** Eğlence (arc) / Dengeli (norm, varsayılan) / Gerçekçi (real). Seçim garaj kaydında kalır; yeniden açılışta korunur.
- Etki (TS ile aynı): norm/arc'ta viraj desteği ve denge kontrolü kaymayı söndürür, TCS gazı keser; real'de yalnız drift desteği (0,4). Drift yardımı drift başlayınca karşı direksiyona ve hızı korumaya yardım eder; açı ve hat yine sende.
- Drift denemesi: virajda tam direksiyon + gaz (ya da el freni) ile kıçı kaydır, açıyı direksiyonla tut; çok açılırsa karşı direksiyon. Gerçekçi'de drift en kolay sürdürülür.

## Rekor ve hayalet

- HUD'da “Rekor … · hayalet …” satırı. Kariyer rekoru yalnız hedef süre içinde ve daha hızlı bitirince yazılır (driftte daha yüksek puan); sonuçta “Rekor: … · YENİ”.
- Piste dönmeden/yeniden doğmadan biten her yarış, daha iyiyse hayalet olarak saklanır. Aynı yarışı yeniden açınca açık mavi kutu kayıtlı sürüşü oynar; geri sayımda bekler, seninle aynı anda kalkar.
- Pist dışından dönüş ya da **Piste dön** o koşunun hayaletini geçersiz kılar (TS gibi).
- Dosyalar garaj profilinin yanında `races-<profil>/` dizininde; test profili ayrı.

## Bilinen eksikler (bu aşamada yok)

Dekor/ağaç/koni/kaya/bariyer çarpışması ve bölge sınır duvarı. Kerb sarsıntısı, geri sayım ışığı/sesi, rakip, geliştirici hayaleti.
