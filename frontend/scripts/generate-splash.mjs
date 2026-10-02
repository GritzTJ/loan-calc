// One-shot : génère les icônes PNG et les splash screens iOS depuis le SVG d'icône.
// Exécution : npm i --no-save sharp && node scripts/generate-splash.mjs   (depuis frontend/)
// Le résultat est commité dans frontend/public/icons/. À relancer si favicon.svg change.
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
const svgPath = join(iconsDir, 'favicon.svg')
const svgSource = readFileSync(svgPath, 'utf8')
const svg = Buffer.from(svgSource)

// --- Icônes ---

// Variante plein cadre : fond sans coins arrondis, motif réduit autour du centre.
// Android (maskable) et iOS (apple-touch-icon) appliquent leur propre masque : les coins
// transparents de favicon.svg y laisseraient des angles noirs, et un motif trop grand serait rogné.
function fullBleedSvg(glyphScale) {
  const [, background, glyph] = svgSource.match(/(<rect[^>]*>)([\s\S]*)<\/svg>/)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    background.replace(/rx="\d+"/, 'rx="0"') +
    `<g transform="translate(256 256) scale(${glyphScale}) translate(-256 -256)">${glyph}</g>` +
    `</svg>`
  )
}

const icons = [
  { file: 'icon-192.png', size: 192, source: svg },
  { file: 'icon-512.png', size: 512, source: svg },
  { file: 'icon-512-maskable.png', size: 512, source: fullBleedSvg(0.62) }, // zone sûre maskable : 80 % centraux
  { file: 'apple-touch-icon.png', size: 180, source: fullBleedSvg(0.85) }
]

for (const { file, size, source } of icons) {
  const png = await sharp(source).resize(size, size).png().toBuffer()
  writeFileSync(join(iconsDir, file), png)
}
console.log(`Generated ${icons.length} icons:`)
icons.forEach(icon => console.log('  -', icon.file))

// --- Splash screens iOS ---

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

const bg = '#f4f6f7'         // identique au background_color du manifest
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
