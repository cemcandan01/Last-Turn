import { kariyerSozlesmesi } from "../yardimci/kariyer-senaryosu.mjs";
import fizik from "./fizik.mjs";
import garaj from "./garaj.mjs";
import modifiye from "./modifiye.mjs";
export default [
  {
    id: "ozellik-toplami",
    ad: "15 stok araç, altı özellik toplamı, bütün sınıflar ve modifiye alanı",
    p: 1,
    birim: { dosya: "tests/birim/denge.test.ts", grup: "ortak özellik toplamı ve modifiye alanı" },
  },
  {
    id: "gercek-performans",
    ad: "Gerçek motor/garaj, modifiye ve ilk beş yarış",
    p: 1,
    birim: { dosya: "tests/birim/surus.test.ts", grup: "garaj ve gerçek sürüş" },
  },
  ...fizik.filter((s) =>
    ["kararlilik", "parcalar", "puan", "uyum", "drift-yarisi", "debriyaj"].includes(s.id),
  ),
  {
    id: "gorunen-puanlar",
    ad: "Garaj ve mağazada gösterilen altı puan toplanır",
    p: 1,
    tarayici: "ozellik-puanlari",
  },
  ...modifiye.filter((s) => s.id == "modifiye-garaj"),
  ...garaj.filter((s) => ["garaj", "cihaz-uyum"].includes(s.id)),
  kariyerSozlesmesi,
];
