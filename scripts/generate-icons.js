import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG Icon for Miam Planner: pastel sage green background with a cute warm fork, spoon and fresh leaf
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A6B53"/>
      <stop offset="100%" stop-color="#344D3C"/>
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A4D4B4"/>
      <stop offset="100%" stop-color="#72B087"/>
    </linearGradient>
  </defs>
  <!-- Background circle with safe margin for maskable -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  
  <!-- Subtle plate / bowl circle -->
  <circle cx="256" cy="256" r="170" fill="#FBF9F5" stroke="#E2DACF" stroke-width="8" opacity="0.95"/>
  <circle cx="256" cy="256" r="135" fill="#F4EFEA" opacity="0.6"/>
  
  <!-- Leaf top accent -->
  <path d="M 256 150 C 290 110 340 120 340 160 C 340 200 290 200 256 190 C 240 185 240 165 256 150 Z" fill="url(#leafGrad)" />
  
  <!-- Fork (Left) -->
  <g transform="translate(190, 200)" fill="#3D5A45">
    <rect x="18" y="0" width="4" height="42" rx="2"/>
    <rect x="6" y="0" width="4" height="32" rx="2"/>
    <rect x="30" y="0" width="4" height="32" rx="2"/>
    <path d="M 6 28 C 6 48 34 48 34 28 L 34 38 C 34 56 24 64 24 75 L 24 135 C 24 138 16 138 16 135 L 16 75 C 16 64 6 56 6 38 Z" />
  </g>
  
  <!-- Spoon (Right) -->
  <g transform="translate(280, 200)" fill="#3D5A45">
    <ellipse cx="20" cy="30" rx="18" ry="26" />
    <path d="M 16 54 C 16 64 24 64 24 75 L 24 135 C 24 138 16 138 16 135 L 16 75 C 16 64 16 54 16 54 Z" />
  </g>
  
  <!-- Warm heart / aroma badge -->
  <circle cx="256" cy="290" r="14" fill="#D97D64"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

// Also create a 1x1 base PNG placeholder or programmatic PNGs for PWA compliance
// A valid minimal 192x192 and 512x512 PNG buffer (PNG header + IDAT) or simple pure node script
// Let's create an HTML page or minimal PNG generator so all browsers and PWA audits pass!
console.log('SVG icon generated successfully.');
