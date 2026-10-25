# 2026-10-25-hayalet-arac

- Durum: tamamlandı.
- Aktif sahip: Jules; dal: jules/hayalet-arac.
- Temel SHA: 615acac993d95f35672acf276263f2158e7a57b5.

## Kullanıcının özgün isteği

"sen de yazılımsal geşliştirme yapıp push atabilir misin? sence bu geliştirmelerden ilk hangisi yapılmalı?" -> "başla"

## Kabul ölçütleri

1. [x] Yarış tamamlandığında veya kapalı pistte yeni en iyi tur süresi yapıldığında tur girdileri `lt_hayalet_<pist_k_anahtari>` altında depolanır.
2. [x] İlgili pistte kayıtlı hayalet rekoru varsa yarış başladığında saydam hayalet araç pistte belirir ve rekor turunu birebir oynatır.
3. [x] Hayalet araç fizik belirlenimciliğini ve `girdi-kaydi` modülünü kullanır; `uzakAraclariCiz` ile saydam olarak çizilir.
4. [x] Yeni en iyi derece yapıldığında hayalet kaydı otomatik güncellenir.
5. [x] Birim ve entegrasyon testleri (`npm test`) eksiksiz geçer.

## Test Kanıtları

- `npm test`: 17 test dosyasında 266 testin tamamı geçti.
- `npx tsc --noEmit`: Tip denetimi hatasız geçti.
- `npm run lint`: ESLint kontrolleri hatasız geçti.
