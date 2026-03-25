# Android Navigation Session Model

## Purpose

This note defines the minimum persistent navigation-session model MyExplorer will need for an Android app and for future phone-to-car handoff scenarios such as Android Auto or CarPlay.

It is based on the current repo state, where MyExplorer is still a web-first React and Vite app and trip/navigation state is still concentrated in browser and component state.

## Current State

The current implementation keeps important planning and navigation state in React components and browser storage:

- `src/App.tsx` persists saved trips in `localStorage`
- `src/components/TripPlanner.tsx` keeps active navigation state in component state
- `src/components/TripPlanner.tsx` currently owns fields such as `isNavigating`, `currentStopIndex`, `currentLocation`, `navigationRoute`, `tripStartedAt`, and `elapsedTimeMs`

That is enough for the current web app, but not durable enough for Android lifecycle events, process death, reconnects, or a vehicle projection session.

## Design Goals

- Keep the session model platform-agnostic
- Persist only what is required to resume an active trip
- Separate durable session data from derived UI state
- Support restore after app restart, backgrounding, or phone-to-car reconnect
- Keep the phone app and car app aligned on the same active-trip contract

## Session Scope

The navigation session should represent one active trip at a time.

It should answer:

- Which trip is active?
- Where is the user in the route?
- What is the next actionable instruction?
- What should survive a restart?
- What can be recomputed when the app reconnects?

## Proposed Session Model

The persistent session should include these fields:

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

Suggested meaning:

- `sessionId`: unique ID for the active navigation run
- `tripId`: links the session back to the saved trip
- `tripSnapshot`: minimal trip data needed to resume without depending on volatile UI state
- `status`: lifecycle state for the navigation session
- `startedAt` and `updatedAt`: timestamps for audit and recovery
- `currentStopIndex`: the next stop to navigate toward
- `currentLegIndex`: the current route leg within the trip
- `currentLocation`: last known GPS position, if available
- `lastKnownLocationAt`: when that location was observed
- `nextInstruction`: the next maneuver or summary instruction
- `remainingDistanceMeters` and `remainingDurationSeconds`: recovery-friendly route summary
- `eta`: estimated arrival time for the current leg or destination
- `approvedPitstops`: pre-approved pitstops that should remain available on resume
- `routeFingerprint`: stable signature for the current route shape
- `resumeToken`: optional token for reconnecting a phone/car session
- `reconnectState`: last known reconnect status
- `lastSyncSource`: whether the latest update came from the phone UI, background logic, or a vehicle projection surface

## Lifecycle States

The session should use a small number of states:

- `idle`: no active trip
- `preparing`: trip selected, session being assembled
- `active`: navigation is in progress
- `paused`: session exists but guidance is temporarily suspended
- `reconnecting`: app or vehicle is trying to restore state
- `completed`: trip finished normally
- `abandoned`: session ended without completion

Transitions should be explicit:

- `idle` -> `preparing` when navigation begins
- `preparing` -> `active` once routing and session data are ready
- `active` -> `paused` when the app is backgrounded or guidance is interrupted
- `paused` -> `reconnecting` when the app regains focus or the phone reconnects to the vehicle
- `reconnecting` -> `active` when state is successfully restored
- `active` -> `completed` when the final destination is reached
- any non-terminal state -> `abandoned` if the user exits navigation without finishing

## Persistence Expectations

Only a subset of the session should be persisted durably.

Persist:

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

Do not persist as source of truth:

- raw map view state
- component-local animation state
- ephemeral recommendation UI state
- transient loading flags
- view-only layout state

Those values can be recomputed from the trip snapshot, route data, or the current platform session.

## Restore And Reconnect Behavior

When Android launches or resumes, it should be able to answer three questions quickly:

1. Is there an active session?
2. Can the current trip still be resumed safely?
3. Do we need to refresh route and location data before showing guidance?

Recommended restore flow:

- Load the last persisted session
- Verify the session is still active or paused
- Validate that the trip snapshot still matches the current trip
- Recompute route-dependent values if the route fingerprint is stale
- Refresh the last known location if permissions are available
- Move the session back to `active` or `reconnecting`

If the session cannot be safely resumed:

- preserve the saved trip
- mark the session as `abandoned` or `completed` as appropriate
- return the user to normal trip-planning UI
- avoid showing stale navigation guidance

For vehicle handoff, the phone app should remain the durable owner of the session. The vehicle surface should act as a projection of that session, not a separate competing source of truth.

## Platform Boundaries

The session model should stay independent of any specific UI toolkit.

Shared logic should own:

- state transitions
- session validation
- route fingerprinting
- resume eligibility
- stop and leg sequencing

Platform code should own:

- permissions
- GPS access
- background lifecycle events
- vehicle projection adapters
- rendering of maps or turn-by-turn UI

## Open Questions

- What storage backend will Android use for durable session state?
- Should route refresh happen automatically on resume, or only after explicit user action?
- How much of `tripSnapshot` should be duplicated versus referenced by ID?
- What is the minimum safe reconnect window for vehicle projection?

## Status

This is a planning baseline. The next implementation step is to extract the shared session contract into code and wire it to the Android host strategy once that decision is finalized.
