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
- introduce platform adapters for storage, location, geocoding, and routing
- implement the durable navigation session state machine
- define Android Auto and CarPlay template/state flows against that shared foundation
