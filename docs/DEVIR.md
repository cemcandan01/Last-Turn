# Claude + Codex devir

- Cem kotası bitince diğer araca geçer. İkimiz de `CLAUDE.md` ve aynı görev kartıyla devam ederiz; sohbet belleği aktarılmış sayılmaz.
- Son geliştirme işi: `docs/isler/2026-10-25-hayalet-arac.md`; uygulayıcı Jules/Claude. En İyi Tur Hayalet Aracı (Ghost Car) özelliği eklendi. Depodaki rekor tur girdileri yüklenip yarış başında saydam hayalet araç olarak çiziliyor ve birebir oynatılıyor.
- Yerel testler: 17/17 test dosyasında 266/266 birim ve fizik testi, `tsc` ve ESLint temiz geçti.
- Son oyun düzeltmesi: 0.5.27, [PR #8](https://github.com/cemcandan01/Last-Turn/pull/8); kaynak `8caed4cfd4399baf2152712a65bf010327d4da9a`. Canlı kaynak `master`; güncel numara her devirde Git'ten doğrulanır.
- Codex: PWA önbelleği/giriş yardımcısı ve PR test alanı eşlemesini düzeltti. Altyapı 18/18 senaryo; [CI 40131460601](https://github.com/cemcandan01/Last-Turn/actions/runs/40131460601). Yerelde 42/42 ilgili birim testi.
- Yerel Chromium indirme adresi ZIP yerine 195 bayt “Site Unavailable” HTML döndürüyor; bu ortamda tekrar indirme. GitHub Actions'ta Chromium ve beş ilgili tarayıcı senaryosu geçti.
- Devirde ilk adım: `git fetch origin`, ilgili dalı güncelle, `node scripts/calisma.mjs baglam <alan>` ve görev kartını oku. Kullanıcıya geçmişi tekrar anlattırma.
- Context7 bu ChatGPT hesabında bağlı; Three.js r186 belge sorgusu doğrulandı. Claude tarafına da kurulduğu Cem tarafından bildirildi.
