# Convoy Stop Proposals, Voting, and Organizer Approval (Issue #86)

**Status:** Specification & Architecture Proposal (**Owner product decisions recorded; passed-stop technical design open; no implementation yet**)
**Issue:** [#86](https://github.com/markccalugay/myexplorer/issues/86)
**Related Issues:** [#12](https://github.com/markccalugay/myexplorer/issues/12)–[#14](https://github.com/markccalugay/myexplorer/issues/14) (Convoy Voice), [#82](https://github.com/markccalugay/myexplorer/issues/82) (Navigation Session), [#83](https://github.com/markccalugay/myexplorer/issues/83) (Coordinate-free Stop Search), [#84](https://github.com/markccalugay/myexplorer/issues/84) (Unified Native Phone Experience)
**Date:** 2026-11-24

> [!IMPORTANT]
> **Status Separation:** This document explicitly separates **(1) Verified / Observed Codebase State**, **(2) Owner-Approved Product Decisions**, **(3) Proposed Technical Direction & Open Technical Questions**, and **(4) Unimplemented Architecture**. Do not treat unimplemented architecture—especially live route replacement during active navigation, passed-stop detection, or per-person identity—as working today.

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

### 1.2 Participant Model Mismatch & Identity Gaps (`ConvoyParticipant` vs. One Vote Per Person)

- **Current `ConvoyParticipant` model ([`src/types/trip.ts`](../src/types/trip.ts) `L72-L88`, [`apps/mobile/src/planner/domain.ts`](../apps/mobile/src/planner/domain.ts) `L43-L59`):**
  - `ConvoyParticipant` has `id`, `kind: 'individual' | 'group'`, `displayName`, `status: 'pending' | 'joined' | 'declined'`, and `members: ConvoyMember[]` (`id`, `displayName`, `isPrimary`).
  - **Mismatch with product intent:** `TripPlanner.tsx` keys votes by `participant.id` (`votes[participant.id]`), which gives a `'group'` participant containing multiple `ConvoyMember`s only **one vote for the entire group** instead of one vote per individual person.
  - **Missing identity & duplicate-vote protection:** `ConvoyMember` currently has **no `userId`, verified device/account identity, or per-member join/leave status**. Neither `Trip` nor `Convoy` has an `organizerId`/`initiatorId` (`'organizer'` appears only as an `assignedBy` literal in `ConvoyPanel.tsx` `L200`). Individual identity and cross-device duplicate-vote prevention **do not exist today**.
- **Local-only state & #12–#14:** `recommendationSession` is ephemeral React `useState`; `ConvoyPanel.tsx` / `convoy.ts` create local invite tokens without a backend; issues `#12`–`#14` (convoy voice) remain `OPEN` with no implementation.
- **Notifications & background setup:** Android `NavigationForegroundService.kt` (`L160-L186`) uses `NotificationCompat` / `NotificationChannel` for active navigation foreground location; iOS (`apps/mobile/ios/`) has **no** `UIBackgroundModes` or `UNUserNotificationCenter` notification code yet.

### 1.3 Verified vs. Unimplemented Capability Summary

| Capability | Current Status | Verification Status |
|---|---|---|
| Pure convoy data model & mobile `Trip.convoy` preservation | Implemented (Local data only) | Unit-tested (`convoy.test.ts`, `persistence.test.ts`, `domain.test.ts`, `legacyMigration.test.ts`). |
| Local web along-the-route vote UI (`TripPlanner.tsx`) | Implemented (Local UI only) | **Not unit-tested**; keys votes by `ConvoyParticipant` (group = 1 vote) and timeout rule conflicts with Decision 2. |
| Per-person identity, duplicate-vote prevention, & multi-user sync | **Unimplemented** | Not tested. |
| Background notifications, countdowns, & vibration alerts | **Unimplemented** | Platform capabilities/permissions not yet verified on Android/iOS. |
| Live route replacement during active/paused navigation | **Unimplemented (Locked)** | Not tested; blocked by `App.tsx` lock and missing `NavigationController` live-update API. |

---

## 2. Product Decisions

### 2.1 Approved Decisions (Owner-Confirmed)

1. **One Vote Per Person (Initiator Included):**
   - **Each individual person** participating in the convoy gets **1 vote**, including the trip initiator (who also has initiator authority in **Decision 6**).
   - A group (`ConvoyParticipant` with `kind: 'group'`) containing multiple people must **not** automatically receive only one vote for the entire group; every individual person (`ConvoyMember`) in the convoy gets their own vote.
2. **Simple Majority of Cast Votes (`yes > no`); Non-Votes Excluded as Abstentions:**
   - A proposal passes when `yes` votes strictly outnumber `no` votes (`yes > no`) among votes actually cast.
   - People who do not vote by the deadline are treated as **abstaining** and **excluded** from the tally.
   - **Ties do not pass** (`yes === no` fails).
3. **No Votes at Deadline (`0 Yes`, `0 No`):**
   - If the deadline arrives with `0` `yes` and `0` `no` votes, the proposal **expires** (`expired`) and the stop is **not** added.
   - Participants are informed that the proposal was unsuccessful via an **in-app modal** when using the app, or a **notification** when appropriate and supported while the app is in the background (without guaranteeing notification delivery).
4. **Early Resolution When Everyone Votes:**
   - When all eligible people have cast a vote, **stop the timer** and **resolve the proposal immediately** using `yes > no` (`accepted_majority` if `yes > no`, `rejected_majority` if `yes <= no`).
5. **5-Minute Timer + Up to 3 Initiator Extensions (1, 2, or 5 Minutes):**
   - Every new proposal opens with a **5-minute** (`300_000` ms) voting window (`extensionsUsed = 0`, `maxExtensions = 3`).
   - While a proposal remains `open`, the trip initiator may extend the deadline **up to 3 times**, choosing **1, 2, or 5 additional minutes** per extension.
   - All participants must see the updated deadline (`expiresAt`) and how many extensions remain (`3 - extensionsUsed`).
   - Extensions remain subject to **Decision 11** (passing the proposed stop still ends the vote early).
6. **Initiator Override & Proposer Withdrawal (Atomic Resolution):**
   - The trip initiator can **approve** or **reject** an `open` proposal at any time.
   - The proposer can **withdraw** their own proposal while it remains `open`.
   - **Competing actions:** Votes (including the final vote that triggers early resolution), vote changes, initiator approve/reject, proposer withdrawal, deadline expiry, passed-stop expiry, and trip completion execute as **atomic server-side state transitions** guarded by `status === 'open'` and `tripRevision`. Only the **first** committed transition from `open` → terminal succeeds; any concurrent or late action sees the terminal state and is rejected without applying a second decision.
7. **Automatic Stop Addition & Honest Routing Failure State:**
   - Only an **approved** proposal (`accepted_majority` or `accepted_organizer`) adds the stop to the authoritative trip route automatically.
   - A **rejected**, **withdrawn**, **expired**, or **cancelled** proposal must **never** be added to the route.
   - If route recalculation fails after stop acceptance, the system must show the convoy an **honest failure/retry state** and must **not** claim the route was successfully updated.
8. **Trip Completion Cancels Open Proposals:**
   - When the trip concludes, any `open` proposal is immediately **cancelled** (`cancelled`) and its stop is **not** added.
   - Participants are informed that voting ended because the trip concluded (via in-app modal when active in the app, or notification when appropriate and supported in the background, subject to platform notification support and without delivery guarantees).
9. **Eligible Voter List & Mid-Vote Membership Changes:**
   - Set the eligible voter list (`eligibleVoterIds`) when a proposal opens.
   - Someone who joins the convoy after voting starts becomes eligible starting with the **next** proposal.
   - Temporary network loss, backgrounding the app, a closed app, or a dead battery does **not** remove someone from the convoy or `eligibleVoterIds`. If they do not vote by the deadline, they abstain.
   - If someone deliberately leaves or is removed from the convoy while voting is open, remove them from `eligibleVoterIds` and **exclude any vote they already cast**.
   - If that departure means all remaining eligible people have voted, resolve immediately using `yes > no`. If **no eligible voters remain**, **expire** the proposal (`expired`) without adding the stop.
10. **Changing a Vote While Open:**
   - An eligible person may change their `yes`/`no` vote while the proposal remains `open`.
   - Once the last eligible person votes, resolve immediately and stop the timer; no further vote changes are accepted.
   - Changing a vote does **not** create or submit another stop recommendation.
   - Competing actions (a vote change racing with the final vote, deadline expiry, passed-stop expiry, initiator approve/reject, proposer withdrawal, or trip completion) resolve atomically on the server (`status === 'open'` and `now < expiresAt` guard); a losing or late vote change is rejected (`PROPOSAL_ALREADY_CLOSED`) and returns the committed terminal state.
11. **Passing the Proposed Stop Ends an Open Vote:**
   - Passing the proposed stop ends an `open` vote immediately, **even if the trip initiator extended the timer**. The proposal **expires** (`expired`, `resolutionReason: 'passed_stop'`) and the stop is **not** added.
   - **Tell participants why voting ended:**
     - Show an **in-app modal** when they are using the app, with clear language such as: *"Voting ended because the convoy passed the proposed stop."*
     - Provide an **appropriate background notification** where supported and permitted (without promising delivery when the device or platform cannot guarantee it).
     - When someone **reconnects or returns to the app**, make the outcome and reason available to them from the authoritative proposal state.
   - **First valid closing action wins:** A passed-stop event racing with the final vote, deadline expiry, initiator action, or trip completion resolves atomically; a later vote or action must not change a closed result.

#### Concrete Tallying, Membership, Passed-Stop, & Timer Extension Examples

| Scenario | Cast Votes (`Yes` / `No`) | Non-Votes (Abstain) | Timing | Outcome |
|---|---|---|---|---|
| **Group + individual (`Group` of 3 + `Solo` 1 = 4 people)** | `2 Yes` (group), `1 Yes` (solo), `1 No` (group) | 0 | **Stops timer immediately** | **Passes** (`3 > 1`; group members vote individually) |
| **Large convoy (`51 Yes` / `50 No`)** | `51 Yes`, `50 No` | 10 | Deadline (or early if 101 total) | **Passes** (`51 > 50`) |
| **Large convoy tie (`50 Yes` / `50 No`)** | `50 Yes`, `50 No` | 10 | Deadline | **Does not pass** (`50 === 50`, tie) |
| **5 people, all 5 vote early (`3 Yes` / `2 No`)** | `3 Yes`, `2 No` | 0 | **Stops timer immediately** | **Passes** (`3 > 2`) |
| **5 people, 3 vote (`2 Yes` / `1 No`, 2 offline)** | `2 Yes`, `1 No` | 2 | Deadline | **Passes** (`2 > 1`; disconnected people stay in convoy, abstain at deadline) |
| **Voter changes `No -> Yes` while open** | `2 Yes` (was `1 Yes`, `1 No`), 1 pending | 1 | Remains `open` | Vote updates in place; no new proposal created |
| **Deliberate departure after voting** | 3 eligible (`2 Yes`, `1 No` leaves) | 0 | **Stops timer immediately** | `No` vote excluded; remaining 2 voted `2 > 0` → **Passes** |
| **All eligible voters depart while open** | 0 eligible remain | 0 | **Stops timer immediately** | **Expires** (`expired`); stop not added |
| **Stop passed while vote is open** | `2 Yes`, `0 No`, 2 pending | 2 | **Convoy passes stop** | **Expires** (`expired`, `passed_stop`); stop not added; in-app modal / bg notification |
| **Stop passed after timer extension** | `1 Yes`, `1 No`, 2 pending (`extensionsUsed: 1`) | 2 | **Convoy passes stop** | **Expires** (`expired`, `passed_stop`); stop not added despite extension |
| **Initiator location unavailable or inaccurate** | `1 Yes`, `0 No`, 3 pending | 3 | Location/route check unreliable | Vote **remains `open`** and continues using the active timer |
| **4 people, 2 vote (`1 Yes` / `1 No`)** | `1 Yes`, `1 No` | 2 | Deadline | **Does not pass** (`1 === 1`, tie) |
| **4 people, 0 vote (`0 Yes` / `0 No`)** | `0 Yes`, `0 No` | 4 | Deadline | **Expires** (`expired`); stop not added; in-app modal / bg notification |

- **Extension example:** Proposal opens at `12:00:00` → `expiresAt = 12:05:00`, `extensionsRemaining = 3`.
  1. At `12:04:10`, initiator extends by `+2 min` → `expiresAt = 12:07:00`, `extensionsRemaining = 2`.
  2. At `12:06:30`, initiator extends by `+5 min` → `expiresAt = 12:12:00`, `extensionsRemaining = 1`.
  3. At `12:11:45`, initiator extends by `+1 min` → `expiresAt = 12:13:00`, `extensionsRemaining = 0`.
  4. Any 4th extension request is rejected (`NO_EXTENSIONS_REMAINING`).
  5. If the convoy passes the proposed stop at `12:08:00` (even after extensions), the proposal immediately transitions to `expired` (`passed_stop`), the stop is not added, and participants are notified.

### 2.2 Proposed Technical Direction & Open Questions: Passed-Stop Detection *(UNIMPLEMENTED)*

> [!NOTE]
> **Proposed technical direction — not owner-approved thresholds, and not yet implemented:**
> - **Reference location:** Use the **trip initiator's location** as the initial reference for convoy progress.
> - **Route-progress check:** Determine whether a stop has been passed using **progress along the current route**, rather than straight-line proximity alone.
> - **Safe fallback:** If the initiator's location, route position, or GPS accuracy is insufficient to determine this reliably, **keep the vote `open`** and rely on the existing timer.
> - **Open technical questions requiring further design & validation (do not invent thresholds yet):**
>   1. Exact geometric/route definition of **"passed"** (e.g., distance past the projected route snap-point or detour branch point).
>   2. Minimum **GPS accuracy thresholds** and staleness limits before falling back to the timer.
>   3. **Location-sharing requirements** and permissions (foreground/background location consent from the initiator).
>   4. Behavior across **route changes / off-route detours** and when the **initiator is unavailable** or offline.

---

## 3. Unimplemented Architecture & Platform Design

### 3.1 Authoritative Proposal, Identity, & Sync State Machine *(UNIMPLEMENTED)*

- **Model & identity updates required for one vote per person:**
  - Extend `ConvoyMember` (or introduce `ConvoyVoter`) with a stable `userId` / verified account identity and per-member `status` (`joined` | `left`) so each individual person—including each person inside a `kind: 'group'` `ConvoyParticipant`—is uniquely addressable.
  - Key `StopProposal.votes` by `memberId` / `userId` (not `participant.id`), and store `eligibleVoterIds: string[]` on each `StopProposal` so group size changes and duplicate-vote checks are deterministic.
  - Add `initiatorId: string` and `tripRevision: number` to `Trip` / `Convoy`.
- **Authorization & duplicate-vote prevention:** Clients authenticate with their `userId` / verified session token and can only write `votes[theirOwnMemberId]` while `status === 'open'` and `memberId ∈ eligibleVoterIds`. Only `initiatorId` can approve, reject, or extend; only `proposedByMemberId` can withdraw.
- **State transitions (`open` → terminal happens at most once):**
  - `open` → `accepted_majority` (all remaining eligible people voted with `yes > no`, or deadline reached with `yes > no`)
  - `open` → `rejected_majority` (all remaining eligible people voted with `yes <= no`, or deadline reached with `yes <= no` and `yes + no > 0`)
  - `open` → `expired` (deadline reached with `yes === 0 && no === 0` [`deadline_no_votes`], all eligible voters depart leaving `0` eligible voters [`no_eligible_voters`], or convoy passes the proposed stop along the route [`passed_stop`])
  - `open` → `accepted_organizer` (initiator approves while `open`)
  - `open` → `rejected_organizer` (initiator rejects while `open`)
  - `open` → `withdrawn` (proposer withdraws while `open`)
  - `open` → `cancelled` (trip concludes while `open`)

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

- **Convoy membership persistence:** Backgrounding, screen lock, network drops, dead battery, or OS process termination **never removes** a person from the convoy. On return/reconnect, the client fetches the authoritative `Trip` + `StopProposal` snapshot and reconciles UI state (including outcomes decided while offline).
- **In-app modals & background notifications:**
  - When a proposal fails (`expired` due to `0` votes or passing the stop, `rejected_*`, or `cancelled` on trip end), show an **in-app modal** to active foreground users with the specific reason (e.g., *"Voting ended because the convoy passed the proposed stop."*), and send an appropriate **background notification** where supported and permitted.
  - When a participant **reconnects or returns to the app** after a vote ended, fetch the authoritative `StopProposal` outcome and `resolutionReason` so the outcome and reason are available to them.
  - While `open`, show an ongoing trip/vote notification with proposal summary and countdown (`expiresAt`) where supported, plus vibration / attention alert when a vote needs attention, subject to user permissions and device settings.
  - **No delivery guarantees:** Persistent background connections and instant notification delivery **cannot be guaranteed** due to OS battery optimization, Doze/App Standby, iOS background suspension, permission denials, or network loss.
- **Platform-specific constraints (to verify before implementation):**
  - **Android:** Extend existing `NotificationCompat` / `NotificationChannel` infrastructure (`NavigationForegroundService.kt`), gated on runtime `POST_NOTIFICATIONS` (Android 13+), channel importance, DND, and device vibration settings; remote push (FCM) is needed when the app process is killed or Doze throttles sockets.
  - **iOS:** Requires adding `UNUserNotificationCenter` permission flow and APNs remote push (`apps/mobile/ios/` currently has none), as iOS suspends background WebSockets shortly after backgrounding.
  - **Web:** Background tabs throttle timers/WebSockets; Web Notifications and `navigator.vibrate` require explicit permission and vary across mobile browsers.

---

## 4. Implementation Milestones & Acceptance Criteria

1. **Milestone 1 — Shared Proposal Domain Contract & Deterministic Reducer:**
   - Pure TypeScript types and reducer implementing Approved Decisions 1–11 with per-person `memberId`/`userId` keying, `eligibleVoterIds`, and `resolutionReason` (including `'passed_stop'`).
   - *Tests:* Unit tests for **individual vs. group voting** (3-member group + 1 solo = 4 votes), **membership changes during open vote** (new joiner excluded until next proposal; deliberate departure excludes any already-cast vote and triggers immediate resolution when remaining eligible people have voted, or `expired` without adding stop when 0 eligible remain), **temporary disconnection** (does not remove voter; deadline treats as abstention), **changing a vote while open** (updates vote without creating a new stop recommendation; final-vote resolution blocks further changes), **vote-change races** (racing with final vote, deadline, or closing action resolves atomically), **stop passed while vote is open** and **stop passed after a timer extension** (`expired` with `passed_stop`, stop not added), **unavailable or inaccurate location** (keeps vote `open` on timer), **passed-stop event racing with final vote, expiry, initiator action, or trip completion** (first valid closing action wins), **no votes at deadline** (`0/0 -> expired`), **all votes arriving early** (timer stopped, immediate `yes > no`), **ties** (`1/1`, `2/2`, `50/50 -> rejected`), **large convoy** (`51 Yes / 50 No -> accepted`), **trip completion** (`open -> cancelled`), **extension limits** (`1/2/5` min up to 3x), and **duplicate-insertion prevention**.
2. **Milestone 2 — Authoritative Backend Sync, Identity, & Reconnect Layer:**
   - Trip-scoped realtime store, per-person/initiator authorization (preventing duplicate votes across devices), atomic proposal transitions (including passed-stop expiry events), and offline/reconnect state reconciliation.
   - *Acceptance & Tests:* Multi-client integration tests for per-person group voting, duplicate-vote rejection across devices, vote-change vs. final-vote vs. passed-stop vs. initiator-override vs. expiry vs. trip-end races, temporary disconnect/reconnect recovery (participant returning after vote ended receives outcome and `resolutionReason`), and duplicate-decision rejection.
3. **Milestone 3 — Web/Phone UI, Live `NavigationController` Route Updates, Passed-Stop Progress, & Notifications:**
   - Replace `TripPlanner.tsx` local vote UI; add native phone proposal/vote UI (`#84`) using `#83` place search; implement `NavigationController` live `setDestinations` reconciliation + failure/retry UI; implement initiator route-progress passed-stop detection (with safe fallback to timer when location/route/accuracy is insufficient); add in-app outcome modals (including *"Voting ended because the convoy passed the proposed stop."*), platform-gated ongoing countdown notifications, and vibration alerts.
   - *Acceptance & Tests:* Unit/component tests + Android JUnit tests for route-recalc failure/retry, concurrent `tripRevision` updates, passed-stop route progress vs. unavailable/inaccurate GPS fallback, in-app modals for unsuccessful/cancelled/passed-stop votes, reconnect outcome visibility, notification permission-denied fallback, and vibration/DND handling.
4. **Milestone 4 — Android Auto Alerts & Multi-Device / DHU Verification:**
   - Distraction-safe Android Auto outcome notifications in `MyExplorerCarScreen.kt`; end-to-end verification across multiple physical devices (Android/iOS/Web), background/network-loss recovery, and Android Auto DHU/vehicle.
