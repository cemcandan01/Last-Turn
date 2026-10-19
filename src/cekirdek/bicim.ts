// Süre biçimleri: 1:23.4 ve 10.613 sn

export const fmt = (t: number | null | undefined): string =>
  t == null ? "—" : Math.floor(t / 60) + ":" + (t % 60).toFixed(1).padStart(4, "0");

export const fmt3 = (t: number): string => t.toFixed(3) + " sn";
