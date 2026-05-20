// One-shot : génère les splash screens iOS depuis le SVG d'icône.
// Exécution : node frontend/scripts/generate-splash.mjs
// Le résultat est commité dans frontend/public/icons/splash-*.png.
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
const svgPath = join(iconsDir, 'favicon.svg')
const svg = readFileSync(svgPath)

// Tailles standards iPhone (portrait — les variantes landscape sont swap W↔H)
// Couvre iPhone SE → iPhone 15 Pro Max.
const devices = [
  { w: 1290, h: 2796 },  // iPhone 14/15 Pro Max
  { w: 1179, h: 2556 },  // iPhone 14/15 Pro
  { w: 1170, h: 2532 },  // iPhone 12/13/14
  { w: 1125, h: 2436 },  // iPhone X/XS/11 Pro/12 mini/13 mini
  { w: 828,  h: 1792 },  // iPhone XR/11
  { w: 750,  h: 1334 }   // iPhone SE 2/3, 8, 7, 6s
]

const bg = '#f9fafb'         // identique au background_color du manifest
const iconSizeRatio = 0.32   // l'icône occupe ~32 % du plus petit côté

async function renderSplash({ w, h }, orientation) {
  const width = orientation === 'portrait' ? w : h
  const height = orientation === 'portrait' ? h : w
  const iconSize = Math.round(Math.min(width, height) * iconSizeRatio)

  const iconPng = await sharp(svg).resize(iconSize, iconSize).png().toBuffer()

  const out = await sharp({
    create: {
      width, height, channels: 4,
      background: bg
    }
  })
    .composite([{ input: iconPng, gravity: 'center' }])
    .png()
    .toBuffer()

  const filename = `splash-${width}x${height}.png`
  writeFileSync(join(iconsDir, filename), out)
  return filename
}

const generated = []
for (const d of devices) {
  generated.push(await renderSplash(d, 'portrait'))
  generated.push(await renderSplash(d, 'landscape'))
}

console.log(`Generated ${generated.length} splash screens:`)
generated.forEach(f => console.log('  -', f))
