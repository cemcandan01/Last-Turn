// Ortak iş/devir araçları yalnız kendi kapsamlarında doğrulanır; oyun testleri tekrarlanmaz.
export default [
  {
    id: "ortak-calisma",
    ad: "Görev kartı korunur, yol dışına yazılmaz; başlangıç bağlamı sınırlıdır",
    p: 2,
    birim: { dosya: "tests/birim/calisma.test.ts", grup: "ortak çalışma araçları" },
  },
];
