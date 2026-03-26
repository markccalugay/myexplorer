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
- Android shell scaffolding is in place, but release signing and runtime config still need to be finished
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

- release signing/provisioning for Android and iOS
- mobile runtime config wiring for Maps/native secrets
- shared-domain integration between `apps/mobile` and the extracted planner/session modules
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

To keep setup repeatable, the iOS `Podfile` forces source-based installation for React Native Core and React Native Dependencies. If pods need to be refreshed, run:

```sh
npm run pods:install
```

Open [MyExplorerMobile.xcworkspace](/Users/markccalugay/Documents/_business/The%20Still%20Foundation/Products/MyExplorer/myexplorer/apps/mobile/ios/MyExplorerMobile.xcworkspace) in Xcode after pod install completes.

## Next Steps

- connect the mobile shell to shared trip and navigation modules
- finish the mobile env/config bridge for Maps and native secrets
- extend the platform adapters with native mobile implementations
- continue implementing the durable navigation session state machine
- define Android Auto and CarPlay template/state flows against that shared foundation
