# Convoy Stop Proposals, Voting, and Organizer Approval (Issue #86)

**Status:** Specification & Architecture Proposal (**All core voting rules approved; no implementation yet**)
**Issue:** [#86](https://github.com/markccalugay/myexplorer/issues/86)
**Related Issues:** [#12](https://github.com/markccalugay/myexplorer/issues/12)–[#14](https://github.com/markccalugay/myexplorer/issues/14) (Convoy Voice), [#82](https://github.com/markccalugay/myexplorer/issues/82) (Navigation Session), [#83](https://github.com/markccalugay/myexplorer/issues/83) (Coordinate-free Stop Search), [#84](https://github.com/markccalugay/myexplorer/issues/84) (Unified Native Phone Experience)
**Date:** 2026-11-23

> [!IMPORTANT]
> **Status Separation:** This document explicitly separates **(1) Verified / Observed Codebase State**, **(2) Owner-Approved Product Decisions**, **(3) Deferred Future Enhancements & Minor Open Details**, and **(4) Unimplemented Architecture**. Do not treat unimplemented architecture—especially live route replacement during active navigation—as working today.

---

## 1. Current State Audit (Observed Facts)

All findings below come from **static source inspection** of the repository. No multi-user runtime tests, notification tests, or physical-device/DHU tests exist for convoy voting.

### 1.1 How a Stop Recommendation Is Proposed, Voted On, Approved, or Added Today

| Aspect | Observed Implementation | File Citation |
|---|---|---|
| **Proposal source** | **System-generated only.** No UI or API lets a participant or initiator propose a custom stop. During active web navigation, `TripPlanner.tsx` waits `5_000` ms (`RECOMMENDATION_DISPLAY_DELAY_MS`) on legs with `currentLegDistanceKm >= 25` or `currentLegDurationMinutes >= 30`, then queries `google.maps.places.Place.searchNearby` around the leg midpoint (`5000` m radius, max `6` results). | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L75-L81`, `L896-L1010`) |
| **Voting state & UI** | When `activeConvoyParticipants` (`convoy.participants` with `status === 'joined'`) has length `> 0`, `TripPlanner.tsx` renders a **Convoy Detour Vote** card (`ActiveNavigationRecommendationSession`) with a `300_000` ms (5-minute) countdown (`RECOMMENDATION_DECISION_WINDOW_MS`) and **Yes / No buttons for every joined participant on the same screen**. | [`src/types/trip.ts`](../src/types/trip.ts) (`L22-L54`), [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L697-L711`, `L1236-L1354`) |
| **Existing local tally rules** | Local `useEffect` hooks finalize the session: (1) if `pendingVotes === 0`, accepts when `yes > no`, otherwise rejects; (2) when the 5-minute timer hits `0`, accepts only if `yes > no + pending` (treating uncast votes against acceptance), otherwise sets status `expired`. *(Note: Timeout handling conflicts with Approved Decisions 2 & 3 below and will be replaced in Milestone 3.)* | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L846-L882`) |
| **Initiator manual approval** | **Missing in convoy mode.** `handleAcceptRecommendation` (**Add to Route**) and `handleRejectRecommendation` (**Not Now**) are only rendered when `activeConvoyParticipants.length === 0` (solo trip). | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L792-L800`, `L1292-L1347`) |
| **Phone navigation stop-edit lock** | **Stop editing is locked during active or paused navigation.** `apps/mobile/App.tsx` blocks adding, reordering, or removing stops whenever `isNavigationSessionInProgress(navigationSession)` is true (`"End navigation before adding, reordering, or removing stops so your phone and Android Auto stay in sync."`). `NavigationController.kt` only calls `nav.setDestinations(...)` in `startTripNavigationWithEnv` and `advanceToNextStop`; it has **no** live route-replacement method. | [`apps/mobile/App.tsx`](../apps/mobile/App.tsx) (`L1144-L1153`), [`NavigationController.kt`](../apps/mobile/android/app/src/main/java/com/thestillfoundation/myexplorer/navigation/NavigationController.kt) (`L304`, `L430`) |

### 1.2 Local vs. Shared / Synchronized Behavior & Identity

- **Ephemeral, single-device React state:** `recommendationSession` lives in `useState` inside `TripPlanner.tsx`, is **not persisted** to `localStorage`, and is **not synced** across devices.
- **Convoy invites are local-only:** `ConvoyPanel.tsx` and `src/lib/convoy.ts` generate invite tokens and add `ConvoyParticipant` records with `status: 'joined'` immediately in local `Trip.convoy` state.
- **No backend, auth, or organizer identity:** Neither `Trip` nor `Convoy` has an `organizerId`/`initiatorId`. `'organizer'` appears only as an `assignedBy` literal in `ConvoyPanel.tsx` (`L200`).
- **Issues #12–#14 (Convoy Voice):** Remain `OPEN` with no code implemented; they share the same missing prerequisites (participant identity, room/session lifecycle, presence, and realtime sync).
- **Notifications & background setup:** Android `NavigationForegroundService.kt` (`L160-L186`) uses `NotificationCompat` / `NotificationChannel` for active navigation foreground location; iOS (`apps/mobile/ios/`) has **no** `UIBackgroundModes` or `UNUserNotificationCenter` notification code yet.

### 1.3 Verified vs. Unimplemented Capability Summary

| Capability | Current Status | Verification Status |
|---|---|---|
| Pure convoy data model & mobile `Trip.convoy` preservation | Implemented (Local data only) | Unit-tested (`convoy.test.ts`, `persistence.test.ts`, `domain.test.ts`, `legacyMigration.test.ts`). |
| Local web along-the-route vote UI (`TripPlanner.tsx`) | Implemented (Local UI only) | **Not unit-tested**; timeout rule conflicts with Approved Decision 2. |
| Authoritative multi-user proposals, voting, initiator override, & sync | **Unimplemented** | Not tested. |
| Background notifications, countdowns, & vibration alerts | **Unimplemented** | Platform capabilities/permissions not yet verified on Android/iOS. |
| Live route replacement during active/paused navigation | **Unimplemented (Locked)** | Not tested; blocked by `App.tsx` lock and missing `NavigationController` live-update API. |

---

## 2. Product Decisions

### 2.1 Approved Decisions (Owner-Confirmed)

1. **One Vote Per Participant (Initiator Included):**
   - Each joined `ConvoyParticipant` gets **1 vote**.
   - The trip initiator is also a participant and gets 1 participant vote (in addition to initiator authority in Decision 6).
2. **Simple Majority of Cast Votes (`yes > no`); Non-Votes Excluded as Abstentions:**
   - A proposal passes when `yes` votes strictly outnumber `no` votes (`yes > no`) among votes actually cast.
   - Participants who do not vote by the deadline are treated as **abstaining** and **excluded** from the tally.
   - **Ties do not pass** (`yes === no` fails).
3. **No Votes at Deadline (`0 Yes`, `0 No`):**
   - If the deadline arrives with `0` `yes` and `0` `no` votes, the proposal **expires** (`expired`) and the stop is **not** added.
   - Participants are informed that the proposal was unsuccessful via an **in-app modal** when using the app, or a **notification** when appropriate and supported while the app is in the background (without guaranteeing notification delivery).
4. **Early Resolution When Everyone Votes:**
   - When all eligible (joined) participants have cast a vote, **stop the timer** and **resolve the proposal immediately** using `yes > no` (`accepted_majority` if `yes > no`, `rejected_majority` if `yes <= no`).
5. **5-Minute Timer + Up to 3 Initiator Extensions (1, 2, or 5 Minutes):**
   - Every new proposal opens with a **5-minute** (`300_000` ms) voting window (`extensionsUsed = 0`, `maxExtensions = 3`).
   - While a proposal remains `open`, the trip initiator may extend the deadline **up to 3 times**, choosing **1, 2, or 5 additional minutes** per extension.
   - All participants must see the updated deadline (`expiresAt`) and how many extensions remain (`3 - extensionsUsed`).
   - **Distance-based expiry is removed** from the initial voting rules (see §2.2).
6. **Initiator Override & Proposer Withdrawal (Atomic Resolution):**
   - The trip initiator can **approve** or **reject** an `open` proposal at any time.
   - The proposer can **withdraw** their own proposal while it remains `open`.
   - **Competing actions:** Votes (including the final vote that triggers early resolution), initiator approve/reject, proposer withdrawal, deadline expiry, and trip completion execute as **atomic server-side state transitions** guarded by `status === 'open'` and `tripRevision`. Only the **first** committed transition from `open` → terminal succeeds; any concurrent or late action sees the terminal state and is rejected without applying a second decision.
7. **Automatic Stop Addition & Honest Routing Failure State:**
   - Only an **approved** proposal (`accepted_majority` or `accepted_organizer`) adds the stop to the authoritative trip route automatically.
   - A **rejected**, **withdrawn**, **expired**, or **cancelled** proposal must **never** be added to the route.
   - If route recalculation fails after stop acceptance, the system must show the convoy an **honest failure/retry state** and must **not** claim the route was successfully updated.
8. **Trip Completion Cancels Open Proposals:**
   - When the trip concludes, any `open` proposal is immediately **cancelled** (`cancelled`) and its stop is **not** added.
   - Participants are informed that voting ended because the trip concluded (via in-app modal when active in the app, or notification when appropriate and supported in the background, subject to platform notification support and without delivery guarantees).

#### Concrete Tallying & Timer Extension Examples

| Scenario | Cast Votes (`Yes` / `No`) | Non-Votes (Abstain) | Timing | Outcome |
|---|---|---|---|---|
| **Large convoy (`51 Yes` / `50 No`)** | `51 Yes`, `50 No` | 10 | Deadline (or early if 101 total) | **Passes** (`51 > 50`) |
| **Large convoy tie (`50 Yes` / `50 No`)** | `50 Yes`, `50 No` | 10 | Deadline | **Does not pass** (`50 === 50`, tie) |
| **5 participants, all 5 vote early (`3 Yes` / `2 No`)** | `3 Yes`, `2 No` | 0 | **Stops timer immediately** | **Passes** (`3 > 2`) |
| **5 participants, 3 vote (`2 Yes` / `1 No`)** | `2 Yes`, `1 No` | 2 | Deadline | **Passes** (`2 > 1`) |
| **4 participants, 2 vote (`1 Yes` / `1 No`)** | `1 Yes`, `1 No` | 2 | Deadline | **Does not pass** (`1 === 1`, tie) |
| **4 participants, 0 vote (`0 Yes` / `0 No`)** | `0 Yes`, `0 No` | 4 | Deadline | **Expires** (`expired`); stop not added; in-app modal / bg notification |

- **Extension example:** Proposal opens at `12:00:00` → `expiresAt = 12:05:00`, `extensionsRemaining = 3`.
  1. At `12:04:10`, initiator extends by `+2 min` → `expiresAt = 12:07:00`, `extensionsRemaining = 2`.
  2. At `12:06:30`, initiator extends by `+5 min` → `expiresAt = 12:12:00`, `extensionsRemaining = 1`.
  3. At `12:11:45`, initiator extends by `+1 min` → `expiresAt = 12:13:00`, `extensionsRemaining = 0`.
  4. Any 4th extension request is rejected (`NO_EXTENSIONS_REMAINING`).

### 2.2 Deferred Enhancements & Minor Open Details

- **Distance-based expiry (Deferred Future Enhancement):** Excluded from `#86` initial scope. Any future distance-based expiry will require defining: which vehicle is the **lead vehicle**, what happens when lead location is unavailable or stale, GPS accuracy tolerances, and fallback to time-only expiry on failure.
- **Minor UX detail (not blocking Milestone 1):** Whether a participant may **change** their already-cast vote while the proposal remains `open` (before all participants have voted). *(Recommended default: allow changing a vote while `open`; once the final participant casts their vote, the proposal resolves immediately.)*

---

## 3. Unimplemented Architecture & Platform Design

### 3.1 Authoritative Proposal & Sync State Machine

- **Authoritative store:** A trip-scoped backend store holds `Trip` (`tripRevision: number`, `initiatorId: string`) and `StopProposal` records (`id`, `tripId`, `proposedByParticipantId`, `candidate`, `targetStopId`, `status`, `expiresAt`, `extensionsUsed`, `votes`, `appliedStopId`, `routeSyncState`).
- **State transitions (`open` → terminal happens at most once):**
  - `open` → `accepted_majority` (all eligible voted with `yes > no`, or deadline reached with `yes > no`)
  - `open` → `rejected_majority` (all eligible voted with `yes <= no`, or deadline reached with `yes <= no` and `yes + no > 0`)
  - `open` → `expired` (deadline reached with `yes === 0 && no === 0`)
  - `open` → `accepted_organizer` (initiator approves while `open`)
  - `open` → `rejected_organizer` (initiator rejects while `open`)
  - `open` → `withdrawn` (proposer withdraws while `open`)
  - `open` → `cancelled` (trip concludes while `open`)
- **Identity & authorization:** Each joined `ConvoyParticipant` maps to an authenticated `userId` / verified session token. Clients can only vote for themselves while `open`; only `initiatorId` can approve, reject, or extend; only `proposedByParticipantId` can withdraw.

### 3.2 Live Route Changes & Cross-Device Reconciliation *(UNIMPLEMENTED)*

Because `apps/mobile/App.tsx` (`L1144-L1153`) currently locks stop edits during active/paused navigation and `NavigationController.kt` lacks live route replacement, supporting automatic stop addition mid-trip requires the following unimplemented work:

1. **Authoritative Trip & Idempotent Insertion:**
   - When a proposal commits `open` → `accepted_majority` or `accepted_organizer`, the backend atomically increments `tripRevision` and inserts `Stop` with deterministic `id: "proposal:${proposalId}"` and `proposalId`.
   - Replaying an acceptance event or reconnecting checks `stops.some(s => s.id === "proposal:" + proposalId)` so a stop can **never be inserted twice**.
2. **Phone & NavigationController Live Update (`apps/mobile`):**
   - Add an explicit `NavigationController.updateActiveRouteStops(...)` path (guarded by `operationId` + `sessionId` + `tripRevision`) that updates `NavigationSessionRepository` and calls `nav.setDestinations(remainingStops)` without tearing down the active session.
   - **Concurrent updates:** If `tripRevision` advances while a route recalculation is in flight, the stale callback is discarded and recalculation restarts against the latest authoritative stop list.
   - **Failure / Retry:** If `setDestinations` returns a non-`OK` `SdkRouteStatus` or network error, keep the accepted stop in authoritative trip state with `routeSyncState = 'recalc_failed'`, surface an explicit error + **Retry Route Update** action to the group, and **do not** report the route as updated.
3. **Android Auto Reconciliation (`MyExplorerCarScreen.kt`):**
   - `NavigationSessionRepository` listeners notify `MyExplorerCarScreen` when `tripRevision` / stops update, refreshing the car surface cleanly under Car App Library distraction limits (no multi-row voting lists or free-text search while driving; concise outcome alerts only unless parked/host-permitted). CarPlay remains future work.

### 3.3 Background Experience, Notifications, & Connectivity

- **Convoy membership persistence:** Backgrounding, screen lock, network drops, dead battery, or OS process termination **never removes** a participant from the convoy. On return/reconnect, the client fetches the authoritative `Trip` + `StopProposal` snapshot and reconciles UI state (including outcomes decided while offline).
- **In-app modals & background notifications:**
  - When a proposal fails (`expired` with 0 votes, `rejected_*`, or `cancelled` on trip end), show an **in-app modal** to active foreground users and send a **background notification** where appropriate and supported.
  - While `open`, show an ongoing trip/vote notification with proposal summary and countdown (`expiresAt`) where supported, plus vibration / attention alert when a vote needs attention, subject to user permissions and device settings.
  - **No delivery guarantees:** Persistent background connections and instant notification delivery **cannot be guaranteed** due to OS battery optimization, Doze/App Standby, iOS background suspension, permission denials, or network loss.
- **Platform-specific constraints (to verify before implementation):**
  - **Android:** Extend existing `NotificationCompat` / `NotificationChannel` infrastructure (`NavigationForegroundService.kt`), gated on runtime `POST_NOTIFICATIONS` (Android 13+), channel importance, DND, and device vibration settings; remote push (FCM) is needed when the app process is killed or Doze throttles sockets.
  - **iOS:** Requires adding `UNUserNotificationCenter` permission flow and APNs remote push (`apps/mobile/ios/` currently has none), as iOS suspends background WebSockets shortly after backgrounding.
  - **Web:** Background tabs throttle timers/WebSockets; Web Notifications and `navigator.vibrate` require explicit permission and vary across mobile browsers.

---

## 4. Implementation Milestones & Acceptance Criteria

1. **Milestone 1 — Shared Proposal Domain Contract & Deterministic Reducer:**
   - Pure TypeScript types and reducer implementing Approved Decisions 1–8 (`yes > no`, abstention exclusion, 0-vote expiry, early resolution when all vote, 5-min timer + up to 3 extensions of 1/2/5 min, atomic initiator override / proposer withdrawal / trip-end cancellation, idempotent `proposal:${proposalId}` insertion).
   - *Tests:* Unit tests for **no votes at deadline** (`0/0 -> expired`), **all votes arriving early** (timer stopped, immediate `yes > no`), **ties** (`1/1`, `2/2`, `50/50 -> rejected`), **large convoy** (`51 Yes / 50 No -> accepted`), **trip completion** (`open -> cancelled`, no stop added), **extension limits** (`1/2/5` min up to 3x), **races between final vote and initiator action** (only first committed transition applies), and **duplicate-insertion prevention**.
2. **Milestone 2 — Authoritative Backend Sync, Identity, & Reconnect Layer:**
   - Trip-scoped realtime store, participant/initiator authorization, atomic proposal transitions, and offline/reconnect state reconciliation.
   - *Acceptance & Tests:* Multi-client integration tests for concurrent votes, final-vote vs. initiator-override vs. expiry vs. trip-end races, background/offline reconnect recovery, and duplicate-decision rejection.
3. **Milestone 3 — Web/Phone UI, Live `NavigationController` Route Updates, & Notifications:**
   - Replace `TripPlanner.tsx` local vote UI; add native phone proposal/vote UI (`#84`) using `#83` place search; implement `NavigationController` live `setDestinations` reconciliation + failure/retry UI; add in-app outcome modals, platform-gated ongoing countdown notifications, and vibration alerts.
   - *Acceptance & Tests:* Unit/component tests + Android JUnit tests for route-recalc failure/retry, concurrent `tripRevision` updates, in-app modals for unsuccessful/cancelled votes, notification permission-denied fallback, and vibration/DND handling.
4. **Milestone 4 — Android Auto Alerts & Multi-Device / DHU Verification:**
   - Distraction-safe Android Auto outcome notifications in `MyExplorerCarScreen.kt`; end-to-end verification across multiple physical devices (Android/iOS/Web), background/network-loss recovery, and Android Auto DHU/vehicle.
