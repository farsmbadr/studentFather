// Generate placeholder icons for Tauri
// Usage: node scripts/generate-icons.cjs
const fs = require('fs');
const path = require('path');

// Minimal valid 32x32 PNG (blue square)
function createPNG(w, h) {
  // PNG header + IHDR + IDAT (raw uncompressed) + IEND
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch { return null; }
  })();

  if (createCanvas) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${w * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CM', w / 2, h / 2);
    return canvas.toBuffer();
  }

  // Fallback: write a simple SVG
  return null;
}

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Try generating PNGs
const png32 = createPNG(32, 32);
const png128 = createPNG(128, 128);
const png256 = createPNG(256, 256);

if (png32) {
  fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
  fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
  fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
  // Copy for ico (placeholder - just use 32x32 PNG as ico)
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), png32);
  console.log('Icons generated successfully');
} else {
  console.log('Canvas module not available, writing SVG placeholders');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="256" height="256" rx="40" fill="#4F46E5"/>
    <text x="128" y="145" font-family="Arial" font-size="100" font-weight="bold" fill="white" text-anchor="middle">CM</text>
  </svg>`;
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);
  // Tauri v2 can use SVG icons
  console.log('SVG icon written (Tauri v2 supports SVG)');
}
