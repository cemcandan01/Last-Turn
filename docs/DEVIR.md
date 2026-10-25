# Son devir: kariyer entegrasyonu doğrulanıyor

- Codex, codex/kariyer; kart docs/isler/2026-10-25-kariyer-uygulama.md. Temel a62833c, 0.7.1; sıradaki deneme yaması kontrollerden sonra. Canlı 0.6.8 değişmedi; regresyon tamamlandi, dondurma yok.
- 40 yarışa sabit performans bütçesi, ayrı ödülsüz deneme, süre bazlı XP/para ve yıldız erişimi eklendi. Motor/parça/araç fiyatları kalibre; kategori yatırımı üst alıma sayılır. Otomatik yarış bileşiği alınan kaliteyi kullanır. Mevcut sahiplik/XP/para/yıldız silinmez; eski fizik hayaleti oynatılmaz.
- docs/DENGE.md tasarım temeli. Kurallar oyun/kariyer.ts; ölçümler docs/denge/2026-10-25-kariyer-olcum.json (40 pist), yatırım karşılaştırması 2026-10-25-yatirim-olcum.json (15 örnek). Yeni içerikte kariyer sözleşmesi CI kapısıdır; kullanılan kurulum/fizik/geometri değişirse ilgili ölçüm yenilenir.
- Yerel temel 68/68; son kariyer+kurallar 30/30; ilgili gerçek fizik 22/22, titreşim/kararlılık 10/10. Geniş turda yük altında 5 sn süre aşımı ve titreşim fixture ayrımı düzeltildi; ayrıntı kartta. Tip/ESLint/biçim temiz; tarayıcı CI ve deneme yayını bekleniyor. İnsan sürüş/keyif dağılımı otomasyon kanıtı değildir.
- Önceki: Claude rekor-hayaleti ayarını 0.7.1'de yayımladı (f41728c, Yayın 40204370746); varsayılan açık, kapalıyken çizilmez, oynatma sürer. Kart docs/isler/2026-10-25-rekor-hayaleti-ayar.md. Korundu.
- Önceki canlı 0.6.8: 147ea038; regresyon 104/104 + duman 10/10, canlı duman 10/10; kanıt docs/isler/2026-10-25-canli-esitleme-regresyon.md. Yeni canlı çıkışı Cem'in regresyon sonu onayını ister; konu/deneme gönderimi yeniden onay istemez.

- Birleştirme: geliştirme dalının 0.7.2–0.7.5 drift bonus/kerb/geri sayım işleri korundu (0871a3b). Drift2 rekor anahtarı, yeni bonus kuralları, dört teker çimde kombo ve 1 sn sonrası sayaç aynen devralındı. Kartlar docs/isler/2026-10-25-drift-bonus-denge.md ve 2026-10-25-kerb-pist.md. Kariyer drift hedefleri yeni kuralla yeniden ölçülüyor; sonraki yama en az 0.7.6.
