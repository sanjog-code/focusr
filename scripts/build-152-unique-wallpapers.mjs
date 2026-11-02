import fs from 'node:fs';
import path from 'node:path';

// Load index.html
const htmlPath = 'index.html';
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const themeMatch = htmlContent.match(/const THEMES = (\[.*?\]);/s);
if (!themeMatch) {
  console.error('Could not find THEMES in index.html');
  process.exit(1);
}

let themes = JSON.parse(themeMatch[1]);
console.log('Current theme count:', themes.length);

// Base photographic images that are unique
const basePhotos = [
  'backgrounds/zen-mist.jpg',
  'backgrounds/zen-bamboo-sanctuary.jpg',
  'backgrounds/nordic-aurora.jpg',
  'backgrounds/deep-forest.jpg',
  'backgrounds/golden-dunes.jpg',
  'backgrounds/cosmic-nebula.jpg',
  'backgrounds/cosmic-stellar-void.jpg',
  'backgrounds/cyberpunk-neo-tokyo.jpg',
  'backgrounds/ocean-twilight.jpg',
  'backgrounds/rainy-window.jpg',
  'backgrounds/stone-zen.jpg'
];

// Additional 10 themes to reach exactly 152 if count is 142
const additionalThemes = [
  {
    id: "visionos-spatial-sanctuary",
    name: "VisionOS Spatial Glass",
    sub: "Refractive Anisotropic Prisms & Ambient Dark Matter",
    category: "minimal",
    liveType: "shader",
    shaderPreset: "minimal-prism",
    particlePreset: "stardust",
    accent: "#38bdf8",
    accentGlow: "rgba(56, 189, 248, 0.42)",
    liquidHue: 198,
    tint: "rgba(8, 12, 22, 0.72)",
    orb1: "rgba(56, 189, 248, 0.22)",
    orb2: "rgba(147, 197, 253, 0.16)",
    orb3: "rgba(192, 132, 252, 0.10)",
    palette: ["#38bdf8", "#818cf8", "#080c16"]
  },
  {
    id: "supernova-stellar-remnant",
    name: "Crab Nebula Pulsar",
    sub: "High-Energy Relativistic Shockwaves & Magnetar Flare",
    category: "cosmic",
    liveType: "shader",
    shaderPreset: "black-hole",
    particlePreset: "stardust",
    accent: "#ec4899",
    accentGlow: "rgba(236, 72, 153, 0.42)",
    liquidHue: 330,
    tint: "rgba(14, 4, 18, 0.72)",
    orb1: "rgba(236, 72, 153, 0.22)",
    orb2: "rgba(168, 85, 247, 0.16)",
    orb3: "rgba(56, 189, 248, 0.10)",
    palette: ["#ec4899", "#a855f7", "#0e0412"]
  },
  {
    id: "cyber-synth-grid",
    name: "Synthwave Horizon 2099",
    sub: "Wireframe Vector Sunset & Retro Laser Highway",
    category: "cyberpunk",
    liveType: "shader",
    shaderPreset: "matrix-code",
    particlePreset: "stardust",
    accent: "#f43f5e",
    accentGlow: "rgba(244, 63, 94, 0.42)",
    liquidHue: 345,
    tint: "rgba(18, 4, 12, 0.72)",
    orb1: "rgba(244, 63, 94, 0.24)",
    orb2: "rgba(168, 85, 247, 0.18)",
    orb3: "rgba(6, 182, 212, 0.10)",
    palette: ["#f43f5e", "#a855f7", "#12040c"]
  },
  {
    id: "ethereal-cloud-summit",
    name: "Olympus Mons Stratosphere",
    sub: "Volumetric Clouds Pierced by Martian Twilight",
    category: "nature",
    liveType: "particles",
    particlePreset: "stardust",
    accent: "#fb923c",
    accentGlow: "rgba(251, 146, 60, 0.38)",
    liquidHue: 30,
    tint: "rgba(18, 8, 4, 0.68)",
    orb1: "rgba(251, 146, 60, 0.20)",
    orb2: "rgba(239, 68, 68, 0.14)",
    orb3: "rgba(253, 186, 116, 0.08)",
    palette: ["#fb923c", "#f43f5e", "#120804"]
  },
  {
    id: "obsidian-geometric-void",
    name: "Matte Obsidian Monolith",
    sub: "Brutalist Monolith with Chiseled Titanium Bevels",
    category: "minimal",
    liveType: "shader",
    shaderPreset: "minimal-prism",
    particlePreset: "none",
    accent: "#94a3b8",
    accentGlow: "rgba(148, 163, 184, 0.32)",
    liquidHue: 215,
    tint: "rgba(8, 9, 12, 0.75)",
    orb1: "rgba(148, 163, 184, 0.14)",
    orb2: "rgba(71, 85, 105, 0.10)",
    orb3: "rgba(30, 41, 59, 0.08)",
    palette: ["#94a3b8", "#475569", "#08090c"]
  },
  {
    id: "aurora-australis-vortex",
    name: "Queen Maud Polar Vortex",
    sub: "Curtains of Emerald & Crimson Atmospheric Ionization",
    category: "aurora",
    liveType: "particles",
    particlePreset: "stardust",
    accent: "#10b981",
    accentGlow: "rgba(16, 185, 129, 0.40)",
    liquidHue: 160,
    tint: "rgba(4, 16, 18, 0.70)",
    orb1: "rgba(16, 185, 129, 0.22)",
    orb2: "rgba(6, 182, 212, 0.16)",
    orb3: "rgba(147, 51, 234, 0.10)",
    palette: ["#10b981", "#06b6d4", "#041012"]
  },
  {
    id: "deep-trench-bioluminescence",
    name: "Mariana Hadal Trench",
    sub: "Abyssal Hydrothermal Chimneys & Ghost Spore Plumes",
    category: "nature",
    liveType: "shader",
    shaderPreset: "bioluminescent",
    particlePreset: "stardust",
    accent: "#06b6d4",
    accentGlow: "rgba(6, 182, 212, 0.42)",
    liquidHue: 190,
    tint: "rgba(2, 10, 20, 0.74)",
    orb1: "rgba(6, 182, 212, 0.24)",
    orb2: "rgba(59, 130, 246, 0.16)",
    orb3: "rgba(16, 185, 129, 0.10)",
    palette: ["#06b6d4", "#3b82f6", "#020a14"]
  },
  {
    id: "lofi-velvet-study",
    name: "Midnight Vinyl Atelier",
    sub: "Amber Desk Lamp Rays on Rain-Washed Skylight",
    category: "lofi",
    liveType: "particles",
    particlePreset: "rain",
    accent: "#f59e0b",
    accentGlow: "rgba(245, 158, 11, 0.38)",
    liquidHue: 38,
    tint: "rgba(18, 12, 6, 0.68)",
    orb1: "rgba(245, 158, 11, 0.20)",
    orb2: "rgba(234, 88, 12, 0.14)",
    orb3: "rgba(251, 191, 36, 0.08)",
    palette: ["#f59e0b", "#d97706", "#120c06"]
  },
  {
    id: "kyoto-autumn-shrine",
    name: "Tofukuji Maple Cloister",
    sub: "Crimson Autumn Foliage Shrouded in Mountain Vapour",
    category: "nature",
    liveType: "particles",
    particlePreset: "sakura",
    accent: "#ef4444",
    accentGlow: "rgba(239, 68, 68, 0.38)",
    liquidHue: 0,
    tint: "rgba(18, 6, 6, 0.68)",
    orb1: "rgba(239, 68, 68, 0.22)",
    orb2: "rgba(249, 115, 22, 0.16)",
    orb3: "rgba(251, 191, 36, 0.08)",
    palette: ["#ef4444", "#f97316", "#120606"]
  },
  {
    id: "quantum-superposition-lattice",
    name: "Superconducting Qubit Matrix",
    sub: "Cryogenic Dilution Chamber Glowing with Quantum State",
    category: "cyberpunk",
    liveType: "shader",
    shaderPreset: "matrix-code",
    particlePreset: "stardust",
    accent: "#a855f7",
    accentGlow: "rgba(168, 85, 247, 0.42)",
    liquidHue: 270,
    tint: "rgba(12, 4, 22, 0.72)",
    orb1: "rgba(168, 85, 247, 0.24)",
    orb2: "rgba(56, 189, 248, 0.16)",
    orb3: "rgba(236, 72, 153, 0.10)",
    palette: ["#a855f7", "#38bdf8", "#0c0416"]
  }
];

if (themes.length < 152) {
  const needed = 152 - themes.length;
  themes.push(...additionalThemes.slice(0, needed));
  console.log(`Pushed ${needed} additional themes to reach exact 152 themes!`);
} else if (themes.length > 152) {
  themes = themes.slice(0, 152);
}

console.log('Final Theme Count:', themes.length);

// Procedural SVG Generator Functions
function getSvgHeader(seed, title) {
  return `<!-- Focusr Spatial Wallpaper [${title}] (Seed: ${seed}) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">`;
}

function generateCosmic(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#8b5cf6';
  const c2 = t.palette?.[1] || '#3b82f6';
  const c3 = t.palette?.[2] || '#050711';
  const cx = 960 + ((seed * 73) % 400) - 200;
  const cy = 540 + ((seed * 37) % 240) - 120;
  const angle = -35 + ((seed * 19) % 70);

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <radialGradient id="space_${seed}" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#0b1022" />
      <stop offset="65%" stop-color="${c3}" />
      <stop offset="100%" stop-color="#020308" />
    </radialGradient>
    <radialGradient id="nebulaA_${seed}" cx="${35 + (seed % 35)}%" cy="${35 + (seed * 3 % 35)}%" r="70%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.48" />
      <stop offset="45%" stop-color="${c2}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="nebulaB_${seed}" cx="${65 - (seed % 30)}%" cy="${65 - (seed * 5 % 30)}%" r="60%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.40" />
      <stop offset="50%" stop-color="${c1}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ring_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.85" />
      <stop offset="50%" stop-color="${c2}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${c1}" stop-opacity="0" />
    </linearGradient>
    <filter id="glow_${seed}">
      <feGaussianBlur stdDeviation="40" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#space_${seed})"/>
  <rect width="100%" height="100%" fill="url(#nebulaA_${seed})" style="mix-blend-mode: screen;"/>
  <rect width="100%" height="100%" fill="url(#nebulaB_${seed})" style="mix-blend-mode: screen;"/>

  <!-- Celestial Singularity & Rings -->
  <g transform="translate(${cx}, ${cy})">
    <ellipse rx="420" ry="120" fill="none" stroke="url(#ring_${seed})" stroke-width="22" opacity="0.68" transform="rotate(${angle})" filter="url(#glow_${seed})"/>
    <ellipse rx="540" ry="155" fill="none" stroke="url(#ring_${seed})" stroke-width="5" opacity="0.45" transform="rotate(${angle})"/>
    <circle r="140" fill="#020308"/>
    <circle r="140" fill="none" stroke="${c1}" stroke-width="7" opacity="0.85" filter="url(#glow_${seed})"/>
    <circle r="138" fill="url(#nebulaA_${seed})" opacity="0.8"/>
  </g>

  <!-- Deep Starfield -->
  ${Array.from({ length: 110 }).map((_, i) => {
    const sx = ((i * 179 + seed * 23) % 1920);
    const sy = ((i * 313 + seed * 47) % 1080);
    const sr = (i % 7 === 0) ? 2.6 : (i % 3 === 0) ? 1.5 : 0.8;
    const sop = 0.3 + ((i + seed) % 7) * 0.1;
    return `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#fff" opacity="${sop.toFixed(2)}"/>`;
  }).join('\n  ')}
</svg>`;
}

function generateNature(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#10b981';
  const c2 = t.palette?.[1] || '#059669';
  const c3 = t.palette?.[2] || '#03140c';

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <linearGradient id="sky_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#040b10"/>
      <stop offset="50%" stop-color="${c3}"/>
      <stop offset="85%" stop-color="#0f261c"/>
      <stop offset="100%" stop-color="#020906"/>
    </linearGradient>
    <radialGradient id="sun_${seed}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="${c2}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <filter id="mist_${seed}">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#sky_${seed})"/>

  <!-- Glowing Sun/Moon Disk -->
  <circle cx="${700 + (seed * 80 % 500)}" cy="${380 + (seed * 40 % 160)}" r="180" fill="url(#sun_${seed})" opacity="0.75"/>

  <!-- Distant Ridge -->
  <path d="M0,640 Q400,${520 + (seed * 11 % 60)} 960,${570 - (seed * 7 % 50)} T1920,620 L1920,1080 L0,1080 Z" fill="#0a1a14" opacity="0.7"/>

  <!-- Midground Ridge -->
  <path d="M0,740 Q550,${620 - (seed * 13 % 70)} 1100,${680 + (seed * 9 % 60)} T1920,720 L1920,1080 L0,1080 Z" fill="#06120d" opacity="0.85"/>

  <!-- Atmospheric Valley Mist Layer -->
  <rect x="0" y="660" width="1920" height="140" fill="${c1}" opacity="0.12" filter="url(#mist_${seed})"/>

  <!-- Foreground Mountains & Lake Reflection -->
  <path d="M0,860 Q480,${780 + (seed * 17 % 50)} 1020,${830 - (seed * 5 % 40)} T1920,850 L1920,1080 L0,1080 Z" fill="#020705"/>
</svg>`;
}

function generateCyberpunk(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#f43f5e';
  const c2 = t.palette?.[1] || '#06b6d4';
  const c3 = t.palette?.[2] || '#0a0314';

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <linearGradient id="cyberSky_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020108"/>
      <stop offset="55%" stop-color="${c3}"/>
      <stop offset="70%" stop-color="#120520"/>
      <stop offset="100%" stop-color="#030006"/>
    </linearGradient>
    <linearGradient id="retroSun_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <filter id="neonGlow_${seed}">
      <feGaussianBlur stdDeviation="15" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#cyberSky_${seed})"/>

  <!-- Retro Futuristic Sun -->
  <g transform="translate(960, 620)">
    <circle r="220" fill="url(#retroSun_${seed})" opacity="0.85" filter="url(#neonGlow_${seed})"/>
    <!-- Horizontal blind slats -->
    ${[10, 35, 65, 100, 140, 185].map(y => `<rect x="-240" y="${y}" width="480" height="12" fill="#020108"/>`).join('\n    ')}
  </g>

  <!-- Skyline Silhouettes -->
  <path d="M0,660 L80,660 L80,520 L150,520 L150,660 L240,660 L240,460 L320,460 L320,660 L440,660 L440,560 L500,560 L500,660 L680,660 L680,480 L760,480 L760,660 L920,660 L920,530 L980,530 L980,660 L1140,660 L1140,470 L1220,470 L1220,660 L1400,660 L1400,510 L1460,510 L1460,660 L1600,660 L1600,450 L1700,450 L1700,660 L1920,660 L1920,1080 L0,1080 Z" fill="#030107" opacity="0.95"/>

  <!-- 3D Perspective Ground Grid -->
  <g opacity="0.45" stroke="${c2}" stroke-width="1.8" filter="url(#neonGlow_${seed})">
    <line x1="0" y1="680" x2="1920" y2="680" stroke="${c1}" stroke-width="3"/>
    ${[720, 770, 830, 900, 980, 1070].map(y => `<line x1="0" y1="${y}" x2="1920" y2="${y}"/>`).join('\n    ')}
    ${Array.from({ length: 19 }).map((_, i) => {
      const x = i * 106;
      return `<line x1="${x}" y1="680" x2="${(x - 960) * 3 + 960}" y2="1080"/>`;
    }).join('\n    ')}
  </g>
</svg>`;
}

function generateAurora(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#00e5ff';
  const c2 = t.palette?.[1] || '#10b981';
  const c3 = t.palette?.[2] || '#041018';

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <linearGradient id="polarNight_${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020612"/>
      <stop offset="40%" stop-color="${c3}"/>
      <stop offset="85%" stop-color="#051722"/>
      <stop offset="100%" stop-color="#020a10"/>
    </linearGradient>
    <linearGradient id="auroraA_${seed}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.1"/>
      <stop offset="35%" stop-color="${c2}" stop-opacity="0.75"/>
      <stop offset="70%" stop-color="${c1}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0.05"/>
    </linearGradient>
    <filter id="auroraBlur_${seed}">
      <feGaussianBlur stdDeviation="35"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#polarNight_${seed})"/>

  <!-- Undulating Aurora Ribbons -->
  <path d="M-100,${340 + (seed * 11 % 80)} C400,${180 + (seed * 7 % 60)} 800,${460 - (seed * 5 % 70)} 1300,${240 + (seed * 9 % 60)} C1600,${120} 1800,${300} 2020,${220} L2020,620 C1700,560 1300,700 800,560 C400,440 100,600 -100,540 Z" fill="url(#auroraA_${seed})" filter="url(#auroraBlur_${seed})" opacity="0.85"/>
  <path d="M-100,${280 - (seed * 7 % 50)} C500,${380 + (seed * 5 % 60)} 950,${210 + (seed * 11 % 50)} 1450,${360 - (seed * 3 % 40)} C1750,${260} 1900,${380} 2020,${320} L2020,540 C1600,480 1200,580 700,480 C300,400 50,500 -100,460 Z" fill="${c1}" filter="url(#auroraBlur_${seed})" opacity="0.45"/>

  <!-- Jagged Ice Mountains Silhouette -->
  <path d="M0,780 L220,690 L440,790 L710,650 L960,760 L1280,630 L1560,770 L1780,680 L1920,770 L1920,1080 L0,1080 Z" fill="#01060c"/>

  <!-- Polar Reflection Sea -->
  <rect x="0" y="800" width="1920" height="280" fill="url(#auroraA_${seed})" opacity="0.22" filter="url(#auroraBlur_${seed})"/>
</svg>`;
}

function generateLofi(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#f59e0b';
  const c2 = t.palette?.[1] || '#ef4444';
  const c3 = t.palette?.[2] || '#160804';

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <radialGradient id="hearthGlow_${seed}" cx="50%" cy="65%" r="65%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.75"/>
      <stop offset="45%" stop-color="${c2}" stop-opacity="0.32"/>
      <stop offset="85%" stop-color="${c3}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#040201"/>
    </radialGradient>
    <filter id="softGlow_${seed}">
      <feGaussianBlur stdDeviation="50"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#hearthGlow_${seed})"/>

  <!-- Architectural Window / Interior Panes -->
  <g stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="none">
    <rect x="240" y="140" width="600" height="720" rx="20"/>
    <line x1="540" y1="140" x2="540" y2="860"/>
    <line x1="240" y1="500" x2="840" y2="500"/>
  </g>

  <!-- Ambient Bokeh Spheres -->
  ${[
    [400, 300, 110, 0.25],
    [700, 420, 85, 0.3],
    [520, 680, 140, 0.18],
    [1300, 520, 190, 0.22],
    [1550, 360, 130, 0.28]
  ].map(([x, y, r, op]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c1}" opacity="${op}" filter="url(#softGlow_${seed})"/>`).join('\n  ')}
</svg>`;
}

function generateMinimal(t, seed) {
  const c1 = t.palette?.[0] || t.accent || '#38bdf8';
  const c2 = t.palette?.[1] || '#94a3b8';
  const c3 = t.palette?.[2] || '#080c14';

  return `${getSvgHeader(seed, t.name)}
  <defs>
    <radialGradient id="minimalGrad_${seed}" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#121828"/>
      <stop offset="60%" stop-color="${c3}"/>
      <stop offset="100%" stop-color="#030508"/>
    </radialGradient>
    <linearGradient id="prismEdge_${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.4)"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0.1"/>
    </linearGradient>
    <filter id="glassGlow_${seed}">
      <feGaussianBlur stdDeviation="30" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#minimalGrad_${seed})"/>

  <!-- VisionOS Isometric Floating Glass Slabs -->
  <g transform="translate(960, 540) rotate(${seed % 30 - 15})">
    <!-- Slab 1 -->
    <polygon points="-380,-120 180,-280 380,80 -180,240" fill="rgba(255,255,255,0.03)" stroke="url(#prismEdge_${seed})" stroke-width="2.5" filter="url(#glassGlow_${seed})"/>
    <!-- Slab 2 -->
    <polygon points="-280,-20 280,-180 480,180 -80,340" fill="rgba(255,255,255,0.02)" stroke="url(#prismEdge_${seed})" stroke-width="1.8"/>
    <!-- Specular Flare Core -->
    <circle cx="0" cy="0" r="160" fill="${c1}" opacity="0.18" filter="url(#glassGlow_${seed})"/>
  </g>
</svg>`;
}

// Generate unique wallpapers for all 152 themes
console.log('Generating unique wallpaper assets for 152 themes...');

const usedImages = new Set();
let baseIndex = 0;

for (let i = 0; i < themes.length; i++) {
  const t = themes[i];
  const seed = i + 1;

  // For the first 11 themes, assign the 11 unique photography JPG files
  if (baseIndex < basePhotos.length) {
    t.image = basePhotos[baseIndex];
    usedImages.add(t.image);
    baseIndex++;
  } else {
    // Generate a unique SVG asset for every other theme!
    const filename = `bg-${t.id}.svg`;
    const relativePath = `backgrounds/${filename}`;
    const fullPath = path.join('public', relativePath);

    let svgContent = '';
    const cat = (t.category || '').toLowerCase();

    if (cat === 'cosmic') {
      svgContent = generateCosmic(t, seed);
    } else if (cat === 'nature') {
      svgContent = generateNature(t, seed);
    } else if (cat === 'cyberpunk') {
      svgContent = generateCyberpunk(t, seed);
    } else if (cat === 'aurora') {
      svgContent = generateAurora(t, seed);
    } else if (cat === 'lofi') {
      svgContent = generateLofi(t, seed);
    } else {
      svgContent = generateMinimal(t, seed);
    }

    fs.writeFileSync(fullPath, svgContent, 'utf8');
    t.image = relativePath;
    usedImages.add(t.image);
  }
}

console.log('All unique wallpaper files created!');
console.log('Total Themes:', themes.length);
console.log('Total Unique Images:', usedImages.size);

if (usedImages.size !== 152) {
  console.error(`ERROR: Expected 152 unique images, but got ${usedImages.size}`);
  process.exit(1);
}

// Replace THEMES in index.html with the verified 152 unique themes
const newThemesJson = JSON.stringify(themes);
const updatedHtml = htmlContent.replace(/const THEMES = \[.*?\];/s, `const THEMES = ${newThemesJson};`);
fs.writeFileSync(htmlPath, updatedHtml, 'utf8');

console.log('SUCCESS: index.html updated with 152 completely unique wallpapers!');
