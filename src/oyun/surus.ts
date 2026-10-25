// Sürüş: simülasyonu oyuna bağlar. Dünya sorgusu, sürüş kurulumu ve olaylar buradan fiziğe verilir;
// her sabit adımda fizik, yarış mantığı ve serbest sürüş tur sayacı sırayla çalışır.
import { note } from "../arayuz/bildirim";
import { puff } from "../cizim/parcaciklar";
import { ortam } from "../cizim/ortam";
import { mB } from "../dunya/kurucu";
import { dunya, Hw, surfW } from "../dunya/dunya";
import { REG, regAt, type Bolge } from "../dunya/bolgeler";
import { ipucu, nearest } from "../dunya/pist";
import { aracAdimi, aracOrnegiYap, aracSifirla } from "../fizik/arac-ornegi";
import { ADIM } from "../fizik/simulasyon";
import type { DunyaSorgusu, SurusKurulumu } from "../fizik/tipler";
import { kameraSifirla } from "../cizim/kamera";
import { set } from "./ayarlar";
import { carIndex, oyun } from "./durum";
import { hayaletKaydet } from "./hayalet-kayit";
import { fizikGirdisi } from "./girdi";
import { kurulum } from "./kurulum";
import { PROF, saveProf } from "./profil";
import { yaris, evTick } from "./yarislar";
import { rekorHayaletiBaslat, rekorHayaletiDurdur, uzakAdimi, uzakSifirla } from "./uzak";

/** serbest sürüşte tur sayacı (kapalı pistlerde) */
export const LAP = {
  run: 0,
  t: 0,
  last: null as number | null,
  best: null as number | null,
  armed: 0,
  kayitBas: 0,
  prev: 0,
  reg: null as Bolge | null,
};

/**
 * bir aracın dünya sorgusu. b: aracın bulunduğu bölgeyi tutan nesne (zemin sorgusunda güncellenir; kerb ve yol
 * türü ona göre). Yerel araçta bu dunya'nın kendisidir (HUD ve tur sayacı dunya.cur'u okur), diğer araçlarda kendi
 * nesneleri: araçlar birbirinin bölgesini bozmaz
 */
export function dunyaSorgusuYap(b: { cur: Bolge | null }): DunyaSorgusu {
  return {
    H: Hw,
    surf: (x, z) => {
      const oncekiBolge = dunya.cur,
        oncekiIpucu = ipucu.ti;
      const r = surfW(x, z);
      b.cur = dunya.cur;
      if (b !== dunya) {
        dunya.cur = oncekiBolge;
        ipucu.ti = oncekiIpucu;
      }
      return r;
    },
    yakin: (x, z) => dunya.cols.yakin(x, z),
    kutu: () => (yaris.EV ? REG[yaris.EV.reg].box : oyun.CURW.box),
    kerb: (x, z) => (b.cur && b.cur.Hk ? b.cur.Hk(x, z) : 0),
    havaTutusu: () => ortam.g,
    karli: () => ortam.k == "snow",
    yolTuru: () => (b.cur ? b.cur.t : null),
  };
}

const surusKurulumu = (): SurusKurulumu => ({
  // takılı parçalar (oyun/modifiye.ts): yalnız seçili araca aitse
  car: kurulum.mod && kurulum.mod.taban === oyun.CAR ? kurulum.mod.car : oyun.CAR,
  pk: kurulum.pk,
  tire: kurulum.tire,
  tu: kurulum.tu,
  as: kurulum.as,
  ss: set.ss,
  sm: set.sm,
});

/** yerel oyuncunun aracı: kamera, ses, HUD ve yarış buna bakar */
export const yerel = aracOrnegiYap(
  {
    dunya: dunyaSorgusuYap(dunya),
    kurulum: surusKurulumu(),
    olay: { spin: () => note("SPİN", 40), puf: puff, caliRengi: () => mB.color.getHex() },
    gorselRng: Math.random,
  },
  1,
);
export const sim = yerel.sim;
let kayitImza = "";
export let kayitKurulumu = structuredClone(surusKurulumu());
export let kayitHavasi = { tutus: ortam.g, karli: ortam.k === "snow" };

/** aracı (x, z) noktasına koy; verilmezse açık dünyanın ilk ışınlanma noktası */
export function reset(x?: number, z?: number, h?: number, rekoruSifirla = true) {
  const sp = oyun.CURW.tele[0];
  x = x ?? sp[1];
  z = z ?? sp[2];
  h = h ?? sp[3];
  aracSifirla(yerel, x, z, h, Hw(x, z));
  kayitKurulumu = structuredClone(surusKurulumu());
  kayitImza = JSON.stringify(kayitKurulumu);
  kayitHavasi = { tutus: ortam.g, karli: ortam.k === "snow" };
  LAP.kayitBas = 0;
  uzakSifirla(rekoruSifirla);
  kameraSifirla(h);
  LAP.run = 0;
  LAP.t = 0;
  LAP.armed = 0;
  dunya.cur = regAt(x, z);
  dunya.TR = dunya.cur ? dunya.cur.TR : null;
  LAP.reg = dunya.cur;
  if (dunya.TR) {
    ipucu.ti = nearest(dunya.TR, x, z, 0, true)[0];
    LAP.prev = ipucu.ti;
  }
}

/** bir sabit adım: fizik, yarış, tur sayacı */
export function surusAdimi() {
  const S = sim.S;
  PROF.km += (Math.hypot(S.vx, S.vz) * ADIM) / 1000;
  yerel.cx.kurulum = surusKurulumu();
  if (JSON.stringify(yerel.cx.kurulum) !== kayitImza || ortam.g !== kayitHavasi.tutus)
    yerel.kayit.kesik = true;
  const gi = fizikGirdisi(),
    son = aracAdimi(yerel, gi);
  if (sim.d.zaman % 20 < ADIM) saveProf();
  turSayaci(ADIM);
  if (yaris.EV) evTick(ADIM, son, gi.tg);
  uzakAdimi();
}

/** serbest sürüşte kapalı pistlerde tur zamanı */
function turSayaci(dt: number) {
  const cur = dunya.cur;
  dunya.TR = cur ? cur.TR : null;
  if (LAP.reg !== cur) {
    LAP.reg = cur;
    LAP.run = 0;
    LAP.best = null;
    LAP.armed = 0;
    if (!yaris.EV) rekorHayaletiDurdur();
    LAP.prev = ipucu.ti;
  }
  const TR = dunya.TR;
  if (TR && !TR.open && !yaris.EV) {
    const N = TR.N,
      ti = ipucu.ti;
    if (ti > N * 0.4 && ti < N * 0.6) LAP.armed = 1;
    if (LAP.prev > N * 0.8 && ti < N * 0.2) {
      if (LAP.run && LAP.armed) {
        LAP.last = LAP.t;
        LAP.best = LAP.best == null ? LAP.t : Math.min(LAP.best, LAP.t);
        if (cur) {
          hayaletKaydet(
            "lap_" + (cur.n || "pist"),
            carIndex(),
            LAP.last,
            yerel.kayit,
            false,
            kayitKurulumu,
            LAP.kayitBas,
            kayitHavasi,
          );
        }
      }
      if (cur) rekorHayaletiBaslat("lap_" + (cur.n || "pist"), dunyaSorgusuYap({ cur: null }));
      LAP.kayitBas = yerel.kayit.n;
      LAP.run = 1;
      LAP.t = 0;
      LAP.armed = 0;
    }
    if (LAP.run) LAP.t += dt;
    LAP.prev = ti;
  }
}
