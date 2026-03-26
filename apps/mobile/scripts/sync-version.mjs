import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.resolve(scriptDir, '..');
const versionFilePath = path.join(mobileDir, 'version.json');
const iosProjectPath = path.join(mobileDir, 'ios', 'MyExplorerMobile.xcodeproj', 'project.pbxproj');
const androidGradlePath = path.join(mobileDir, 'android', 'app', 'build.gradle');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const loadVersionConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
  } catch (error) {
    fail(`Failed to read ${versionFilePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const saveVersionConfig = (config) => {
  fs.writeFileSync(versionFilePath, `${JSON.stringify(config, null, 2)}\n`);
};

const replaceOrFail = (content, pattern, replacement, label) => {
  if (!pattern.test(content)) {
    fail(`Could not find ${label} to update.`);
  }

  return content.replace(pattern, replacement);
};

const syncNativeVersions = (config) => {
  const iosProject = fs.readFileSync(iosProjectPath, 'utf8');
  let nextIosProject = replaceOrFail(
    iosProject,
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${config.buildNumber};`,
    'CURRENT_PROJECT_VERSION'
  );
  nextIosProject = replaceOrFail(
    nextIosProject,
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${config.marketingVersion};`,
    'MARKETING_VERSION'
  );
  fs.writeFileSync(iosProjectPath, nextIosProject);

  const androidGradle = fs.readFileSync(androidGradlePath, 'utf8');
  let nextAndroidGradle = replaceOrFail(
    androidGradle,
    /versionCode \d+/,
    `versionCode ${config.androidVersionCode}`,
    'versionCode'
  );
  nextAndroidGradle = replaceOrFail(
    nextAndroidGradle,
    /versionName "[^"]+"/,
    `versionName "${config.marketingVersion}"`,
    'versionName'
  );
  fs.writeFileSync(androidGradlePath, nextAndroidGradle);
};

const printSummary = (config) => {
  console.log(`Synced mobile versions:
- marketingVersion: ${config.marketingVersion}
- buildNumber: ${config.buildNumber}
- androidVersionCode: ${config.androidVersionCode}`);
};

const args = process.argv.slice(2);
const command = args[0] ?? 'sync';
const versionConfig = loadVersionConfig();

if (command === 'set') {
  const marketingVersion = args[1];
  const buildNumberArg = args[2];
  const androidVersionCodeArg = args[3];

  if (!marketingVersion || !buildNumberArg) {
    fail('Usage: node scripts/sync-version.mjs set <marketingVersion> <buildNumber> [androidVersionCode]');
  }

  const buildNumber = Number.parseInt(buildNumberArg, 10);
  const androidVersionCode = Number.parseInt(androidVersionCodeArg ?? buildNumberArg, 10);

  if (!Number.isInteger(buildNumber) || buildNumber <= 0) {
    fail('buildNumber must be a positive integer.');
  }

  if (!Number.isInteger(androidVersionCode) || androidVersionCode <= 0) {
    fail('androidVersionCode must be a positive integer.');
  }

  versionConfig.marketingVersion = marketingVersion;
  versionConfig.buildNumber = buildNumber;
  versionConfig.androidVersionCode = androidVersionCode;
  saveVersionConfig(versionConfig);
}

if (command !== 'sync' && command !== 'set') {
  fail('Usage: node scripts/sync-version.mjs [sync] | set <marketingVersion> <buildNumber> [androidVersionCode]');
}

syncNativeVersions(versionConfig);
printSummary(versionConfig);
