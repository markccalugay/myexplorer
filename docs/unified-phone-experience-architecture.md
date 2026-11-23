# Unified App-Packaged Phone Experience: Audit & Architecture Proposal (Issue #84)

**Status:** Draft audit and architecture proposal for owner review (November 23, 2026).
**Scope:** Phase 1 of [#84](https://github.com/markccalugay/myexplorer/issues/84) — codebase audit, state/data flow trace, target architecture, migration plan, and Milestone 1 definition. No application code or behavior was changed.

> [!NOTE]
> Throughout this document, **Facts (Code Inspection)** are distinguished from **Device-Tested Behavior**, **Unverified / Blocked Items**, **Assumptions**, and **Open Questions / Recommended Decisions**.

---

## 1. Executive Summary & Dependency Context

MyExplorer on Android currently operates as **two disconnected phone experiences** bridged by a one-way DOM-fiber export:

1. **Hosted Web Shell (`WebExperienceScreen`):** Cold-launches `https://myexplorer-travel.vercel.app` inside an Android `WebView` (`MyExplorerWebViewManager.kt`), providing Explore, Discovery, Place Details (when reached from Discovery), Trip Planner, Saved Trips (`Bookings`), Convoy, and Legal pages.
2. **Native Planner & Navigation (`NativePlannerScreen` + `MyExplorerNavigationViewManager` + `NavigationController`):** A separate React Native screen backed by `AsyncStorage`, Google Navigation SDK (`7.6.1`), `NavigationForegroundService`, and Android Auto (`MyExplorerCarScreen`).

Users currently have to understand the boundary between the hosted website (`☰ → Navigate Current Trip (Native Nav)` / `Return to Trip` banner) and the native turn-by-turn screen, and the two layers maintain separate persistence (`WebView` `localStorage` vs React Native `AsyncStorage` vs native `SharedPreferences`).

### Explicit Cross-Issue Dependencies

| Issue | Current Status (Fact) | Impact on #84 |
| --- | --- | --- |
| **#82** | Phone/car reconciliation, startup race guard, and draft-conflict preservation exist in local commits (`da3c48c`–`f5fb3a9`), **not yet verified on physical Samsung or DHU**. Unresolved gap: the Android Auto host (`MyExplorerCarScreen` / `NavigationController` path) can still clear or replace a quarantined corrupt-session backup without an explicit user decision on the phone. | **Trip recovery is NOT accepted.** #84 cannot assume recovery is complete until #82's device/DHU checks pass and corrupt-backup clearing requires explicit user confirmation. |
| **#83** | Phone place search (`android.location.Geocoder` via `NavigationBridgeModule.searchPlaces`), coordinate-free stop management, intermediate insertion, stale-query guards, and Undo exist in local commits (`34a7797`, `58b3bee`). **Real Samsung recall for landmarks/businesses is NOT TESTED**; Android Auto search and stop editing remain incomplete. | Milestone 1 of #84 builds directly on #83's phone stop-search flow; real-device `Geocoder` vs Places API evaluation is required before removing the web planner. |
| **#78 & #79** | Product requirements (#78) and usability research (#79) are pending. | No existing capability (Explore, Discovery, Convoy, Bookings, Legal) may be sunsetted or removed without an explicit #78 decision and data-migration plan. |
| **#80** | [`docs/design-guide.md`](design-guide.md) is a **working draft** pending owner approval and Mobbin comparison. | Proposed UI structure in #84 follows the draft guide's principles (`Home → search/manage stops → begin navigation → return to trip`) without locking unapproved visual tokens. |
| **#81** | Broader UI improvements depend on reviewed #80 direction. | #84 Milestone 1 stays scoped to unifying the core journey rather than performing the broader redesign. |

---

## 2. Capability Inventory: Web vs. Native Phone

Status legend:
- **Implemented (Code)** — present in source code.
- **Partial (Code)** — core exists, missing key UX or parity pieces.
- **Unverified (Device)** — code exists, not yet verified on physical device / current build.
- **Missing** — not implemented on that surface.

| Capability | Web (`src/`) — Code Inspection | Native Phone (`apps/mobile/`) — Code Inspection | Device-Tested Status (Observed) |
| --- | --- | --- | --- |
| **Home / Explore** | **Implemented:** `ExplorePage` (`src/components/ExplorePage.tsx`) with curated destinations & `Start Planning` entry. | **Partial (via WebView only):** `WebExperienceScreen` hosts the deployed Vercel site. No native Home screen exists; iOS launches directly into `NativePlannerScreen`. | WebView loads `https://myexplorer-travel.vercel.app` on `emulator-5554` (`v4` release APK). Native Home: **Missing**. |
| **Discovery (Stays / Pitstops)** | **Implemented:** `view === 'discovery'` (`src/App.tsx`) with `usePlaces`, `usePitstops`, `FilterPanel`, `DestinationCard` list, and map markers. | **Missing** in `NativePlannerScreen`. | **Unverified** on physical phone (`RFGYC0D9KHF`). |
| **Place Search (by name/address)** | **Implemented:** `SearchBar` + `PlaceAutocompleteInput` (`src/lib/googlePlaces.ts`, Google Maps JS Places API). | **Implemented (Code, #83):** `NavigationBridgeModule.searchPlaces` using Android `android.location.Geocoder` + `placeSearch.ts` + search UI in `App.tsx` (with collapsed manual lat/lng fallback). **Missing on iOS.** | **NOT TESTED** on physical Samsung or emulator (blocked by Play-signed mismatch / emulator storage). `Geocoder` recall for POIs/businesses is **Unverified**. |
| **Interactive Map** | **Implemented:** `src/components/Map.tsx` (Google Maps JS, markers, directions polyline, zoom/pan). | **Partial:** `NavigationMapView` wraps Google Navigation SDK `NavigationView` inside a fixed `240px` box in `Turn-by-Turn Navigation` (`MyExplorerNavigationViewManager.kt`), used for guidance rather than pre-trip interactive map browsing/pin selection. | WebView map tiles & route polyline verified on `emulator-5554` (`v4`); native `NavigationView` **NOT TESTED** on `#82`/`#83` commits. |
| **Place Details** | **Partial (Code):** `LocationDetail.tsx` exists, but in `src/App.tsx` it only mounts under `view === 'discovery'` with no live navigation trigger from `ExplorePage` or `TripPlanner` (confirmed in `CHANGELOG.md` 2026-11-19). | **Missing** in `NativePlannerScreen`. | Verified **unreachable** on deployed web app (`v4` audit). |
| **Trip Planning (Stops, Order, Undo)** | **Implemented:** `TripPlanner.tsx` (88 KB) with autocomplete stops, drag/reorder, auto-pitstops, journey timing, `StopCard`, `Timeline`. | **Implemented (Code, #83):** `NativePlannerScreen` (`App.tsx`) supports trip naming, coordinate-free search, intermediate stop insertion before destination, `Up`/`Down`/`Remove` + `Undo`, and active-navigation edit lock. | **NOT TESTED** on physical Samsung (`RFGYC0D9KHF`). |
| **Route Preview & ETA** | **Implemented:** `googleRoutes.ts` + `journeyDetailsEngine.ts` + `RoutePlanner.tsx`. | **Partial:** `routingProxyClient.ts` computes distance/duration/polyline only when `app.json`'s `routingProxyUrl` is configured (currently empty `""` by default); otherwise `routeState` shows `stale`/`idle` notice. | Proxy tested locally in earlier milestones; default mobile build has `routingProxyUrl` unconfigured (**Unverified** end-to-end). |
| **Saved Trips & Drafts** | **Implemented:** `Bookings.tsx` + `localStorage` key `myexplorer.saved-trips` (`browserKeyValueStore.ts`). Unsaved web drafts do not survive `force-stop`. | **Implemented (Code):** `AsyncStorage` keys `myexplorer.mobile.saved-trips`, `myexplorer.mobile.draft-trip`, `myexplorer.mobile.draft-baseline` (`storage.ts`). | Web `Save Trip` survived `force-stop` on `emulator-5554` (`v4`); native `AsyncStorage` draft-conflict flow **NOT TESTED** on device. |
| **Turn-by-Turn Navigation & FG Service** | **Partial (Sim/Session only):** `navigationSessionController.ts` tracks web session state; no OS foreground location service. | **Implemented (Code):** Google Navigation SDK `7.6.1` (`NavigationController`, `NavigationSdkAdapter`, `NavigationForegroundService` `7201`), voice guidance, pause/resume/end. | Reached `preparing` in `v4` emulator test; earlier `flow_01`–`flow_05` proved active guidance on debug emulator, **NOT TESTED** on `#82`/`#83` commits or physical Samsung. |
| **Return to Active Trip & Recovery** | **Partial:** `navigationSessionStore.ts` (`myexplorer.navigation-session` in `localStorage`). | **Implemented (Code, #82):** `NavigationSessionRepository` (`SharedPreferences`), `WebExperienceScreen` `current-trip-banner` + `Return to Current Trip` menu item, `App.tsx` launch/`AppState` auto-restore + conflict prompt. | **NOT TESTED** on physical Samsung, emulator (`#82`/`#83`), DHU, or vehicle. |
| **Convoy & Legal Pages** | **Implemented:** `ConvoyPanel.tsx` (in `TripPlanner`), `LegalPage.tsx` + `SiteFooter.tsx` (`#privacy`, `#terms`, etc.). | **Missing** natively (only accessible inside `WebView`). | Legal/Convoy on mobile **Unverified** on physical Samsung. |

---

## 3. Current Data & Navigation State Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Hosted WebView (https://myexplorer-travel.vercel.app)                     │
│  • State: React state + localStorage (myexplorer.saved-trips,             │
│           myexplorer.navigation-session)                                  │
│  • Handoff (one-way, user-triggered):                                     │
│    ☰ Menu -> MyExplorerWebViewManager.exportTripFromWebStorage()          │
│    reads .trip-planner-view/.trip-planner React fiber -> tripHandoff.ts   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ onOpenNativePlanner(trip)
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ React Native Shell (App.tsx -> NativePlannerScreen)                       │
│  • State: AsyncStorage (saved-trips, draft-trip, draft-baseline,          │
│           navigationSession.v1)                                           │
│  • Place Search: MyExplorerNavigation.searchPlaces() -> Android Geocoder  │
│  • Route Preview: optional HTTP POST to routingProxyUrl (unconfigured)    │
│  • Navigation Commands: startNavigation / pause / resume / stop           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ React Native Bridge
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Native Android Authoritative Session Layer                                │
│  • NavigationSessionRepository (in-memory + SharedPreferences             │
│    myexplorer_nav_session / snapshot_json + corrupt_snapshot_backup_json) │
│  • NavigationController + NavigationSdkAdapter (Google Nav SDK 7.6.1)     │
│  • NavigationForegroundService (notification 7201, location FGS)          │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │ Listener + CarHostUpdateCoordinator
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Android Auto (MyExplorerCarAppService -> MyExplorerCarScreen)             │
│  • NavigationTemplate + NavigationViewForAuto (ACTIVE/PREPARING/RECONN.)  │
│  • MessageTemplate with Resume/End (PAUSED) or status text (ABANDONED)    │
│  • UNRESOLVED (#82): Car/controller transitions can still clear backup    │
└───────────────────────────────────────────────────────────────────────────┘
```

### Identified Data-Loss, Split-Brain, and Dependency Risks

1. **Three isolated persistence silos:**
   - WebView `localStorage` (`myexplorer.saved-trips`) is completely invisible to `NativePlannerScreen` (`AsyncStorage`), and vice-versa. Retiring the WebView without migrating `localStorage` would hide trips users saved on the hosted web planner.
2. **Brittle React-fiber DOM scraping for handoff:**
   - `MyExplorerWebViewManager.exportTripFromWebStorage()` traverses `.trip-planner-view` / `.trip-planner` React internal fiber keys (`__reactFiber$`). Any frontend deploy to `myexplorer-travel.vercel.app` that renames that class or refactors state shape can break trip handoff without an app update.
3. **Hosted-website runtime dependency & offline fragility:**
   - Cold launch on Android requires HTTPS access to `https://myexplorer-travel.vercel.app`. Offline cold launch drops users onto a WebView error fallback instead of their saved trips and planner.
4. **Unresolved `#82` corrupt-session backup risk:**
   - `NavigationSessionRepository` quarantines corrupt `snapshot_json` into `corrupt_snapshot_backup_json`, but an Android Auto **End** (`stopNavigation` → `replaceOrClearPreservedCorruptSession`) or host-driven clear can discard that backup without an explicit user decision on the phone.
5. **External service & platform coupling:**
   - Web relies on `VITE_GOOGLE_MAPS_API_KEY` (browser JS Maps/Places/Routes).
   - Native Android relies on Google Navigation SDK `7.6.1` (upload + Play App Signing SHA-1 authorized), Android `Geocoder` (Play Services + network), and an optional `routingProxyUrl` (`scripts/mobile-routing-proxy.mjs`) not yet hosted/configured in `apps/mobile/app.json`.
   - **iOS:** Native map/navigation/place-search bridges are unimplemented; `App.tsx` falls back to `NativePlannerScreen` without a native map or `searchPlaces` provider.

---

## 4. Proposed Architecture: App-Packaged Phone Experience

### Core Principle
Make the **React Native app the single app-packaged shell** for the entire phone journey (`Home → search and manage stops → begin navigation → return to the current trip`), eliminating the visible hosted WebView shell and React-fiber scraping while **preserving existing user data and avoiding premature removal of web-only capabilities**.

### Layering: Shared vs. Platform-Specific

| Layer | Shared TypeScript (`packages/` or `src/shared/` + `apps/mobile/src/`) | Platform-Specific Adapters & UI |
| --- | --- | --- |
| **Domain & Validation** | `Trip`, `Stop`, `GeoPoint`, `retypeStops`, `insertStopIntoTripStops`, `normalizeTrip`, `parseManualCoordinate`, `tripHandoff` coordinate bounds. | None (pure TS). |
| **Route & ETA Logic** | `buildRouteKey`, `routeSnapshotMatchesTrip`, `journeyDetailsEngine`, `stopSequence`, `autoPitstops`, `formatDistanceKm` / `formatDuration`. | Web uses `google.maps` Directions/Routes adapter; Mobile uses `routingProxyClient` / native Navigation SDK route estimates. |
| **Navigation Session Rules** | `NavigationSessionSnapshot`, `isNavigationSessionInProgress`, `reconcileTripWithNavigationSession`, `preserveConflictingDraftInSavedTrips`, `validateSnapshotStops`. | Android: `NavigationSessionRepository` + `NavigationController` + `NavigationForegroundService`. Future iOS: native Nav SDK / MapKit adapter. |
| **Storage** | Typed `TripStorage` & `SessionStorage` interfaces. | Web: `localStorage`; Mobile: `AsyncStorage` + native `SharedPreferences` (with one-time WebView `localStorage` import). |
| **Place Search & Maps** | Normalized `PlaceSearchResult` + validation (`placeResultToStop`). | Web: Google Places JS; Mobile: `PlacesProvider` interface (initially Android `Geocoder`, upgradeable to Places SDK / proxy without UI rewrite) + native `MapView` / `NavigationView`. |
| **UI & Car Surfaces** | Shared copy, status labels, and journey structure from approved `#80` guide. | Mobile: React Native screens (`Home`, `TripPlanner`, `ActiveNavigation`); Android Auto: `MyExplorerCarScreen` templates reading `NavigationSessionRepository`; Future CarPlay: native templates. |

### Keeping Phone and Android Auto Consistent
- **Single runtime authority:** `NavigationSessionRepository` (Android native) remains the sole runtime owner of `ACTIVE`, `PREPARING`, `RECONNECTING`, `PAUSED`, `COMPLETED`, and `ABANDONED` states for both `NativePlannerScreen` and `MyExplorerCarScreen`.
- **Single planner trip store:** Once the WebView shell is replaced, there is **no web-to-native handoff boundary**—the phone planner edits `Trip` directly in `AsyncStorage` (locked while `isNavigationSessionInProgress` is true until a future parked-only live-edit protocol is approved and verified).
- **Corrupt backup safety (#82):** `NavigationController` must require an explicit phone-side user confirmation (or dedicated recovery prompt) before clearing `corrupt_snapshot_backup_json`; Android Auto idle/end actions must not silently erase quarantined recovery data.

### Practical Migration Sequence (Preserving Data & Capabilities)

1. **Phase 0 — Prerequisites & Owner Decisions (Pre-implementation):**
   - Resolve `#82` device/DHU testing and corrupt-backup protection; verify `#83` `Geocoder` recall on physical Samsung; confirm `#78`/`#80` scope for Discovery, Bookings, Convoy, and Legal pages.
2. **Phase 1 — One-Time Data Bridge & App-Packaged Core Journey (Milestone 1):**
   - Build a clean native **Home** screen (`Plan a trip`, `Return to trip` / `Continue planning` card, **Saved Trips** list, `☰ → App info` + Legal links) and unify it with the #83 **Trip Planner** and **Turn-by-Turn Navigation** inside `apps/mobile`—behind a clean internal navigation stack with **no visible WebView shell** on cold launch.
   - Add a **silent, one-time WebView `localStorage` → `AsyncStorage` migration** (or explicit "Import trips from previous web planner" fallback) reading `myexplorer.saved-trips` before retiring `WebExperienceScreen` so existing users do not lose saved trips.
3. **Phase 2 — Map & Place Search Parity:**
   - Add an interactive pre-trip map (pan/zoom, stop pins, route polyline via hosted routing proxy) and upgrade place search from `Geocoder` to Google Places API (if Samsung testing shows `Geocoder` POI recall is insufficient).
4. **Phase 3 — Secondary Capabilities (Per #78/#80 Approval) & iOS / Car:**
   - Migrate or link Discovery (`Explore` / `Stays` / `Pitstops`), `Place Details`, and `Legal` natively (or keep an explicit secondary web link only if owner approves deferring them).
   - Address Android Auto parked-only search / stop-edit architecture (`#83`) and future CarPlay (`AUTOMOTIVE_REFERENCE.md`).

---

## 5. Recommended First Implementation Milestone (Milestone 1)

**Goal:** Deliver the unified app-packaged core journey on Android with zero visible hosted WebView switching:

> **Home → Search and manage stops → Begin navigation → Return to the current trip**

### Scope of Milestone 1
- **Native Home screen (`HomeScreen`):**
  - Brand header + `☰` menu (**App info** with runtime version, **Legal & Privacy**).
  - Priority **Current / Active Trip** card (`Return to Trip` when active/paused, `Continue Planning` when a draft exists, or dismissed/clear status when canceled/completed—reusing #82's `NavigationSessionSnapshot` reconciliation).
  - Primary **"Plan a trip"** CTA and **Saved Trips** quick-open list.
- **Unified Planner & Navigation flow (`TripPlannerScreen`):**
  - Directly opens from Home ("Plan a trip", "Continue Planning", or a Saved Trip) without any WebView handoff or fiber scraping.
  - Uses #83's coordinate-free place search, intermediate stop insertion, `Up`/`Down`/`Remove` + `Undo`, and active-navigation edit lock.
  - Uses #82's `NavigationController` / `NavigationForegroundService` for `Start Navigation`, `Pause`, `Resume`, `End`, and relaunch recovery.
- **Data Preservation:**
  - Non-destructive import of any existing `myexplorer.saved-trips` from WebView storage on upgrade, preserving existing `AsyncStorage` drafts and saved trips.

### Milestone 1 Acceptance Criteria & Verification Plan
1. **Cold start (no active session):** App launches offline-capable into native **Home** in < 2s with no `WebExperienceScreen` / `myexplorer-travel.vercel.app` load.
2. **Data migration:** Existing `myexplorer.saved-trips` and `myexplorer.mobile.saved-trips` appear in **Saved Trips** without duplicates or data loss.
3. **Core journey:** User taps **Plan a trip** → **Add stop** → searches by name/address (no lat/lng) → adds origin, destination, and intermediate stop → taps **Start Navigation** → reaches active guidance with notification `7201`.
4. **Background, relaunch, and Return to Trip:** Minimizing and reopening restores the active/paused trip; navigating back to **Home** shows the **Return to Trip** card and returns to the exact trip and stops.
5. **Regression & device gates:** All Jest, TypeScript, ESLint, and Android JUnit tests pass, **plus** physical Samsung (`SM_A366B`) + Android Auto DHU verification (`PASS`) before closing `#84`.

---

## 6. Tradeoffs, Open Questions & Decisions Needed From Owner

1. **Place Search Provider (`Geocoder` vs. Google Places API):**
   - *Tradeoff:* Android `Geocoder` requires no new API key or Cloud setup, but has weaker POI/business recall. Google Places API (New) gives rich business results and addresses, but requires hosting a proxy or configuring Android-restricted Places SDK billing/quotas.
   - *Decision needed:* Approve testing `Geocoder` first on Samsung (`#83`) or authorize Places SDK / proxy for Milestone 1/2.
2. **Routing Proxy Hosting (`scripts/mobile-routing-proxy.mjs`):**
   - *Tradeoff:* Pre-navigation route distance/duration/polyline on native currently waits on `routingProxyUrl` (`""` in `app.json`).
   - *Decision needed:* Confirm where the routing proxy will be hosted (or whether pre-nav route preview is deferred to Milestone 2 while Navigation SDK handles active guidance).
3. **Fate of Web-Only Views During Transition (`Discovery`, `LocationDetail`, `Bookings`, `Convoy`, `Legal`):**
   - *Tradeoff:* Removing `WebExperienceScreen` immediately without native equivalents would hide Discovery and Convoy; keeping a secondary **"Explore (Web)"** menu link preserves access until `#78` decides which features are native-built vs. sunsetted.
   - *Decision needed:* Confirm whether Milestone 1 removes the default WebView launch while keeping an optional secondary web/legal link, or waits until Discovery/Legal are native.
4. **Play Internal Testing Track for Physical Samsung Verification:**
   - *Blocker:* Your Samsung (`RFGYC0D9KHF`) has a Play-signed install (`9a:29:70:e0:...`) that cannot be updated in-place by locally signed APKs without uninstalling.
   - *Decision needed:* Approve cutting a bumped Play internal-testing AAB after reviewing `#82`/`#83` commits so real-device verification can unblock `#82`, `#83`, and `#84` Milestone 1.
