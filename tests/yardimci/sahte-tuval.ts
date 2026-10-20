// Node'da dünya kurmak için sahte tuval: dokular çizilmez, yalnız three.js nesneleri ve çarpışmalar kurulur.
const ctx = new Proxy(
  {},
  {
    get: (_t, k) => (k == "measureText" ? () => ({ width: 10 }) : () => {}),
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

const g = globalThis as unknown as { document?: unknown };
if (!g.document) g.document = { createElement: () => tuval() };
