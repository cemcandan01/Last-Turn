// Kalıcı kayıt (localStorage). Gizli sekmede ya da dolu depoda sessizce vazgeçer.
// Anahtarlar eski sürümle aynıdır: lt_prof, lt_car, lt_olock, lt_ayar, sv_<yarış>

export function oku(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export function yaz(k: string, v: string | number) {
  try {
    localStorage.setItem(k, String(v));
  } catch {}
}

export function okuJson<T extends object>(k: string, varsayilan: T): T {
  try {
    return Object.assign(varsayilan, JSON.parse(oku(k) || "{}"));
  } catch {
    return varsayilan;
  }
}

export const yazJson = (k: string, v: unknown) => yaz(k, JSON.stringify(v));
