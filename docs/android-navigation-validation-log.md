# Android Navigation & Android Auto Validation Log

- **Date:** 2026-11-18 (Asia/Manila)
- **Branch:** `main`
- **Package:** `com.thestillfoundation.myexplorer`
- **Candidate Version:** `versionCode 2` / `versionName "1.0"` (`enableProguardInReleaseBuilds = false`; no `mapping.txt` produced)

## Validation Gates Summary

| Gate / Scenario | Status | Evidence |
| :--- | :--- | :--- |
| Phone `NavigationView` lifecycle & map rendering (`emulator-5554`, API 36, `arm64-v8a`) | **PASS** *(defect found & fixed 2026-11-17)* | Fixed `NavView.onStart cannot follow a NavView.onResume` in `MyExplorerNavigationViewManager.kt`; verified Google map tiles + watermark rendered (`docs/validation-evidence/2026-11-17/02-scrolled.png`). |
| Fresh-install permission denial → retry → grant (`emulator-5554`) | **PASS** *(2026-11-18)* | Revoked location permissions, entered 3 Manila stops (`Rizal Park` → `Intramuros` → `Binondo`) via UI, tapped `Start Navigation`, tapped `Don't allow` (`docs/validation-evidence/2026-11-18/04_perm_denied.png`), verified `Session status: paused` with permission-denied notice, tapped `Resume Nav`, granted `While using the app`. |
| Navigation SDK Terms & foreground service authorization (`emulator-5554`) | **PASS** *(2026-11-18)* | Accepted `Welcome to Google Maps navigation` (`GOT IT`); `dumpsys activity services` confirmed `NavigationForegroundService` (`isForeground=true`, `foregroundId=4201`, `myexplorer_navigation_channel`) and SDK `NavigationService` (`isForeground=true`, `foregroundId=408647582`, `category=navigation`). |
| Route-calculation failure handling (`emulator-5554`) | **PASS** *(2026-11-17)* | Invalid/cross-ocean route returned `Route calculation failed: FAILED` and transitioned cleanly to `Session status: paused`. |
| Simulated driving, maneuvers, ETA, intermediate stop progression, final arrival & notification cleanup (`emulator-5554`) | **PASS** *(simulated, 2026-11-18)* | Driven on `emulator-5554` (`Rizal Park` → `Intramuros` → `Binondo`) via debug-only `DebugNavigationTestReceiver` (`BuildConfig.DEBUG` + `src/debug/` only) at `8.0x`/`10.0x` speed. Observed instruction/maneuver/ETA progression (`05_active_nav.png`: `1530m / 289s` `"Head north on Padre Burgos Ave..."` → `06_sim_progress.png`: `981m / 188s` `"Keep left onto Padre Burgos Ave"`, maneuver `11` → `07_intermediate_or_arrival.png`: `254m / 55s` `"Merge onto Padre Burgos Ave"`, maneuver `13`), intermediate stop advancement (`currentStopIndex` `1 → 2`, `currentLegIndex` `0 → 1`, `"Head northwest on Padre Burgos Ave toward General Luna St"`), final arrival (`status=completed`, `"Arrived at destination"`, `0m / 0s`), and `dumpsys activity services` `[]` cleanup. |
| End during preparation (`emulator-5554`) | **PASS** *(defect found & fixed 2026-11-18)* | Added `try/catch` to `handlePauseNavigation`, `handleResumeNavigation`, and `handleStopNavigation` in `apps/mobile/App.tsx` after observing `Uncaught (in promise): IllegalStateException: Navigation route callback ignored; session ended or superseded.` on mid-prep cancellation. Re-tested `start` → immediate `stop`: transitioned cleanly to `abandoned` with `lastError=None` and zero `ReactNativeJS` errors. |
| Pause / Resume (`emulator-5554`) | **PASS** *(2026-11-18)* | `pause` transitioned `active → paused` with `guidanceFeedRegistered=false` (`docs/validation-evidence/2026-11-18/10_paused.png`); `resume` transitioned `paused → active` with `guidanceFeedRegistered=true`. |
| Route replacement A → B feed isolation (`emulator-5554`) | **PASS** *(2026-11-18)* | Replaced actively simulating Route A (`pause-test`, `nav-3f93ae52`) with Route B (`route-b`, `nav-7888649a`, `Binondo` → `Quiapo`); Route B received its own guidance updates (`"Head west toward Reina Regente St"` `1882m` → `"Turn right onto Reina Regente St"` `1618m`) without Route A events overwriting it (`docs/validation-evidence/2026-11-18/11_route_b_replacement.png`). |
| Android Auto DHU projection & host coordination | **NOT TESTED** | `desktop-head-unit` (`v2.0-mac-arm64`) is installed at `/Users/markccalugay/Library/Android/sdk/extras/google/auto/desktop-head-unit`, but `adb forward tcp:5277 tcp:5277` + `desktop-head-unit --adb` exited with `Failed to read from transport - disconnect. Exiting...`. Missing equipment: a physical Android phone running Android Auto with Head Unit Server enabled (`emulator-5554` does not provide a projection head unit server). |
| Play Console highest `versionCode` confirmation | **BLOCKED** | `androidpublisher.googleapis.com` is not enabled on `myexplorer-489610` and no Play Developer API credentials are configured; owner must confirm highest uploaded `versionCode` in Play Console before uploading. |
| 16 KB ELF `LOAD` alignment & APK ZIP alignment | **PASS** *(static & ZIP)* / **NOT TESTED** *(16 KB runtime)* | Static ELF results reused from 2026-11-17 (no native `.so` dependencies changed: `0` of `28` 64-bit `.so` files had `LOAD` align `< 0x4000`). On final AAB (`808378ec...`): `bundletool build-apks --mode=universal` + `zipalign -c -P 16 -v 4` returned `Verification successful`. `emulator-5554` runs `PAGESIZE=4096` (16 KB runtime not tested). |

## Automated Checks (Post-Final Edit)

- `cd apps/mobile && npm test -- --watchAll=false`: **4 suites passed, 13 tests passed** (`App.test.tsx`, `route.test.ts`, `session.test.ts`, `permissions.test.ts`).
- `cd apps/mobile && npx tsc --noEmit`: **Passed** (`0` errors).
- `cd apps/mobile && npm run lint`: **Passed** (`0` errors, `1` warning in generated `apps/mobile/android/app/build/reports/tests/testDebugUnitTest/js/report.js`).
- `cd apps/mobile/android && ./gradlew testDebugUnitTest bundleRelease --no-daemon`: **BUILD SUCCESSFUL**; JUnit **12/12 tests passed**.
- Final Signed AAB (`apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`, `67M`, `versionCode 2` / `versionName "1.0"`):
  - SHA-256: `808378ec27d25be127629d27056a287c0a4364c7e43cb3acc57226fb37eb5f89`
  - Signer: `CN=The Still Foundation, OU=MyExplorer, O=The Still Foundation, L=Manila, ST=Metro Manila, C=PH` (`jarsigner -verify` → `jar verified.`).
