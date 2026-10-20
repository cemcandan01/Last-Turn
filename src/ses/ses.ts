// Ses katmanı: oyunun durumunu her karede okur; motor, sürüş efektleri, yarış sesleri ve menü müziğini yönetir.
// Ses, ilk dokunuşta açılır (iOS). Seviyeler Ayarlar → Ses'ten (set.ses, set.muz).
import { cl } from "../cekirdek/matematik";
import { set } from "../oyun/ayarlar";
import { oyun } from "../oyun/durum";
import { I } from "../oyun/girdi";
import { sim } from "../oyun/surus";
import { yaris } from "../oyun/yarislar";
import { sesDurumu, sesKilidiKur } from "./baglam";
import { arayuzSesi, SurusSesleri } from "./efektler";
import { MotorSesi } from "./motor";
import { Muzik } from "./muzik";

let M: MotorSesi | null = null,
  SE: SurusSesleri | null = null,
  MZ: Muzik | null = null;

/** son durumlar (olay yakalamak için) */
const once = {
  mod: "",
  hit: -9,
  hava: 0,
  vy: 0,
  sayi: 0,
  durum: "",
  carpan: 1,
  kombo: 0,
  puan: 0,
  sessiz: 0,
  ilkMuzik: true,
  arac: "",
};
/** son 0,2 sn'nin hızları (çarpma şiddeti) */
const hizlar: number[] = [];
/** garajda ve geri sayımda sanal motor (fizik çalışmazken) */
const sanal = { devir: 900, gaz: 0, blip: 0, blipBekle: false };

const seviye = (v: number) => (cl(v, 0, 100) / 100) ** 1.6;

export function sesKur() {
  sesKilidiKur((k) => {
    M = new MotorSesi(k.ctx, k.arac);
    SE = new SurusSesleri(k.ctx, k.arac);
    MZ = new Muzik(k.ctx, k.muzik);
    k.efekt.gain.value = seviye(set.ses);
    k.muzik.gain.value = 0;
  });
  // müzik notaları ileriye planlanır; kare hızı düşse de kesilmesin diye ayrı zamanlayıcı
  setInterval(() => {
    const ctx = sesDurumu.ctx;
    if (ctx && MZ && ctx.state == "running") MZ.planla(ctx.currentTime + 0.3);
  }, 50);
  // menü tıkları (sürüş tuşları hariç)
  document.addEventListener(
    "pointerdown",
    (e) => {
      const ctx = sesDurumu.ctx,
        k = sesDurumu.k;
      if (!ctx || !k || ctx.state != "running") return;
      const el = (e.target as Element | null)?.closest?.(
        ".btn,.chip,.nv,.card,.gc,.row,button,summary,.ib,[data-nav],#gpv,#gnx",
      );
      if (!el || el.closest("#ctl")) return;
      arayuzSesi.tik(ctx, k.efekt, ctx.currentTime, el.classList.contains("chip"));
    },
    { capture: true, passive: true },
  );
}

/** her kare */
export function sesTick(dt: number) {
  const ctx = sesDurumu.ctx,
    k = sesDurumu.k;
  if (!ctx || !k || !M || !SE || !MZ || ctx.state != "running") return;
  const t = ctx.currentTime,
    mod = oyun.mode,
    EV = yaris.EV,
    S = sim.S,
    Y = sim.yeni,
    v = Math.hypot(S.vx, S.vz);

  // müzik: menüde tam, garajda ve sonuçta kısık, sürüşte yok
  const mh = mod == "menu" ? 1 : mod == "garage" ? 0.55 : mod == "result" ? 0.8 : mod == "pause" ? 0.35 : 0;
  k.muzik.gain.setTargetAtTime(mh * seviye(set.muz) * 0.9, t, mh ? 0.6 : 0.3);
  if (mh > 0 && set.muz > 0) {
    once.sessiz = 0;
    if (!MZ.caliyor) {
      MZ.baslat(t, once.ilkMuzik);
      once.ilkMuzik = false;
    }
  } else if (MZ.caliyor && (once.sessiz += dt) > 2) MZ.durdur();
  k.efekt.gain.setTargetAtTime(seviye(set.ses), t, 0.1);
  k.kokpit.frequency.setTargetAtTime(oyun.camMode == 3 && mod == "drive" ? 2400 : 20000, t, 0.2);

  // motor: araç değişince yeniden kurulur
  const car = oyun.CAR,
    dMax = car.dv ?? 7500,
    anahtar = car.k + dMax;
  if (anahtar != once.arac) {
    once.arac = anahtar;
    void M.kur(car.k, dMax);
    if (mod == "garage") sanal.blipBekle = true;
  }
  if (mod == "garage" && once.mod != "garage") sanal.blipBekle = true;
  if (sanal.blipBekle && M.hazir) {
    sanal.blipBekle = false;
    sanal.blip = t + 0.32;
  }
  const geriSayim = mod == "drive" && !!EV && EV.state == "count";
  if (mod == "garage" || mod == "result" || geriSayim) {
    // fizik çalışmıyor: garajda gaz vuruşu, geri sayımda oyuncunun gazı, sonuçta rölantiye iner
    const gaz = mod == "garage" ? (t < sanal.blip ? 1 : 0) : geriSayim ? I.g : 0;
    sanal.gaz = gaz;
    const h = gaz ? 900 + gaz * 0.8 * (dMax - 900) : 900;
    sanal.devir += (h - sanal.devir) * Math.min(1, dt * (h > sanal.devir ? 5 : 1.8));
  } else if (Y) sanal.devir = Y.rpm;
  const sesli = mod == "drive" || mod == "garage" || mod == "result",
    ms = mod == "garage" ? 0.75 : mod == "result" ? 0.35 : sesli ? 1 : 0;
  if (Y && mod == "drive" && !geriSayim)
    M.guncelle(t, dt, { devir: Y.rpm, gaz: S.gas, kesik: Y.vitesT > 0, hiz: v }, ms);
  else M.guncelle(t, dt, { devir: sanal.devir, gaz: sanal.gaz, kesik: false, hiz: 0 }, ms);

  // lastik ve zemin
  const zemin = [0, 0, 0, 0, 0, 0];
  let kayma = 0,
    gevsek = 0;
  if (Y && mod == "drive")
    for (const tk of Y.tk) {
      if (!tk.temas) continue;
      zemin[tk.zemin] = (zemin[tk.zemin] || 0) + 0.25;
      const yan = Math.max(0, Math.abs(tk.tanA) - 0.1) / 0.3,
        boy = Math.max(0, Math.abs(tk.kap) - 0.12) / 0.5,
        s = Math.min(1.5, Math.hypot(yan, boy)) / 4;
      if (tk.zemin == 1) kayma += s;
      else gevsek += s;
    }
  const D = sim.d.D,
    savrulma = (D.act ? 1 : cl((Math.abs(D.beta) - 0.25) / 0.4, 0, 1)) * zemin[1];
  SE.guncelle(
    t,
    {
      hiz: mod == "drive" ? v : 0,
      kayma: kayma * cl(v / 3 + 0.3, 0, 1),
      savrulma,
      zemin,
      gevsekKayma: gevsek * 2,
      havada: S.air,
      kerb: !!S.kerb,
      kokpit: oyun.camMode == 3,
    },
    mod == "drive" ? 1 : 0,
  );

  // olaylar: çarpma, iniş
  hizlar.push(v);
  if (hizlar.length > 12) hizlar.shift();
  if (mod == "drive") {
    if (S.hit > once.hit + 0.01 && sim.d.zaman - S.hit < 0.2) {
      const dv = Math.max(...hizlar) - v;
      SE.carp(t, cl(dv / 14 + 0.2, 0.2, 1));
    }
    if (S.air) {
      once.hava += dt;
      once.vy = S.vy;
    } else {
      if (once.hava > 0.25) SE.inis(t, cl(-once.vy / 10, 0.25, 1));
      once.hava = 0;
    }
  }
  once.hit = S.hit;

  // yarış: geri sayım, drift kombosu, bitiş
  if (EV && mod == "drive") {
    if (EV.state == "count") {
      const n = Math.ceil(EV.cd);
      if (n > 0 && n != once.sayi) arayuzSesi.sayim(ctx, k.efekt, t, false);
      once.sayi = n;
    } else if (EV.state == "run" && once.durum == "count") arayuzSesi.sayim(ctx, k.efekt, t, true);
    if (EV.ty == "dp") {
      if (EV.mult > once.carpan) arayuzSesi.kombo(ctx, k.efekt, t, EV.mult);
      if (once.kombo > 0 && EV.combo == 0) {
        if (EV.score > once.puan) arayuzSesi.kasa(ctx, k.efekt, t);
        else arayuzSesi.yandi(ctx, k.efekt, t);
      }
    }
    once.durum = EV.state;
    once.carpan = EV.mult;
    once.kombo = EV.combo;
    once.puan = EV.score;
  } else {
    once.durum = "";
    once.sayi = 0;
  }
  if (mod == "result" && once.mod == "drive" && EV)
    arayuzSesi.bitis(ctx, k.efekt, t, EV.ty == "dp" ? EV.score > 0 : EV.t <= EV.limit);
  once.mod = mod;
}

/** testler için: bağlamın durumu, motor kuruldu mu, müzik çalıyor mu */
export const sesBilgi = () => ({
  durum: sesDurumu.ctx?.state ?? "yok",
  motor: !!M?.hazir,
  muzik: !!MZ?.caliyor,
});
