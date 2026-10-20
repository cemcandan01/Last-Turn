// Ses bağlamı: AudioContext, ana karıştırıcı (efekt ve müzik kanalları, sınırlayıcı) ve iOS kilidi.
// iOS'ta ses ancak bir dokunuşla açılır: bağlam ilk dokunuşta kurulur ve her dokunuşta gerekirse sürdürülür.
// Uygulama arka plana geçince bağlam askıya alınır, öne gelince sürdürülür.

/** efekt ve müzik kanalları: oyun sesleri efekte, menü müziği müziğe bağlanır */
export interface Karistirici {
  ctx: BaseAudioContext;
  /** araç sesleri (kokpitte boğuklaşır) */
  arac: GainNode;
  /** arayüz ve yarış sesleri */
  efekt: GainNode;
  muzik: GainNode;
  /** kokpit süzgeci (araç sesleri) */
  kokpit: BiquadFilterNode;
}

/** kanalları kur: araç → kokpit süzgeci → efekt → ana → sınırlayıcı → hoparlör; müzik → ana */
export function karistiriciKur(ctx: BaseAudioContext): Karistirici {
  const ana = ctx.createGain(),
    sinir = ctx.createDynamicsCompressor(),
    efekt = ctx.createGain(),
    muzik = ctx.createGain(),
    arac = ctx.createGain(),
    kokpit = ctx.createBiquadFilter();
  sinir.threshold.value = -10;
  sinir.knee.value = 8;
  sinir.ratio.value = 6;
  sinir.attack.value = 0.004;
  sinir.release.value = 0.2;
  kokpit.type = "lowpass";
  kokpit.frequency.value = 20000;
  kokpit.Q.value = 0.5;
  arac.connect(kokpit).connect(efekt).connect(ana);
  muzik.connect(ana);
  ana.connect(sinir).connect(ctx.destination);
  return { ctx, arac, efekt, muzik, kokpit };
}

export const sesDurumu = {
  ctx: null as AudioContext | null,
  k: null as Karistirici | null,
};

/** ilk dokunuşta bağlamı kur; hazır olunca hazir() çağrılır */
export function sesKilidiKur(hazir: (k: Karistirici) => void) {
  const ac = () => {
    let ctx = sesDurumu.ctx;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC({ latencyHint: "interactive" });
      } catch {
        return;
      }
      sesDurumu.ctx = ctx;
      sesDurumu.k = karistiriciKur(ctx);
      // iOS: dokunuş içinde kısa bir sessiz ses çalmak kilidi açar
      const b = ctx.createBuffer(1, 1, ctx.sampleRate),
        s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start();
      hazir(sesDurumu.k);
    }
    if (ctx.state != "running" && !document.hidden) ctx.resume().catch(() => {});
  };
  for (const o of ["touchend", "pointerup", "click", "keydown"])
    document.addEventListener(o, ac, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    const ctx = sesDurumu.ctx;
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  });
}
