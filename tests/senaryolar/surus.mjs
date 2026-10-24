// Bu değişikliğin kabul ve bağlantı kapsamı; geniş fizik alanı ayrıca korunur.
import fizik from "./fizik.mjs";
import garaj from "./garaj.mjs";
export default [
  {
    id: "girdi-kaydi",
    ad: "El freni girdisi kayıt/yeniden oynatmada belirlenimci",
    p: 1,
    birim: { dosya: "tests/birim/cok-arac.test.ts", grup: "girdi kaydı ve yeniden oynatma" },
  },
  {
    id: "gercek-performans",
    ad: "Garaj/gerçek motor, sınıf farkı, modifiye ve ilk yarış",
    p: 1,
    birim: { dosya: "tests/birim/surus.test.ts", grup: "garaj ve gerçek sürüş" },
  },
  ...fizik.filter((s) =>
    ["kararlilik", "debriyaj", "debriyaj-tus", "saglamlik", "parcalar", "puan", "uyum", "surus"].includes(
      s.id,
    ),
  ),
  ...garaj.filter((s) => ["garaj", "cihaz-uyum"].includes(s.id)),
];
