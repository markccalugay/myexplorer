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

## Idea Breakdown Drafts

These drafts break the ideas in `IDEAS.md` into smaller GitHub issues that can be prioritized independently. They assume the current app state described in `README.md` and `TECH_STACK.md`: frontend-first, browser `localStorage` today, and backend/realtime infrastructure still undecided.

## 8. Define the realtime architecture for convoy voice features

Type: Foundation

Why it matters:
- The walkie-talkie idea depends on realtime presence, audio transport, permission handling, and likely a backend/service choice that does not exist yet.
- The repo currently has convoy UI concepts, but no implemented backend, auth, or realtime layer.

Suggested body:

```md
## Summary
Choose and document the technical approach for convoy walkie-talkie support before implementation begins.

## Problem
Push-to-talk convoy audio needs more than frontend UI. We need a clear decision on:

- realtime transport/provider
- room/session lifecycle
- participant identity and presence
- audio permission handling
- whether this feature is web-first only or needs a mobile-compatible path from day one

Without this, implementation work will likely be throwaway.

## Scope
- Compare 2-3 implementation options for realtime audio and signaling
- Decide what the MVP supports on web
- Define convoy room model, participant identity assumptions, and session lifecycle
- Document security/privacy constraints for microphone usage
- Capture the decision in project docs

## Acceptance Criteria
- A written architecture decision exists for convoy voice
- MVP scope is explicitly limited and approved
- Required backend/service dependencies are identified
- Follow-up implementation issues can reference the chosen design
```

## 9. Add a push-to-talk interaction model to the convoy UI

Type: Feature

Why it matters:
- Even before full voice transport lands, the product needs a clear push-to-talk interaction that fits the current convoy experience.
- The UI should define hold-to-talk, participant status, active speaker, and failure states in a way that can later connect to realtime transport.

Suggested body:

```md
## Summary
Design and implement the frontend push-to-talk controls for convoy communication.

## Problem
The walkie-talkie concept is not actionable until the UI behavior is clear. Users need obvious controls and feedback for:

- who is connected
- who is currently speaking
- when the mic is muted or unavailable
- what happens while the user is pressing and releasing talk

## Scope
- Add a push-to-talk button and relevant convoy status states
- Show connected participants and active speaker feedback
- Add loading, disconnected, and mic-permission-denied states
- Keep the UI transport-agnostic enough to work with the chosen realtime provider later

## Acceptance Criteria
- The convoy UI exposes a clear push-to-talk control
- Users can understand connection/speaking state without reading docs
- Permission and error states are visible in the interface
- The component API is ready to plug into a realtime voice layer
```

## 10. Implement MVP convoy voice sessions for active trips

Type: Feature

Why it matters:
- This is the actual user-facing walkie-talkie feature: joining a trip-scoped audio session and speaking to other participants.
- It should be narrowly scoped so the first version is realistic.

Suggested body:

```md
## Summary
Ship an MVP convoy voice experience for active trip participants.

## Problem
After the architecture and UI are defined, the product still needs a real end-to-end audio session flow that lets participants join the same convoy channel and communicate in real time.

## Scope
- Create/join a trip-scoped convoy voice session
- Publish microphone audio only while push-to-talk is active
- Show participant presence and basic connection state
- Handle reconnects and participant leaves
- Instrument basic usage and failure events

## Acceptance Criteria
- Two or more participants can join the same convoy session
- Pressing and holding talk sends audio only while active
- Join/leave/reconnect states are handled without breaking the UI
- Basic logs/telemetry exist for connection failures and session joins
```

## 11. Add religious-stop preferences and data classification rules

Type: Foundation

Why it matters:
- “Religious stop recommendations” can mean several things: churches, monasteries, shrines, chapels, pilgrimage sites, or other worship destinations.
- The app needs explicit preference and classification rules before recommendations can be shown consistently.

Suggested body:

```md
## Summary
Define how MyExplorer identifies and filters religious destinations for stop recommendations.

## Problem
The current idea is broad and includes preference-sensitive categories such as Catholic churches and related destinations. We need a clear data model for:

- which place types qualify
- which user preferences are supported
- how inclusive vs. denomination-specific filtering works
- what minimum metadata is needed before surfacing a recommendation

## Scope
- Define supported religious place categories for MVP
- Define user preference fields and defaults
- Determine what data can come from current place providers vs. what needs curation
- Document any content or ranking guardrails

## Acceptance Criteria
- Religious stop categories are explicitly defined
- User preference inputs are documented
- Recommendation eligibility rules are documented
- Follow-up implementation issues have a stable contract to build against
```

## 12. Surface religious stop recommendations in the route-planning flow

Type: Feature

Why it matters:
- Once preferences and categories exist, the app needs a user-facing route experience that suggests relevant religious stops without overwhelming the planning flow.

Suggested body:

```md
## Summary
Add optional religious stop recommendations to trip and route planning.

## Problem
Users currently have no way to request or discover worship-related stops while planning a route. The feature should feel like an optional recommendation layer, not a forced interruption.

## Scope
- Add a user control to enable/disable religious stop suggestions
- Show nearby qualifying religious destinations along a route
- Support adding a suggested stop into the trip plan
- Display enough place context to help users decide

## Acceptance Criteria
- Religious recommendations are opt-in or preference-driven
- Suggested stops appear only in relevant planning flows
- Users can add a suggested destination into their itinerary
- The route-planning UX remains usable on desktop and mobile
```

## 13. Add content review and user-trust safeguards for religious recommendations

Type: Trust / Content

Why it matters:
- Recommendations about religious destinations can feel especially sensitive if they are mislabeled, irrelevant, or overconfident.
- The product needs guardrails around ranking, presentation, and uncertainty.

Suggested body:

```md
## Summary
Add trust, labeling, and fallback rules for religious stop recommendations.

## Problem
Place-provider data can be incomplete or ambiguous. If the app suggests a destination as a religious stop without enough confidence, users may get misleading recommendations.

## Scope
- Define minimum metadata required before surfacing a recommendation
- Add UI copy for uncertain or sparsely described places
- Provide a fallback when no strong recommendations exist
- Document review considerations for denomination-specific recommendations

## Acceptance Criteria
- Low-confidence recommendations are filtered or clearly labeled
- Empty-state UX exists when no relevant stops are found
- Recommendation copy avoids overclaiming unsupported metadata
- The feature has documented trust/content guardrails
```

## 14. Define the merchandise catalog and order lifecycle for trip add-ons

Type: Foundation

Why it matters:
- Merchandise ordering introduces product, variant, pricing, fulfillment, and reorder questions that the current app does not model yet.
- The repo has no backend or commerce system today, so this needs a clear foundation issue first.

Suggested body:

```md
## Summary
Define the MVP commerce model for trip merchandise add-ons.

## Problem
The merch idea spans multiple moments:

- during initial booking
- optional add-ons per traveler or group
- post-trip reorders

Before UI work begins, we need a shared definition of what is being sold and how orders behave.

## Scope
- Define MVP catalog items, variants, and personalization rules
- Define whether merchandise is per booking, per traveler, or both
- Document pricing, inventory, fulfillment, and reorder assumptions
- Identify required backend/provider dependencies

## Acceptance Criteria
- A written merch MVP spec exists
- Catalog and order concepts are defined clearly enough for implementation
- Booking-time add-ons and post-trip reorders are both addressed
- Follow-up feature issues can build on the agreed model
```

## 15. Add booking-time merchandise add-ons to the reservation flow

Type: Feature

Why it matters:
- The most direct business value in the merch idea is offering optional items during booking, when purchase intent is already high.

Suggested body:

```md
## Summary
Let users add optional merchandise to a booking before checkout/confirmation.

## Problem
There is currently no way to attach optional merchandise such as shirts, hats, jackets, socks, towels, flags, or stickers to a trip booking.

## Scope
- Add a merchandise step or section in the booking flow
- Allow variant selection where applicable
- Show pricing impact before confirmation
- Persist selected merch with the booking record or interim booking state

## Acceptance Criteria
- Users can add at least one merchandise item during booking
- Variant choices are captured correctly
- Pricing updates are visible before confirmation
- Selected merchandise stays attached to the booking state after refresh/navigation
```

## 16. Add post-trip merch reorder and repeat-purchase entry points

Type: Feature

Why it matters:
- The idea explicitly includes ordering merch again after the trip, which is a different journey from checkout-time add-ons.

Suggested body:

```md
## Summary
Create a post-trip reorder flow for past merchandise purchases.

## Problem
Users may want replacement items or additional matching merch after travel ends, but the app has no post-trip purchase path today.

## Scope
- Add a reorder entry point from trip history or booking details
- Preload prior merchandise selections when possible
- Let users adjust quantities or variants before reordering
- Handle missing/unavailable items gracefully

## Acceptance Criteria
- Past trips expose a clear reorder path
- Users can re-order previously purchased merchandise with minimal friction
- Unavailable products are handled without blocking the rest of the reorder flow
- The reorder experience is clearly distinct from initial booking add-ons
```

## 17. Add saved-route favorites for places discovered during a trip

Type: Feature

Why it matters:
- Saving favorite restaurants, cafes, gas stations, and stops is a natural extension of the existing trip and route experience.
- This is feasible as a frontend-first feature even before backend sync exists.

Suggested body:

```md
## Summary
Let users save route-related places as favorites for future trips.

## Problem
Users can currently discover and plan stops, but they cannot mark places they want to remember the next time they travel.

## Scope
- Add a “save favorite” action for eligible places and stops
- Store enough metadata to recognize the saved place later
- Support frontend persistence for MVP, with room for later account sync
- Add basic management actions such as save/remove

## Acceptance Criteria
- Users can favorite route-relevant places from the current app flow
- Favorites persist across sessions for the same browser
- Users can remove saved places
- Saved data is structured so later sync is possible
```

## 18. Re-surface saved favorites when users travel a similar route again

Type: Feature

Why it matters:
- The value of favorites is not just storage; it is timely resurfacing when the user is near or planning a similar route again.

Suggested body:

```md
## Summary
Show previously saved favorite places when a user plans or travels a matching route again.

## Problem
A favorites feature is incomplete if saved places never come back into the user journey. The app should recognize when the user is near a previously saved stop or planning a similar path.

## Scope
- Define what counts as a similar route for MVP
- Match saved favorites against the active route or nearby stops
- Surface favorites in a lightweight, non-disruptive way
- Let users jump from the resurfaced card into place details or add the stop again

## Acceptance Criteria
- Similar-route matching logic is defined for MVP
- Relevant favorites appear during route planning or navigation prep
- Users can reopen or re-add a saved place from the resurfaced recommendation
- The resurfacing logic avoids spamming unrelated favorites
```

## 19. Add a favorites library and route-history management UI

Type: Feature

Why it matters:
- Once users save places, they also need a dependable place to review, prune, and reuse them outside the exact route where they were discovered.

Suggested body:

```md
## Summary
Create a dedicated saved-places management experience.

## Problem
Users need a central place to manage favorites, especially if they save multiple restaurants, tourist spots, pit stops, and gas stations across different trips.

## Scope
- Add a saved places screen or panel
- Support filtering by category
- Show where/when the place was saved if available
- Let users remove outdated or unwanted favorites

## Acceptance Criteria
- Users have a clear place to browse saved favorites
- Saved places can be filtered by type or category
- Remove/manage actions work reliably
- The UI supports future expansion to synced account data
```
