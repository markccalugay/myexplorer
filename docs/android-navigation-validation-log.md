# Android Navigation & Android Auto Validation Log

- **Date:** 2026-11-19 (Asia/Manila)
- **Branch:** `main`
- **Package:** `com.thestillfoundation.myexplorer`
- **Candidate Version:** `versionCode 2` / `versionName "1.0"` (`enableProguardInReleaseBuilds = false`; no `mapping.txt` produced)
- **Device / Emulator:** `emulator-5554` (`Medium_Phone_API_36.1`, `sdk_gphone64_arm64`, API 36, `PAGESIZE=4096`)

## Prior Evidence Corrections

1. **2026-11-18 invalid captures (`NOT VERIFIED`):** `docs/validation-evidence/2026-11-18/05_active_nav.png`, `06_sim_progress.png`, and `07_intermediate_or_arrival.png` share identical SHA-256 (`a90448a57172cd85852e85e6999762fa4c66750abc66025d7de335b091064beb`) and depicted a `System UI isn't responding` dialog over the Phone app. Historical files are preserved unchanged in git history and marked **NOT VERIFIED**.
2. **2026-11-19 early `03_resumed_sim_1.png` note:** An earlier debug-started capture (`03_resumed_sim_1.png`) showed `"Make a U-turn at Kalaw Ave"` on screen while the log cited `"Head toward Kalaw Ave"` (captured before `03_resumed_sim_1.png`). That run is superseded below by the normal UI-started flow (`ui_01_active.png` through `ui_06_final_arrival.png`) with snapshots dumped immediately around each capture.

All 2026-11-19 captures were validated programmatically (`MainActivity` window focus confirmed via `dumpsys window displays`, valid `1080 x 2400` RGBA PNG via `file`, and distinct SHA-256 hashes) and are retained for separate owner/reviewer visual inspection.

## Validation Gates Summary

| Gate / Scenario | Status | Evidence |
| :--- | :--- | :--- |
| Normal planner-to-navigation UI flow: 3 UI-entered stops + UI `Start Navigation` (`emulator-5554`) | **RUNTIME PASS** | Entered 3 stops (`Rizal Park` `14.5839,120.9794` → `ntramuros` `14.5896,120.9747` → `Binondo` `14.5995,120.9745`) in MyExplorer UI, tapped `Start Navigation` in UI. `DebugNavigationTestReceiver` read-only `dump` confirmed `sessionId=nav-ee9f62f2`, `tripId=trip-1795053176390-pe9okz`, `tripName="New Adventure"`, `status=active`, `guidanceFeedRegistered=true`, `1530m / 289s` (`docs/validation-evidence/2026-11-19/ui_01_active.png`, SHA-256 `6d3aac1e...`). |
| Active/paused trip-edit & trip-switch guard (`App.tsx`, `session.ts`) | **FIXED IN SOURCE** / **AUTOMATED PASS** | Added `isNavigationSessionInProgress` and `navigationSessionMatchesTrip` in `apps/mobile/src/navigation/session.ts` and enforced in `App.tsx` (`addStop`, `removeStop`, `moveStop`, `queueOrRunAction`) so editing/reordering/removing stops or switching/creating trips is blocked while navigation is active or paused, plus `Navigating trip:` indicator. Covered by `App.test.tsx` and `session.test.ts` (`15/15` Jest tests passed). |
| Pause foreground-service & notification cleanup (`NavigationController.pauseNavigation(context)`) | **FIXED IN SOURCE** / **AUTOMATED PASS** / **RUNTIME PASS** | Fixed `pauseNavigation(context)` to resolve `NavigationEnvironment` and `NavigationForegroundService.stop(context)` to call `stopService` + `NotificationManager.cancel(7201)`. `NavigationControllerTest.publicPauseNavigationStopsForegroundServicePreservesTripAndAllowsResumeToArrival` passes (`13/13` JUnit). UI `Pause` → `Resume Nav` verified on `emulator-5554`: `docs/validation-evidence/2026-11-19/ui_02_paused.png` (SHA-256 `c0e02967...`) and filtered `dumpsys activity services` / `dumpsys notification` in `docs/validation-evidence/2026-11-19/service-notification-log.txt` confirm `NavigationForegroundService` (`id=7201`, `myexplorer_navigation_channel`) active before pause, removed after pause (`FG_SERVICES_NONE`), and restarted on resume. |
| `NavigationUpdatesOptions` required properties (`NavigationSdkAdapter.registerGuidanceFeed`) | **FIXED IN SOURCE** / **RUNTIME PASS** | Supplied `setNumNextStepsToPreview(0)`, `setGeneratedStepImagesType(NONE)`, and `setDisplayMetrics(...)` after observing `IllegalStateException: Missing required properties` in `registerServiceForNavUpdates`. |
| Simulated movement after UI start: changing instructions, intermediate stop, final arrival (`emulator-5554`) | **RUNTIME PASS** *(simulated, 8.0x)* | Simulated via `DebugNavigationTestReceiver` `simulate_route` (`speed=8.0`) after UI `Start Navigation` → `Pause` → `Resume Nav`: `ui_03_sim_1.png` (`256cf244...`, `"Head north on Padre Burgos Ave..."` `1530m/289s` → `"Keep left onto Padre Burgos Ave"` `1188m/226s`), `ui_04_sim_2.png` (`eacc317c...`, `"Merge onto Padre Burgos Ave"` `417m/82s`), `ui_05_intermediate_stop.png` (`733361f1...`, `currentStopIndex=2`, `currentLegIndex=1`, `"Turn right onto Quintin Paredes Rd"` `560m/115s`), `ui_06_final_arrival.png` (`167a61ad...`, `status=completed`, `"Arrived at destination"`, `0m/0s`). Filtered service/notification cleanup recorded in `docs/validation-evidence/2026-11-19/service-notification-log.txt`. |
| Fresh-install permission denial → retry → grant (`emulator-5554`) | **RUNTIME PASS** *(2026-11-18)* | Denied location (`docs/validation-evidence/2026-11-18/04_perm_denied.png`), verified `paused` notice, retried via `Resume Nav`, granted `While using the app`. |
| End during preparation & route replacement A → B (`emulator-5554`) | **RUNTIME PASS** *(2026-11-18)* / **AUTOMATED PASS** | `App.tsx` `try/catch` fix verified on mid-prep `stop`; A → B replacement verified (`docs/validation-evidence/2026-11-18/11_route_b_replacement.png`) and covered by `NavigationControllerTest`. |
| Android Auto DHU projection & host coordination | **NOT TESTED** | `desktop-head-unit` (`v2.0-mac-arm64`) is installed, but no physical Android phone running Android Auto with Head Unit Server enabled is connected (`emulator-5554` does not provide a projection head unit server). |
| Play Console highest `versionCode` confirmation | **BLOCKED** | `androidpublisher.googleapis.com` is not enabled on `myexplorer-489610` and no Play Developer API credentials are configured; owner must confirm highest uploaded `versionCode` in Play Console before uploading. |
| 16 KB ELF `LOAD` alignment, APK ZIP alignment & 16 KB runtime | **AUTOMATED PASS** *(static & ZIP)* / **NOT TESTED** *(16 KB runtime)* | Static ELF (`0/28` 64-bit `.so` `< 0x4000`, unchanged native libs) and `zipalign -c -P 16 -v 4` on `universal.apk` from final AAB (`Verification successful`); `emulator-5554` runs `PAGESIZE=4096` (16 KB runtime not tested). |

## Automated Checks & Release Artifact (Post-Final Edit)

- `cd apps/mobile && npm test -- --watchAll=false`: **4 suites passed, 15 tests passed**.
- `cd apps/mobile && npx tsc --noEmit`: **Passed** (`0` errors).
- `cd apps/mobile && npm run lint`: **Passed** (`0` errors, `1` warning in generated `apps/mobile/android/app/build/reports/tests/testDebugUnitTest/js/report.js`).
- `cd apps/mobile/android && ./gradlew testDebugUnitTest assembleDebug bundleRelease --no-daemon`: **BUILD SUCCESSFUL**; JUnit **13/13 tests passed**.
- **Final Signed AAB:** `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` (`67M`, `versionCode 2` / `versionName "1.0"`)
  - **SHA-256:** `147562a4c627aa0c3b2f9d8750bd116d177bb19f0ddd97800ffa45ddd7785bb5`
  - **Signer:** `CN=The Still Foundation, OU=MyExplorer, O=The Still Foundation, L=Manila, ST=Metro Manila, C=PH` (`jarsigner -verify` → `jar verified.`)
