// Dokunma: mobil oyunlardaki "parmağın kalktığı yerde tetikle" davranışı (iOS'taki touch-up-inside).
// Sayfa kaydırması kapalı olduğu için (touch-action: none) iOS, parmak düğmeden çıkıp başka yerde kalksa bile
// ilk dokunulan düğmeye tıklar. Burada parmak her dokunuş için izlenir: düğmenin üzerindeyken "basili" görünür,
// dışına çıkınca söner; parmak düğmenin dışında kalkarsa tıklama iptal edilir. Geri dönüp üzerinde bırakırsa
// tıklama olur. Sürüş tuşları (pointerdown/up ile çalışır) etkilenmez; her parmak ayrı izlenir.

/** tıklanabilir kabul edilen yerli öğeler; geri kalanı .onclick atanmış olanlar */
const YERLI = "button, a, summary, label, select, input, textarea";
/** düğme kenarında hoşgörü (px): parmağın düğmeyi biraz taşması iptal etmez */
const PAY = 10;

interface Dokunus {
  hedef: HTMLElement;
  icinde: boolean;
}
const DOK = new Map<number, Dokunus>();
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

export function dokunmaKur() {
  const sec = { capture: true, passive: true };
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType == "mouse" && e.button != 0) return;
      const h = hedefi(e.target);
      if (!h || (h instanceof HTMLInputElement && h.type == "range")) return;
      DOK.set(e.pointerId, { hedef: h, icinde: true });
      h.classList.add("basili");
    },
    sec,
  );
  document.addEventListener(
    "pointermove",
    (e) => {
      const d = DOK.get(e.pointerId);
      if (!d) return;
      const i = uzerinde(d.hedef, e.clientX, e.clientY);
      if (i != d.icinde) d.hedef.classList.toggle("basili", (d.icinde = i));
    },
    sec,
  );
  const bitir = (e: PointerEvent, iptal: boolean) => {
    const d = DOK.get(e.pointerId);
    if (!d) return;
    DOK.delete(e.pointerId);
    d.hedef.classList.remove("basili");
    if (iptal || !uzerinde(d.hedef, e.clientX, e.clientY)) YUT.set(d.hedef, performance.now() + 600);
    else YUT.delete(d.hedef);
  };
  document.addEventListener("pointerup", (e) => bitir(e, false), sec);
  document.addEventListener("pointercancel", (e) => bitir(e, true), sec);
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
