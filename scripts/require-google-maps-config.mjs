import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2] ?? 'doctor';
const cwd = process.cwd();

const LOCAL_ENV_FILES = [
  '.env.local',
  '.env',
];

const trimQuotes = (value) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const parseEnvFile = (filename) => {
  const fullPath = path.join(cwd, filename);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const values = {};
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = trimQuotes(line.slice(separatorIndex + 1));
    values[key] = value;
  }

  return { filename, values };
};

const envSources = LOCAL_ENV_FILES
  .map(parseEnvFile)
  .filter(Boolean);

const getValue = (key) => {
  const processValue = process.env[key]?.trim();
  if (processValue) {
    return { source: 'process.env', value: processValue };
  }

  for (const source of envSources) {
    const fileValue = source.values[key]?.trim();
    if (fileValue) {
      return { source: source.filename, value: fileValue };
    }
  }

  return { source: null, value: '' };
};

const mapsKey = getValue('VITE_GOOGLE_MAPS_API_KEY');
const mapId = getValue('VITE_GOOGLE_MAPS_MAP_ID');
const isCi = process.env.CI === 'true';

const prefix = `[maps-config:${mode}]`;
const canonicalLocalSetup = 'Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_MAPS_API_KEY`, and restart the Vite server.';

if (!mapsKey.value) {
  console.error(`${prefix} Missing VITE_GOOGLE_MAPS_API_KEY.`);
  console.error(`${prefix} ${canonicalLocalSetup}`);
  console.error(`${prefix} You can also run \`npm run maps:doctor\` after updating the file.`);
  process.exit(1);
}

if (!isCi && mapsKey.source === '.env') {
  console.warn(`${prefix} Using VITE_GOOGLE_MAPS_API_KEY from .env.`);
  console.warn(`${prefix} For stable local development, move this key to .env.local so the setup matches the documented contract.`);
}

if (!mapsKey.value.startsWith('AIza')) {
  console.warn(`${prefix} The configured Maps key does not look like a standard browser Google Maps API key.`);
}

console.log(`${prefix} Google Maps API key detected from ${mapsKey.source}.`);
if (mapId.value) {
  console.log(`${prefix} Optional VITE_GOOGLE_MAPS_MAP_ID detected from ${mapId.source}.`);
} else {
  console.log(`${prefix} No VITE_GOOGLE_MAPS_MAP_ID configured; the app will continue without a custom map ID.`);
}

if (mode === 'doctor') {
  console.log(`${prefix} Canonical local setup: ${canonicalLocalSetup}`);
  if (isCi) {
    console.log(`${prefix} CI mode detected. Placeholder or secret-injected keys are acceptable for build verification.`);
  } else {
    console.log(`${prefix} If Maps still appear unavailable after updating env, fully restart the Vite dev server so it reloads env values.`);
  }
}
