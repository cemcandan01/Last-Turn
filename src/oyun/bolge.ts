// Bölge geçişi: yalnız kullanılan bölge çizilir; tema ve koşullar uygulanır, mini harita çizilir
import { mmDraw } from "../arayuz/mini-harita";
import { applyEnv } from "../cizim/ortam";
import { ground } from "../cizim/zemin";
import { REG, type Bolge } from "../dunya/bolgeler";
import { dunya, ensureBuilt } from "../dunya/dunya";

export function setActive(r: Bolge | null) {
  applyEnv((r && r.th) || "day");
  if (r) ensureBuilt(r);
  ground.visible = !(r && r.t == "rl");
  if (dunya.g) dunya.g.visible = !r;
  for (const q of REG) if (q.g) q.g.visible = q === r;
  mmDraw(r);
}
