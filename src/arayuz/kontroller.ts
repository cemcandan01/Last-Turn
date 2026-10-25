// Dokunmatik kontroller: direksiyon tuşları / ekran direksiyonu / telefonu çevirme, gaz ve fren tuşları / analog pedal.
// Analog pedal: ortası sıfır, yukarı gaz, aşağı fren. Debriyaj fren (ya da pedal) üstünde: basılı tut, bırakınca
// motorun devri tekerlere vurur ve arka patinaja girer (drifte giriş).
import { $ } from "../cekirdek/dom";
import { ad, cl } from "../cekirdek/matematik";
import { toApp } from "../cekirdek/ekran";
import { CT } from "../oyun/ayarlar";
import { askTilt, girdiSifirla, I, tilt, tiltRoll } from "../oyun/girdi";
import { note } from "./bildirim";
import { ikon } from "./ikonlar";

function bindK(id: string, k: "l" | "r" | "g" | "b" | "dbr") {
  const e = $(id);
  e.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    e.setPointerCapture(v.pointerId);
    I[k] = 1;
    e.classList.add("on");
  });
  for (const n of ["pointerup", "pointercancel"])
    e.addEventListener(n, () => {
      I[k] = 0;
      e.classList.remove("on");
    });
}

/** ekran direksiyonu: parmakla döndürülür, bırakınca ortalanır */
let wheelA = 0;
function bindWheel(z: HTMLElement, e: HTMLElement) {
  let id: number | null = null,
    a0 = 0;
  const ang = (v: PointerEvent) => {
    const r = e.getBoundingClientRect();
    return Math.atan2(v.clientY - (r.top + r.height / 2), v.clientX - (r.left + r.width / 2));
  };
  z.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    z.setPointerCapture(v.pointerId);
    id = v.pointerId;
    a0 = ang(v);
  });
  z.addEventListener("pointermove", (v) => {
    if (v.pointerId !== id) return;
    const a = ang(v);
    wheelA = cl(wheelA + ad(a - a0), -2.1, 2.1);
    a0 = a;
    I.sa = -wheelA / 2.1;
    e.style.transform = `rotate(${wheelA}rad)`;
  });
  for (const n of ["pointerup", "pointercancel"])
    z.addEventListener(n, (v) => {
      if ((v as PointerEvent).pointerId !== id) return;
      id = null;
      wheelA = 0;
      I.sa = 0;
      e.style.transform = "";
    });
}

/** analog pedal: dikey konum gaz ya da fren miktarı */
function bindPedal(e: HTMLElement) {
  const fg = e.querySelector("i")!,
    fb = e.querySelector("u")!,
    set_ = (v: PointerEvent) => {
      const r = e.getBoundingClientRect(),
        c = toApp(r.left + r.width / 2, r.top + r.height / 2),
        q = toApp(v.clientX, v.clientY);
      const y = (c[1] - q[1]) / (e.offsetHeight / 2);
      const dz = 0.08,
        m = Math.abs(y) < dz ? 0 : cl((Math.abs(y) - dz) / (0.9 - dz), 0, 1);
      I.g = y > 0 ? m : 0;
      I.b = y < 0 ? m : 0;
      fg.style.height = I.g * 50 + "%";
      fb.style.height = I.b * 50 + "%";
    };
  e.addEventListener("pointerdown", (v) => {
    v.preventDefault();
    e.setPointerCapture(v.pointerId);
    set_(v);
  });
  e.addEventListener("pointermove", (v) => {
    if (e.hasPointerCapture(v.pointerId)) set_(v);
  });
  for (const n of ["pointerup", "pointercancel"])
    e.addEventListener(n, () => {
      I.g = I.b = 0;
      fg.style.height = fb.style.height = "0";
    });
}

/** kontrol moduna göre tuşları kur */
export function kontrolleriKur() {
  const c = $("#ctl"),
    app = $("#app");
  girdiSifirla();
  // HUD göstergeleri tuşların yüksekliğine göre yerleşir (stil.css: --cL, --cR)
  app.dataset.steer = CT.steer;
  app.dataset.gas = CT.gas;
  const L =
    CT.steer == "btn"
      ? `<div class="g"><div class="k" id="l">${ikon("okSol")}</div><div class="k" id="r">${ikon("okSag")}</div></div>`
      : CT.steer == "wheel"
        ? '<div class="wz" id="wz"><div class="wheel" id="wh"></div></div>'
        : '<div class="g"><div class="k" id="cal">Ortala</div></div>';
  const D = '<div class="k" id="dbr">DEBRİYAJ</div>',
    B =
      CT.gas == "analog"
        ? '<div class="tsut">' +
          D +
          '<div class="pedal" id="pd"><i></i><u></u><b>GAZ</b><s>FREN</s></div></div>'
        : '<div class="tsut">' + D + '<div class="k pd" id="b">FREN</div></div>';
  c.innerHTML =
    L + '<div class="g">' + B + (CT.gas == "btn" ? '<div class="k pd" id="g">GAZ</div>' : "") + "</div>";
  if (CT.steer == "btn") {
    bindK("#l", "l");
    bindK("#r", "r");
  } else if (CT.steer == "wheel") bindWheel($("#wz"), $("#wh"));
  else
    $("#cal").onclick = () => {
      if (performance.now() - tilt.t > 1500) {
        askTilt();
        return;
      }
      tilt.zero = tiltRoll();
      note("Ortalandı", 30);
    };
  bindK("#dbr", "dbr");
  if (CT.gas != "analog") bindK("#b", "b");
  if (CT.gas == "btn") bindK("#g", "g");
  else if (CT.gas == "analog") bindPedal($("#pd"));
}
