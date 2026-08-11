#!/usr/bin/env node
/**
 * build-institute-apps.js
 *
 * Builds a separate Android APK for each institute in institutes.json.
 * Each APK has the institute's domain baked in and its own package ID.
 *
 * Usage:
 *   node scripts/build-institute-apps.js                      # build ALL institutes
 *   node scripts/build-institute-apps.js --slug test          # build ONE institute
 *   node scripts/build-institute-apps.js --slug test --config-only  # write configs only (then build in Android Studio)
 *   node scripts/build-institute-apps.js --list               # list all institutes
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const ANDROID = path.join(ROOT, "android");
const INSTITUTE_SRC = path.join(ANDROID, "app", "src", "institute");
const INSTITUTE_ASSETS = path.join(INSTITUTE_SRC, "assets");
const INSTITUTE_RES = path.join(INSTITUTE_SRC, "res", "values");
const APK_BUILD_OUTPUT = path.join(ANDROID, "app", "build", "outputs", "apk", "institute", "release");
const APK_BUILD_DEBUG = path.join(ANDROID, "app", "build", "outputs", "apk", "institute", "debug");
const DIST = path.join(ROOT, "dist", "apks");
const INSTITUTES_JSON = path.join(ROOT, "institutes.json");
const BASE_GOOGLE_SERVICES = path.join(ANDROID, "app", "google-services.json");
const GRADLEW = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let targetSlug = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--slug" && i + 1 < args.length) {
    if (!args[i + 1].startsWith("--")) {
      targetSlug = args[i + 1];
    }
  } else if (!args[i].startsWith("--") && i > 0 && args[i - 1] === "--slug") {
    targetSlug = args[i];
  } else if (!args[i].startsWith("--") && !targetSlug) {
    targetSlug = args[i];
  }
}
const listOnly = args.includes("--list");
const configOnly = args.includes("--config-only"); // just write files, skip Gradle


// ─── Load config ──────────────────────────────────────────────────────────────
const { institutes } = JSON.parse(fs.readFileSync(INSTITUTES_JSON, "utf8"));
const baseGoogleServices = JSON.parse(fs.readFileSync(BASE_GOOGLE_SERVICES, "utf8"));

if (listOnly) {
  console.log("\n📋 Institutes configured:\n");
  institutes.forEach((inst) => {
    console.log(`  • ${inst.slug.padEnd(20)} ${inst.domain.padEnd(40)} ${inst.packageId}`);
  });
  console.log();
  process.exit(0);
}

const targets = targetSlug
  ? institutes.filter((i) => i.slug === targetSlug)
  : institutes;

if (targets.length === 0) {
  console.error(`❌  No institute found with slug "${targetSlug}"`);
  console.error(`    Run with --list to see available institutes.`);
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeCapacitorConfig(institute) {
  ensureDir(INSTITUTE_ASSETS);
  const config = {
    appId: institute.packageId,
    appName: institute.name,
    webDir: "mobile-shell",
    server: {
      url: `https://${institute.domain}`,
      cleartext: false,
    },
    plugins: {
      PushNotifications: {
        presentationOptions: ["badge", "sound", "alert"],
      },
    },
  };
  fs.writeFileSync(
    path.join(INSTITUTE_ASSETS, "capacitor.config.json"),
    JSON.stringify(config, null, "\t"),
    "utf8"
  );
  console.log(`  ✅  capacitor.config.json → https://${institute.domain}`);
}

function writeStringsXml(institute) {
  ensureDir(INSTITUTE_RES);
  const xml = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">${institute.name}</string>
    <string name="title_activity_main">${institute.name}</string>
    <string name="package_name">${institute.packageId}</string>
    <string name="custom_url_scheme">${institute.packageId}</string>
</resources>
`;
  fs.writeFileSync(path.join(INSTITUTE_RES, "strings.xml"), xml, "utf8");
  console.log(`  ✅  strings.xml → "${institute.name}" / ${institute.packageId}`);
}

function writeGoogleServices(institute) {
  // Clone the base google-services.json and patch the package name.
  // For proper FCM push per institute, register each packageId in Firebase Console
  // and replace this file with the downloaded google-services.json.
  const patched = JSON.parse(JSON.stringify(baseGoogleServices));
  patched.client = patched.client.map((client) => ({
    ...client,
    client_info: {
      ...client.client_info,
      android_client_info: {
        package_name: institute.packageId,
      },
    },
  }));

  fs.writeFileSync(
    path.join(INSTITUTE_SRC, "google-services.json"),
    JSON.stringify(patched, null, "  "),
    "utf8"
  );
  console.log(`  ✅  google-services.json → ${institute.packageId}`);
}

function writeGradleProperties(institute) {
  const gradlePropsPath = path.join(ANDROID, "gradle.properties");
  let content = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, "utf8") : "";
  if (content.includes("instituteAppId=")) {
    content = content.replace(/instituteAppId=.*/g, `instituteAppId=${institute.packageId}`);
  } else {
    content += `\ninstituteAppId=${institute.packageId}\n`;
  }
  fs.writeFileSync(gradlePropsPath, content, "utf8");
  console.log(`  ✅  gradle.properties → instituteAppId=${institute.packageId}`);
}


function generateIconsForInstitute(institute) {
  const possiblePaths = [
    institute.logoPath ? path.resolve(ROOT, institute.logoPath) : null,
    path.join(ROOT, "public", "logos", `${institute.slug}.png`),
    path.join(ROOT, "public", "logos", `${institute.slug}.jpg`),
    path.join(ROOT, "public", `${institute.slug}-logo.png`),
    path.join(ROOT, "public", `${institute.slug}-logo.jpg`),
    path.join(ROOT, "public", "logo.png"),
    path.join(ROOT, "public", "logoC.png"),
  ].filter(Boolean);

  const chosenLogo = possiblePaths.find((p) => fs.existsSync(p));
  if (chosenLogo) {
    console.log(`  🎨  Generating launcher icons & splash from: ${path.relative(ROOT, chosenLogo)}`);
    const scriptPath = path.join(ROOT, "scripts", "generate-android-icons.js");
    const instResDir = path.join(INSTITUTE_SRC, "res");
    try {
      execSync(`node "${scriptPath}" --src "${chosenLogo}" --dest "${instResDir}"`, { cwd: ROOT, stdio: "inherit" });
      console.log(`  ✅  Custom icons generated for ${institute.slug}`);
    } catch (err) {
      console.warn(`  ⚠️  Icon generation warning: ${err.message}`);
    }
  }
}


function runGradleBuild(institute, debug = false) {
  const task = debug ? "assembleInstituteDebug" : "assembleInstituteRelease";
  const cmd = [GRADLEW, task, `-PinstituteAppId=${institute.packageId}`].join(" ");
  console.log(`  🔨  Running: ${cmd}`);
  execSync(cmd, { cwd: ANDROID, stdio: "inherit" });
}

function copyApk(institute, debug = false) {
  ensureDir(DIST);
  const outDir = debug ? APK_BUILD_DEBUG : APK_BUILD_OUTPUT;
  const candidates = debug
    ? [`app-institute-debug.apk`]
    : [`app-institute-release.apk`, `app-institute-release-unsigned.apk`];

  let src = null;
  for (const name of candidates) {
    const p = path.join(outDir, name);
    if (fs.existsSync(p)) { src = p; break; }
  }

  if (!src) {
    console.warn(`  ⚠️  APK not found in ${outDir} — check Gradle output`);
    return;
  }

  const suffix = debug ? "debug" : institute.versionName;
  const dest = path.join(DIST, `${institute.slug}-${suffix}.apk`);
  fs.copyFileSync(src, dest);
  console.log(`  📦  APK saved → dist/apks/${path.basename(dest)}`);
}

// ─── Build loop ───────────────────────────────────────────────────────────────
const mode = configOnly ? "config files only (open Android Studio to build)" : "full APK build";
console.log(`\n🚀  Processing ${targets.length} institute(s) — ${mode}...\n`);

for (const institute of targets) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Institute : ${institute.name}`);
  console.log(`  Domain    : ${institute.domain}`);
  console.log(`  Package   : ${institute.packageId}`);
  console.log(`  Version   : ${institute.versionName} (${institute.versionCode})`);
  console.log(`${"─".repeat(60)}\n`);

  try {
    writeCapacitorConfig(institute);
    writeStringsXml(institute);
    writeGoogleServices(institute);
    writeGradleProperties(institute);
    generateIconsForInstitute(institute);



    if (configOnly) {
      console.log(`\n  ✅  Config files written for ${institute.slug}.`);
      console.log(`      Open Android Studio → select "instituteDebug" or "instituteRelease" → Build APK\n`);
      continue;
    }

    runGradleBuild(institute);
    copyApk(institute);
    console.log(`\n  ✅  ${institute.slug} build complete!\n`);
  } catch (err) {
    console.error(`\n  ❌  Build failed for ${institute.slug}:`);
    console.error(`  ${err.message}\n`);
    process.exit(1);
  }
}

console.log(
  configOnly
    ? `\n✅  Config files ready. Open Android Studio to build the APK(s).\n`
    : `\n✅  All builds complete. APKs in: apps/web/dist/apks/\n`
);
