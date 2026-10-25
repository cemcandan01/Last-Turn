# rekor-hayaleti

- 0.7.1: Ayarlar → Mekanikler'e "Rekor hayaleti" aç/kapat eklendi (`set.rh`, varsayılan açık, lt_ayar'da kalıcı).
- Kapalıyken hayalet çizilmez ama oynatma arkada sürer; yarış ortasında açılınca doğru konumdan görünür.
- Hayalet yalnız 0.6.8 sonrası bitirilen yarış / tamamlanan serbest tur rekorundan oluşur; eski rekorların girdi kaydı yok (Cem'in "görmedim" nedeni).
- Kayıt cihaza özel (localStorage), buluta gitmiyor. Açık iş: istenirse bulut eşitleme ya da başka oyuncuların hayaletleri.
