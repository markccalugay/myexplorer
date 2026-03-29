# MyExplorer Mobile

This directory contains the first React Native host for MyExplorer.

Current identifiers:

- iOS bundle ID: `com.thestillfoundation.myexplorer`
- Android application ID: `com.thestillfoundation.myexplorer`

## Current Scope

This is a native shell foundation only.

It is intended to unblock:

- iOS shell work
- Android shell work
- shared session and platform-adapter work
- future Android Auto and CarPlay implementation

It is not yet wired to shared trip modules or a full mobile navigation experience.

Current readiness:

- iOS shell scaffolding is in place and can be archived locally
- iOS now includes a native CarPlay scene scaffold, but it is still waiting on entitlement approval and shared-session wiring
- Android shell scaffolding is in place, and the repo now includes a defined runtime-config plus release-signing path
- shared planner/session foundations are now being extracted in the main app
- Android Auto and CarPlay are not implemented yet

## Build Requirements

Before treating this repo as mobile-build ready, make sure the local machine has:

- Xcode and CocoaPods for iOS
- Android Studio plus a working Android SDK for Android
- Node `>= 22.11.0`
- a local mobile env/config path for Maps and other native secrets once those adapters are wired

## Native Metadata

- Display name: `MyExplorer`
- iOS bundle ID: `com.thestillfoundation.myexplorer`
- Android application ID: `com.thestillfoundation.myexplorer`
- iOS location permission copy is set for trip-origin and navigation restore use
- Android location permissions are declared for future planner/navigation use
- Android release builds can read a Google Maps API key from `local.properties` or `MYEXPLORER_MAPS_API_KEY`
- Android release signing can read `apps/mobile/android/app/keystore.properties`

## Native Runtime Config

Android runtime config is now defined through `apps/mobile/android/app/build.gradle`.

The Android app resolves native config in this order:

1. `apps/mobile/android/local.properties`
2. process environment variables

Current keys:

- `myexplorer.mapsApiKey` or `MYEXPLORER_MAPS_API_KEY`
- `myexplorer.mapsApiBaseUrl` or `MYEXPLORER_MAPS_API_BASE_URL`

## Mobile Routing Proxy

The React Native planner now has a mobile-side routing contract and automatic refresh lifecycle, but this repo still does **not** contain the real backend proxy service yet.

Current in-repo behavior:

- the phone app expects a routing proxy URL in `apps/mobile/app.json` as `routingProxyUrl`
- if `routingProxyUrl` is blank, the planner stays usable but route refresh remains unavailable and the app shows a configuration warning
- when `routingProxyUrl` is set, the phone app automatically posts structural trip changes to `POST /routes/compute`
- the app persists the last known normalized route payload locally so resumed trips can reopen with route context

See [`docs/mobile-routing-proxy-contract.md`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/docs/mobile-routing-proxy-contract.md) for the current request/response contract the future backend should satisfy.

Use [`local.properties.example`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/android/local.properties.example) as the starting point for local Android setup. The values are exposed to Android native code through `BuildConfig`.

For Android native map SDK setup, the Maps API key is also exposed through Android manifest metadata `com.google.android.geo.API_KEY`.

## Android Release Signing

Android release signing is now defined through `apps/mobile/android/app/keystore.properties`.

1. Copy [keystore.properties.example](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/android/app/keystore.properties.example) to `apps/mobile/android/app/keystore.properties`
2. Set `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`
3. Place the release keystore file at the matching `storeFile` path

If `keystore.properties` is absent, the repo falls back to the debug keystore so local release-style builds can still run while true release signing is being set up.

## Android Play Release Notes

The Android release build currently keeps `enableProguardInReleaseBuilds = false` in `apps/mobile/android/app/build.gradle`.

That means:

- release builds are currently signed, but not minified or obfuscated by R8/ProGuard
- Google Play's warning about a missing deobfuscation file is expected for the current setup
- no `mapping.txt` file is generated while obfuscation stays disabled

If Android release obfuscation is enabled later:

- build the release artifact first
- preserve `apps/mobile/android/app/build/outputs/mapping/release/mapping.txt`
- upload that `mapping.txt` file alongside the corresponding App Bundle in Play Console
- keep the mapping file with the same release artifacts so crash and ANR traces remain symbolicated

Small release checklist for Android:

1. Sync the intended mobile version with `npm run version:sync` or `npm run version:set`.
2. Confirm `apps/mobile/android/app/keystore.properties` points at the intended release keystore.
3. Build the signed Android release artifact.
4. If `enableProguardInReleaseBuilds` is still `false`, treat the Play deobfuscation warning as informational.
5. If `enableProguardInReleaseBuilds` is `true`, retain and upload `app/build/outputs/mapping/release/mapping.txt` for that exact release.

## Versioning

Mobile native versions now use [`version.json`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/version.json) as the source of truth.

Useful commands from [`apps/mobile`](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile):

```sh
npm run version:sync
```

This syncs the current values in `version.json` into:

- iOS `MARKETING_VERSION`
- iOS `CURRENT_PROJECT_VERSION`
- Android `versionName`
- Android `versionCode`

To set a new release version and sync it in one step:

```sh
npm run version:set -- 1.0.1 2
```

Optional:

```sh
npm run version:set -- 1.0.1 2 42
```

The third argument lets Android use a different `versionCode` if you ever need it. If omitted, Android uses the same integer as the iOS build number.

## Current Gaps

The following still need to be completed before the mobile shell issue can close:

- final release signing/provisioning verification for Android and iOS
- iOS-native runtime config wiring for Maps/native secrets
- shared-domain integration between `apps/mobile` and the extracted planner/session modules
- CarPlay entitlement approval plus native scene-to-session integration
- real device/build verification for Android in this repo
- versioning/release policy for web and mobile builds

## Local Development

From [apps/mobile](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile):

```sh
npm start
```

In a second terminal:

```sh
npm run ios
```

or:

```sh
npm run android
```

## CocoaPods Note

This repo currently lives in a filesystem path with spaces, which breaks React Native's prebuilt pod artifact resolution on this machine.

To keep setup repeatable, the iOS `Podfile` forces source-based installation for React Native Core and React Native Dependencies. It also forces Hermes to build from source so iOS archives can include Hermes debug symbols instead of depending on a missing prebuilt `hermesvm.framework` dSYM.

If pods need to be refreshed, run:

```sh
npm run pods:install
```

Open [MyExplorerMobile.xcworkspace](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/ios/MyExplorerMobile.xcworkspace) in Xcode after pod install completes.

If a TestFlight archive reports a missing Hermes dSYM warning, reinstall pods and rebuild the archive so Xcode picks up the source-built Hermes framework and refreshed symbol settings.

## Next Steps

- connect the mobile shell to shared trip and navigation modules
- finish the mobile env/config bridge for Maps and native secrets
- extend the platform adapters with native mobile implementations
- continue implementing the durable navigation session state machine
- keep extending the CarPlay scene scaffold into a real navigation-first template flow
- define Android Auto and CarPlay template/state flows against that shared foundation
