# Test paneli — kısa kullanım

1. **Last Turn → Ana Menüyü Aç**, sonra **Play**. Ana menüden **Garaj / Mağaza**, **Kariyer / Yarışlar** veya **Test / Geliştirici** seç. Game alanı küçükse Game sekmesine sağ tık → **Maximize**. Panel yazıyı küçültmez; dar alanda Test sekmesi kısa adla görünür ve bölüm içeriği kaydırılır.
2. **Garaj:** sahip olunan araç / mağaza, araç seçimi ve istatistikler. **Modifiye:** parça önizleme, al/tak/sök, paketler. Satın alma ikinci basışla onaylanır.
3. **Yarışlar → Drag → ilk pist (dg_1) → Yarışı Başlat**. Başlatma düğmesi alt satırda kalır. Asfalt, Rallikros, Ralli ve Drift de aynı yerde; her türün sekiz pisti vardır. Kilitli seçim nedenini mesaj satırında açıklar.
4. **Test / Geliştirici:** tek tıklamayla dg_1, GTTest, TerrainTest ve RaceTest; ayrı test profili, kaydet ve yeniden yükle. Oyuncu kaydını değiştirmeden denemek için önce ayrı test profilini aç.
5. **Ayarlar:** kalıcı sürüş yardımı ve GT/Arazi testlerinin lastik seçimi. Yarış bileşiğini etkinlik otomatik belirler.

Drag mevcut manuel vites sistemini kullanır: geri sayımda W ile kalkış devri, E yükselt / Q düşür. Diğer türler otomatik. Bu panel değişikliği yarış/fizik/ekonomi/kayıt kurallarını değiştirmez.

Otomatik kontroller: `.NET --panel`, `.NET --garage-ui`; Unity menüsünde **Test Paneli Kısa Play Doğrulaması**. Erişim testi ayrı geçici profilde dg_1 ve diğer dört türü, üç test sahnesini, hata açıklamalarını ve kayıt değişmezliğini sınar. Bu bir uzun yarış regresyonu değildir.
