# Android Navigation & Android Auto Validation Log

- **Date:** 2026-11-19 (Asia/Manila)
- **Branch:** `main`
- **Package:** `com.thestillfoundation.myexplorer`
- **Candidate Version:** `versionCode 2` / `versionName "1.0"` (`enableProguardInReleaseBuilds = false`; no `mapping.txt` produced)
- **Device / Emulator:** `emulator-5554` (`Medium_Phone_API_36.1`, `sdk_gphone64_arm64`, API 36, `PAGESIZE=4096`)
- **DHU Matrix (Issue #74):** See [docs/android-auto-dhu-validation-matrix.md](android-auto-dhu-validation-matrix.md)

## Prior Evidence Corrections

1. **2026-11-18 invalid captures (`NOT VERIFIED`):** `docs/validation-evidence/2026-11-18/05_active_nav.png`, `06_sim_progress.png`, and `07_intermediate_or_arrival.png` share identical SHA-256 (`a90448a57172cd85852e85e6999762fa4c66750abc66025d7de335b091064beb`) and depicted a `System UI isn't responding` dialog over the Phone app. Historical files are preserved unchanged in git history and marked **NOT VERIFIED**.
2. **2026-11-19 early `ui_01_active.png`–`ui_06_final_arrival.png` and `service-notification-log.txt` (`FAILED` / `NOT VERIFIED`):** Senior review and OCR inspection (`tesseract`) confirmed that all six `ui_*.png` files show `"Session status: paused"` and `"Notice: Route calculation failed: FAILED"` (a malformed stop `Binond` at `0, 0` caused route calculation failure, so `NavigationForegroundService` and notification `7201` never started). Consequently, `service-notification-log.txt` captured only Google Navigation SDK's internal `NavigationService` (`foregroundId=1001`) and lacked MyExplorer's `NavigationForegroundService` (`7201`). Those files are retained unchanged as historical evidence and marked **FAILED / NOT VERIFIED** for active navigation, progression, pause cleanup, and arrival claims.

All new 2026-11-19 `flow_*.png` captures below were validated programmatically (`file` -> `1080 x 2400` RGBA PNG, distinct SHA-256 hashes) and OCR-checked (`tesseract`) for visible UI state alongside `DebugNavigationTestReceiver` `dump` and `dumpsys` logs; they remain retained for separate owner/reviewer visual inspection.

## Service & Notification Role Investigation

- **`com.thestillfoundation.myexplorer/.navigation.NavigationForegroundService` (`foregroundId=7201`, channel `myexplorer_navigation_channel`):** Owned by MyExplorer (`NavigationController` / `NavigationSdkAdapter.registerGuidanceFeed()`). Started when guidance activates, **stopped and notification `7201` removed on UI `Pause`** (`flow-service-notification-log.txt`), and **restarted on UI `Resume Nav`**.
- **`com.google.android.libraries.geo.navcore.service.base.NavigationService` (`foregroundId=1001`, channel `1_foreground_1`):** Owned internally by the Google Navigation SDK AAR (`Navigator` / `NavigationView`). The SDK starts this foreground service for the `Navigator` session and keeps it active across `stopGuidance()` / `clearDestinations()` (pause and end-navigation) so `Navigator` and `NavigationView` remain ready to resume without tearing down the SDK instance.

## Validation Gates Summary

| Gate / Scenario | Status | Evidence |
| :--- | :--- | :--- |
| Normal planner-to-navigation UI flow: UI-entered stops + UI `Start Navigation` (`emulator-5554`) | **RUNTIME PASS** | Entered stops via phone UI (`New Adventure`, `Rizal Park` → `inondo` `14.5995,120.9745` → `In` `14.5896,120.9747`; GPS `14.5839, 120.9794`), tapped `Start Navigation` in UI (`nav-fe81e5d8`). `flow_01_active.png` (`17c5038c...`) shows `Session status: active`, `Navigating trip: New Adventure`, `Next: Head toward Kalaw Ave`, `Next stop: 2.6 km - 12 min`, `Final destination: 4.9 km - 21 min`, `Pause` / `End Navigation`. |
| Pause foreground-service & notification cleanup (`NavigationController.pauseNavigation(context)`) | **AUTOMATED PASS** / **RUNTIME PASS** | `NavigationControllerTest.publicPauseNavigationStopsForegroundServicePreservesTripAndAllowsResumeToArrival` passes (`13/13` JUnit). On `emulator-5554`, tapping UI `Pause` produced `Session status: paused` + `Resume Nav` (`flow_02_paused.png`, `ff68eda4...`), and `flow-service-notification-log.txt` (`05b37bd8...`) proves `NavigationForegroundService` (`7201`) and notification `7201` were present before pause, **absent after pause** (only SDK `NavigationService` `1001` remained), and **restarted on UI `Resume Nav`** (`flow_03_resumed.png`, `57c28a76...`, `Session status: active`). |
| Changing guidance, distance & ETA after UI start (`emulator-5554`) | **RUNTIME PASS** *(simulated after UI start)* | After UI `Start Navigation`, `DebugNavigationTestReceiver` `simulate_route` (`8.0x`–`15.0x`) and `set_location` produced distinct guidance/ETA states on `nav-c0a37631` / `nav-c52bc34a`: `flow_01_active.png` (`Head toward Kalaw Ave`, `2.6 km - 12 min`), `flow_04_sim_1.png` (`d9d1ff24...`, `Head on Ongpin St`, `2.2 km - 10 min`), `flow_05_sim_2.png` (`443d9593...`, `Make a U-turn at Kalaw Ave`, `2.6 km - 11 min`), `flow_05b_sim_3.png` (`f53e69c6...`, `Turn right onto Padre Burgos Ave/C-1`, `2.3 km - 10 min`), and `flow_05c_sim_4.png` (`95acf23f...`, `Turn left onto Liwasang Bonifacio West Overpass/Padre Burgos Ave`, `2.2 km - 10 min`). |
| Intermediate stop progression & final arrival + post-arrival service cleanup (UI-started flow) | **NOT VERIFIED** *(emulator stall)* | `nav-c0a37631` simulation stalled on `emulator-5554` at `versionSeq=175` (`2152m` remaining to `inondo` on `Liwasang Bonifacio West Overpass`); intermediate stop arrival, final arrival, and post-arrival `NavigationForegroundService` (`7201`) cleanup were not reached in this run and remain **NOT VERIFIED** at runtime (covered only by `NavigationControllerTest` unit tests). |
| Active/paused trip-edit & trip-switch guard (`App.tsx`, `session.ts`) | **AUTOMATED PASS** | `isNavigationSessionInProgress` and `navigationSessionMatchesTrip` in `apps/mobile/src/navigation/session.ts` enforced in `App.tsx`; covered by `App.test.tsx` and `session.test.ts` (`15/15` Jest tests passed). |
| Fresh-install permission denial → retry → grant (`emulator-5554`) | **RUNTIME PASS** *(2026-11-18)* | Denied location (`docs/validation-evidence/2026-11-18/04_perm_denied.png`), verified `paused` notice, retried via `Resume Nav`, granted `While using the app`. |
| End during preparation & route replacement A → B (`emulator-5554`) | **RUNTIME PASS** *(2026-11-18)* / **AUTOMATED PASS** | `App.tsx` `try/catch` fix verified on mid-prep `stop`; A → B replacement verified (`docs/validation-evidence/2026-11-18/11_route_b_replacement.png`) and covered by `NavigationControllerTest`. |
| Android Auto DHU projection (Issue #74 matrix) | **NOT TESTED** | Matrix and procedure documented in [docs/android-auto-dhu-validation-matrix.md](android-auto-dhu-validation-matrix.md). `desktop-head-unit` (`2.0-mac-arm64`) is installed, but no physical Android phone running Android Auto with Head Unit Server enabled is connected (`emulator-5554` lacks a Head Unit Server). |
| Play Console highest `versionCode` confirmation | **BLOCKED** | `androidpublisher.googleapis.com` is not enabled on `myexplorer-489610` and no Play Developer API credentials are configured; owner must confirm highest uploaded `versionCode` in Play Console before uploading. |
| 16 KB ELF `LOAD` alignment, APK ZIP alignment & 16 KB runtime | **AUTOMATED PASS** *(static & ZIP)* / **NOT TESTED** *(16 KB runtime)* | Static ELF (`0/28` 64-bit `.so` `< 0x4000`, unchanged native libs) and `zipalign -c -P 16 -v 4` on `universal.apk` from final AAB (`Verification successful`); `emulator-5554` runs `PAGESIZE=4096` (16 KB runtime not tested). |

## Automated Checks & Release Artifact

- `cd apps/mobile && npm test -- --watchAll=false`: **4 suites passed, 15 tests passed**.
- `cd apps/mobile && npx tsc --noEmit`: **Passed** (`0` errors).
- `cd apps/mobile && npm run lint`: **Passed** (`0` errors, `1` warning in generated `apps/mobile/android/app/build/reports/tests/testDebugUnitTest/js/report.js`).
- `cd apps/mobile/android && ./gradlew testDebugUnitTest assembleDebug bundleRelease --no-daemon`: **BUILD SUCCESSFUL**; JUnit **13/13 tests passed**.
- **Final Signed AAB:** `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` (`67M`, `versionCode 2` / `versionName "1.0"`)
  - **SHA-256:** `147562a4c627aa0c3b2f9d8750bd116d177bb19f0ddd97800ffa45ddd7785bb5`
  - **Signer:** `CN=The Still Foundation, OU=MyExplorer, O=The Still Foundation, L=Manila, ST=Metro Manila, C=PH` (`jarsigner -verify` → `jar verified.`)
