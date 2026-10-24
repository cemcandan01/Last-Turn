// Gerçek SW şablonunu sahte ağ ve önbellekle çalıştırır; tarayıcı/bağlantı gerektirmez.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const KOK = "https://ornek.test/Last-Turn/";
const SABLON = readFileSync(new URL("../../src/pwa/sw-sablon.js", import.meta.url), "utf8");

function kur(gelistirme = false) {
  const kok = KOK + (gelistirme ? "dev/" : ""),
    onek = gelistirme ? "last-turn-dev-" : "last-turn-",
    ad = onek + "test-ozet",
    kayit = new Map<string, Map<string, Response>>(),
    dinleyiciler: Record<string, (e: unknown) => void> = {};
  const anahtar = (r: Request | string) => new URL(typeof r == "string" ? r : r.url, kok).href;
  const esle = (veri: Map<string, Response>, r: Request | string, opts?: { ignoreSearch?: boolean }) => {
    const url = anahtar(r);
    for (const [k, v] of veri)
      if (opts?.ignoreSearch ? k.split("?")[0] == url.split("?")[0] : k == url) return v.clone();
  };
  const caches = {
    open: vi.fn(async (isim: string) => {
      if (!kayit.has(isim)) kayit.set(isim, new Map());
      const veri = kayit.get(isim)!;
      return {
        match: async (r: Request | string, opts?: { ignoreSearch?: boolean }) => esle(veri, r, opts),
        put: vi.fn(async (r: Request | string, yanit: Response) => {
          veri.set(anahtar(r), yanit.clone());
        }),
        addAll: async () => {},
      };
    }),
    match: vi.fn(async (r: Request | string, opts?: { ignoreSearch?: boolean }) => {
      for (const veri of kayit.values()) {
        const yanit = esle(veri, r, opts);
        if (yanit) return yanit;
      }
    }),
    keys: async () => [...kayit.keys()],
    delete: async (isim: string) => kayit.delete(isim),
  };
  const fetch = vi.fn(async () => new Response("ağ"));
  runInNewContext(SABLON.replaceAll("%ONEK%", onek).replace("%SURUM%", "test").replace("%OZET%", "ozet"), {
    self: {
      location: kok + "sw.js",
      addEventListener: (ad: string, fn: (e: unknown) => void) => (dinleyiciler[ad] = fn),
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
    location: new URL(kok),
    URL,
    caches,
    fetch,
  });
  const koy = async (url: string, yazi: string, isim = ad) => {
    const c = await caches.open(isim);
    await c.put(url, new Response(yazi));
  };
  async function iste(yol: string, navigate = false) {
    let yanit: Promise<Response | undefined> | undefined;
    const bekleyen: Promise<unknown>[] = [];
    dinleyiciler.fetch({
      request: { url: new URL(yol, kok).href, method: "GET", mode: navigate ? "navigate" : "cors" },
      respondWith: (p: Promise<Response | undefined>) => (yanit = p),
      waitUntil: (p: Promise<unknown>) => bekleyen.push(p),
    });
    const sonuc = await yanit;
    await Promise.all(bekleyen);
    return sonuc;
  }
  return { kok, ad, caches, fetch, koy, iste, dinleyiciler };
}

describe("PWA çevrimdışı kayıt ve sürüm yalıtımı", () => {
  it.each([false, true])("ana ekran adresi sorguyla çevrimdışı açılır (deneme: %s)", async (dev) => {
    const s = kur(dev);
    await s.koy("./", "oyun");
    s.fetch.mockRejectedValue(new Error("çevrimdışı"));
    expect(await (await s.iste("./?kaynak=simge", true))?.text()).toBe("oyun");
  });

  it("bulunamayan görseli önbelleğe almaz; sonraki istekte yeniden dener", async () => {
    const s = kur();
    s.fetch.mockResolvedValueOnce(new Response("yok", { status: 404 }));
    expect((await s.iste("img/arac.webp"))?.status).toBe(404);
    expect(await (await s.iste("img/arac.webp"))?.text()).toBe("ağ");
    expect(s.fetch).toHaveBeenCalledTimes(2);
  });

  it("eski sürümün görselini kullanmaz", async () => {
    const s = kur();
    await s.koy("img/arac.webp", "eski", "last-turn-eski");
    expect(await (await s.iste("img/arac.webp"))?.text()).toBe("ağ");
  });

  it("başarılı dosyayı kaydeder ve çevrimdışı geri verir", async () => {
    const s = kur();
    await s.iste("assets/oyun.js");
    s.fetch.mockRejectedValue(new Error("çevrimdışı"));
    expect(await (await s.iste("assets/oyun.js"))?.text()).toBe("ağ");
    expect(s.fetch).toHaveBeenCalledTimes(1);
  });

  it("bilinmeyen veri dosyasının yerine HTML döndürmez", async () => {
    const s = kur();
    await s.koy("index.html", "oyun");
    s.fetch.mockRejectedValue(new Error("çevrimdışı"));
    await expect(s.iste("veri.json")).rejects.toThrow("çevrimdışı");
  });

  it("Google giriş yardımcısına ve deneme sürümüne karışmaz", async () => {
    const s = kur();
    expect(await s.iste("__/auth/handler", true)).toBeUndefined();
    expect(await s.iste("dev/index.html", true)).toBeUndefined();
    expect(s.fetch).not.toHaveBeenCalled();
  });

  it("önbellek yazılamasa da başarılı ağ yanıtını verir", async () => {
    const s = kur();
    s.caches.open.mockRejectedValue(new Error("kota"));
    expect(await (await s.iste("assets/oyun.js"))?.text()).toBe("ağ");
  });
});
