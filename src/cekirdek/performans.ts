// Performans göstergesi: kare hızı, kare süresi, fizik ve çizim süresi, çizim çağrısı ve üçgen sayısı.
// Telefonda ölçmek için: Ayarlar → Mekanikler → Performans göstergesi (ya da adrese ?perf ekle).

export const perf = {
  fps: 60,
  /** ortalama süreler (ms) */
  kare: 16.7,
  fizik: 0,
  cizim: 0,
  /** bu karedeki fizik adımı sayısı */
  adim: 0,
  cagri: 0,
  ucgen: 0,
  /** en kötü kare (son yarım saniye) */
  enKotu: 0,
};

let panel: HTMLElement | null = null,
  sonYazi = 0,
  enKotu = 0;
const ema = (a: number, b: number) => a + (b - a) * 0.08;

export function performansGoster(acik: boolean) {
  if (acik && !panel) {
    panel = document.createElement("div");
    panel.id = "perf";
    document.getElementById("app")!.appendChild(panel);
  }
  if (panel) panel.style.display = acik ? "" : "none";
}

/** kare bitti: süreleri kaydet, panel açıksa yarım saniyede bir yaz */
export function kareKaydet(
  kare: number,
  fizik: number,
  cizim: number,
  adim: number,
  cagri: number,
  ucgen: number,
) {
  perf.kare = ema(perf.kare, kare);
  perf.fps = 1000 / Math.max(perf.kare, 1);
  perf.fizik = ema(perf.fizik, fizik);
  perf.cizim = ema(perf.cizim, cizim);
  perf.adim = adim;
  perf.cagri = cagri;
  perf.ucgen = ucgen;
  enKotu = Math.max(enKotu, kare);
  if (!panel || panel.style.display == "none") return;
  const now = performance.now();
  if (now - sonYazi < 500) return;
  sonYazi = now;
  perf.enKotu = enKotu;
  enKotu = 0;
  panel.textContent =
    `${perf.fps.toFixed(0)} fps · kare ${perf.kare.toFixed(1)} ms (en kötü ${perf.enKotu.toFixed(0)}) · ` +
    `fizik ${perf.fizik.toFixed(2)} ms · çizim ${perf.cizim.toFixed(1)} ms · ${perf.cagri} çağrı · ${(perf.ucgen / 1000).toFixed(0)}k üçgen`;
}
