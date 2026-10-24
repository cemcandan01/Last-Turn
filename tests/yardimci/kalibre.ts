// Puan kalibrasyonunun yapılandırmaları (tests/olcum/kalibre.test.ts)
import { CARS } from "../../src/arac/araclar";

/** kalibrasyon yapılandırmaları: [araç, parçalar] */
export const YAPILAR: [number, string[]][] = [
  ...CARS.map((_c, a): [number, string[]] => [a, []]),
  [0, ["motor-yaris", "turbo-buyuk"]],
  [0, ["lastik-sokak", "suspansiyon-sokak", "motor-kisitli"]],
  [0, ["agirlik-3", "aero-buyuk", "fren-yaris"]],
  [8, ["motor-yaris", "kompresor", "agirlik-3", "lastik-yaris", "suspansiyon-yaris", "fren-yaris"]],
  [8, ["lastik-spor", "suspansiyon-spor", "motor-spor"]],
  [4, ["lastik-yaris", "suspansiyon-yaris", "aero-yaris"]],
  [4, ["motor-kisitli", "lastik-sokak"]],
  [1, ["lastik-yaris", "suspansiyon-yaris", "aero-yaris"]],
  [3, ["lastik-yaris", "suspansiyon-yaris", "aero-yaris", "motor-yaris"]],
  [2, ["lastik-yaris", "suspansiyon-yaris", "diferansiyel-lsd"]],
  [9, ["lastik-yaris", "suspansiyon-yaris", "aero-buyuk", "agirlik-2"]],
  [5, ["lastik-sokak", "agirlik-balast"]],
  [0, ["lastik-toprak", "suspansiyon-ralli", "koruma", "cekis-dort", "motor-yaris"]],
  [2, ["lastik-toprak", "suspansiyon-rallikros", "diferansiyel-ralli", "cekis-dort"]],
  [3, ["motor-yaris", "turbo-buyuk", "agirlik-2"]],
  [1, ["motor-kisitli", "agirlik-balast"]],
];
