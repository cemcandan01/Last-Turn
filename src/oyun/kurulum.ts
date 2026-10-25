// Sürüş kurulumu: önayar (PK), yardım seviyesi (LK), araç ayarları (TU), yardımlar (AS), lastik.
// Yarıştan önceki kurulum yarış bitince geri yüklenir (yarislar.ts).
// Modifiye: takılı parçalar varsa (oyun/modifiye.ts → modifiyeUygula) kurulum.mod parçalı aracı ve parçaların ayar
// alanlarını taşır; fizik aracı ondan alır (oyun/surus.ts), önayar seçilse de parça ayarları üstüne yazılır.
import type { Arac, YarisTuru } from "../arac/araclar";
import {
  LEVELS,
  PRESETS,
  type Ayarlar,
  type OnayarAnahtari,
  type SeviyeAnahtari,
  type Yardimlar,
} from "../fizik/veriler";

export const kurulum = {
  pk: "fd" as OnayarAnahtari,
  lk: "real" as SeviyeAnahtari,
  tu: {} as Ayarlar,
  as: {} as Yardimlar,
  tire: 1,
  /** Yarışa özel geçici lastik; serbest sürüşe dönünce kayıtla geri yüklenir. */
  yarisLastik: null as number | null,
  /** önayardan sonra elle değiştirildi mi */
  custom: false,
  /**
   * takılı parçalar (yoksa null: stok). taban: CARS'taki araç (seçili araç o değilse yok sayılır), car: parçalı araç,
   * tire: lastik parçası (yoksa null: önayarın lastiği), ayar: parçaların yazdığı ayar alanları
   */
  mod: null as ModKurulumu | null,
};

export interface ModKurulumu {
  taban: Arac;
  car: Arac;
  tire: number | null;
  ayar: Partial<Ayarlar>;
  parcalar: string[];
}

/** önayarı ve yardım seviyesini uygula (önayarın yardım tabanı ve tavanıyla) */
export function applyPreset() {
  const p = PRESETS[kurulum.pk];
  kurulum.tu = { ...p.v };
  kurulum.tire = p.tire;
  const as = { ...LEVELS[kurulum.lk].v };
  if (p.ast) for (const k in p.ast) as[k] = Math.max(as[k], p.ast[k]!);
  if (p.cap) for (const k in p.cap) as[k] = Math.min(as[k], p.cap[k]!);
  kurulum.as = as;
  kurulum.custom = false;
  const m = kurulum.mod;
  if (m) {
    Object.assign(kurulum.tu, m.ayar);
    if (m.tire != null) kurulum.tire = m.tire;
  }
  if (kurulum.yarisLastik != null) kurulum.tire = kurulum.yarisLastik;
}

/** Yarış malzemesine uygun lastik; garajdaki parça sahipliği ve takılı liste değişmez. */
export const YARIS_LASTIKLERI: Record<YarisTuru, number> = { gp: 0, rx: 2, rl: 1, dp: 3, dg: 6 };
export function yarisLastigiTak(tur: YarisTuru) {
  kurulum.yarisLastik = YARIS_LASTIKLERI[tur];
  kurulum.tire = kurulum.yarisLastik;
}

export type KurulumKaydi = ReturnType<typeof kurulumKaydet>;

export const kurulumKaydet = () => ({
  pk: kurulum.pk,
  lk: kurulum.lk,
  tire: kurulum.tire,
  yarisLastik: kurulum.yarisLastik,
  tu: { ...kurulum.tu },
  as: { ...kurulum.as },
  custom: kurulum.custom,
  mod: kurulum.mod,
});

export function kurulumYukle(v: KurulumKaydi) {
  Object.assign(kurulum, { ...v, tu: v.tu, as: v.as });
}
