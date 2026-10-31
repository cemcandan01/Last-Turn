# Unity yarış — manuel test rehberi (gp_1, geçici görünüm)

Kural/veri TS 0.8.18'den aktarılır; ekran ve pist görselleri geçicidir (`docs/UNITY-GECIS.md` → “Sunum katmanı ayrımı”).
Otomatik kanıt: **Last Turn → Yarış Kısa Play Doğrulaması (gp_1)** + `node Unity/Validation/check-race-proof.mjs`.

## Açma

- Garajdan: **Garaj** sahnesi → Play → seçili araçla alttaki **Yarış: gp_1**. Kurulum ve etkinlik türünün yarış lastiği (asfalt) uygulanır.
- Doğrudan: **Last Turn → Yarış Test Sahnesini Aç (gp_1)** → Play. Kayıtlı oyuncu profilinin seçili aracı kullanılır.
- Ödül oyuncu kaydına yazılır. Gerçek kaydı değiştirmek istemiyorsan önce garajda **Ayrı test profilini aç**.

## Tuşlar

W/S gaz–fren, A/D direksiyon, Boşluk el freni, R yarışı yeniden başlat.

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

## Bilinen eksikler (bu aşamada yok)

Dekor/ağaç/tabela çarpışması ve bölge sınır duvarı (Unity fiziğinde `yakin`/`kutu` yok). Kerb sarsıntı bayrağı, rekor (`best`), hayalet, rakip, profil yarış/galibiyet sayaçları yok. Drift/rallikros/ralli/drag sürüş dünyası yok (kuralları ve oturumları .NET'te TS ile eşleşir). Geri sayım sesi ve ışıkları yok.
