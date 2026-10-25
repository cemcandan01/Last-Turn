# Kariyer ve ekonomi dengesi: araştırma ve tasarım

## Kullanıcının isteği

> pekala şu an sayılar ve gelişim oranını tam çözmeli ve oyunun geri kalanında buna dair bir problem yaşamamalıyız. Gerçek yarış oyunlarındaki gelişim sürecini inceleyelim. bu kadar araba bu kadar modifiye parçası pistler boşa yapılmış olmasın. tek bir parça modifiyesi ile farklı yarış türlerinde tek bir arabayla yarışları tamamlayabiliyorum. arabayı daha da geliştiröel yerine yeni araba alıp yoluma bakabiliyorum. xp kazanımı, yıldızlar için gerekli sürelerin ayarı, modifiyenin maliyetine karşılık verdiği güçlendifme bunların hepsi dengeli olmalı. geçek oyunlarda bu nasıl dengeleniyor sistem nasıl kuruluyor. bunları netleştirmek lazım ki bundan sonra yapılan her yeni pist, araba, modifiye, oynanış mekaniği bu mantıkla çelişmesin ona bağlı kalsın burası çok önemli

## Sözleşme

- Sahip: Codex, tek uygulayıcı. Araştırma/kurallar işi; yardımcı ajan yok.
- Temel: origin/gelistirme `f41728c601fe28633f5e4ed229a5a513d1d80e73`, 0.7.1. Yerel inceleme codex/denge-modeli; kalıcı belge gönderimi süreç alanı codex/kurallar üzerinden.
- Kabul: resmî yarış oyunu kaynakları; bütün araç/parça/pist sayısal envanteri; kodla kanıtlı açıklar; ilerleme/araç/parça/XP/yıldız modelinin birlikte tanımı; yeni içerik için ölçülebilir kabul ve aşamalı uygulama planı.
- Kapsam: araştırma, tasarım ve kalıcı geliştirme kuralı. Oyun fiyatı/fiziği/kayıt/ödül/versiyon değişikliği yok. Öneri oranları ölçülmüş oyuncu sonucu gibi sunulmaz.

## Sonuç ve kanıt

- `docs/DENGE.md`: resmî GT7, NFS Heat ve Forza belgeleriyle karşılaştırma; 10 mevcut açık; önerilen kariyer ve ekonomi; hedef aralıklar ve uygulama sırası.
- `docs/denge/2026-10-25-envanter.json`: gerçek TypeScript veri ve fonksiyonlarından 15 araç/42 parça/40 pist çıkarımı. Geçici Vitest ölçümü 1/1, yaklaşık 0,5 sn; oyun testi veya sürüş matrisi değildir. Geçici üretici dosya kaldırıldı; yöntem: CARS/PARCALAR/TDEF ile performansPuani/aracKur/parcaFiyatHesapla/yarisSonuPara/yarisSonuXp çağrıları.
- Envanter: 7 D/7 C/1 B; 350 HP swap 2350; Serçe 181→264 puan. Drag7 sev1: ilk 3★ mevcut 365, zorlukla 65 XP. Bütün pistler tek bitiriş 3★ muhasebesi 9600/7350 XP; kilitli erişimi aşan varsayımsal toplamdır.
- Mevcut testlerdeki 30 pistli ilerleme ve parçasız alım simülasyonu gerçek kariyer dengesini doğrulamıyor. Bu işte test beklentileri veya oyun sayıları değiştirilmedi.
- Doğrulama: npm run kontrol (tip/ESLint/biçim), git diff --check ve süreç alanının mevcut 18/18 birim kontrolü geçti (Vitest ~0,7 sn). Markdown proje biçim denetiminde hariç tutuluyor; bağlantı ve başlıklar ayrıca incelendi. Oyun davranışı değişmediği için fizik/tarayıcı/tam regresyon tekrarına gerek yok.
- Yayın tabanı: inceleme sırasında gelen 71a7a16 yalnız diğer işin devir belgesini ekledi; bu satır korundu. Oyun envanterinin f41728c kaynağı değişmedi.
- Risk: önerilen dakika/etki/yıldız aralıkları insan ve sürüş kalibrasyonu bekliyor; sonsuz denge garantisi verilmiyor. İlerleme kilitleri ve lastik kalite tasarımı henüz uygulanmadı.
- Sonraki adım: ilk D kupasında iki platform/yatırım rotasıyla ölçülen örnek; önce XP kimlik/zorluk ve otomatik lastik rolü karara bağlanır, ardından tüm içerik matrisi.
