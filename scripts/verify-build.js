#!/usr/bin/env node
/**
 * Post-build smoke check.
 *
 * A Create React App build exits 0 even when the entry module is empty or the
 * app tree is not imported anywhere — the result is a working deploy of a
 * blank page (this exact failure shipped to production once). This script
 * asserts the build actually contains the application before it is published.
 *
 * Checks:
 *   1. build/index.html exists and references a JS bundle.
 *   2. The main JS bundle exists and is larger than a minimal floor.
 *   3. A known app string is present in the bundle (the app really compiled).
 *   4. Required static files (manifest, icons, OG image) are present.
 *   5. The Firebase config env vars were actually injected (see below).
 *
 * Check 5 exists because the build also exits 0 when REACT_APP_FIREBASE_* is
 * missing: CRA simply inlines empty strings, and the deployed site then renders
 * "Missing Firebase configuration" instead of the chat. That shipped once, and
 * a green CI run is no proof the bundle is usable.
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const MIN_BUNDLE_BYTES = 50 * 1024; // 50 KB — the real app bundle is ~500 KB
const REQUIRED_FILES = ['index.html', 'manifest.json', 'favicon.ico', 'og-image.png'];
const EXPECTED_MARKERS = ['AK-CHAT'];

/**
 * Every one of these must survive bundling with a real value. CRA replaces
 * `process.env.REACT_APP_FOO` at build time, so an unset variable shows up in
 * the bundle as the literal name with an empty string.
 */
const REQUIRED_CONFIG_VARS = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
];

const errors = [];

function fail(message) {
  errors.push(message);
}

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error('✖ build/ not found. Run `npm run build` first.');
  process.exit(1);
}

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(BUILD_DIR, file))) {
    fail(`Missing build output: ${file}`);
  }
}

const htmlPath = path.join(BUILD_DIR, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/src="\/static\/js\/main\.[^"]+\.js"/);

  if (!scriptMatch) {
    fail('index.html does not reference a main JS bundle.');
  } else {
    const bundlePath = path.join(BUILD_DIR, scriptMatch[0].replace(/^src="/, '').replace(/"$/, ''));

    if (!fs.existsSync(bundlePath)) {
      fail(`Referenced bundle is missing on disk: ${bundlePath}`);
    } else {
      const size = fs.statSync(bundlePath).size;
      console.log(`• main bundle: ${(size / 1024).toFixed(1)} KB`);

      if (size < MIN_BUNDLE_BYTES) {
        fail(
          `Main bundle is only ${size} bytes (< ${MIN_BUNDLE_BYTES}). ` +
            'This usually means the entry module is empty or the app is not imported.'
        );
      }

      const source = fs.readFileSync(bundlePath, 'utf8');
      for (const marker of EXPECTED_MARKERS) {
        if (!source.includes(marker)) {
          fail(
            `Main bundle does not contain the marker "${marker}" — the app may not have compiled.`
          );
        }
      }

      // The app reads these via process.env and refuses to start when any is
      // empty. An unset var compiles to `NAME:""`, which is exactly how a
      // missing-secret build reaches production.
      const missingConfig = REQUIRED_CONFIG_VARS.filter(
        (name) => !new RegExp(`${name}:"[^"]+"`).test(source)
      );
      if (missingConfig.length > 0) {
        fail(
          `Firebase config was not injected into the bundle for: ${missingConfig.join(', ')}. ` +
            'The app would render "Missing Firebase configuration" instead of the chat. ' +
            'Locally: is .env present with these keys? In CI: are the matching GitHub secrets set ' +
            '(gh secret list)?'
        );
      } else {
        console.log(`• firebase config injected: ${REQUIRED_CONFIG_VARS.length} vars`);
      }
    }
  }
}

const cssDir = path.join(BUILD_DIR, 'static', 'css');
const cssFiles = readDirSafe(cssDir);
if (cssFiles.length === 0) {
  fail('No CSS emitted — the app would render unstyled.');
}

if (errors.length > 0) {
  console.error('\n✖ Build verification failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('✔ Build output verified: index.html, bundle, styles and assets are present.');
