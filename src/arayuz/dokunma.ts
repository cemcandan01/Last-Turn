// Dokunma: mobil oyunlardaki "parmağın kalktığı yerde tetikle" davranışı (iOS'taki touch-up-inside).
// Sayfa kaydırması kapalı olduğu için (touch-action: none) iOS, parmak düğmeden çıkıp başka yerde kalksa bile
// ilk dokunulan düğmeye tıklar. Burada parmak her dokunuş için izlenir: düğmenin üzerindeyken "basili" görünür,
// dışına çıkınca söner; parmak düğmenin dışında kalkarsa tıklama iptal edilir. Geri dönüp üzerinde bırakırsa
// tıklama olur. Sürüş tuşları (pointerdown/up ile çalışır) etkilenmez; her parmak ayrı izlenir.
// Parmak dokunma olaylarıyla (touchstart/move/end) izlenir: kaydırılabilir alanlarda (touch-action: pan-y) iOS
// parmak kayınca pointercancel gönderip pointer olaylarını keser, ama tıklamayı parmak kalkınca yine gönderir.
// Dokunma olayları parmak kalkana kadar sürer. Fare pointer olaylarıyla izlenir.

/** tıklanabilir kabul edilen yerli öğeler; geri kalanı .onclick atanmış olanlar */
const YERLI = "button, a, summary, label, select, input, textarea";
/** düğme kenarında hoşgörü (px): parmağın düğmeyi biraz taşması iptal etmez */
const PAY = 10;

interface Dokunus {
  hedef: HTMLElement;
  icinde: boolean;
}
const DOK = new Map<string, Dokunus>();
/** iptal edilen dokunuşlar: o düğmeye gelecek tıklama kısa bir süre yutulur (başka düğmeye tıklama etkilenmez) */
const YUT = new Map<HTMLElement, number>();

/** dokunulan öğenin tıklamayı alacak atası: onclick atanmış ya da yerli düğme */
function hedefi(t: EventTarget | null): HTMLElement | null {
  for (let e = t instanceof Element ? t : null; e; e = e.parentElement)
    if (e instanceof HTMLElement && (e.onclick || e.matches(YERLI))) return e;
  return null;
}

/** parmak düğmenin (biraz payla) üzerinde mi; döndürülmüş içerikte de doğru (ekrandaki kutu) */
function uzerinde(h: HTMLElement, x: number, y: number) {
  const r = h.getBoundingClientRect();
  if (x >= r.left - PAY && x <= r.right + PAY && y >= r.top - PAY && y <= r.bottom + PAY) {
    // payın içinde ama başka bir düğmenin üstündeyse sayılmaz
    const u = document.elementFromPoint(x, y);
    return !u || h.contains(u) || !hedefi(u) || hedefi(u) === h || !h.isConnected;
  }
  return false;
}

const basla = (k: string, t: EventTarget | null) => {
  const h = hedefi(t);
  if (!h || (h instanceof HTMLInputElement && h.type == "range")) return;
  DOK.set(k, { hedef: h, icinde: true });
  h.classList.add("basili");
};
const kay = (k: string, x: number, y: number) => {
  const d = DOK.get(k);
  if (!d) return;
  const i = uzerinde(d.hedef, x, y);
  if (i != d.icinde) d.hedef.classList.toggle("basili", (d.icinde = i));
};
/** parmak kalktı: düğmenin dışındaysa (ya da dokunuş iptal edildiyse) o düğmeye gelecek tıklama yutulur */
const bitir = (k: string, x: number, y: number, iptal: boolean) => {
  const d = DOK.get(k);
  if (!d) return;
  DOK.delete(k);
  d.hedef.classList.remove("basili");
  if (iptal || !uzerinde(d.hedef, x, y)) YUT.set(d.hedef, performance.now() + 600);
  else YUT.delete(d.hedef);
};

export function dokunmaKur() {
  const sec = { capture: true, passive: true };
  // parmak: dokunma olayları (her parmak kendi kimliğiyle)
  const her = (e: TouchEvent, f: (k: string, t: Touch) => void) => {
    for (const t of e.changedTouches) f("t" + t.identifier, t);
  };
  document.addEventListener("touchstart", (e) => her(e, (k, t) => basla(k, t.target)), sec);
  document.addEventListener("touchmove", (e) => her(e, (k, t) => kay(k, t.clientX, t.clientY)), sec);
  document.addEventListener("touchend", (e) => her(e, (k, t) => bitir(k, t.clientX, t.clientY, false)), sec);
  document.addEventListener(
    "touchcancel",
    (e) => her(e, (k, t) => bitir(k, t.clientX, t.clientY, true)),
    sec,
  );
  // fare ve kalem: pointer olayları (dokunmatik pointer olayları yukarıda dokunma olaylarıyla izlenir)
  const fare = (e: PointerEvent) => e.pointerType != "touch";
  document.addEventListener(
    "pointerdown",
    (e) => fare(e) && (e.pointerType != "mouse" || e.button == 0) && basla("p" + e.pointerId, e.target),
    sec,
  );
  document.addEventListener(
    "pointermove",
    (e) => fare(e) && kay("p" + e.pointerId, e.clientX, e.clientY),
    sec,
  );
  document.addEventListener(
    "pointerup",
    (e) => fare(e) && bitir("p" + e.pointerId, e.clientX, e.clientY, false),
    sec,
  );
  document.addEventListener(
    "pointercancel",
    (e) => fare(e) && bitir("p" + e.pointerId, e.clientX, e.clientY, true),
    sec,
  );
  // iptal edilen dokunuşun tıklaması hiçbir dinleyiciye (arayüz tık sesi dahil) ulaşmaz
  document.addEventListener(
    "click",
    (e) => {
      const h = hedefi(e.target),
        t = h && YUT.get(h);
      if (!h || !t) return;
      YUT.delete(h);
      if (performance.now() > t) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    { capture: true },
  );
}
