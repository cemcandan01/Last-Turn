// Ortam: günün saati ve hava. Tema zemini ve dekoru verir; saat ve hava ışığı, gökyüzünü, yağışı ve tutuşu belirler.
// Yağış kameranın çevresinde dönen parçacık bulutudur; gölge yalnız aracın çevresindeki 90 m'ye düşer.
import * as THREE from "three";
import { mB, mK, mR, mT } from "../dunya/kurucu";
import { havaTutusu, thOf } from "../dunya/temalar";
import { headL } from "./arac-modeli";
import { ctex } from "./dokular";
import { cam, hemi, ISIK, scene, sun } from "./sahne";
import { C3 } from "./yardimci";
import { ground } from "./zemin";

export type GununSaati = "morning" | "noon" | "evening" | "night";
export type Hava = "sun" | "rain" | "snow";

export const TODS: Partial<Record<GununSaati, string>> = {
    morning: "Sabah",
    noon: "Öğlen",
    evening: "Akşam",
  },
  WXS: Record<Hava, string> = { sun: "Güneşli", rain: "Yağmurlu", snow: "Karlı" };

/** seçili koşullar ve hesaplanan hava tutuşu */
export const COND = { tod: "noon" as GununSaati, wx: "sun" as Hava };
export const ortam = {
  /** hava tutuş çarpanı (yağmur, kar) */
  g: 1,
  /** etkin tema anahtarı */
  k: "day",
};
const SUNDIR = new THREE.Vector3(60, 120, 40).normalize();
const gTex: Record<string, THREE.Texture> = {};

/** temanın varsayılan koşulları (karlı haritada kar yağar, gece temaları akşam) */
export const condOf = (k: string | undefined) => ({
  tod: ((
    { city: "evening", coast: "evening", port: "evening", mount: "evening" } as Record<string, GununSaati>
  )[k || ""] || "noon") as GununSaati,
  wx: (k == "snow" ? "snow" : "sun") as Hava,
});

export function applyEnv(k: string) {
  ortam.k = k;
  const t = thOf(k),
    c = COND,
    sky = C3(t.sky),
    night = (t.night && c.tod == "evening") || c.tod == "night";
  let hi = t.hemi[2],
    si = t.sun[1],
    fn = t.fog[0],
    ff = t.fog[1];
  const sc = C3(t.sun[0]);
  if (t.night && !night) {
    sky.setHex(0x9fb8d0);
    hi = 0.78;
    si = 0.85;
    sc.setHex(0xfff1d6);
  }
  if (c.tod == "night" && !t.night) {
    sky.setHex(0x070b12);
    hi = 0.26;
    si = 0.08;
    sc.setHex(0x8899cc);
    fn *= 0.5;
    ff *= 0.6;
  }
  if (c.tod == "morning") {
    sky.lerp(C3(0xf6dcb4), 0.35);
    sc.lerp(C3(0xffe2b0), 0.6);
    si *= 0.85;
    hi *= 0.9;
    SUNDIR.set(-80, 45, 60).normalize();
  } else if (c.tod == "evening" && !night) {
    sky.lerp(C3(0xf08a5a), 0.45);
    sc.lerp(C3(0xff8a4a), 0.7);
    si *= 0.75;
    hi *= 0.75;
    SUNDIR.set(85, 28, -40).normalize();
  } else SUNDIR.set(60, 120, 40).normalize();
  ortam.g = havaTutusu(k, c.wx);
  if (c.wx == "rain") {
    sky.lerp(C3(night ? 0x0d1218 : 0x6f7882), 0.7);
    fn *= 0.35;
    ff *= 0.5;
    hi *= 0.75;
    si *= 0.3;
  } else if (c.wx == "snow") {
    sky.lerp(C3(night ? 0x1a2028 : 0xc9d3dc), 0.7);
    fn *= 0.3;
    ff *= 0.5;
    hi *= 0.9;
    si *= 0.4;
  }
  (scene.background as THREE.Color).copy(sky);
  const fog = scene.fog as THREE.Fog;
  fog.color.copy(sky);
  fog.near = fn;
  fog.far = ff;
  hemi.color.setHex(t.hemi[0]);
  hemi.groundColor.setHex(t.hemi[1]);
  hemi.intensity = hi * ISIK;
  sun.color.copy(sc);
  sun.intensity = si * ISIK;
  const gk = k + (c.wx == "snow" && k != "snow" ? "_s" : "");
  const gr = t.gr.map((h) =>
    c.wx == "snow" && k != "snow" ? "#" + new THREE.Color(h).lerp(C3(0xe8eef2), 0.7).getHexString() : h,
  );
  ground.material.map = gTex[gk] || (gTex[gk] = ctex(gr[0], gr[1], gr[2], 240));
  ground.material.needsUpdate = true;
  mT.color.setHex(t.leaf);
  mK.color.setHex(t.trunk);
  mR.color.setHex(t.rock);
  mB.color.setHex(t.bush);
  headL.intensity = night || (c.wx == "rain" && c.tod == "evening") ? 2.4 * ISIK : 0;
  precip.userData.hava = c.wx != "sun";
  precip.visible = precip.userData.hava;
  precip.userData.snow = c.wx == "snow";
  precip.material.color.setHex(c.wx == "snow" ? 0xffffff : 0xa9b8c8);
  precip.material.size = c.wx == "snow" ? 0.22 : 0.09;
}

// yağış: kameranın çevresinde dönen parçacık bulutu
const PN = 1600;
export const precip = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }),
);
{
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    a[i * 3] = (Math.random() - 0.5) * 70;
    a[i * 3 + 1] = Math.random() * 30;
    a[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  precip.geometry.setAttribute("position", new THREE.BufferAttribute(a, 3));
  precip.frustumCulled = false;
  precip.visible = false;
  scene.add(precip);
}

/** yağış parçacıklarını ilerlet (tt: görsel saat) */
export function precipTick(dt: number, tt: number, gizle = false) {
  // garaj vitrininde yağış/kar noktaları çizilmez
  precip.visible = !!precip.userData.hava && !gizle;
  if (!precip.visible) return;
  const pa = precip.geometry.attributes.position as THREE.BufferAttribute,
    a = pa.array as Float32Array,
    sn = precip.userData.snow,
    vy = sn ? 2.2 : 26;
  for (let i = 0; i < PN; i++) {
    let y = a[i * 3 + 1] - vy * dt;
    if (sn) {
      a[i * 3] += Math.sin(tt * 1.3 + i) * dt * 0.8;
    }
    if (y < 0) {
      y += 30;
      a[i * 3] = (Math.random() - 0.5) * 70;
      a[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    a[i * 3 + 1] = y;
  }
  pa.needsUpdate = true;
  precip.position.set(cam.position.x, cam.position.y - 12, cam.position.z);
}

/** gölge: güneş aracı izler (acik: ayarlardan gölge açık mı) */
export function shadowTick(acik: boolean, x: number, y: number, z: number) {
  if (!acik) {
    if (sun.castShadow) sun.castShadow = false;
    return;
  }
  sun.castShadow = true;
  sun.target.position.set(x, y, z);
  sun.position.set(x + SUNDIR.x * 150, y + SUNDIR.y * 150, z + SUNDIR.z * 150);
}
