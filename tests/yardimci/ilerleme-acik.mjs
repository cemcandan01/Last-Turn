// Tarayıcı testlerinde bütün pist ve araçlar açık başlar (oyun/ilerleme.ts kilitleri): kayıt yoksa yüksek XP'li ilerleme
// yazılır. Kilitleri deneyen bölüm (ilerleme) temiz bağlam açar. Kullanım: await sayfaVeyaBaglam.addInitScript(TUM_ACIK)
export const TUM_ACIK = `try {
  if (!localStorage.getItem("lt_ilerleme"))
    localStorage.setItem("lt_ilerleme", JSON.stringify({ surum: 1, xp: 99999, updatedAt: 0, yildiz: {}, ekAcik: [] }));
} catch {}`;
