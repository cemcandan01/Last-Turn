# Unity yarış kuralları — Paket A (yarış planı 2. aşama) — 31 Ekim 2026

## İstek ve kabul

Cem: TS 0.8.18 drift puanı/geçerliliği, ters sürüş, pist dışı ve piste dönüş, pist kesme ve cezası, yıldız hedefleri ve sonuç değerlendirmesi saf C#'a; TS birim testleri, sınır durumları ve karşılaştırma senaryolarıyla doğrulansın; yeni formül yok.

1. Kurallar `src/oyun/yaris-kurallari.ts`, `piste-donus.ts`, `yildiz.ts` ile sabit/formül olarak birebir; DOM/kayıt yok.
2. TS oracle'ı sabit SHA'dan senaryo + tohumlu iz üretir, `--check` sapmayı reddeder; C# her adımda aynı durumu verir (1e-9).
3. TS birim testlerinin fiziğe bağlı olmayan iddiaları C#'ta aynen geçer; sınırlar (1+5 sn, kerb, 15 m, 10 m kazanç, JS yuvarlama) hedefli vakayla sınanır.
4. Unity derler; garaj/pist davranışı değişmez.

## Sahiplik / Git

Sahip ve uygulayıcı Claude (claude-opus-5-5); Codex kotası dolu, ikinci ajan yok. Dal `claude/unity-yaris-kurallari`, taban `03787f2` (pist aktarımı). Yalnız yerel commit.

## Yapılan

- Core `RaceRules.cs`: `DriftCounter` (driftPuanHizi, driftAdimi, bonus: uzun/direksiyonsuz/tek yön, driftBankala, x6 çarpanı), `WrongWayCounter` (tersAdimi), `TrackRules.Locate/Edge` (pistKonumu, pistKenari), `OffTrackCounter` (pistDisiAdimi), `CutCounter` (kesmeAdimi), `RaceStars` (tür anahtarı, eşikler, yildizSay, drift rekor ön eki), `JsMath.Round` (JS Math.round: eşitlikte +∞; C# bankacı yuvarlaması kullanılmaz).
- **Pist kesme cezası:** TS kariyer yarışında kesme yalnız algılanır ve “PİST KESME” bildirimi verir; ceza (atlanan/10 gövde) yalnız MUTANT'ta (`mutantKesme`). Kariyer için ceza eklenmedi; MUTANT kapsam dışı.
- `Validation/export-race-rules.mjs` → `Reference/race-rules-0.8.18.json` (3,8 MB): sabitler; 31 drift senaryosu (yildiz.test.ts girdileri + 6 tohumlu iz); ters sürüş sentetik hız izleri (geri hızlanma/dönüş, yavaş araç, spin, 3 rastgele); pist dışı/kesme: TS birim testindeki sentetik pistler (TS `mkTrack` çıktısı dosyada) + gerçek gp_1/dp_1/rx_1/rl_1/dg_1/gp_3 üzerinde ipuçlu rastgele araç yürüyüşü (kenar taşması, 7 sn dışarıda bekleme, kestirme); kesme.test.ts gerçek gp iç saha araması; 40 pist yıldız eşiği ve sınır sayımları. Gerçek pistler `export-tracks.mjs`'deki doğrulanmış bileşimle kurulur (ortak `regionTrack`).
- **Sınır vakaları:** kesmenin 15 m alt sınırı (köşe kestirmesi, a=24/30) ve 10 m kazanç toleransı (sabit dik çıkış/dönüş, ~140 m atlanan mesafe); TS kararının değiştiği yol ikili aramayla bulunur, iki yanı (±0,05 m) yazılır.
- `.NET --race-rules` (`RaceRulesValidation.cs`); CI'ye `export-race-rules --check` ve `--race-rules` eklendi (çalıştırılmadı).

## Kanıt

- `node Unity/Validation/export-race-rules.mjs --check`: drift 31 senaryo/8.673 adım, ters 3.370, pist dışı 8.373 (249 dönüş), kesme 13.537 (14 kesme), 40 pist yıldızı; 10 kaynak dosya hash'li.
- `--race-rules`: **266.363 iz koşulu + 37 TS birim testi iddiası**; en büyük TS–C# farkı **3,41e-13** (tolerans 1e-9 göreli).
- Taşınan TS birim iddiaları: yildiz.test.ts (yıldız sayımı, 10° taban, geçiş akışı/0,6 sn, x6 %89/%91 ve çarpan 6, ters kombo, puan hızı sıralaması, 60° kesim, m/s, bonus dizisi/1050, 2,9 sn bonus yok, direksiyonsuz 450, taraf değişimi, bankalama +250, yanma, ters bonus yok); piste-donus.test.ts (1+5 sn tam sınırı, erken dönüş, yeni hiza, kerb sınırı, örnek arası kenar, kapalı birleşim, açık uçlar); kesme.test.ts (çapraz kesme 70–110 m ve sıfırlama, dışarıdan dolaşma/paralel/geri dönüş 0, gerçek gp iç saha ds−40…ds+10).
- **Taşınmayan TS iddiaları (fizik/YZ gerekir):** yildiz.test.ts “drift pistinde ters sürünce bayrak” gerçek araç fiziğiyle; kesme.test.ts “YZ tur atarken yanlış kesme yok” YZ sürücüyle; mutant-kosu kesme cezası. Ters bayrağı sentetik hız izleriyle, kesme gerçek pist yürüyüşleriyle oracle'a bağlandı; fizikle tur Paket B'de.
- Duyarlılık (geçici bozma, geri alındı; her biri yakalandı): ters çıkış 0,5→0,6; JS yuvarlama → bankacı; geçiş 0,6→0,61; pist dışı 1e-9 payı; kazanç `> 10` → `≥ 9,8`; kesme alt sınırı 15→15,1. İlk iki sınır vakası denemem yalnız 15 m sınırını sınıyordu; sabit çıkışlı yol ailesiyle 10 m toleransı ayrıca bağlandı.
- Unity 6000.3.9f1 (UTC 09:55): `check-editor-proof` 28 Core dosyası derlendi + kısa test.
- Regresyon: `export-tracks --check`, `--tracks` değişmedi.

## Sonraki tek adım

Paket B: yarış oturumu (`docs/isler/2026-10-31-unity-yaris-oturumu.md`).
