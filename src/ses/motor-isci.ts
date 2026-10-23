// Motor sesi işçisi: bir aracın motor katmanlarını ana iş parçacığının dışında hesaplar (garajda araç
// değişince ve yarış başlarken oyun takılmasın). Hesap sentez.ts'teki saf fonksiyonların aynısıdır.
import { katmanDevirleri, motorEq, motorKatmani, motorProfili } from "./sentez";

export interface MotorIstegi {
  no: number;
  k: string;
  devirMax: number;
  sr: number;
}
export interface MotorYaniti {
  no: number;
  katmanlar: { devir: number; gaz: Float32Array; bos: Float32Array }[];
}

self.onmessage = (e: MessageEvent<MotorIstegi>) => {
  const { no, k, devirMax, sr } = e.data,
    p = motorProfili(k),
    katmanlar = katmanDevirleri(devirMax).map((d, i) => ({
      devir: d,
      gaz: motorKatmani(p, d, 1, devirMax, sr, 11 + i, motorEq(k, i)),
      bos: motorKatmani(p, d, 0, devirMax, sr, 31 + i, motorEq(k, i)),
    }));
  const yanit: MotorYaniti = { no, katmanlar };
  (self as unknown as Worker).postMessage(
    yanit,
    katmanlar.flatMap((x) => [x.gaz.buffer, x.bos.buffer]),
  );
};
