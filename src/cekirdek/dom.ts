// DOM yardımcıları

/** seçiciye uyan ilk öğe; yoksa hata verir (iskelette her öğe vardır) */
export function $<T extends HTMLElement = HTMLElement>(s: string): T {
  const e = document.querySelector<T>(s);
  if (!e) throw new Error("Öğe bulunamadı: " + s);
  return e;
}

export const gizle = (...ss: string[]) => ss.forEach((s) => $(s).classList.add("hidden"));
export const goster = (...ss: string[]) => ss.forEach((s) => $(s).classList.remove("hidden"));

/** yalnız değişince yazar: her karede DOM'a dokunmayı önler */
export function yazi(e: HTMLElement, t: string) {
  if (e.textContent !== t) e.textContent = t;
}
