import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "src-tauri", "icons");

// Reuse the same SVG design as the web PWA icons
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
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
];

for (const { name, size } of sizes) {
  const svg = Buffer.from(createIconSvg(size));
  await sharp(svg).png().toFile(join(iconsDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

// Generate ICO for Windows (from 256x256)
const svg256 = Buffer.from(createIconSvg(256));
await sharp(svg256).resize(256, 256).toFile(join(iconsDir, "icon.ico"));
console.log("Generated icon.ico (256x256)");

// Generate ICNS placeholder (macOS) - just use a PNG, actual .icns needs a different tool
const svg512 = Buffer.from(createIconSvg(512));
await sharp(svg512).png().toFile(join(iconsDir, "icon.icns"));
console.log("Generated icon.icns placeholder (512x512 PNG)");

console.log("All Tauri icons generated.");
