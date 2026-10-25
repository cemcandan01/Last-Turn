// Gerçek Firebase sağlayıcısının kurulumunu SDK sınırında gözlemler; canlı hesaba bağlanmaz.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIREBASE_AYAR } from "../../src/bulut/ayar";
import { firebaseSaglayici } from "../../src/bulut/firebase";
import { browserPopupRedirectResolver } from "firebase/auth";

const sdk = vi.hoisted(() => ({
  app: vi.fn((..._args: unknown[]) => ({})),
  auth: vi.fn((..._args: unknown[]) => ({ currentUser: null, languageCode: "" })),
  popup: vi.fn(async () => ({})),
  redirect: vi.fn(async () => null),
  signOut: vi.fn(),
}));
vi.mock("firebase/app", () => ({ initializeApp: sdk.app }));
vi.mock("firebase/firestore/lite", () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock("firebase/auth", async (orijinal) => ({
  ...(await orijinal<typeof import("firebase/auth")>()),
  initializeAuth: sdk.auth,
  signInWithPopup: sdk.popup,
  getRedirectResult: sdk.redirect,
  signOut: sdk.signOut,
}));

const istek = vi.fn<typeof fetch>();
const depo = { getItem: vi.fn((): string | null => null), setItem: vi.fn(), removeItem: vi.fn() };
function yanitla(iframeTuru = "text/html; charset=utf-8", handlerTuru = "text/html", ek = {}) {
  istek.mockImplementation(
    async (url) =>
      new Response(null, {
        status: 200,
        headers: { "Content-Type": String(url).endsWith("/iframe") ? iframeTuru : handlerTuru, ...ek },
      }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("location", new URL("https://ornek.test/Last-Turn/dev/"));
  vi.stubGlobal("navigator", { userAgent: "iPhone", standalone: true });
  vi.stubGlobal("localStorage", depo);
  vi.stubGlobal("fetch", istek);
  yanitla();
});
afterEach(() => vi.unstubAllGlobals());

describe("Firebase giriş yardımcısı ve iPhone açılışı", () => {
  it("bekleyen yönlendirme ve bozuk yardımcı birleşiminde SDK çözücüsünü kaldırmaz", async () => {
    yanitla("application/octet-stream");
    depo.getItem.mockReturnValueOnce("1");
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.auth.mock.calls[0]?.[1]).toHaveProperty("popupRedirectResolver", browserPopupRedirectResolver);
    expect(sdk.redirect).toHaveBeenCalledWith(expect.anything(), browserPopupRedirectResolver);
    expect(sdk.signOut).not.toHaveBeenCalled();
  });
  it("439 baytlık octet-stream iframe ile yerel yardımcıyı kullanmaz", async () => {
    yanitla("application/octet-stream");
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: FIREBASE_AYAR.authDomain });
    expect(sdk.auth.mock.calls[0]?.[1]).toHaveProperty("popupRedirectResolver", browserPopupRedirectResolver);
    expect(sdk.popup).not.toHaveBeenCalled();
    expect(sdk.signOut).not.toHaveBeenCalled();
    expect(depo.removeItem).not.toHaveBeenCalled();
  });

  it("iframe HTML olsa bile handler indirilen dosyaysa yönlendirmeyi açmaz", async () => {
    yanitla("text/html", "application/octet-stream");
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: FIREBASE_AYAR.authDomain });
    expect(sdk.auth.mock.calls[0]?.[1]).toHaveProperty("popupRedirectResolver", browserPopupRedirectResolver);
  });

  it("attachment başlığı HTML türünü geçersiz kılar", async () => {
    yanitla("text/html", "text/html", { "Content-Disposition": "attachment; filename=iframe" });
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: FIREBASE_AYAR.authDomain });
  });

  it("ağ hatası veya eksik yardımcı oyun hesabının kurulmasını durdurmaz", async () => {
    istek.mockRejectedValue(new Error("çevrimdışı"));
    await expect(firebaseSaglayici(FIREBASE_AYAR)).resolves.toBeDefined();
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: FIREBASE_AYAR.authDomain });
  });

  it("404 HTML hata sayfasını geçerli giriş yardımcısı saymaz", async () => {
    istek.mockImplementation(
      async () => new Response(null, { status: 404, headers: { "Content-Type": "text/html" } }),
    );
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: FIREBASE_AYAR.authDomain });
  });

  it("doğru HTML sunan kurulu uygulamada yönlendirme çözücüsünü korur", async () => {
    depo.getItem.mockReturnValueOnce("1");
    await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.app.mock.calls[0]?.[0]).toMatchObject({ authDomain: "ornek.test/Last-Turn/dev" });
    expect(sdk.auth.mock.calls[0]?.[1]).toHaveProperty("popupRedirectResolver", browserPopupRedirectResolver);
    expect(sdk.redirect).toHaveBeenCalledWith(expect.anything(), browserPopupRedirectResolver);
    expect(istek.mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining(["__/auth/iframe", "__/auth/handler"]),
    );
    for (const [, secenek] of istek.mock.calls) expect(secenek?.method).toBe("HEAD");
  });

  it("Safari sekmesinde Google popup yalnız girişe basılınca çağrılır", async () => {
    vi.stubGlobal("navigator", { userAgent: "Desktop", standalone: false });
    const saglayici = await firebaseSaglayici(FIREBASE_AYAR);
    expect(sdk.auth.mock.calls[0]?.[1]).toHaveProperty("popupRedirectResolver", browserPopupRedirectResolver);
    expect(sdk.popup).not.toHaveBeenCalled();
    await saglayici.googleBagla();
    expect(sdk.popup).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      browserPopupRedirectResolver,
    );
  });
});
