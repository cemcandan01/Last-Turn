// Yarış bileşiğini etkinlik, kaliteyi takılı lastik geliştirmesi seçer. Oyuncu yarışta lastik değiştirmez.
import type { YarisTuru } from "./araclar";
import { parcaBul } from "./parcalar";
export const YARIS_LASTIKLERI: Record<YarisTuru, number> = { gp: 0, rx: 1, rl: 1, dp: 3, dg: 6 };
export const lastikKalitesi = (ids: readonly string[]) =>
  ids.reduce((n, id) => {
    const p = parcaBul(id);
    return p?.kat == "lastik" ? p.sv : n;
  }, 0);
export function yarisLastigi(tur: YarisTuru, ids: readonly string[] = []) {
  const kalite = lastikKalitesi(ids),
    taban = YARIS_LASTIKLERI[tur];
  return kalite ? 7 + taban * 3 + kalite - 1 : taban;
}
