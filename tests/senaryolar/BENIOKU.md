# Senaryolar

Her dalın test senaryoları kendi dosyasında: `<dal>.mjs` (dal adıyla aynı). Bir dal yalnız kendi dosyasını değiştirir.

Alanlar:

- `id`: kısa, benzersiz ad
- `ad`: senaryonun ne denetlediği (raporda görünür)
- `p`: önem. **1** kritik (oyun açılmaz, sürülmez, yarış bitmez), **2** önemli (bir özellik bozulur), **3** ayrıntı (görünüm, ince ayar)
- `duman: true`: hızlı duman turunda da koşar. Yalnız hızlı (birkaç saniye) ve oyunun temelini denetleyen P1 senaryolar
- Türü, biri:
  - `tarayici: "<bölüm>"`: `tests/e2e/bolumler/<bölüm>.mjs`
  - `birim: { dosya: "tests/birim/x.test.ts", grup: "<describe adı>" }`: Vitest'te o `describe` grubu

Koşum: `node tests/kosucu.mjs duman | alan <dal> | regresyon` (ayrıntı `oyun-test` skill'i).

Geliştirme turunda seçilmiş kapsam: `npm run alan -- altyapi --senaryo firebase-giris-yardimcisi,bulut-esitleme`; `--liste` yalnız kapsamı gösterir. Boş/yanlış seçim hata verir. Tam regresyon/duman daraltılamaz. CI varsayılanı tüm ilgili alandır.
