# Android Next Pass

## Completed In This Pass

- Chose `React Native` as the recommended mobile host path in `MOBILE_HOST_STRATEGY.md`
- Defined the Android and phone-to-car navigation session model in `ANDROID_NAV_SESSION_MODEL.md`
- Added `src/lib/navigationSession.ts` and `src/lib/navigationSession.test.ts` as the first coded session baseline
- Extracted shared trip lifecycle helpers into `src/lib/tripDocument.ts`
- Extracted shared stop and journey-field helpers into `src/lib/stopSequence.ts`
- Updated `src/App.tsx` and `src/components/TripPlanner.tsx` to consume those shared helpers
- Added new tests for the extracted modules
- Updated GitHub issues `#24`, `#25`, `#26`, `#27`, and `#28` with progress notes
- Bootstrapped the first React Native native host under `apps/mobile`
- Wired the iOS bundle ID and Android application ID to `com.thestillfoundation.myexplorer`
- Added a minimal branded MyExplorer native shell screen and mobile setup docs
- Made iOS pod installation repeatable through the `apps/mobile` package scripts and Podfile configuration

## Verified Before Handoff

- `npm test` passed
- `npm run build` passed
- `npm run lint` returned only the existing warning in `src/components/Map.tsx`
- `apps/mobile` React Native test suite passed
- `apps/mobile` pod install completed successfully

## Recommended Next Steps

1. Extract the next planner-heavy orchestration layers out of `TripPlanner.tsx`
   Focus on journey recalculation and auto-pitstop orchestration, not just small helper functions.

2. Introduce platform boundaries for storage, location, and geocoding
   Add interfaces for trip persistence, device location, and geocoding so the web app stops depending directly on browser-only APIs like `localStorage` and `navigator.geolocation`.

3. Turn the navigation-session note into a fuller coded state machine
   Add transitions for start, pause, reconnect, advance-leg, skip-stop, complete, and abandon.

4. Define the Android Auto template and state map
   Build directly from `MOBILE_HOST_STRATEGY.md` and `ANDROID_NAV_SESSION_MODEL.md` so the in-car surface stays narrow and compliant.

5. Verify the generated Android shell and wire runtime config handling
   The scaffold now exists, but Android-specific build verification and Maps/runtime config wiring still need to be completed before #25 can close.

6. Verify the generated iOS shell in Xcode/TestFlight
   The scaffold and workspace now exist, but simulator/device validation still depends on local Xcode execution outside this environment.

## Known Remaining Gaps

- Journey and auto-pitstop orchestration still live inside `src/components/TripPlanner.tsx`
- Persistence is still browser-local in parts of the app
- Android Auto remains at planning scope, not implementation
- Android shell issue `#25` is still open because Android build verification and runtime config wiring remain
- CarPlay, Android Auto, handoff/reconnect, validation, and monitoring issues remain open
