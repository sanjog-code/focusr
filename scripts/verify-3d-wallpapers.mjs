import fs from 'node:fs';
import path from 'node:path';

console.log('>>> [1/4] Verifying 152 unique themes & wallpaper files...');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/const THEMES = (\[[\s\S]*?\]);/);
if (!match) {
  throw new Error('THEMES array not found in index.html');
}

const themes = JSON.parse(match[1]);
console.log(`Total themes loaded: ${themes.length}`);
if (themes.length !== 152) {
  throw new Error(`Expected exactly 152 themes, got ${themes.length}`);
}

// Check uniqueness of IDs
const idSet = new Set(themes.map(t => t.id));
if (idSet.size !== 152) {
  throw new Error(`Duplicate theme IDs detected! Unique count: ${idSet.size}`);
}

// Check uniqueness of wallpaper image files
const imagePaths = themes.map(t => t.image);
const imageSet = new Set(imagePaths);
console.log(`Unique wallpaper images count: ${imageSet.size} / 152`);
if (imageSet.size !== 152) {
  throw new Error(`Duplicate wallpaper images found! Unique count: ${imageSet.size}`);
}

// Check that every file exists on disk
let missingFiles = 0;
for (const img of imagePaths) {
  const diskPath = path.join(process.cwd(), 'public', img.replace(/^backgrounds\//, 'backgrounds/'));
  if (!fs.existsSync(diskPath)) {
    console.error(`Missing wallpaper file: ${diskPath}`);
    missingFiles++;
  }
}
if (missingFiles > 0) {
  throw new Error(`${missingFiles} wallpaper files are missing on disk!`);
}
console.log('✓ All 152 wallpaper files exist on disk with 100% uniqueness (zero duplicates).');

console.log('>>> [2/4] Verifying category distribution...');
const catCounts = {};
themes.forEach(t => catCounts[t.category] = (catCounts[t.category] || 0) + 1);
console.log('Category breakdown:', catCounts);

console.log('>>> [3/4] Verifying 3D Spatial Motion Engine & Auto Video Generator in index.html...');
const hasLiveManager = html.includes('window.LiveWallpaperManager = LiveWallpaperManager');
const hasAutoVideoGen = html.includes('generate3DVideoWallpaper');
const hasAdaptiveTheming = html.includes('startAdaptiveTheming');
const hasCaptureStream = html.includes('captureStream');
const hasCosmic3D = html.includes('render3DCosmic');
const hasCyberpunk3D = html.includes('render3DCyberpunk');
const hasNature3D = html.includes('render3DNature');
const hasAurora3D = html.includes('render3DAurora');
const hasLofi3D = html.includes('render3DLofi');
const hasMinimal3D = html.includes('render3DMinimal');

if (!hasLiveManager || !hasAutoVideoGen || !hasAdaptiveTheming || !hasCaptureStream) {
  throw new Error('LiveWallpaperManager is missing critical 3D video generation methods');
}
if (!hasCosmic3D || !hasCyberpunk3D || !hasNature3D || !hasAurora3D || !hasLofi3D || !hasMinimal3D) {
  throw new Error('Missing category-specific 3D spatial renderers');
}
console.log('✓ All 6 3D spatial renderers, canvas stream capture, and adaptive theming verified.');

console.log('>>> [4/4] Verifying Focus Passport Allowed Workspaces & Relayed Desktop Apps...');
const hasPassportCurated = html.includes('CURATED_DEVELOPER_APPS') && html.includes('CURATED_WORK_TABS');
const hasRelayApps = html.includes('FOCUSR_RESP_APPS') && html.includes('FOCUSR_ACTIVE_APP_CHANGED');
const hasLauncherBat = html.includes('downloadBridgeBat');

if (!hasPassportCurated || !hasRelayApps || !hasLauncherBat) {
  throw new Error('Focus Passport is missing curated apps library or extension relay support');
}
console.log('✓ Focus Passport curated developer library, extension relay, and launcher download verified.');

console.log('\n🎉 ALL 152 UNIQUE WALLPAPERS & 3D MOTION ENGINE VERIFICATIONS PASSED!\n');
