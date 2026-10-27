// MUTANT dalının senaryoları (tests/senaryolar/BENIOKU.md)
export default [
  {
    id: "mutant-akis",
    ad: "MUTANT A1/A2: menü, boss kartı, araç/pasif seçimi, etkinlik işareti → kariyer dışı yarış → koşu parası, NİTRO tuşu, eklenti sandığı (normal/lanetli), atölye, zorunlu boss, özet; normal yarış etkilenmez",
    p: 1,
    tarayici: "mutant",
  },
  {
    id: "mekanik-yurutucu",
    ad: "Mekanik yürütücü: tekrar engeli, yığınlama yok, sonlu döngü, enerji sınırı",
    p: 1,
    birim: { dosya: "tests/birim/mekanikler.test.ts", grup: "LT-SYS-001 mekanik yürütücü" },
  },
  {
    id: "drift-gozlemcisi",
    ad: "Drift gözlemcisi gerçek fizikte durumu değiştirmez, savrulmadan enerji yok",
    p: 1,
    birim: {
      dosya: "tests/birim/mekanikler.test.ts",
      grup: "LT-SYS-001 drift gözlemcisi (gerçek fizik, Boş Otopark, Beyaz Kurt)",
    },
  },
  {
    id: "ortak-kurallar",
    ad: "Spin yakma, Tutuş Darbesi süresi/beklemesi, değiştirici sınırları",
    p: 1,
    birim: {
      dosya: "tests/birim/mekanikler.test.ts",
      grup: "LT-SYS-001 ortak kurallar: spin yakma, Tutuş Darbesi, değiştiriciler",
    },
  },
  {
    id: "kosu-kurallari",
    ad: "MUTANT koşu: boss/geri sayım, etkinlik ödülü, XP/seviye/pasif, atölye, boss sonrası bölge, belirlenimcilik",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT koşu (A1)" },
  },
  {
    id: "nitro-sistemik",
    ad: "MUTANT A2 nitro: enerji, süre/soğuma, güç; Çarpışma Pili, Risk Kondansatörü, Nitro kalkanı; belirlenimcilik, kariyer yalıtımı",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT A2: nitro ve sistemik güçler" },
  },
  {
    id: "eklenti-sandiklari",
    ad: "MUTANT A2 eklenti sandıkları: tohumlu yerleşim, normal/lanetli seçim, bedel, sözleşmeye katılım",
    p: 1,
    birim: { dosya: "tests/birim/mutant.test.ts", grup: "MUTANT A2: eklenti sandıkları" },
  },
  {
    id: "kombinasyon-matrisi",
    ad: "Enerji perkleri + sandık eklentileri: 1-3'lü bütün kombinasyonlar kırılmaz; etkisiz perk yok; sinerji raporu",
    p: 2,
    birim: { dosya: "tests/birim/mutant-matris.test.ts", grup: "MUTANT kombinasyon matrisi" },
  },
  {
    id: "rakip-yz",
    ad: "A3 rakip YZ: yarış çizgisi/hız profili, kişilik, stok kurulum (gizli çarpan yok), 5 araç × 2 kişilik 2 tur, ışınlanma yok, tohum tekrarı, zorlanmadan toparlanma",
    p: 1,
    birim: {
      dosya: "tests/birim/rakip.test.ts",
      grup: "A3 rakip YZ: düello pistinde gerçek fizik (Yeşil Vadi, 2 tur)",
    },
  },
  {
    id: "rakip-plan",
    ad: "A3 rakip YZ (saf): çizgi pist içinde ve düz, hız profili sınırlı, tohumlu sapma, geri sayım/kalkış",
    p: 2,
    birim: {
      dosya: "tests/birim/rakip.test.ts",
      grup: "A3 rakip YZ: yarış çizgisi, hız profili ve kişilik (saf)",
    },
  },
  {
    id: "rakip-duello",
    ad: "A3 düello: kart (Çaylak/Deneyimli), rakip aynı fizikle kalkar ve çizilir, HUD sıra/fark, yeniden başlatma, kazan/kaybet sonucu, 4x yavaş işlemcide maliyet",
    p: 1,
    tarayici: "rakip",
  },
  {
    id: "skill-akis",
    ad: "LT-SYS-004 skill: başlangıçta skill teklifi, tuş/bar, drift kaporası kilitli ve kaybedince skill gider, düelloda kanca enerji harcar ve bağlanır",
    p: 1,
    tarayici: "beceri",
  },
  {
    id: "skill-yurutucu",
    ad: "LT-SYS-004 skill yürütücüsü: belirlenimcilik, sonlu zincir, Grappling Hook, Flying Dutchman, Risk Taker, Slipstream, anti-farm",
    p: 1,
    birim: { dosya: "tests/birim/beceri.test.ts", grup: "LT-SYS-004 skill sistemi" },
  },
  {
    id: "skill-fizik",
    ad: "LT-SYS-004 skill kuvvetleri gerçek fizikte: dış ivme yokken birebir aynı, kanca yaklaştırır, ışınlanma yok",
    p: 1,
    birim: { dosya: "tests/birim/beceri-fizik.test.ts", grup: "LT-SYS-004 skill kuvvetleri gerçek fizikte" },
  },
  {
    id: "skill-his",
    ad: "LT-SYS-005 skill'ler hissedilir: kanca rakibe/pist/yol noktasına bütün süre çeker, dönüşüm yol kazandırır, Dutchman 2,5 sn, temel sürüş enerjisi, Risk Taker açık dünyada dolar, kullanılamama nedenleri",
    p: 1,
    birim: { dosya: "tests/birim/beceri-his.test.ts", grup: "LT-SYS-005 skill'ler hissedilir" },
  },
  {
    id: "skill-efekt-hud",
    ad: "LT-SYS-005 açık dünyada üç skill yuvası (ikon, seviye, durum), reddedilen istekte neden, kanca halatı yola, hayalet gövde, Risk Taker alevi ve kalan süre, gölgeler kapalıyken de",
    p: 1,
    tarayici: "beceri-his",
  },
  {
    id: "yol-agi",
    ad: "LT-SYS-005 açık dünya asfalt yol ağı: bütün etkinlikler/atölye/boss bağlı, yolda engel yok, asfalt araç pilotla varır, ralli aracı toprakta hızlı",
    p: 1,
    birim: { dosya: "tests/birim/yol-agi.test.ts", grup: "LT-SYS-005 açık dünya asfalt yol ağı" },
  },
  {
    id: "pist-kesme",
    ad: "LT-SYS-006 pist kesme: kısa yoldan dönüş algılanır, geniş almak/paralel gitmek/geri dönmek değil; gerçek pistlerde YZ'ye yanlış alarm yok; ceza atlanan/10 gövde, hayalet korumaz",
    p: 1,
    birim: { dosya: "tests/birim/kesme.test.ts", grup: "LT-SYS-006 pist kesme gerçek pistte" },
  },
  {
    id: "pist-kesme-kural",
    ad: "LT-SYS-006 pist kesme kuralı (saf): çapraz kestirme, dışarıdan geniş alma, paralel sapma, geri dönme, ceza",
    p: 1,
    birim: { dosya: "tests/birim/piste-donus.test.ts", grup: "LT-SYS-006 pist kesme" },
  },
];
