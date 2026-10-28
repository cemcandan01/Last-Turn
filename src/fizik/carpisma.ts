// Çarpışma ızgarası: temas edilebilir nesneler 16 m'lik hücrelerde tutulur, araç yalnız çevresindeki 9 hücreye bakar.
// Saf modül: dünya kurulurken doldurulur, fizik okur.

export type CarpisanTuru = "solid" | "bush" | "water" | "box";

export interface Carpisan {
  x: number;
  z: number;
  t: CarpisanTuru;
  /** daire yarıçapı (solid, bush, water) */
  r?: number;
  /** kutu yarı genişlikleri (box) */
  hx?: number;
  hz?: number;
  /** tepe yüksekliği (m; bina): oyuncunun dünya sorgusu, araç bunun üstündeyken nesneyi vermez (uçuş) */
  y?: number;
}

export const GRID = 16;

export class CarpismaIzgarasi {
  hucre = new Map<string, Carpisan[]>();

  ekle(o: Carpisan) {
    const ex = o.hx || 0,
      ez = o.hz || 0;
    for (let i = Math.floor((o.x - ex) / GRID); i <= Math.floor((o.x + ex) / GRID); i++)
      for (let j = Math.floor((o.z - ez) / GRID); j <= Math.floor((o.z + ez) / GRID); j++) {
        const k = i + "," + j;
        let a = this.hucre.get(k);
        if (!a) this.hucre.set(k, (a = []));
        a.push(o);
      }
  }

  /** (x, z) çevresindeki nesneler; her nesne bir kez, eski sırayla */
  yakin(x: number, z: number): Set<Carpisan> {
    const r = new Set<Carpisan>();
    const cx = Math.floor(x / GRID),
      cz = Math.floor(z / GRID);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const a = this.hucre.get(cx + i + "," + (cz + j));
        if (a) for (const o of a) r.add(o);
      }
    return r;
  }

  temizle() {
    this.hucre.clear();
  }
}
