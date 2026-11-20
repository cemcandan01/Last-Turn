@AGENTS.md

## Claude'a özgü notlar

- Alt ajanlar (`.claude/agents`): `kasif` (kodda yer bulma), `testci` (test koşup kısa sonuç), `denetci` (göndermeden önce diff denetimi). Küçük işte kullanma.
- Skill'ler (`.claude/skills`) yalnız ilgili iş için yüklenir; `yonlendir`, `regresyon`, `merkez` otomasyon varsayımları geçerli sayılmaz, ayrıca konuşulacak.
- Commit mesajlarının sonuna ortamın verdiği ortak yazar satırı eklenir.
