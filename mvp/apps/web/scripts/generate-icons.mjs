import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Simple SVG icon: lightning bolt on dark background (matches the Zap icon used in the app)
function createIconSvg(size) {
  const padding = Math.round(size * 0.15);
  const boltSize = size - padding * 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0f172a"/>
    <g transform="translate(${padding}, ${padding})">
      <polygon points="${boltSize * 0.55},${boltSize * 0.02} ${boltSize * 0.2},${boltSize * 0.48} ${boltSize * 0.45},${boltSize * 0.48} ${boltSize * 0.38},${boltSize * 0.98} ${boltSize * 0.8},${boltSize * 0.42} ${boltSize * 0.52},${boltSize * 0.42} ${boltSize * 0.55},${boltSize * 0.02}" fill="#fafafa"/>
    </g>
  </svg>`;
}

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  const svg = Buffer.from(createIconSvg(size));
  await sharp(svg).png().toFile(join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log("All icons generated.");
