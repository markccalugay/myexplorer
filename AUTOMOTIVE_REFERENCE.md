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

## Android Auto V1 Scope

Primary user journey:

- the user plans a trip on the phone first
- the user starts or resumes that trip from the phone
- Android Auto projects the active trip into a driver-safe navigation surface
- Android Auto shows the current destination, next maneuver, ETA, remaining distance, and approved pitstops already selected by the phone-side trip engine

Supported v1 states:

- ready to resume an active trip
- active guidance to the next stop
- stop completed and advancing to the next leg
- reconnecting after projection loss
- trip completed or abandoned on the phone

Supported v1 interactions:

- resume current trip
- confirm or dismiss a narrow set of already prepared trip actions
- view active-leg guidance and trip progress

Deferred Android Auto interactions:

- full route editing
- destination search and broad discovery browsing
- booking, commerce, or convoy administration flows
- arbitrary recommendation browsing while driving

Android Auto template assumptions:

- use platform-native Android Auto templates only
- treat the phone app as the source of truth for trip/session ownership
- keep Android Auto focused on active guidance, not full trip planning

## CarPlay V1 Scope

Primary user journey:

- the user plans a trip on the phone first
- the phone owns the durable trip session
- CarPlay attaches to that active session and renders a narrow in-car guidance surface
- CarPlay resumes the active trip when the phone reconnects and the session is still valid

Supported v1 states:

- active trip available to resume
- active guidance to the next stop
- reconnect pending after cable/session interruption
- trip completed or abandoned on the phone

Supported v1 interactions:

- resume active trip
- view next maneuver, ETA, remaining distance, and current destination
- acknowledge minimal driver-safe state changes already prepared by the phone

Deferred CarPlay interactions:

- trip creation or full itinerary editing
- open-ended discovery or recommendation browsing
- booking, convoy management, or commerce flows
- any UI that depends on dense touch interaction or long text entry

CarPlay template assumptions:

- use platform-native CarPlay templates only
- keep the CarPlay surface as a projection of phone-owned state
- enable only navigation-first screens that fit Apple's driver-safety rules

## Phone-To-Car Handoff And Reconnect

Session ownership rules:

- the phone app is always the durable owner of the active navigation session
- Android Auto and CarPlay project that phone-owned session instead of creating competing session state
- projection surfaces can request resume, advance-leg, and limited driver-safe actions, but durable writes flow back to the shared phone session

Reconnect rules:

- if projection disconnects but the phone session is still valid, the session moves to `reconnecting`
- if route fingerprint and trip identity still match, reconnect can restore the active session without creating a new one
- if the route fingerprint no longer matches, reconnect must reject the stale session and require reroute or resume from the phone
- if last known location is stale or unavailable, the session may resume in a degraded reconnect state until location refresh succeeds

Recovery UX expectations:

- successful reconnect returns to active guidance with the current destination and next instruction
- partial reconnect keeps the trip resumable but surfaces a reroute or location-refresh requirement
- failed reconnect leaves the session paused or abandoned and defers recovery to the phone UI

## Native Permissions, Background Lifecycle, And Policy

iOS assumptions:

- when-in-use location permission is the minimum required for trip planning and foreground navigation
- background location should not be enabled until active-trip recovery and CarPlay session behavior explicitly require it
- CarPlay requires Apple-managed entitlement approval before shipping or testing the real projected experience
- CarPlay UI must stay within Apple's approved template and driver-safety constraints

Android assumptions:

- fine/coarse location permissions are required for trip planning and foreground navigation
- background location should stay deferred until active-trip continuity and Android Auto behavior require it
- Android Auto must stay within approved app-category and template constraints
- release builds need proper signing and runtime config handling before distribution

Cross-platform policy rules:

- no broad discovery browsing or booking flows while driving
- projected surfaces should expose concise state and minimal driver interaction
- phone-only flows remain the place for itinerary editing, account work, and dense decision-making

## Automotive Test Matrix

Minimum phone-only regression coverage:

- start trip from a planned route
- restore a persisted active trip after app restart
- complete or abandon a trip and clear durable session state

Minimum projected-flow coverage:

- attach Android Auto or CarPlay to an already active trip
- resume a reconnecting trip after projection loss
- advance through stop progression without corrupting phone-owned session state
- validate approved pitstop continuity before and after projection reconnect

High-risk scenarios:

- stale session reconnect after trip edits
- location unavailable at resume time
- projection disconnect during active leg guidance
- final-stop completion and session teardown

Coverage approach:

- unit coverage for shared session and planner rules
- simulator coverage for Android Auto and CarPlay template behavior
- device coverage for at least one real Android Auto path and one real iPhone-to-CarPlay path before release

## Automotive Monitoring Plan

Lifecycle events to instrument:

- trip session created
- session restored
- projection connected
- projection disconnected
- reconnect started
- reconnect succeeded
- reconnect failed
- stop advanced
- trip completed
- trip abandoned

Failure cases to capture:

- stale-session resume rejection
- route refresh failure during reconnect
- projection disconnect loops
- location refresh failure during active guidance

Minimum telemetry payload:

- session id
- trip id
- projection surface (`phone-ui`, `android-auto`, `carplay`)
- reconnect state
- route fingerprint match or mismatch result
- failure reason bucket without storing unnecessary sensitive location history

Follow-up dependency assumptions:

- production analytics or logging destination for automotive lifecycle events
- alerting or dashboarding once projected navigation reaches external testing or release

## Android Auto V1 Scope

### User Journey

Android Auto v1 begins on the phone, not in the car display.

Expected flow:

1. the traveler plans and saves a trip on the phone
2. the traveler starts navigation from the phone or resumes an already active trip
3. Android Auto connects and projects the active trip state
4. the car surface shows current destination, next step, ETA, remaining distance, and approved pitstops
5. the traveler can continue, resume, or end the active trip without entering a full planner flow in the vehicle

### Required Android Auto States

- no active trip
- resumable trip available
- active trip guidance
- reconnecting after temporary disconnect
- trip completed
- recoverable failure

### Required Android Auto Data

- active trip id and session id
- current stop index and leg index
- current destination name
- next maneuver or instruction text
- remaining distance and duration
- ETA
- reconnect state
- approved pitstops already chosen by the phone planner
- a stale-route or stale-session flag when resume is no longer safe

### Android Auto V1 Constraints

- Android Auto is an active-guidance surface, not a planning surface
- trip editing stays on the phone
- freeform discovery browsing stays on the phone
- booking, favorites management, and settings stay on the phone
- the car UI must avoid multi-step or attention-heavy flows

### Android Auto Follow-Up Work

- add Android Auto service and manifest metadata in the Android shell
- map shared navigation session data into Android Auto templates
- implement reconnect and stale-session messaging from the shared handoff rules
- validate against the automotive test matrix defined below

## CarPlay V1 Scope

### User Journey

CarPlay v1 follows the same phone-owned trip model as Android Auto.

Expected flow:

1. the traveler plans and saves a trip on the phone
2. the traveler starts or resumes an active trip on the phone
3. CarPlay connects and projects the active session
4. the car surface shows a narrow guidance experience with destination, next instruction, ETA, remaining distance, and approved pitstops
5. the traveler can continue, resume, or end the trip without entering broad discovery or trip-editing flows

### Required CarPlay States

- no active trip
- resumable trip available
- active trip guidance
- reconnecting after temporary disconnect
- trip completed
- recoverable failure

### Required CarPlay Data

- active trip id and session id
- current stop index and leg index
- current destination name
- next maneuver or instruction text
- remaining distance and duration
- ETA
- reconnect state
- approved pitstops prepared by the phone planner
- a stale-route or stale-session flag when resume should be blocked

### CarPlay V1 Constraints

- CarPlay is a guidance-first surface, not a trip-builder
- trip editing stays on the phone
- booking stays on the phone
- broad discovery browsing stays on the phone
- only safety-limited resume, continue, and end-trip style actions should appear in the vehicle
- CarPlay entitlement approval is a delivery blocker even when repo scaffolding exists

### CarPlay Follow-Up Work

- enable the approved CarPlay entitlement in the iOS target
- connect the current native CarPlay scaffold to the shared navigation session
- map shared navigation state into a driver-safe CarPlay template flow
- validate against the automotive test matrix defined below

## Phone-To-Car Handoff And Reconnect

### Ownership Rules

- the phone app is the durable owner of the active navigation session
- Android Auto and CarPlay project phone-owned state and never become the system of record
- projected surfaces may request safe actions, but the shared session layer remains authoritative

### Handoff Behavior

- if a trip is already active when projection connects, the vehicle should offer resume/continue guidance from the current session
- if no active trip exists, the vehicle should not expose full planner creation
- if the trip has changed since the session was persisted, the session must be treated as stale and blocked from silent resume

### Reconnect Rules

- temporary disconnect should preserve the phone-owned session and allow reconnect to the same active trip
- app restart should reload the last persisted session and re-evaluate resume eligibility
- reconnect should refresh route-derived fields and last known location when permissions allow
- if the route fingerprint no longer matches, the UI must show a stale-session recovery state instead of restoring guidance automatically

### Recovery UX Expectations

- success: resume the active trip and show current destination, next instruction, ETA, and remaining distance
- partial recovery: reconnect with session metadata but require route refresh before full guidance
- failure: show a safe recovery state that tells the traveler to continue on the phone

## Native Permissions, Background Lifecycle, And Policy Requirements

### iOS

- `NSLocationWhenInUseUsageDescription` is required for active-trip guidance and live-origin selection
- if background location becomes necessary for projected active guidance, the team must explicitly add the matching background mode and user-facing purpose copy instead of assuming foreground-only access is enough
- CarPlay requires Apple entitlement approval before shipping or fully testing the projected experience
- CarPlay templates must stay narrow and guidance-first

### Android

- location permissions must support live-origin selection and active-trip guidance
- release signing must not depend on the debug keystore
- Android Auto requires the correct app category, metadata, and automotive-safe templates before distribution
- Android builds need a documented runtime config flow for Maps and other native secrets

### Cross-Platform Lifecycle Assumptions

- the phone app owns persisted session state across foreground, background, disconnect, and reconnect transitions
- projected surfaces must tolerate session loss, stale sessions, and permissions denial without inventing their own recovery model
- location, route refresh, and reconnect behavior must degrade safely when native permissions are missing or revoked

### Policy Baseline

- in-car surfaces are for active-trip guidance, not broad exploration
- avoid freeform search and high-attention interactions in the vehicle
- keep booking, discovery browsing, and itinerary editing on the phone
- treat entitlement or store-review approval as a deployment gate, not a late-stage surprise

## Automotive Test Matrix And Validation Plan

### Core Scenarios

- start a saved trip on the phone, then connect projection
- reconnect after a temporary cable or wireless disconnect
- resume after app restart with a valid persisted session
- block resume when the route fingerprint is stale
- advance through intermediate stops and finish the trip cleanly
- surface approved pitstops without duplicating or losing them during reconnect

### Phone-Only Versus Projected Coverage

Phone-only coverage must verify:

- trip start and restore behavior
- session persistence
- route recalculation and stale-session detection
- stop progression and trip completion

Projected coverage must verify:

- active guidance state projection
- reconnect and disconnect behavior
- safe no-active-trip behavior
- stale-session recovery messaging
- parity of destination, ETA, and remaining-distance state with the phone-owned session

### Coverage Layers

- unit tests for shared session, route-fingerprint, and stop-progression logic
- integration tests for phone-side planner/session orchestration where practical
- simulator and emulator checks for initial automotive template wiring
- real-device checks for phone-shell permissions, reconnect, and archive/build verification

### Minimum Regression Expectations

- any change to navigation-session logic should run shared session tests
- any change to trip recalculation or pitstop insertion should run planner regression tests
- any new automotive projection work should be validated against reconnect, stale-session, and stop-progression scenarios before merge

## In-Car Observability And Failure Reporting

### Core Lifecycle Events

- session restored successfully
- session rejected from restore
- session needs reroute before resume
- reconnect started
- reconnect succeeded
- reconnect failed
- stop advanced
- trip completed
- trip abandoned
- projection connected
- projection disconnected

### Core Failure Events

- route refresh failed during active guidance
- reconnect failed after projection or app interruption
- stale-session recovery blocked resume
- location unavailable during start or reconnect
- approved pitstop state diverged from the active trip snapshot

### Minimum Metadata

- session id
- trip id
- current stop index
- reconnect state
- last sync source
- projection surface when applicable
- failure category
- recoverable vs non-recoverable classification

### Initial Implementation Guidance

- instrument these events in the shared session/controller layer where possible so phone and projected surfaces can report consistently
- keep payloads focused on operational debugging rather than sensitive user content
- treat this as a separate baseline from generic Maps quota monitoring

## Android Auto V1 Scope

Android Auto should start from a trip that was already planned on the phone.

Primary user flow:

1. The phone app has an active or resumable trip session
2. Android Auto connects and reads that session as a projection surface
3. The car surface shows the current destination, next instruction, ETA, remaining distance, and approved pitstop context
4. The user can resume or continue active guidance, but not edit the itinerary deeply in-car

Expected v1 Android Auto screens/templates:

- a home/resume entry point for the current trip
- an active guidance surface for current destination and next maneuver
- a lightweight stop-progress view showing current target stop and remaining route state
- a limited pitstop surface showing only already-approved or already-computed stops

Required Android Auto trip/session data:

- current trip id and name
- current target stop
- current leg index and stop index
- next instruction text
- ETA and remaining duration/distance
- reconnect and resume eligibility state
- approved pitstop summaries

Deferred or unsupported Android Auto flows:

- creating a new trip in the car
- broad place discovery or recommendation browsing
- booking, checkout, or saved-favorites management
- convoy setup or participant editing
- arbitrary stop reordering

Android Auto follow-up implementation tasks:

- add Android Auto dependencies and `CarAppService`
- map the shared navigation session into Android Auto templates
- wire reconnect and stale-session handling against the shared session layer
- validate templates against Android Auto review constraints

## CarPlay V1 Scope

CarPlay should follow the same projection model as Android Auto: the phone owns the durable session, and CarPlay reflects it through native templates.

Primary user flow:

1. The phone app has an active or resumable trip session
2. CarPlay connects and attaches to the current session
3. The CarPlay surface shows active-trip status, next instruction, ETA, remaining distance, and limited stop progression state
4. The user can resume or continue active guidance without entering complex planning flows

Expected v1 CarPlay surfaces:

- a root resume/status template
- an active trip template showing current destination and next instruction
- a lightweight stop-progress or trip-status summary
- a limited pitstop summary based on pre-approved or pre-computed stops

Required CarPlay trip/session data:

- trip identity and current route fingerprint
- current stop and leg position
- next instruction snapshot
- ETA and remaining duration/distance
- reconnect state and resume eligibility
- approved pitstops

Deferred or unsupported CarPlay flows:

- full itinerary planning or editing in-car
- open-ended search and browsing while driving
- booking flows
- convoy management
- any interaction that competes with active guidance

CarPlay follow-up implementation tasks:

- enable the CarPlay entitlement after Apple approval
- replace the placeholder CarPlay template with shared-session-backed UI
- wire handoff/reconnect behavior into the native CarPlay scene
- validate template behavior against Apple review constraints

## Phone-To-Car Handoff And Reconnect Rules

The phone remains the system of record for active-trip state.

Ownership rules:

- the phone app persists the durable navigation session
- Android Auto and CarPlay are projection surfaces, not competing session owners
- projected surfaces may request resume, advance, or end actions, but those actions resolve through the shared session layer

Reconnect behavior:

- on connect, the projected surface loads the latest persisted session
- if the route fingerprint still matches, projection resumes from the current stop/leg
- if the route fingerprint changed, projection should show a reroute-needed or resume-unavailable state
- if location is stale or unavailable, projection can still show trip context but should degrade guidance copy accordingly

Failure states:

- if no resumable session exists, show a no-active-trip state
- if persistence is corrupted or incomplete, reject resume and fall back to the phone
- if the projection disconnects, the phone continues owning the session and can remain active, paused, or reconnecting

## Native Permissions, Lifecycle, And Policy Baseline

### iOS / CarPlay

- require foreground location permission before active guidance depends on live location
- background behavior must remain narrow and justified by active-trip recovery or guidance
- CarPlay access depends on Apple entitlement approval
- CarPlay templates must stay navigation-first and avoid complex browsing or editing

### Android / Android Auto

- require location permissions for trip-origin and active-guidance use cases
- Android Auto support must stay within allowed categories and templates
- background/lifecycle behavior should support reconnect, but the phone remains the durable owner of session state
- any future foreground service or background location behavior must be justified by active guidance, not generic browsing

### Cross-platform policy constraints

- in-car surfaces should never expose the full planner UI
- discovery, booking, and broad content browsing remain phone-only
- reconnect and stale-session handling should prefer safety and clarity over aggressive auto-resume

## Automotive Test Matrix

Minimum scenarios to verify before automotive-capable releases:

- phone-only trip start, stop progression, and trip completion
- resume an active trip after app background/foreground
- reconnect to projection after temporary disconnect
- reject resume after route fingerprint mismatch
- advance through a route with manual stops and approved auto-pitstops
- recover gracefully when live location is unavailable

Coverage expectations:

- unit coverage for shared session transitions and route fingerprint logic
- simulator/emulator coverage for phone and projection lifecycle hooks
- device validation for at least one iPhone/CarPlay path and one Android/Android Auto path before release

## Automotive Monitoring Baseline

Minimum events worth instrumenting once in-car surfaces exist:

- session started, resumed, paused, abandoned, completed
- projection connected and disconnected
- resume rejected because of stale route fingerprint
- reconnect failed because of missing session or invalid state
- route refresh or next-instruction refresh failure

Minimum debugging context:

- platform and projection surface
- trip id and session id
- reconnect state
- current stop and leg indexes
- whether location was available when the failure occurred

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
- shared handoff and reconnect behavior still needs native consumers
- automotive validation and monitoring execution still remain open

## Closed Planning Baselines

- `#28` Define the Android Auto v1 scope and driver-safety constraints
- `#34` Define the CarPlay v1 scope and driver-safety constraints
- `#29` Define phone-to-car handoff and reconnect behavior for active trips
- `#30` Define the in-car test matrix and validation plan for Android Auto and CarPlay
- `#37` Define native permissions, background lifecycle, and platform policy requirements for iOS and Android automotive support

## Remaining Work / Issue Map

- `#25` Stand up the Android app shell and repository build scaffolding
- `#27` Extract shared trip and navigation domain logic from `TripPlanner`
- `#31` Add operational monitoring and failure reporting for in-car navigation sessions
- `#35` Implement the navigation session state machine and persistence layer
- `#36` Add platform adapters for storage, location, geocoding, and routing

## Main Risks

- too much planner logic still lives in the web UI layer
- browser-local persistence is still present
- shared models still leak browser `google.maps.*` types
- platform policy and compliance requirements are not fully settled
- reconnect and phone-to-car handoff are not fully implemented
