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

- confirm the synced version/build values before archiving
- archive from Xcode using the current signing/provisioning profile
- keep TestFlight/App Store Connect warnings attached to the release notes so follow-up fixes stay visible
