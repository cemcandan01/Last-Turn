// Ekran uyum ölçümü: sayfanın İÇİNDE çalışır (page.evaluate'e verilir, kendi içinde eksiksiz olmalı; dış değişken yok).
// Görünür metni ve etkileşimli öğeleri toplar; taşma, kesilme, üst üste binme, dokunma hedefi, güvenli alan,
// çentik, istenmeyen kaydırma ve tuval kaplamasını denetler.
// seçenekler: { kok, guvenli:{ust,sag,alt,sol}, centik:{derinlik,uzunluk}|null, kose, dikeyKaydirma, tuval, haric:[seçici] }
// dönüş: { hatalar: [{ oge, sorun }], uyarilar: [{ oge, sorun }], sayac: { metin, etkilesim } }
export function olc(sec) {
  const HOS = 1.5; // piksel toleransı (alt piksel yuvarlaması)
  const GUV_YAN = 20, // docs/HUD.md: göstergeler güvenli alana en çok 20 px, tuşlar 14 px girer
    GUV_TUS = 14,
    GUV_UST_ALT = 12;
  const hatalar = [],
    uyarilar = [];
  const W = document.documentElement.clientWidth,
    H = document.documentElement.clientHeight;
  const kok = document.querySelector(sec.kok || "body");
  const stil = new Map();
  const cs = (e) => {
    let s = stil.get(e);
    if (!s) stil.set(e, (s = getComputedStyle(e)));
    return s;
  };
  const yuvarla = (n) => Math.round(n * 10) / 10;

  // öğenin okunur kısa adı: #kapsayıcı etiket.sınıf[data-x]
  const ad = (e) => {
    const c = [...e.classList].filter((x) => x.length < 22).slice(0, 2);
    let s = e.id
      ? e.tagName.toLowerCase() + "#" + e.id
      : e.tagName.toLowerCase() + (c.length ? "." + c.join(".") : "");
    const dv = e.dataset && Object.keys(e.dataset)[0];
    if (dv) s += "[data-" + dv.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()) + "]";
    if (!e.id) {
      let a = e.parentElement,
        n = 0;
      while (a && !a.id && n++ < 5) a = a.parentElement;
      if (a && a.id) s = "#" + a.id + " " + s;
    }
    return s;
  };

  const haric = (sec.haric || []).join(",");
  const haricMi = (e) => !!haric && !!e.closest(haric);

  const gorunur = (e) => {
    let op = 1;
    for (let x = e; x && x !== document.documentElement; x = x.parentElement) {
      const s = cs(x);
      if (s.display == "none") return false;
      op *= parseFloat(s.opacity);
    }
    return op > 0.05 && cs(e).visibility == "visible";
  };

  // öğeyi kırpan atalar (overflow ≠ visible). kendiDahil: metin için öğenin kendi kırpması da sayılır
  const kirpanlar = (e, kendiDahil) => {
    const kutular = [];
    let pos = kendiDahil ? "static" : cs(e).position;
    for (let a = kendiDahil ? e : e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a);
      const kapsayan =
        pos == "fixed"
          ? s.transform != "none"
          : pos == "absolute"
            ? s.position != "static" || s.transform != "none"
            : true;
      if (!kapsayan) continue;
      if (s.overflowX != "visible" || s.overflowY != "visible") {
        const r = a.getBoundingClientRect(),
          sx = a.offsetWidth ? r.width / a.offsetWidth : 1,
          sy = a.offsetHeight ? r.height / a.offsetHeight : 1;
        const l = r.left + a.clientLeft * sx,
          t = r.top + a.clientTop * sy;
        kutular.push({
          a,
          l,
          t,
          r: l + a.clientWidth * sx,
          b: t + a.clientHeight * sy,
          kay: /(auto|scroll)/.test(s.overflowX + s.overflowY),
        });
      }
      pos = s.position;
    }
    return kutular;
  };

  // kutunun bir ya da daha çok kenarının dışına taşan miktarlar
  const tasma = (r, c) => ({
    sol: Math.max(0, c.l - r.l),
    ust: Math.max(0, c.t - r.t),
    sag: Math.max(0, r.r - c.r),
    alt: Math.max(0, r.b - c.b),
  });
  const enCok = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const kes = (r, c) => ({
    l: Math.max(r.l, c.l),
    t: Math.max(r.t, c.t),
    r: Math.min(r.r, c.r),
    b: Math.min(r.b, c.b),
  });
  const kutu = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });

  // --- öğeleri topla
  const ogeler = []; // { e, tur: "metin"|"etkilesim", r: {l,t,r,b}, ad, yazi }
  const etkilesimli = (e) => {
    if (cs(e).pointerEvents == "none") return false;
    if (/^(BUTTON|SELECT|TEXTAREA|SUMMARY|A)$/.test(e.tagName)) return !e.disabled;
    if (e.tagName == "INPUT") return e.type != "hidden" && !e.disabled;
    if (e.__ltDinle) return true;
    const p = e.parentElement;
    return cs(e).cursor == "pointer" && !(p && cs(p).cursor == "pointer");
  };
  const alanTop = W * H;
  const tum = [...kok.querySelectorAll("*")];
  if (kok !== document.body) tum.unshift(kok);
  for (const e of tum) {
    if (/^(SCRIPT|STYLE|CANVAS|HEAD|META|LINK|TITLE|NOSCRIPT)$/.test(e.tagName)) continue;
    if (e.id == "_olcStil" || haricMi(e)) continue;
    if (!gorunur(e)) continue;
    const eb = e.getBoundingClientRect();
    if (etkilesimli(e) && eb.width > 0 && eb.height > 0 && eb.width * eb.height < alanTop * 0.35) {
      ogeler.push({
        e,
        tur: "etkilesim",
        r: kutu(eb),
        ad: ad(e),
        yazi: (e.innerText || e.value || "").trim().slice(0, 30),
      });
    }
    // metin: öğenin kendi metin düğümleri (alt öğelerin metni kendi öğesinde sayılır)
    const rects = [];
    let yazi = "";
    for (const n of e.childNodes) {
      if (n.nodeType != 3 || !n.nodeValue.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q);
      yazi += n.nodeValue.trim() + " ";
    }
    if (rects.length) {
      const r = {
        l: Math.min(...rects.map((q) => q.left)),
        t: Math.min(...rects.map((q) => q.top)),
        r: Math.max(...rects.map((q) => q.right)),
        b: Math.max(...rects.map((q) => q.bottom)),
      };
      ogeler.push({
        e,
        tur: "metin",
        r,
        ad: ad(e),
        yazi: yazi.trim().slice(0, 30),
        px: parseFloat(cs(e).fontSize),
      });
    }
  }

  // --- kırpma ve görünürlük (stil okumaları burada biter; sonra pointer-events açılır)
  for (const o of ogeler) {
    o.kirp = kirpanlar(o.e, o.tur == "metin");
    o.donuk = false; // eğik / döndürülmüş / ölçeklenmiş: sınır kutusu gerçek şekilden büyük
    for (let a = o.e; a && a !== document.documentElement; a = a.parentElement) {
      const t = cs(a).transform;
      if (t != "none" && !/^matrix\(1, 0, 0, 1, /.test(t)) o.donuk = true;
    }
    o.kay = o.kirp.some((c) => c.kay); // kaydırılabilir kap içinde: kesilme beklenen davranış
    o.etkin = o.r;
    for (const c of o.kirp) if (!c.kay) o.etkin = kes(o.etkin, c);
  }
  const stilEk = document.createElement("style");
  stilEk.id = "_olcStil";
  stilEk.textContent = "*{pointer-events:auto !important}";
  document.head.appendChild(stilEk);
  for (const o of ogeler) {
    const r = o.etkin,
      gen = r.r - r.l,
      yuk = r.b - r.t;
    o.gorunen = false;
    if (gen > 0 && yuk > 0) {
      // 5 örnek noktadan biri bu öğeye (ya da içine/üstüne) denk geliyorsa görünür: kısmen örtülü öğe de sayılır
      for (const [u, v] of [
        [0.5, 0.5],
        [0.2, 0.2],
        [0.8, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
      ]) {
        const x = Math.min(Math.max(r.l + gen * u, 0), W - 1),
          y = Math.min(Math.max(r.t + yuk * v, 0), H - 1),
          h = document.elementFromPoint(x, y);
        if (h && (o.e.contains(h) || h.contains(o.e))) {
          o.gorunen = true;
          break;
        }
      }
    }
  }

  const sat = (o) => `${o.ad}${o.yazi ? ` "${o.yazi}"` : ""}`;
  const hata = (o, sorun) => hatalar.push({ oge: sat(o), sorun });
  const uyari = (o, sorun) => uyarilar.push({ oge: sat(o), sorun });
  const tamKutu = { l: 0, t: 0, r: W, b: H };
  const g = sec.guvenli || { ust: 0, sag: 0, alt: 0, sol: 0 };
  const cn = sec.centik;
  let metin = 0,
    etkilesim = 0;

  for (const o of ogeler) {
    if (o.tur == "metin") metin++;
    else etkilesim++;
    if (o.kay) continue; // kaydırılabilir kapta: taşan kısım kaydırınca görünür
    const r = o.r,
      gen = r.r - r.l,
      yuk = r.b - r.t;
    // tamamen kırpılmış (görünmez) öğe sayılmaz
    const kirpilmis = (o.etkin.r - o.etkin.l) * (o.etkin.b - o.etkin.t);
    if (kirpilmis <= 0 || kirpilmis < gen * yuk * 0.05) continue;
    if (!o.gorunen) continue; // başka katmanın altında
    // 1) kırpma: kapsayıcının kenarı öğeyi kesiyor
    for (const c of o.kirp) {
      if (c.kay) continue;
      const [yon, px] = enCok(tasma(r, c));
      if (px > HOS)
        hata(
          o,
          `${o.tur == "metin" ? "yazı" : "düğme"} kesiliyor (${yon} kenarda ${yuvarla(px)} px, kırpan ${ad(c.a)})`,
        );
    }
    // 2) ekran dışı
    const [yon, px] = enCok(tasma(o.etkin, tamKutu));
    if (px > HOS) hata(o, `ekran dışına taşıyor (${yon} kenarda ${yuvarla(px)} px)`);
    // 3) çentik / köşe yuvarlaklığı / güvenli alan
    const ek = o.etkin;
    if (cn) {
      const ortaY = H / 2,
        cy1 = ortaY - cn.uzunluk / 2,
        cy2 = ortaY + cn.uzunluk / 2;
      const yDegiyor = ek.t < cy2 - HOS && ek.b > cy1 + HOS;
      // çentik ölçüsü bilinen cihazlarda (iPhone) hata; Android delik ölçüsü yaklaşıktır, uyarı
      const bildir = cn.kesin === false ? uyari : hata;
      if (yDegiyor && ek.l < cn.derinlik - HOS)
        bildir(o, `çentiğe giriyor (sol kenar, ${yuvarla(cn.derinlik - ek.l)} px)`);
      if (yDegiyor && ek.r > W - cn.derinlik + HOS)
        bildir(o, `çentiğe giriyor (sağ kenar, ${yuvarla(ek.r - (W - cn.derinlik))} px)`);
    }
    if (sec.kose) {
      // yuvarlak köşe: kutunun köşe noktası köşe dairesinin dışında kalıyor mu
      const R = sec.kose,
        nok = [
          [ek.l, ek.t, R, R],
          [ek.r, ek.t, W - R, R],
          [ek.l, ek.b, R, H - R],
          [ek.r, ek.b, W - R, H - R],
        ];
      for (const [x, y, cx, cy] of nok) {
        const icKose = (x < R && cx == R) || (x > W - R && cx == W - R),
          icKoseY = (y < R && cy == R) || (y > H - R && cy == H - R);
        if (icKose && icKoseY && Math.hypot(x - cx, y - cy) > R + HOS) {
          hata(o, `yuvarlak ekran köşesine giriyor (${yuvarla(x)}, ${yuvarla(y)})`);
          break;
        }
      }
    }
    const girSol = Math.max(0, g.sol - ek.l),
      girSag = Math.max(0, ek.r - (W - g.sag)),
      girUst = Math.max(0, g.ust - ek.t),
      girAlt = Math.max(0, ek.b - (H - g.alt));
    const yanTol = o.tur == "etkilesim" ? GUV_TUS : GUV_YAN;
    const ihlal = [];
    if (girSol > yanTol + HOS) ihlal.push(`sol ${yuvarla(girSol)} px`);
    if (girSag > yanTol + HOS) ihlal.push(`sağ ${yuvarla(girSag)} px`);
    if (girUst > GUV_UST_ALT + HOS) ihlal.push(`üst ${yuvarla(girUst)} px`);
    if (girAlt > GUV_UST_ALT + HOS) ihlal.push(`alt ${yuvarla(girAlt)} px`);
    if (ihlal.length) (o.tur == "etkilesim" ? hata : uyari)(o, `güvenli alanı aşıyor (${ihlal.join(", ")})`);
    // 4) dokunma hedefi
    if (o.tur == "etkilesim" && (gen < 40 - HOS || yuk < 40 - HOS))
      hata(o, `dokunma hedefi küçük (${Math.round(gen)}×${Math.round(yuk)} px, en az 40)`);
    // 5) okunurluk
    if (o.tur == "metin" && o.px < 9) uyari(o, `yazı çok küçük (${yuvarla(o.px)} px)`);
  }

  // --- üst üste binme (görünen, birbirinin atası olmayan çiftler)
  const gor = ogeler.filter((o) => o.gorunen && !o.kay);
  const ciftler = [];
  for (let i = 0; i < gor.length; i++)
    for (let j = i + 1; j < gor.length; j++) {
      const a = gor[i],
        b = gor[j];
      if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const k = kes(a.etkin, b.etkin),
        ow = k.r - k.l,
        oh = k.b - k.t;
      if (ow <= 3 || oh <= 3 || ow * oh < 20) continue;
      if (a.donuk || b.donuk) {
        // dönük öğelerde sınır kutusu yanıltır: kesişim kutusunda ızgara noktaları, ikisinin gerçek şeklinde de mi
        let ikisi = 0;
        for (let u = 0; u < 8; u++)
          for (let v = 0; v < 8; v++) {
            const x = k.l + ((u + 0.5) * ow) / 8,
              y = k.t + ((v + 0.5) * oh) / 8;
            const st = document.elementsFromPoint(x, y);
            if (st.some((n) => a.e.contains(n)) && st.some((n) => b.e.contains(n))) ikisi++;
          }
        if (ikisi < 3) continue;
      }
      ciftler.push({ a, b, ow, oh });
    }
  // önce düğme-düğme, sonra yazı-düğme, sonra yazı-yazı; bir düğmenin kendi yazısı aynı çarpışmayı ikinci kez yazmaz
  const sira = (c) => (c.a.tur == "etkilesim" && c.b.tur == "etkilesim" ? 0 : c.a.tur == c.b.tur ? 2 : 1);
  ciftler.sort((x, y) => sira(x) - sira(y));
  const bildirilen = [];
  const sahip = (o) => ogeler.find((q) => q.tur == "etkilesim" && q.e.contains(o.e));
  for (const { a, b, ow, oh } of ciftler) {
    const s = sira({ a, b });
    const sa = a.tur == "metin" ? sahip(a) : a,
      sb = b.tur == "metin" ? sahip(b) : b;
    if (
      s > 0 &&
      sa &&
      sb &&
      sa !== sb &&
      bildirilen.some((q) => (q[0] === sa && q[1] === sb) || (q[0] === sb && q[1] === sa))
    )
      continue;
    if (
      s > 0 &&
      ((sa && sa === sb) ||
        (bildirilen.some((q) => q[0] === sa || q[1] === sa) && sa !== undefined && sb === undefined && false))
    )
      continue;
    bildirilen.push([a, b]);
    const tur = s == 0 ? "düğmeler" : s == 2 ? "yazılar" : "yazı ve düğme";
    hata(a, `${tur} üst üste biniyor: ${sat(b)} (${Math.round(ow)}×${Math.round(oh)} px)`);
  }

  stilEk.remove();

  // --- sayfa düzeyi
  const kayW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    kayH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  if (kayW > W + 1 || kayH > H + 1)
    hatalar.push({
      oge: "html",
      sorun: `sayfa kaydırılabiliyor (içerik ${kayW}×${kayH}, ekran ${W}×${H})`,
    });
  if (!sec.dikeyKaydirma)
    for (const e of kok.querySelectorAll("*")) {
      const s = cs(e);
      if (!/(auto|scroll)/.test(s.overflowY) || !gorunur(e)) continue;
      if (e.scrollHeight > e.clientHeight + 1)
        hatalar.push({
          oge: ad(e),
          sorun: `istenmeyen dikey kaydırma (içerik ${e.scrollHeight} px > kap ${e.clientHeight} px)`,
        });
    }
  if (sec.tuval) {
    const c = document.querySelector(sec.tuval);
    if (!c) hatalar.push({ oge: sec.tuval, sorun: "3B tuval yok" });
    else {
      const r = c.getBoundingClientRect();
      if (
        Math.abs(r.left) > 1 ||
        Math.abs(r.top) > 1 ||
        Math.abs(r.width - W) > 1 ||
        Math.abs(r.height - H) > 1
      )
        hatalar.push({
          oge: ad(c),
          sorun: `3B tuval ekranı kaplamıyor (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} / ekran ${W}×${H})`,
        });
      const oran = c.width / Math.max(1, r.width) / (c.height / Math.max(1, r.height));
      if (Math.abs(oran - 1) > 0.03)
        hatalar.push({
          oge: ad(c),
          sorun: `3B tuval gerilmiş (çizim ${c.width}×${c.height}, görünen ${Math.round(r.width)}×${Math.round(r.height)})`,
        });
    }
  }
  return { hatalar, uyarilar, sayac: { metin, etkilesim }, boyut: [W, H] };
}

// sayfaya enjekte edilen betik: dinleyicisi olan öğeleri işaretler (etkileşimli öğe tespiti)
export const DINLEYICI_ISARETI = `(() => {
  const tur = /^(click|pointerdown|pointerup|touchstart|mousedown|mouseup|input|change)$/;
  const ekle = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, ...r) {
    if (this instanceof Element && tur.test(t)) this.__ltDinle = true;
    return ekle.call(this, t, ...r);
  };
  for (const p of ["onclick", "onpointerdown", "onpointerup", "ontouchstart", "onmousedown", "oninput", "onchange"]) {
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, p);
    if (!d || !d.set) continue;
    Object.defineProperty(HTMLElement.prototype, p, {
      configurable: true,
      get: d.get,
      set(f) {
        if (f) this.__ltDinle = true;
        d.set.call(this, f);
      },
    });
  }
})();`;
