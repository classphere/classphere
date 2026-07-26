#!/usr/bin/env node
/**
 * generate-android-icons.js
 *
 * Takes apps/web/public/logoC.png and generates all required
 * Android mipmap icon sizes into the correct res directories.
 *
 * Run once:
 *   node scripts/generate-android-icons.js
 *
 * Requires: sharp  (npm install --save-dev sharp)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_ICON = path.join(ROOT, "public", "logoC.png");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");

// Android mipmap sizes (px) for each density bucket
const MIPMAP_SIZES = [
  { dir: "mipmap-mdpi",    size: 48  },
  { dir: "mipmap-hdpi",    size: 72  },
  { dir: "mipmap-xhdpi",   size: 96  },
  { dir: "mipmap-xxhdpi",  size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

// Adaptive icon foreground sizes (with 25% safe-zone padding built in)
const ADAPTIVE_SIZES = [
  { dir: "mipmap-mdpi",    size: 54  },
  { dir: "mipmap-hdpi",    size: 81  },
  { dir: "mipmap-xhdpi",   size: 108 },
  { dir: "mipmap-xxhdpi",  size: 162 },
  { dir: "mipmap-xxxhdpi", size: 216 },
];

// Splash screen dimensions (width × height in px) for each screen density
const SPLASH_SIZES = [
  { dir: "drawable",              w: 1080, h: 1920 }, // default fallback
  { dir: "drawable-port-mdpi",    w: 320,  h: 480  },
  { dir: "drawable-port-hdpi",    w: 480,  h: 800  },
  { dir: "drawable-port-xhdpi",   w: 720,  h: 1280 },
  { dir: "drawable-port-xxhdpi",  w: 1080, h: 1920 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 2400 },
  { dir: "drawable-land-mdpi",    w: 480,  h: 320  },
  { dir: "drawable-land-hdpi",    w: 800,  h: 480  },
  { dir: "drawable-land-xhdpi",   w: 1280, h: 720  },
  { dir: "drawable-land-xxhdpi",  w: 1920, h: 1080 },
  { dir: "drawable-land-xxxhdpi", w: 2400, h: 1280 },
];

async function main() {
  // Lazy-require sharp so the error message is clear if it's missing
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("\n❌  'sharp' is not installed. Run:");
    console.error("    npm install --save-dev sharp\n");
    process.exit(1);
  }

  if (!fs.existsSync(SRC_ICON)) {
    console.error(`\n❌  Source icon not found: ${SRC_ICON}\n`);
    process.exit(1);
  }

  console.log(`\n🎨  Generating Android icons from: public/logoC.png\n`);

  // ── Legacy launcher icons (ic_launcher.png) ──────────────────────────────
  for (const { dir, size } of MIPMAP_SIZES) {
    const dest = path.join(RES, dir, "ic_launcher.png");
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    // Add a white background so the transparent logo looks good on any launcher
    await sharp(SRC_ICON)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(dest);

    console.log(`  ✅  ${dir}/ic_launcher.png  (${size}×${size})`);
  }

  // ── Round launcher icons (ic_launcher_round.png) ─────────────────────────
  for (const { dir, size } of MIPMAP_SIZES) {
    const dest = path.join(RES, dir, "ic_launcher_round.png");

    // Same as regular but with a circular crop mask
    const circle = Buffer.from(
      `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
    );

    await sharp(SRC_ICON)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .composite([{ input: circle, blend: "dest-in" }])
      .png()
      .toFile(dest);

    console.log(`  ✅  ${dir}/ic_launcher_round.png  (${size}×${size})`);
  }

  // ── Adaptive icon foreground (ic_launcher_foreground.png) ────────────────
  for (const { dir, size } of ADAPTIVE_SIZES) {
    const dest = path.join(RES, dir, "ic_launcher_foreground.png");
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    // Foreground: logo on transparent background with safe-zone padding
    const padding = Math.round(size * 0.125); // ~12.5% each side = 25% total
    const logoSize = size - padding * 2;

    await sharp(SRC_ICON)
      .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: padding, bottom: padding, left: padding, right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(dest);

    console.log(`  ✅  ${dir}/ic_launcher_foreground.png  (${size}×${size})`);
  }

  // ── Adaptive icon XML (mipmap-anydpi-v26) ────────────────────────────────
  const anydpiDir = path.join(RES, "mipmap-anydpi-v26");
  fs.mkdirSync(anydpiDir, { recursive: true });

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher.xml"), adaptiveXml);
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher_round.xml"), adaptiveXml);
  console.log(`  ✅  mipmap-anydpi-v26/ic_launcher.xml`);

  // ── Adaptive icon background color ───────────────────────────────────────
  const valuesDir = path.join(RES, "values");
  const colorsPath = path.join(valuesDir, "colors.xml");

  // Preserve existing colors.xml if present, otherwise create it
  let colorsXml = fs.existsSync(colorsPath)
    ? fs.readFileSync(colorsPath, "utf8")
    : `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>`;

  if (!colorsXml.includes("ic_launcher_background")) {
    colorsXml = colorsXml.replace(
      "</resources>",
      `    <!-- App icon background color (white — logo is orange) -->\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>`
    );
    fs.writeFileSync(colorsPath, colorsXml);
    console.log(`  ✅  values/colors.xml → added ic_launcher_background (#FFFFFF)`);
  }

  // ── Branded Splash Screens (splash.png) ──────────────────────────────────
  console.log(`\n🌊  Generating branded splash screens...\n`);
  for (const { dir, w, h } of SPLASH_SIZES) {
    const dest = path.join(RES, dir, "splash.png");
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    // Center logo at ~35% of the shorter dimension
    const minDim = Math.min(w, h);
    const logoSize = Math.round(minDim * 0.35);

    const logoBuf = await sharp(SRC_ICON)
      .resize(logoSize, logoSize, { fit: "contain" })
      .toBuffer();

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(dest);

    console.log(`  ✅  ${dir}/splash.png  (${w}×${h})`);
  }

  console.log(`\n✅  All Android icons and splash screens generated!\n`);
  console.log(`    Rebuild the APK in Android Studio to see the new icons & splash screen.\n`);
}


main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
