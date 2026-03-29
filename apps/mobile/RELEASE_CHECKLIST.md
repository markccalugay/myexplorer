# Mobile Release Checklist

This checklist captures the current manual release expectations for MyExplorer's native mobile builds.

It is intentionally lightweight for now: the goal is to make repeat releases less error-prone before we add fuller automation.

## Android

### Before building

- confirm [`version.json`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/version.json) has the intended `marketingVersion`, `buildNumber`, and `androidVersionCode`
- run `npm run version:sync` from [`apps/mobile`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile)
- confirm `apps/mobile/android/app/keystore.properties` points at the intended release keystore
- confirm the Android Maps/runtime config values are available through `local.properties` or environment variables

### Build and archive

- build the Android release artifact from [`apps/mobile/android`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/android)
- keep the generated `.aab` or `.apk` together with any related release notes and upload metadata

### Deobfuscation mapping file handling

The current Android config in [`build.gradle`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/android/app/build.gradle) sets `enableProguardInReleaseBuilds = false`.

That means:

- the current Play Console warning about a missing deobfuscation file is expected for the present release flow
- no `mapping.txt` upload is required while release obfuscation/minification remains disabled

If we later turn R8 or ProGuard on by setting `enableProguardInReleaseBuilds = true`, treat mapping-file preservation as required release work.

Expected mapping-file location for an obfuscated Android release build:

- `apps/mobile/android/app/build/outputs/mapping/release/mapping.txt`

When obfuscation is enabled:

- preserve `mapping.txt` as a release artifact alongside the uploaded bundle
- upload the matching deobfuscation file in Play Console with the corresponding release
- treat a missing Play deobfuscation artifact as actionable rather than informational

### Play Console upload notes

- if the release was built with `enableProguardInReleaseBuilds = false`, the missing deobfuscation warning should not block the upload
- if the release was built with `enableProguardInReleaseBuilds = true`, do not finish the rollout until the matching `mapping.txt` file has been preserved and uploaded

## iOS

### Before archiving

- confirm [`version.json`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/version.json) has the intended `marketingVersion` and `buildNumber`
- run `npm run version:sync` from [`apps/mobile`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile)
- confirm the active Xcode signing/provisioning settings match the intended release target
- if pods were changed or a prior archive reported missing Hermes symbols, run `npm run pods:install` before archiving again

### Archive and retain artifacts

- archive from Xcode using the current signing/provisioning profile
- keep the generated `.xcarchive` bundle with the release notes for that build instead of throwing it away after upload
- if you need the symbol artifacts, open the `.xcarchive` package and look under `dSYMs/`

### dSYM and missing-symbol handling

The current iOS pod setup in [`apps/mobile/ios/Podfile`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/ios/Podfile) forces release builds to use `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym`.

That means:

- a release archive should include dSYM artifacts inside the generated `.xcarchive`
- the first thing to preserve for crash-symbolication follow-up is the full `.xcarchive`, not just the uploaded binary

If TestFlight or App Store Connect reports missing symbols:

- first confirm the archive came from the current source-built pod setup
- if the warning points back to the Hermes dSYM path, reinstall pods and rebuild the archive before treating it as a distribution-side problem
- if a rebuilt archive still triggers the warning, retain the archive and extract the matching files from `.xcarchive/dSYMs/` for follow-up upload or investigation

### App Store Connect upload notes

- keep TestFlight/App Store Connect warnings attached to the release notes so follow-up fixes stay visible
- treat a one-off local Hermes archive warning as a rebuild signal first
- treat a repeated missing-symbol warning from a fresh archive as actionable release follow-up that should keep the matching `.xcarchive` and dSYMs attached to the release record
