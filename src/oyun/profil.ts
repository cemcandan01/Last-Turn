// Profil ve rekorlar: telefonda yerel olarak saklanır (lt_prof, sv_<yarış>)
import { oku, okuJson, yaz, yazJson } from "../cekirdek/depo";

export const PROF = okuJson("lt_prof", {
  name: "Sürücü",
  races: 0,
  wins: 0,
  km: 0,
  use: {} as Record<number, number>,
});

export const saveProf = () => yazJson("lt_prof", PROF);

/** kişisel rekor (yoksa 0) */
export const best = (k: string): number => +(oku("sv_" + k) || 0) || 0;
export const saveBest = (k: string, v: string | number) => yaz("sv_" + k, v);
