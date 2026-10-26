// MUTANT ölçülmüş referansları (issue #16): tests/olcum/mutant.test.ts (TAM=1) gerçek fizik + pilotla, türün başlangıç
// aracıyla, bütün turlar. Anahtar `<tür>_<pist no>` (pist numarası kalıcıdır). Değer: stok / dengeli / uzman build
// sonucu (süre sn, drift puan). Fizik, araç, parça ya da pist değişince ölçümü yenile ve bu tabloyu yeniden üret.
// Rapor: docs/denge/2026-10-26-mutant-olcum.json
import type { Referans } from "./mutant-kosu";

export const MUTANT_REFERANS: Record<string, Referans> = {};
