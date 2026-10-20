// Sürüş kurulumu: önayar (PK), yardım seviyesi (LK), araç ayarları (TU), yardımlar (AS), lastik.
// Yarıştan önceki kurulum yarış bitince geri yüklenir (yarislar.ts).
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
  /** önayardan sonra elle değiştirildi mi */
  custom: false,
};

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
}

export type KurulumKaydi = ReturnType<typeof kurulumKaydet>;

export const kurulumKaydet = () => ({
  pk: kurulum.pk,
  lk: kurulum.lk,
  tire: kurulum.tire,
  tu: { ...kurulum.tu },
  as: { ...kurulum.as },
  custom: kurulum.custom,
});

export function kurulumYukle(v: KurulumKaydi) {
  Object.assign(kurulum, { ...v, tu: v.tu, as: v.as });
}
