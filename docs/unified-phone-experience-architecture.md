# Unified App-Packaged Phone Experience: Audit & Architecture Proposal (Issue #84)

**Status:** Revised draft audit and architecture proposal for owner review (November 23, 2026).
**Scope:** Phase 1 of [#84](https://github.com/markccalugay/myexplorer/issues/84) — codebase audit, capability-parity & release plan, concrete data-migration proposal, and milestone breakdown. **No application code, build configuration, or runtime behavior was changed.**

> [!IMPORTANT]
> **Product Decision Recorded:** The web experience belongs on the web. The phone app must have its own **app-packaged native experience** that mirrors the web's user-facing interactions and capabilities. Users must not switch between a hosted web interface and a separate app interface to complete a journey, nor rely on a hosted website, embedded web shell, or secondary "open web" link as the intended phone experience.
>
> **Current Reality vs. Target Architecture:** Everything in Section 3–5 describes the **target architecture**. The current Android app **still** cold-launches `WebExperienceScreen` (`WebView` loading `https://myexplorer-travel.vercel.app`) and bridges to a separate `NativePlannerScreen` via React-fiber DOM scraping.

---

## 1. Cross-Issue Dependencies & Unresolved Gaps

| Issue | Current Status (Fact) | Impact on #84 |
| --- | --- | --- |
| **#82** | Phone/car reconciliation, FG-service startup guard, draft-conflict preservation, and protection of `corrupt_snapshot_backup_json` across host/phone `stopNavigation` AND new-trip starts (requiring explicit `discardCorruptRecoverySession` confirmation) exist in local commits, **not yet verified on physical Samsung or DHU**. | **Trip recovery is NOT accepted** until #82's physical-device, DHU, and vehicle checks pass. |
| **#83** | Phone place search (`NavigationBridgeModule.searchPlaces` using Android `Geocoder`), coordinate-free stop management, intermediate insertion, stale-query guards, and Undo exist in local commits (`34a7797`, `58b3bee`). **Real Samsung availability and landmark/business recall are UNVERIFIED**; Android Auto search and stop editing remain incomplete. | Milestone 1 builds on #83's phone stop-search flow; real-device `Geocoder` verification on Samsung (`SM_A366B`) is required before deciding whether Google Places API is needed. |
| **#78 & #79** | Product requirements (#78) and usability research (#79) are pending. | No existing capability (`Discovery`, `Bookings`, `Convoy`, `LocationDetail`, `Legal`) may be removed or sunsetted without an explicit #78 decision and data-migration plan. |
| **#80** | [`docs/design-guide.md`](design-guide.md) is a **working draft** pending owner approval and Mobbin travel-screen comparison. | #84 follows the draft guide's principles (`Home → search/manage stops → begin navigation → return to trip`) without locking unapproved visual tokens. |
| **#81** | Broader interface improvements depend on reviewed #80 design direction. | #84 Milestone 1 focuses on functional parity and coherent native structure rather than the broader visual redesign. |

---

## 2. Web-to-Phone Capability Inventory & Parity Plan

Status legend (explicitly distinguishing **Code Inspection** from **Device-Tested Behavior**):
- **Implemented (Code)** — present in source code; device status noted separately.
- **Partial (Code)** — core exists, missing key UX, map, or parity pieces.
- **Unverified (Device)** — code exists, not tested on physical Samsung (`RFGYC0D9KHF`) or current build.
- **Missing** — not implemented on that surface.

| Capability / User Interaction | Web (`src/`) — Code Inspection | Current Native Phone (`apps/mobile/`) — Code Inspection | Device-Tested Behavior (Observed) | Planned Phone Parity & Preservation |
| --- | --- | --- | --- | --- |
| **Home / Explore** | **Implemented:** `ExplorePage` (`src/components/ExplorePage.tsx`) — curated destinations, search/filter, `Start Planning`. | **Missing natively** (Android cold-launches `WebExperienceScreen` WebView; iOS opens `NativePlannerScreen` directly). | WebView loads `https://myexplorer-travel.vercel.app` on `emulator-5554` (`v4`). Native Home: **NOT TESTED / Missing**. | Native `HomeScreen` with brand, current/active trip card (`Return to Trip` / `Continue Planning`), `Plan a trip`, curated Explore entry, and Saved Trips. |
| **Discovery (Places, Stays & Pitstops)** | **Implemented:** `view === 'discovery'` (`src/App.tsx`) — `usePlaces`, `usePitstops`, `FilterPanel`, `DestinationCard` list, map markers. | **Missing** in `NativePlannerScreen`. | **Unverified** on physical Samsung. | Preserve in existing WebView until native Discovery screen/drawer is built and verified (or owner approves #78 disposition). |
| **Place Search (name / address)** | **Implemented:** `SearchBar` + `PlaceAutocompleteInput` (`src/lib/googlePlaces.ts`, Google Places JS). | **Implemented (Code, #83):** `NavigationBridgeModule.searchPlaces` (Android `Geocoder`) + `placeSearch.ts` + `App.tsx` search UI. **Missing on iOS.** | **NOT TESTED** on physical Samsung (`RFGYC0D9KHF`) or emulator. `Geocoder` availability & POI/business recall: **Unverified**. | Evaluate `Geocoder` on Samsung first; keep `PlaceSearchProvider` interface so Places API can be plugged in if recall is insufficient. |
| **Place Details** | **Partial (Code):** `LocationDetail.tsx` exists under `view === 'discovery'`, but has no navigation trigger from `ExplorePage` or `TripPlanner` on the live site (`CHANGELOG.md` 2026-11-19). | **Missing** in `NativePlannerScreen`. | Verified **unreachable** from `ExplorePage`/`TripPlanner` on deployed site (`v4` audit). | Native place-detail sheet/modal triggered from search results and Discovery cards (showing name, address, rating/notes when available, and `Add to trip`). |
| **Interactive Pre-Trip Map** | **Implemented:** `src/components/Map.tsx` — interactive Google Map with pan, zoom, stop/place markers, directions polyline. | **Partial:** `NavigationMapView` hosts Google Navigation SDK `NavigationView` in a fixed `240px` box in `Turn-by-Turn Navigation` (`MyExplorerNavigationViewManager.kt`), not an interactive pre-trip map with stop pins/route preview. | WebView map tiles & route polyline verified on `emulator-5554` (`v4`); native `NavigationView` **NOT TESTED** on `#82`/`#83` commits. | **Required in core phone journey (not deferred):** interactive native map in planner showing stop markers, pan/zoom (plus accessible zoom controls), and route preview polyline when route data is available. |
| **Trip Planning (Stops, Order, Undo)** | **Implemented:** `TripPlanner.tsx` — stop search, reorder, remove, auto-pitstops, `StopCard`, `Timeline`. | **Implemented (Code, #83):** `App.tsx` — coordinate-free search, intermediate stop insertion before destination, `Up`/`Down`/`Remove` + `Undo`, active-nav edit lock. | **NOT TESTED** on physical Samsung (`RFGYC0D9KHF`). | Unify into native `TripPlannerScreen` alongside the interactive pre-trip map. |
| **Route Preview & ETA** | **Implemented:** `googleRoutes.ts`, `journeyDetailsEngine.ts`, `RoutePlanner.tsx`. | **Partial:** `routingProxyClient.ts` requires `app.json`'s `routingProxyUrl` (currently `""`); otherwise `routeState` shows `stale`/`idle`. | Default mobile build has `routingProxyUrl` unconfigured (**Unverified** end-to-end). | Configure/host routing proxy (or native Routes adapter) so distance, duration, and polyline render reliably on the pre-trip map. |
| **Saved Trips & Bookings** | **Implemented:** `Bookings.tsx` displays `myexplorer.saved-trips` (`localStorage`), `Open Trip`, `Manage Convoy`, `Create Trip` (no live venue-booking backend). | **Implemented (Code):** `AsyncStorage` `saved-trips`, `draft-trip`, `draft-baseline` (`storage.ts`). | Web `Save Trip` survived `force-stop` on `emulator-5554` (`v4`); native draft/conflict persistence **NOT TESTED** on device. | Native **Saved Trips / Bookings** view preserving both migrated web trips (including `convoy` metadata) and native trips. |
| **Convoy** | **Implemented:** `ConvoyPanel.tsx` (`src/lib/convoy.ts`) — vehicles, participants, invites, assignments stored on `Trip.convoy`. | **Missing** natively (only accessible inside `WebView`). | **Unverified** on physical Samsung. | Preserve `Trip.convoy` data during migration (`#78` disposition required before sunsetting or building native Convoy UI). |
| **Legal & Support Pages** | **Implemented:** `LegalPage.tsx` + `SiteFooter.tsx` (`#privacy`, `#terms`, `#attribution`, `#permissions`, `#support`). | **Partial:** `WebExperienceScreen` has **App info** (`Version 1.0 (4)`), but no native Privacy/Terms/Attribution/Support screens. | App info modal verified in Jest & `v4` emulator; native Legal screens **Missing**. | Bundle legal/support content natively in **Menu → App info & Legal** so offline users can read them without a WebView. |
| **Navigation & Return to Trip** | **Partial (Session state):** `navigationSessionStore.ts` (`myexplorer.navigation-session`), no OS FG service. | **Implemented (Code, #82):** Google Nav SDK `7.6.1`, `NavigationForegroundService` (`7201`), `NavigationSessionRepository`, `MyExplorerCarScreen`, `Return to Trip`. | Earlier debug build reached active guidance on emulator; `#82`/`#83` commits **NOT TESTED** on physical Samsung, emulator, DHU, or vehicle. | Single authoritative `NavigationSessionRepository` + `NavigationController` driving both native phone guidance and Android Auto. |

### Release Gate (No Premature Removal)
> [!CAUTION]
> **Release Gate:** Do **not** remove `WebExperienceScreen` from a user-facing release build until:
> 1. Every capability required for the unified core journey—including **native Home, coordinate-free Place Search, interactive pre-trip Map (pan, zoom, stop markers, route preview), Trip Planning, Saved Trips, Legal/App info, Navigation, and Return to Trip**—is implemented and verified on physical Android hardware (Samsung `SM_A366B`) and Android Auto DHU/vehicle.
> 2. Every web-only capability (`Discovery`, `Convoy`, `Bookings`) either has native parity **or** has an explicit owner-approved disposition under `#78`.
> 3. The non-destructive data migration (Section 5) is implemented, tested, and verified not to lose user data.

---

## 3. Current Data & State Flows vs. Target Architecture

### Current State Silos (Code Inspection)
1. **Hosted WebView (`localStorage`):** `myexplorer.saved-trips` (`sanitizePersistedTrip`) and `myexplorer.navigation-session` (`createNavigationSessionStore`), plus unsaved `TripPlanner` React state exported only via `MyExplorerWebViewManager.exportTripFromWebStorage()` scraping `.trip-planner-view` / `.trip-planner` React fibers.
2. **React Native (`AsyncStorage`):** `myexplorer.mobile.saved-trips`, `myexplorer.mobile.draft-trip`, `myexplorer.mobile.draft-baseline`, `myexplorer.mobile.navigationSession.v1`.
3. **Android Native (`SharedPreferences` + In-Memory):** `myexplorer_nav_session` (`snapshot_json`, `corrupt_snapshot_backup_json`) owned by `NavigationSessionRepository`, synced to `MyExplorerCarScreen`.

### Target App-Packaged Architecture
- **Shared Core (`packages/shared` or `src/shared` consumed by both web and `apps/mobile`):**
  - Pure TypeScript models (`Trip`, `Stop`, `GeoPoint`, `Convoy`, `NavigationSessionSnapshot`), validation (`parseManualCoordinate`, `validateSnapshotStops`, coordinate bounds), stop sequence & route-key logic (`retypeStops`, `insertStopIntoTripStops`, `buildRouteKey`, `journeyDetailsEngine`), and session conflict/reconciliation rules.
- **Platform-Specific Phone Layer (`apps/mobile/`):**
  - **UI:** Native React Native screens (`HomeScreen`, `TripPlannerScreen` with interactive pre-trip map, `ActiveNavigationScreen`, `SavedTripsScreen`, `AppInfoAndLegalScreen`) — zero visible WebView shell or hosted-site dependency.
  - **Adapters:** `StorageAdapter` (`AsyncStorage` + `SharedPreferences`), `PlaceSearchAdapter` (`Geocoder` / Places provider), `RoutingAdapter` (routing proxy / SDK), `MapAdapter` (interactive native `MapView` + `NavigationView` for active guidance).
- **Phone + Android Auto Consistency:**
  - `NavigationSessionRepository` + `NavigationController` remain the single runtime authority for `ACTIVE`, `PREPARING`, `RECONNECTING`, `PAUSED`, `COMPLETED`, and `ABANDONED`.
  - Editing stops remains locked while `isNavigationSessionInProgress` is true (preventing phone/car route drift) until a future parked-only live-edit protocol is designed and verified.
  - `#82` corrupt-backup protection must be tightened so Android Auto / controller transitions never clear `corrupt_snapshot_backup_json` without an explicit phone-side user decision.

---

## 4. Practical Milestones (Internal Dev vs. Release-Ready)

| Milestone | Kind | Scope | Exit Gate |
| --- | --- | --- | --- |
| **M0: Hardware & Gap Verification** | Pre-req | Unblock Samsung (`SM_A366B`) testing (Play internal-testing build or owner-approved test track), verify `#82` phone/DHU recovery + fix corrupt-backup clearing, and verify `#83` `Geocoder` recall on real landmarks/businesses. | Real-device test evidence recorded for `#82` and `#83`; `Geocoder` vs. Places API decision made. |
| **M1: Core Native Journey (Internal Dev)** | Internal Dev (WebView retained as fallback or feature-flagged until M3 gate) | Implement native `HomeScreen`, unified `TripPlannerScreen` **with interactive pre-trip map (pan, zoom, stop markers, route preview)**, `#83` stop search/management, `#82` `NavigationController` guidance + `Return to Trip`, and bundled App Info / Legal screens. | Automated Jest/TS/Lint/JUnit pass + internal dev verification on Samsung for `Home → Map & Search Stops → Start Nav → Background/Relaunch → Return to Trip`. |
| **M2: Non-Destructive Data Migration** | Internal Dev | Implement and test `localStorage` → `AsyncStorage` migration (Section 5) with backup, idempotency, collision handling, and rollback. | All migration unit/integration tests pass with representative web payloads, corrupt payloads, and colliding IDs. |
| **M3: Parity & Release-Ready Replacement** | Release Gate | Complete `#78`/`#80`-approved native Discovery, Place Details, and Convoy/Bookings disposition; remove `WebExperienceScreen` cold-launch WebView only after all release-gate criteria pass on Samsung, DHU, and vehicle. | Owner sign-off on `#78`–`#81`, full Samsung + DHU + vehicle pass, migration verified on upgrade build. |

---

## 5. Concrete Data-Migration Proposal (Not Yet Implemented)

> [!NOTE]
> **Status:** Foundation building blocks implemented (`Trip.convoy` / legacy field round-trip in `apps/mobile/src/planner/domain.ts`, pure `planLegacyWebTripMigration` planner in `apps/mobile/src/planner/legacyMigration.ts`, and read-only `LegacyWebStorageReader.kt` parser/reader). **Automatic migration is NOT wired** and live Android WebView execution (online and offline `loadDataWithBaseURL`) is **UNVERIFIED / NOT TESTED** on a physical device or emulator.

### Stored Schema Inventory (Code Inspection)

| Store | Keys | Fields Stored |
| --- | --- | --- |
| **Web `localStorage`** | `myexplorer.saved-trips` (`src/lib/persistence.ts`) | `Trip[]`: `id`, `name`, `stops[]` (`id`, `name`, `location.{lat,lng}`, `type`, `source`, `isAutoSuggested` — note `sanitizePersistedTrip` strips `formattedAddress`, `rating`, `description`, `googleMapsUri`, `distanceFromPrevious`, `durationFromPrevious`, `arrivalTime`, `totalDistance`, `totalDuration`), `convoy` (`Convoy`), `savedAt`, `updatedAt`. |
| **Web `localStorage`** | `myexplorer.navigation-session` (`src/lib/navigationSessionStore.ts`) | `PersistedNavigationSession`: `sessionId`, `tripId`, `tripSnapshot` (`Trip`), `status`, `startedAt`, `updatedAt`, `currentStopIndex`, `currentLegIndex`, `approvedPitstops`, `reconnectState`, `lastSyncSource`, etc. |
| **Mobile `AsyncStorage`** | `myexplorer.mobile.saved-trips`, `draft-trip`, `draft-baseline`, `navigationSession.v1` | `Trip`: `id`, `name`, `stops[]` (includes optional `formattedAddress`, `source`, `isAutoSuggested`, etc.), `totalDistance`, `totalDuration`, `savedAt`, `updatedAt`, `routeSnapshot`. **Currently lacks `convoy` field.** |
| **Android `SharedPreferences`** | `myexplorer_nav_session` (`snapshot_json`, `corrupt_snapshot_backup_json`) | `NavigationSessionSnapshot` JSON (`sessionId`, `tripId`, `tripName`, `status`, `stops[]`, `currentStopIndex`, `currentLegIndex`, `versionSeq`, `updatedAtMs`, `lastError`, etc.). |

### Field-by-Field Mapping & Preservation Policy

1. **`Trip.id`, `name`, `savedAt`, `updatedAt`:** Preserve verbatim; if `name` is blank, default to `"Imported Trip"`.
2. **`Trip.stops[]` (ordered):** Preserve exact array order and apply `retypeStops` only after validating every stop's `id`, `name`, and finite `location.lat` (`[-90, 90]`) / `location.lng` (`[-180, 180]`). **Never silently drop an invalid stop:** if any stop in a trip is invalid, quarantine that trip entry into a migration-error/backup key and surface an actionable notice.
3. **Fields without native UI yet (`Trip.convoy`, `Stop.source`, `Stop.isAutoSuggested`, `PersistedNavigationSession.approvedPitstops`):**
   - Extend mobile `Trip` type with optional `convoy?: Convoy` (and `migratedFromWebAt?: string`) so `convoy` vehicles, participants, invites, and assignments are **preserved verbatim** in `AsyncStorage` rather than stripped.
4. **ID-Collision & Duplicate Detection Policy:**
   - **Exact duplicate** (`id` matches an existing mobile trip AND normalized `name` + `stops` + `convoy` match): skip without duplicating.
   - **Same `id`, different content** (e.g., user edited a trip natively and also has a web trip with that `id`): keep the existing mobile trip untouched and import the web trip under a new unique ID (`${webTrip.id}-web-${timestamp}`) labeled `"<Name> (Imported from Web)"`.
   - **Active navigation session (`myexplorer.navigation-session`):** Never auto-start a migrated web navigation session; import its `tripSnapshot` into Saved Trips if it contains valid stops not already saved, while leaving Android's `NavigationSessionRepository` as the sole active-session authority.

### Non-Destructive Execution, Failure/Retry & Rollback
1. **Backup first:** Before mutating `AsyncStorage`, snapshot existing `myexplorer.mobile.saved-trips` and raw WebView export payload into `myexplorer.mobile.migration-backup.v1` and set a status flag (`pending` → `completed` | `failed`).
2. **Idempotency & retry:** Mark completion per source payload hash/version; if interrupted mid-write, re-running on next launch resumes from backup without duplicating already-imported trips.
3. **Failure / Rollback:** If `AsyncStorage` write or validation fails, restore `myexplorer.mobile.saved-trips` from `migration-backup.v1`, keep WebView `localStorage` untouched, and show a non-blocking retry notice.
4. **Offline / Unavailable WebView storage:** WebView `localStorage` is stored locally on the device (not on Vercel), so migration **does not require network access**. However, **investigation needed:** confirm the exact Android API/hidden-WebView or Chromium `Local Storage/leveldb` reader mechanism so the native app can read `https://myexplorer-travel.vercel.app` origin storage reliably during upgrade without flashing a visible WebView to the user.

### Required Migration Test Matrix (Before Implementation)
- Representative legacy `myexplorer.saved-trips` with multi-stop `Stop` metadata and `Convoy` data.
- Partial/corrupt web JSON or stop with invalid coordinates (quarantined, no partial trip created, existing mobile trips untouched).
- Repeated migration runs (strictly idempotent, zero duplicates).
- ID collision with differing content (both mobile and web versions preserved with distinct IDs/labels).
- Simulated write failure / mid-migration interruption (rollback preserves both web and mobile data).

---

## 6. Verification & Acceptance Criteria (Distinguished by Environment)

- **Automated checks (code/unit):** Mobile Jest, TypeScript (`tsc --noEmit`), ESLint, Android JUnit (`testDebugUnitTest`), plus migration suite.
- **Physical Samsung (`SM_A366B` / `RFGYC0D9KHF`):** Currently **BLOCKED** by Play App Signing mismatch (`9a:29:70:e0:...`); required for `Geocoder` landmark/business availability & recall verification, interactive pre-trip map gestures, cold start, background/relaunch, and `#82`/`#83` acceptance.
- **Emulator (`Medium_Phone_API_36.1`):** Currently **BLOCKED** by `INSTALL_FAILED_INSUFFICIENT_STORAGE` (`564M` free on `/data`).
- **Android Auto DHU & Actual Vehicle:** **NOT TESTED**; required before claiming `#82`, `#83`, or `#84` release readiness.
- **Cold-start performance:** Any cold-start latency target must be defined against a specific reference device, warm/cold state, and measurement method (e.g., Android `adb shell am start -W` / `Displayed` metric on `SM_A366B`) rather than an arbitrary ungrounded threshold.

---

## 7. Decisions Needed From Owner Before Implementation

1. **Samsung Verification Path:** Approve cutting a bumped Play internal-testing AAB (or freeing emulator space) so `#82`, `#83` (`Geocoder` availability & POI recall), and M0 can be verified on real hardware.
2. **Pre-Trip Map & Routing Proxy:** Confirm where `scripts/mobile-routing-proxy.mjs` will be hosted for Milestone 1's interactive pre-trip map route preview.
3. **Feature Disposition (`#78`–`#81`):** Confirm native parity scope vs. sunset/deferral plan for `Discovery`, `LocationDetail`, `Convoy`, and `Bookings` before any release build removes `WebExperienceScreen`.
4. **Data-Migration Mechanism:** Approve investigating a one-time background/hidden-WebView `localStorage` export bridge during upgrade (keeping `WebExperienceScreen` hidden/non-user-facing during migration) vs. a Chromium storage reader.
