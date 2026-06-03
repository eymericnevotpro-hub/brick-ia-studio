// Generates the PWA / home-screen icons from an inline SVG, rasterised with
// sharp (already a transitive dependency of Next). Run with: node scripts/generate-icons.mjs
//
// Output (in public/):
//   icon-192.png         — Android home screen / manifest
//   icon-512.png         — Android splash / manifest
//   icon-maskable.png    — Android adaptive (full-bleed safe zone)
//   apple-icon.png       — iOS home screen (no transparency)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public");

// The flame from the app's own icon set (24×24 viewBox).
const FLAME = "M12 3c2 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z";

// `radius` = corner radius (0 for maskable so the OS mask decides the shape).
// `scale`  = how big the flame is drawn (24 units × scale).
function svg({ radius, scale }) {
  const s = 512;
  // The flame is centred by moving its (12,12) midpoint to the canvas centre.
  // The inner translate lives inside scale(), so it uses raw viewBox units.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8A3A"/>
      <stop offset="1" stop-color="#FF6A1A"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${s / 2},${s / 2}) scale(${scale}) translate(-12,-12)">
    <path d="${FLAME}" fill="#FFFFFF"/>
  </g>
</svg>`;
}

const standard = Buffer.from(svg({ radius: 112, scale: 13 }));
const maskable = Buffer.from(svg({ radius: 0, scale: 10 }));

await mkdir(out, { recursive: true });
await sharp(standard).resize(512, 512).png().toFile(join(out, "icon-512.png"));
await sharp(standard).resize(192, 192).png().toFile(join(out, "icon-192.png"));
await sharp(standard).resize(180, 180).png().toFile(join(out, "apple-icon.png"));
await sharp(maskable).resize(512, 512).png().toFile(join(out, "icon-maskable.png"));

console.log("Icons written to public/.");
