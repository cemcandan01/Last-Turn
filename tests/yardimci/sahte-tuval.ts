// Node'da dünya kurmak için sahte tuval: dokular çizilmez, yalnız three.js nesneleri ve çarpışmalar kurulur.
const grad = { addColorStop: () => {} };

const ctx = new Proxy(
  {},
  {
    get: (_t, k) =>
      k == "measureText"
        ? () => ({ width: 10 })
        : k == "createRadialGradient" || k == "createLinearGradient"
          ? () => grad
          : () => {},
    set: () => true,
  },
);

const tuval = () => ({
  width: 0,
  height: 0,
  style: {},
  getContext: () => ctx,
  toDataURL: () => "data:,",
  addEventListener: () => {},
});

const depo = new Map<string, string>();

const g = globalThis as unknown as { document?: unknown; localStorage?: unknown };
if (!g.document) g.document = { createElement: () => tuval() };
if (!g.localStorage) {
  g.localStorage = {
    getItem: (k: string) => depo.get(k) ?? null,
    setItem: (k: string, v: string) => depo.set(k, String(v)),
    removeItem: (k: string) => depo.delete(k),
    clear: () => depo.clear(),
  };
}
