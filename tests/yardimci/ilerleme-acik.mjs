// Tarayıcı testlerinde bütün pist ve araçlar açık başlar (oyun/ilerleme.ts kilitleri): kayıt yoksa yüksek XP'li ilerleme
// yazılır. Kilitleri deneyen bölüm (ilerleme) temiz bağlam açar. Kullanım: await sayfaVeyaBaglam.addInitScript(TUM_ACIK)
export const TUM_ACIK = `try {
  if (!localStorage.getItem("lt_ilerleme"))
    localStorage.setItem("lt_ilerleme", JSON.stringify({ surum: 3, xp: 99999, updatedAt: 0, yildiz: {}, kazanilan: 999999, alimlar: {}, ekAcik: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => "arac_" + i) }));
} catch {}`;
