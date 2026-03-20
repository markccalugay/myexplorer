# GitHub Issue Drafts

`gh auth status` was checked on March 20, 2026 and reported that the active `markccalugay` token for `github.com` is invalid, so these issues could not be created through `gh issue create` yet.

## 1. Remove the hardcoded Google Maps API key and fail closed when env vars are missing

Severity: Critical

Evidence:
- `src/hooks/useGoogleMaps.ts:10`
- `src/hooks/useGoogleMaps.ts:53-71`

Why it matters:
- The client bundle currently falls back to a literal Google Maps API key when `VITE_GOOGLE_MAPS_API_KEY` is unset.
- That exposes a credential in source control and production bundles, makes rotation harder, and encourages running environments with hidden config drift.
- If the real env var is missing, the app should surface a clear configuration error instead of silently using a shared fallback key.

Suggested body:

```md
## Summary
Remove the hardcoded Google Maps API key fallback from the frontend and require explicit environment configuration for Maps.

## Problem
`src/hooks/useGoogleMaps.ts` currently does this:

- reads `VITE_GOOGLE_MAPS_API_KEY`
- falls back to a literal API key when the env var is missing

That means the repository and built client can expose a usable credential, and misconfigured deployments may appear to work while using the wrong key.

## Scope
- Remove the literal API key fallback
- Fail closed when the key is missing
- Show a user-facing configuration error for missing/invalid Maps config
- Document required env vars in `README.md`
- Add `.env.example` with the expected variables

## Acceptance Criteria
- No API keys are committed to source
- The app does not attempt to load Google Maps without `VITE_GOOGLE_MAPS_API_KEY`
- Missing config produces a clear UI error and console message
- Setup docs explain how to configure local/dev/prod env vars
```

## 2. Prevent stale route calculations from overwriting newer trip edits

Severity: High

Evidence:
- `src/components/TripPlanner.tsx:474-505`
- `src/components/TripPlanner.tsx:649-653`

Why it matters:
- `calculateJourneyDetails()` fires async route requests for every adjacent stop pair whenever `trip.stops` changes.
- There is no request versioning or cancellation, so slower responses from an older stop list can update the current trip after the user has already edited or reordered stops.
- That can display wrong distances, durations, and arrival times.

Suggested body:

```md
## Summary
Add stale-request protection to trip journey recomputation in `TripPlanner`.

## Problem
`calculateJourneyDetails()` issues async route requests every time the stop list changes, but older in-flight requests are not cancelled or ignored. If the user edits the itinerary quickly, a slower previous request can still call `updateTrip()` and overwrite the latest journey metadata.

## Scope
- Introduce request IDs or abort/cancellation semantics for journey recomputation
- Only apply results for the latest stop sequence
- Add regression coverage for rapid stop edits/reorders

## Acceptance Criteria
- Outdated route responses cannot overwrite the latest trip state
- Rapid add/edit/reorder flows keep distance, duration, and arrival times aligned with the current stop list
- Tests cover at least one stale-response scenario
```

## 3. Stop mutating stop objects during journey-detail recomputation

Severity: High

Evidence:
- `src/components/TripPlanner.tsx:483-495`

Why it matters:
- `const newStops = [...stops]` only clones the array, not the stop objects.
- The code then mutates `arrivalTime`, `distanceFromPrevious`, and `durationFromPrevious` on existing stop objects before React state is replaced.
- This breaks immutability assumptions and can produce subtle rendering bugs or make future memoization/state comparisons unreliable.

Suggested body:

```md
## Summary
Refactor `TripPlanner` journey-detail calculation to avoid mutating existing stop objects.

## Problem
`calculateJourneyDetails()` shallow-copies the stops array and then mutates nested stop objects in place. React state should be treated as immutable, especially in a planner flow that depends on comparisons and repeated async updates.

## Scope
- Build a fully cloned stop list before writing computed journey fields
- Keep calculation logic pure until the final `updateTrip()` call
- Add a focused test around recalculation to verify previous stop objects are not mutated

## Acceptance Criteria
- No existing `Stop` object instance is mutated during recomputation
- The recalculation path remains functionally correct
- Tests guard against accidental state mutation regressions
```

## 4. Gate Google Places quota-heavy fetches behind the active UI flow

Severity: Medium

Evidence:
- `src/App.tsx:63-69`
- `src/App.tsx:102-103`
- `src/hooks/usePlaces.ts:11-32`
- `src/hooks/usePitstops.ts:12-49`

Why it matters:
- `usePlaces(center)` is invoked at the app root, and `center` is initialized immediately to Manila.
- That means a nearby lodging search can run on app load even while the user is on the marketing/explore view and has not opened discovery yet.
- `usePitstops(route)` is also mounted globally, even though pitstop recommendations are only relevant after route planning.
- These unnecessary API calls add quota cost, startup noise, and harder-to-predict UX.

Suggested body:

```md
## Summary
Move Places and pitstop lookups behind explicit discovery/planning states instead of running them from the top-level app by default.

## Problem
The app mounts `usePlaces(center)` and `usePitstops(route)` in `App.tsx`, so third-party API calls can happen before the user enters the relevant flow.

## Scope
- Gate lodging lookup behind the discovery view or an explicit search action
- Gate pitstop lookup behind the route-planning flow
- Avoid running quota-heavy Google requests for inactive screens
- Add basic instrumentation/logging so request volume can be verified

## Acceptance Criteria
- No nearby-lodging request is made on initial app load unless discovery is active
- No pitstop lookup runs without a user-triggered route flow
- Functional behavior remains unchanged once the relevant view is active
```

## 5. Reset Google Maps loader state after load failures and expose a retry path

Severity: Medium

Evidence:
- `src/hooks/useGoogleMaps.ts:13`
- `src/hooks/useGoogleMaps.ts:26-74`
- `src/hooks/useGoogleMaps.ts:82-105`

Why it matters:
- The module caches the first loader promise in `googleMapsLoadPromise`.
- If the initial load fails because of network problems or an invalid key, that rejected promise remains cached.
- Every later hook consumer reuses the same failure state, so the app cannot recover without a full page reload.

Suggested body:

```md
## Summary
Make the Google Maps loader recoverable after transient failures.

## Problem
`googleMapsLoadPromise` is memoized globally, but failures do not clear the cached promise. A single failed load can permanently poison Maps usage for the rest of the session.

## Scope
- Reset cached loader state after rejection
- Expose a retry mechanism for Maps-dependent views
- Surface a user-facing error state with retry affordance

## Acceptance Criteria
- Transient Maps load failures can be retried without reloading the page
- Subsequent hook consumers can recover after the original failure
- Error handling is visible in the UI, not only the console
```

## 6. Add a baseline automated test harness and CI guardrails

Severity: Medium

Evidence:
- `package.json:6-29`
- `README.md:17-18`
- No `test` script is defined
- No test files are present in the repository
- No `.github/workflows` CI configuration is present

Why it matters:
- Current quality checks are limited to `tsc`, `vite build`, and `eslint`.
- Core planning logic, convoy helpers, and Google API integration boundaries have no automated regression protection.
- Without CI, even the existing build and lint steps are not enforced on pushes/PRs.

Suggested body:

```md
## Summary
Introduce a minimal automated test setup and CI workflow for MyExplorer.

## Problem
The repo has no `test` script, no test files, and no GitHub Actions workflow. Important planner logic currently depends on manual verification only.

## Scope
- Add a test runner suitable for the Vite/React stack
- Add initial unit tests for route normalization, convoy helpers, and planner state helpers
- Add a GitHub Actions workflow for install + lint + build + test
- Update `README.md` with local verification commands

## Acceptance Criteria
- `npm test` exists and runs in CI
- At least a small initial suite covers core non-UI logic
- PRs/pushes run lint, build, and tests automatically
```

## 7. Fix hook dependency instability in `ConvoyPanel`

Severity: Low

Evidence:
- `src/components/ConvoyPanel.tsx:75-82`
- `npm run lint` warning output on March 20, 2026

Why it matters:
- `participants` and `assignments` are recreated through fallback expressions before being used in a `useMemo` dependency list.
- React Hooks lint already flags this as unstable.
- It is not a production outage today, but it weakens memo behavior and makes the component easier to regress.

Suggested body:

```md
## Summary
Resolve the `react-hooks/exhaustive-deps` warning in `ConvoyPanel`.

## Problem
`participants` and `assignments` are derived with fallback logical expressions and then used as dependencies for `useMemo`, which causes unstable references and lint warnings.

## Scope
- Refactor derived convoy collections so memo dependencies are stable
- Keep behavior identical
- Ensure `npm run lint` completes without warnings

## Acceptance Criteria
- `npm run lint` reports zero warnings
- `ConvoyPanel` derived state remains functionally unchanged
```
