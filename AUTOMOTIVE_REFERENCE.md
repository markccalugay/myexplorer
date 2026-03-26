# Automotive Reference

## Purpose

This document is the single planning and execution reference for MyExplorer's mobile host, Android Auto, and CarPlay work.

It consolidates the repo's previous automotive planning notes into one place so product scope, architecture decisions, completed work, and remaining gaps can be tracked together.

## Current Repo State

MyExplorer started as a web-first React and Vite application. The current product already includes destination search, route planning, trip planning with multiple stops, pitstop discovery, and navigation-oriented route data.

Important current files and modules:

- `src/App.tsx`
- `src/components/RoutePlanner.tsx`
- `src/components/TripPlanner.tsx`
- `src/lib/googleRoutes.ts`
- `src/lib/tripDocument.ts`
- `src/lib/stopSequence.ts`
- `src/lib/navigationSession.ts`
- `src/types/trip.ts`
- `src/types/place.ts`
- `apps/mobile`

What is already done:

- React Native is the chosen mobile host strategy
- A hybrid maps and routing strategy is now chosen for web, mobile, and in-car projection
- The first shared trip helpers have been extracted from the web UI layer
- A navigation session contract exists in docs and code
- A React Native mobile host now exists under `apps/mobile`
- The iOS bundle ID and Android application ID are both `com.thestillfoundation.myexplorer`

What is still true:

- Too much trip and navigation orchestration still lives in `TripPlanner.tsx`
- Browser-local persistence still exists in parts of the web app
- Native maps, routing, and automotive projection work are not implemented yet

## Key Constraints

- Android Auto and CarPlay cannot be added directly to the current Vite app
- Both platforms require native mobile layers
- The current web app uses browser Google Maps APIs, which are not the final native-mobile or in-car integration surface
- Automotive experiences must stay narrow, driver-safe, and policy-compliant

## Architecture Decision

MyExplorer should use `React Native` as the mobile host strategy for Android and future in-car support.

Why this is the right fit:

- the repo is already TypeScript-first
- the most reusable parts are trip, routing, and navigation rules
- a real native app is required for Android Auto and CarPlay anyway
- React Native gives one mobile host with room for native automotive surfaces where needed

Why not Capacitor:

- it would wrap the current web UI without solving the deeper automotive architecture requirements
- it would likely leave the team carrying both a WebView shell and native automotive modules

Why not separate native shells yet:

- the repo is not mature enough to justify duplicated Android and iOS implementation paths
- the shared domain layer is not extracted far enough yet

## Maps And Routing Strategy

MyExplorer should keep Google Maps Platform as the canonical provider for place and route data, but the browser Google Maps JavaScript API should no longer be treated as the shared cross-platform contract.

The intended split is:

- web uses the current Google Maps JavaScript adapter
- React Native phone screens use native map rendering for the phone UI
- Android Auto and CarPlay consume the shared navigation session and route summary state through platform-native automotive templates

This keeps route/place data consistent while avoiding a design where phone map components are incorrectly reused inside Android Auto or CarPlay.

## What Can Be Reused

These areas are good candidates for reuse across web, mobile, and in-car support:

- trip and stop data models
- route computation logic
- ETA and duration calculations
- route step parsing and formatting
- pitstop suggestion logic
- navigation session concepts

Primary starting points:

- `src/types/trip.ts`
- `src/types/place.ts`
- `src/lib/googleRoutes.ts`
- `src/lib/tripDocument.ts`
- `src/lib/stopSequence.ts`
- `src/lib/navigationSession.ts`

## Shared Navigation Session Contract

The navigation session should represent one active trip at a time and answer:

- Which trip is active?
- Where is the user in the route?
- What is the next actionable instruction?
- What should survive a restart?
- What can be recomputed when the app reconnects?

The persistent session should include:

- `sessionId`
- `tripId`
- `tripSnapshot`
- `status`
- `startedAt`
- `updatedAt`
- `currentStopIndex`
- `currentLegIndex`
- `currentLocation`
- `lastKnownLocationAt`
- `nextInstruction`
- `remainingDistanceMeters`
- `remainingDurationSeconds`
- `eta`
- `approvedPitstops`
- `routeFingerprint`
- `resumeToken`
- `reconnectState`
- `lastSyncSource`

Lifecycle states:

- `idle`
- `preparing`
- `active`
- `paused`
- `reconnecting`
- `completed`
- `abandoned`

Restore and reconnect expectations:

- load the last persisted session
- verify that it is still safe to resume
- revalidate route-dependent fields if needed
- refresh last known location if permissions allow
- return to `active` or `reconnecting`

The phone app should remain the durable owner of the session. The projected car surface should act as a projection of that session, not a competing source of truth.

## Platform Boundaries

Shared logic should own:

- trip lifecycle rules
- stop and leg sequencing
- journey enrichment rules
- session transitions
- resume eligibility
- route fingerprinting

Platform code should own:

- persistence adapters
- GPS access
- geocoding adapters
- native map and routing adapters
- permissions
- background lifecycle behavior
- Android Auto and CarPlay projection surfaces

## V1 In-Car Product Scope

Recommended v1 features:

- start navigation from a pre-planned trip
- show current destination
- show next maneuver or instruction
- show ETA and remaining distance
- show approved pitstop suggestions already prepared by the trip engine
- resume trip state when the phone reconnects to the vehicle

Explicit non-goals for v1:

- full discovery browsing while driving
- booking flows
- complex itinerary editing on the car display
- anything that creates unnecessary driver distraction

## Platform-Specific Notes

### Android Auto

Android Auto support will require:

- an Android app
- approved Android Auto categories and templates
- a simplified, safety-limited in-car navigation experience

### CarPlay

CarPlay support will require:

- an iOS app
- CarPlay entitlements and template support
- a simplified in-car UI that follows Apple's driver-safety rules

## Execution Status

Completed:

- chose React Native as the mobile host strategy
- chose the hybrid maps/routing strategy for web, React Native phone UI, and automotive projection
- defined the navigation session model
- added a coded navigation session baseline
- extracted `tripDocument`, `stopSequence`, and related shared helpers
- bootstrapped the React Native host under `apps/mobile`
- wired `com.thestillfoundation.myexplorer` as the iOS bundle ID and Android application ID
- made iOS pod installation repeatable in this repo
- added an initial `src/platform` adapter layer for storage, location, geocoding, and routing
- started wiring persisted navigation-session state into the planner flow

Verified:

- `npm test`
- `npm run build`
- `apps/mobile` React Native tests
- `apps/mobile` pod install

Open blockers:

- planner orchestration is still too web-bound
- platform adapters are only browser-backed so far
- Android Auto and CarPlay product scope remains doc-level
- handoff, reconnect, validation, and monitoring work remain open

## Remaining Work / Issue Map

- `#25` Stand up the Android app shell and repository build scaffolding
- `#27` Extract shared trip and navigation domain logic from `TripPlanner`
- `#28` Define the Android Auto v1 scope and driver-safety constraints
- `#29` Define phone-to-car handoff and reconnect behavior for active trips
- `#30` Define the in-car test matrix and validation plan for Android Auto and CarPlay
- `#31` Add operational monitoring and failure reporting for in-car navigation sessions
- `#34` Define the CarPlay v1 scope and driver-safety constraints
- `#35` Implement the navigation session state machine and persistence layer
- `#36` Add platform adapters for storage, location, geocoding, and routing
- `#37` Define native permissions, background lifecycle, and platform policy requirements for iOS and Android automotive support

## Main Risks

- too much planner logic still lives in the web UI layer
- browser-local persistence is still present
- shared models still leak browser `google.maps.*` types
- platform policy and compliance requirements are not fully settled
- reconnect and phone-to-car handoff are not fully implemented
