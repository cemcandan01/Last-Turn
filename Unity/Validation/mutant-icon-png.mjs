import fs from "node:fs";
import { inflateSync } from "node:zlib";

// Salt okuma: atlas alfa sınırları için PNG RGBA çözümü; görüntü yazmaz/değiştirmez.
export function readAlpha(file) {
  const png = fs.readFileSync(file);
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw Error("RGBA8 PNG gerekir: " + file);
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const size = png.readUInt32BE(at);
    if (png.toString("ascii", at + 4, at + 8) === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + size));
    at += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)),
    stride = width * 4;
  const alpha = new Uint8Array(width * height);
  let prev = new Uint8Array(stride),
    offset = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c,
      da = Math.abs(p - a),
      db = Math.abs(p - b),
      dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++],
      row = new Uint8Array(stride);
    if (filter > 4) throw Error("PNG filtre türü");
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x - 4] : 0,
        b = prev[x],
        c = x >= 4 ? prev[x - 4] : 0;
      row[x] =
        raw[offset++] +
        (filter === 0
          ? 0
          : filter === 1
            ? a
            : filter === 2
              ? b
              : filter === 3
                ? Math.floor((a + b) / 2)
                : paeth(a, b, c));
    }
    for (let x = 0; x < width; x++) alpha[y * width + x] = row[x * 4 + 3];
    prev = row;
  }
  if (offset !== raw.length) throw Error("PNG veri boyutu");
  return { width, height, alpha };
}

export function bounds(image, x, y, width, height, threshold = 16) {
  let left = x + width,
    top = y + height,
    right = -1,
    bottom = -1;
  for (let py = y; py < y + height; py++)
    for (let px = x; px < x + width; px++)
      if (image.alpha[py * image.width + px] > threshold) {
        left = Math.min(left, px);
        top = Math.min(top, py);
        right = Math.max(right, px);
        bottom = Math.max(bottom, py);
      }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
