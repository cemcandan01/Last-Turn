// Fizik dalının senaryoları (tests/senaryolar/BENIOKU.md)
const F = "tests/birim/fizik.test.ts";
export default [
  {
    id: "kararlilik",
    ad: "5 araç: kararlılık ve temel değerler",
    p: 1,
    duman: true,
    birim: { dosya: F, grup: "kararlılık ve temel değerler" },
  },
  { id: "surus", ad: "Tarayıcıda gazla araç ilerliyor", p: 1, duman: true, tarayici: "surus" },
  {
    id: "spin",
    ad: "Gerçekçide otomatik pilot spin atmaz",
    p: 1,
    birim: { dosya: F, grup: "gerçekçi seviyede otomatik pilot spin atmaz" },
  },
  {
    id: "drift-denge",
    ad: "Otoparkta drift dengesi",
    p: 1,
    birim: { dosya: F, grup: "drift dengesi (Boş Otopark, Beyaz Kurt, drift önayarı)" },
  },
  {
    id: "saglamlik",
    ad: "Belirlenimcilik, yokuş, rampa, çarpışma, patinaj, rastgele sürüş",
    p: 1,
    birim: { dosya: F, grup: "kurallar ve sağlamlık" },
  },
  {
    id: "toprak",
    ad: "Toprakta tam gaz + tam direksiyon yola tutunmaz",
    p: 2,
    birim: { dosya: F, grup: "toprakta sınır: tam gaz ve tam direksiyon yola tutunmaz" },
  },
  {
    id: "drift-yarisi",
    ad: "Drift yarışında %80 tek kombo, abartan yakar",
    p: 2,
    birim: { dosya: F, grup: "drift yarışı (Drift Parkı, Beyaz Kurt, drift önayarı)" },
  },
  {
    id: "titresim",
    ad: "Asfalt pistlerde titreşim yok, kerb sarsıntısı",
    p: 2,
    birim: { dosya: F, grup: "asfalt pistte titreşim yok (her araç, her asfalt pist)" },
  },
  {
    id: "kerb-tarayici",
    ad: "Tarayıcıda kerbe değmeden sarsıntı yok (5 araç × 18 asfalt pist)",
    p: 3,
    tarayici: "kerb",
  },
];
