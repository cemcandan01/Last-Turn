// Sahne: renderer, kamera, ışıklar. Sahne nesneleri modül yüklenirken (Node testlerinde de) kurulur;
// renderer yalnız tarayıcıda, rendererKur() ile.
import * as THREE from "three";
import { ekran, layout, olcuIzle } from "../cekirdek/ekran";

// Three.js r128'deki görünüm korunur: renk yönetimi kapalı, çıktı doğrusal (eski oyunun renkleri birebir).
// Işık şiddetleri eski sürümle aynı aydınlığı versin diye ISIK çarpanıyla verilir (r155'ten beri fiziksel birimler).
THREE.ColorManagement.enabled = false;
export const ISIK = Math.PI;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd0e8);
scene.fog = new THREE.Fog(0x9fd0e8, 140, 900);
export const cam = new THREE.PerspectiveCamera(70, 1, 0.5, 1500);
export const hemi = new THREE.HemisphereLight(0xffffff, 0x7a6a50, 0.8 * ISIK);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff1d6, 0.9 * ISIK);
sun.position.set(60, 120, 40);
scene.add(sun, sun.target);
sun.shadow.mapSize.set(1024, 1024);
{
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -45;
  sc.right = sc.top = 45;
  sc.near = 20;
  sc.far = 320;
}
sun.shadow.bias = -0.0006;

/** renderer (tarayıcıda rendererKur ile oluşur) */
export let R: THREE.WebGLRenderer;

export function rendererKur(canvas: HTMLCanvasElement) {
  R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.outputColorSpace = THREE.LinearSRGBColorSpace;
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFShadowMap;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  // iOS ana ekran uygulaması ölçüyü gecikmeli oturtur (açılışta/dönmede sağda ya da altta boşluk):
  // ölçü sayfa düzeninden alınır ve düzen her değiştiğinde (ResizeObserver) yenilenir; ayrıca her olayda
  // hemen ve 1,5 sn boyunca birkaç kare/ms sonra yeniden ölçülür. Dönmeden kalan kaydırma sıfırlanır.
  const olc = () => {
    rs();
    requestAnimationFrame(() => requestAnimationFrame(rs));
    [100, 300, 700, 1000, 1500].forEach((ms) => setTimeout(rs, ms));
  };
  olcuIzle(rs);
  addEventListener("resize", olc);
  addEventListener("orientationchange", olc);
  screen.orientation?.addEventListener?.("change", olc);
  addEventListener("pageshow", olc);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) olc();
  });
  window.visualViewport?.addEventListener("resize", rs);
  olc();
}

/** ekran boyutu değişince (dönme dahil) */
export function rs() {
  if (scrollX || scrollY) scrollTo(0, 0);
  layout();
  R.setSize(ekran.aw, ekran.ah, false);
  cam.aspect = ekran.aw / ekran.ah;
  cam.updateProjectionMatrix();
}
