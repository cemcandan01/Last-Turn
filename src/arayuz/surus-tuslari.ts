// Sürüş sırasındaki üst tuşlar: kamera (🎥), lastik (🛞), yeniden doğma (↺), duraklat (⏸)
import { $ } from "../cekirdek/dom";
import { cl } from "../cekirdek/matematik";
import { REG } from "../dunya/bolgeler";
import { dunya, Hw } from "../dunya/dunya";
import { ipucu } from "../dunya/pist";
import { CAMS, oyun } from "../oyun/durum";
import { reset, sim } from "../oyun/surus";
import { yaris } from "../oyun/yarislar";
import { lastikDegistir, showSet } from "./ayarlar-ekrani";
import { note } from "./bildirim";

/** ↺: serbest sürüşte en yakın yola/piste, yarışta pistin en yakın noktasına koyar (süre işlemeye devam eder) */
function yenidenDog() {
  if (oyun.mode != "drive") return;
  const EV = yaris.EV,
    TR = EV ? EV.TR : dunya.TR,
    rg = EV ? REG[EV.reg] : dunya.cur;
  if (TR) {
    let i = ipucu.ti;
    // çamurda yeniden doğma: çamurdan çıkana kadar pist boyunca ileri al
    if (rg && rg.inMud)
      for (
        let n = 0;
        n < TR.N &&
        [0, 3, -3].some((k) => {
          const q = TR.P[TR.open ? cl(i + k, 0, TR.N - 1) : (i + k + TR.N) % TR.N];
          return rg.inMud!(q[0], q[1]);
        });
        n++
      )
        i = TR.open ? Math.min(i + 1, TR.N - 1) : (i + 1) % TR.N;
    const P = TR.P[i],
      T = TR.T[i],
      t = EV ? EV.t : 0;
    reset(P[0], P[1], Math.atan2(T[0], T[1]));
    if (EV) {
      EV.t = t;
      EV.prev = ipucu.ti;
      EV.combo = 0;
      EV.mult = 1;
      EV.ct = 0;
    }
  } else {
    const S = sim.S;
    S.vx = S.vz = S.w = 0;
    S.y = Hw(S.x, S.z) + 0.5;
    S.air = true;
    sim.pozKaydet();
  }
}

export function surusTuslariKur() {
  $("#gs").onclick = showSet;
  $("#ts").onclick = lastikDegistir;
  $("#rs").onclick = yenidenDog;
  $("#cm").onclick = () => {
    oyun.camMode = (oyun.camMode + 1) % 4;
    note(CAMS[oyun.camMode], 30);
  };
}
