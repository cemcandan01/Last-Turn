// Yarışların hedef süreleri (oyundaki EVENTS hesabıyla aynı), DOM'suz
import { REG } from "../../src/dunya/bolgeler";

const TYP_V: Record<string, { laps?: number; v?: number }> = {
  gp: { laps: 3, v: 35.3 },
  rx: { laps: 3, v: 28.5 },
  rl: { v: 12.2 },
};

/** yarışın adı, toplam hedef süresi ve tur başına hedef */
export function EVENTS_HEDEF(i: number) {
  const r = REG[i],
    y = TYP_V[r.t] || {},
    TR = r.TR!,
    laps = y.laps || 1,
    limit = r.tg || (y.v ? Math.round((TR.len * laps) / y.v / 5) * 5 : 0);
  return { n: r.n, limit, tur: limit / laps };
}
