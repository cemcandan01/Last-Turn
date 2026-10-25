import garaj from "./garaj.mjs";
export default [
  {
    id: "garaj-duzen",
    ad: "Garajda büyük sınıf, sol motor dinleme ve sade sağ panel; mağaza bilgileri korunur",
    p: 1,
    tarayici: "garaj-duzen",
  },
  ...garaj.filter((s) => s.id === "cihaz-uyum"),
];
