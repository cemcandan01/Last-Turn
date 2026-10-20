// PWA: service worker kaydı ve yeni sürüm kontrolü. Uygulama öndeyken 30 sn'de bir, arka plandan dönünce
// index.html'deki sürüme bakılır; yeni sürüm varsa üstte "Güncelle" düğmesi çıkar.
import { $ } from "../cekirdek/dom";

let updT = 0;

async function checkUpdate() {
  if (location.protocol == "file:" || Date.now() - updT < 30000) return;
  updT = Date.now();
  try {
    const t = await (await fetch("index.html", { cache: "no-store" })).text(),
      m = t.match(/APP_VERSION='([^']+)'/);
    if (m && m[1] != __APP_VERSION__) {
      const b = $("#upd");
      b.textContent = "Yeni sürüm hazır (" + m[1] + ") · Güncelle";
      b.classList.remove("hidden");
    }
  } catch {}
}

export function pwaKur() {
  if (import.meta.env.DEV) return;
  if ("serviceWorker" in navigator && location.protocol != "file:")
    navigator.serviceWorker.register("sw.js").catch(() => {});
  $("#upd").onclick = () => location.reload();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkUpdate();
  });
  setTimeout(checkUpdate, 3000);
}
