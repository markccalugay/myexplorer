# Convoy Stop Proposals, Voting, and Organizer Approval (Issue #86)

**Status:** Audit & Architecture Proposal (Draft — **awaiting owner product decisions before implementation**)
**Issue:** [#86](https://github.com/markccalugay/myexplorer/issues/86)
**Related Issues:** [#12](https://github.com/markccalugay/myexplorer/issues/12)–[#14](https://github.com/markccalugay/myexplorer/issues/14) (Convoy Voice), [#82](https://github.com/markccalugay/myexplorer/issues/82) (Navigation Session), [#83](https://github.com/markccalugay/myexplorer/issues/83) (Coordinate-free Stop Search), [#84](https://github.com/markccalugay/myexplorer/issues/84) (Unified Native Phone Experience)
**Date:** 2026-11-23

> [!IMPORTANT]
> **No voting rules or multi-user claims are implemented in this phase.** This document records an audit of what exists in the codebase today, lists the product decisions required from the owner, and proposes a durable architecture and milestone plan for #86.

---

## 1. Current State Audit (Observed Facts)

All findings below are based on **source inspection** of the repository as of commit `ff2157b`. No multi-user runtime tests or physical-device/DHU tests exist for convoy voting.

### 1.1 How a Stop Recommendation Is Proposed, Voted On, Approved, or Added Today

| Aspect | Observed Implementation | File Citation |
|---|---|---|
| **Proposal source** | **System-generated only.** There is no UI or API for a participant or organizer to propose a custom stop. During active web navigation, `TripPlanner.tsx` waits `5_000` ms (`RECOMMENDATION_DISPLAY_DELAY_MS`) on legs with `currentLegDistanceKm >= 25` or `currentLegDurationMinutes >= 30`, then queries `google.maps.places.Place.searchNearby` around the leg midpoint (`5000` m radius, max `6` results). | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L75-L81`, `L896-L1010`) |
| **Voting state & UI** | When `activeConvoyParticipants` (`convoy.participants` with `status === 'joined'`) has length `> 0`, `TripPlanner.tsx` renders a **Convoy Detour Vote** card (`ActiveNavigationRecommendationSession`) with a `300_000` ms (5-minute) countdown (`RECOMMENDATION_DECISION_WINDOW_MS`) and **Yes / No buttons for every joined participant on the same screen**. | [`src/types/trip.ts`](../src/types/trip.ts) (`L22-L54`), [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L697-L711`, `L1236-L1354`) |
| **Hardcoded local tally rules** | Local `useEffect` hooks finalize the session: (1) if `pendingVotes === 0`, accepts when `yes > no`, otherwise rejects; (2) when the 5-minute timer hits `0`, accepts only if `yes > no + pending` (so uncast votes effectively count against acceptance), otherwise sets status `expired`. | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L846-L882`) |
| **Organizer manual approval** | **Missing in convoy mode.** `handleAcceptRecommendation` (**Add to Route**) and `handleRejectRecommendation` (**Not Now**) are only rendered when `activeConvoyParticipants.length === 0` (solo trip). | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L792-L800`, `L1292-L1347`) |
| **Stop insertion & route update** | `finalizeRecommendationSession(..., 'accepted')` splices a new `Stop` (`source: 'activity-recommendation'`, random `rec-${Date.now()}-...` ID) before `session.targetStopId` and calls `retypeStops(nextStops)`. A `useEffect` watches `trip.stops` and calls `routeProvider.computeDrivingRoute(...)`. | [`src/components/TripPlanner.tsx`](../src/components/TripPlanner.tsx) (`L718-L750`, `L802-L831`) |

### 1.2 Local vs. Shared / Synchronized Behavior

- **Ephemeral, single-device React state:** `recommendationSession` lives in `useState<ActiveNavigationRecommendationSession | null>(null)` inside `TripPlanner.tsx`. It is **not persisted** to `localStorage` (`myexplorer.navigation-session` or `myexplorer.saved-trips`) and is **not transmitted** to any server or other device.
- **Convoy invites are local-only:** `ConvoyPanel.tsx` and `src/lib/convoy.ts` generate invite tokens (`token: Math.random().toString(36)...`) and add `ConvoyParticipant` records with `status: 'joined'` immediately in local `Trip.convoy` state.
- **No backend, auth, or realtime transport exists in the repo:** Searching `src/` and `apps/mobile/src/` shows no authentication service, WebSocket/realtime client, or shared trip/convoy database.

### 1.3 Organizer Identity, Participants, Membership, and Route Updates

- **Organizer identity:** **Missing.** Neither `Trip` nor `Convoy` (`src/types/trip.ts`, `apps/mobile/src/planner/domain.ts`) has an `organizerId`, `ownerId`, or `createdBy` field. The literal string `'organizer'` appears only as an `assignedBy` tag in `ConvoyPanel.tsx` (`L200`).
- **Participants & membership:** `ConvoyParticipant` supports `kind: 'individual' | 'group'` and nested `members: ConvoyMember[]`. `TripPlanner.tsx` counts **one vote per `ConvoyParticipant`** (`votes[participant.id]`), regardless of how many `ConvoyMember`s or vehicles that participant has.
- **Native mobile & Android Auto:** `apps/mobile` preserves `Trip.convoy` in `domain.ts` and `legacyMigration.ts` (foundation work from `#84`), and manages local navigation/session state in `NavigationController.kt`, `NavigationSessionRepository.kt`, and `MyExplorerCarScreen.kt`. **Native Convoy UI, recommendation voting, and multi-device sync do not exist in `apps/mobile` or Android Auto.**
- **Issues #12–#14 (Convoy Voice):** Issues `#12` (realtime voice architecture), `#13` (push-to-talk UI), and `#14` (MVP voice sessions) are all `OPEN` on GitHub with **no implementation in the repository**. They share the same missing prerequisites: participant identity, trip-scoped room/session lifecycle, presence, and a realtime backend.

### 1.4 Capability Summary

| Capability | Status | Notes & Evidence |
|---|---|---|
| Local web along-the-route recommendation & multi-button vote UI | **Implemented (Local UI only)** | `TripPlanner.tsx`; no unit/component tests for voting or `finalizeRecommendationSession`. |
| Pure convoy data model & helpers (vehicles, participants, invites, assignments) | **Implemented (Local data only)** | `src/types/trip.ts`, `src/lib/convoy.ts`, tested in `src/lib/convoy.test.ts` and `src/lib/persistence.test.ts`. |
| Mobile `Trip.convoy` preservation & legacy migration planning | **Implemented (Foundation only)** | `apps/mobile/src/planner/domain.ts`, `legacyMigration.ts`, tested in `domain.test.ts` and `legacyMigration.test.ts`. |
| User-initiated stop proposals | **Missing** | Neither web nor mobile lets a participant propose a stop into a voting session. |
| Organizer identity & manual convoy approval/rejection | **Missing** | No `organizerId` on `Trip`/`Convoy`; no organizer override UI during convoy voting. |
| Multi-user authentication, realtime sync & reconnect recovery | **Missing** | Single-device `localStorage` / `AsyncStorage` only. |
| Android Auto / native phone convoy voting & safety UX | **Missing** | `MyExplorerCarScreen.kt` has no proposal/voting surface; CarPlay is future work. |

---

## 2. Product Decisions Required Before Implementation

Per `#86`, **these rules must be confirmed by the owner rather than invented in code**. Each row lists the open question and a recommended default for review.

| # | Decision Area | Open Questions | Recommended Default (For Owner Confirmation) |
|---|---|---|---|
| **D1** | **Eligibility & Majority Denominator** | Who can propose a stop and who can vote (every joined `ConvoyParticipant`, every individual `ConvoyMember`, or one vote per `ConvoyVehicle` driver)? Does the organizer also cast a participant vote? Does a 1-person trip skip voting? | Require `>= 2` joined participants for voting (solo trips use direct add). Give **1 vote per joined `ConvoyParticipant`** (matching existing `votes[participant.id]` schema), with the organizer counted as one participant. |
| **D2** | **Ties, Abstentions, Late Votes, & Disconnects** | Does an exact 50/50 tie pass or fail? Should explicit `Abstain` exist? Do disconnected/offline participants count in the denominator, or only active/online ones? Are late votes after acceptance/expiry rejected? | **Ties fail** (strict majority `yes > 50%` of eligible denominator). Support explicit `abstain` (or treat non-votes as pending) while keeping **all joined participants** in the denominator so a small online subset cannot silently reroute an offline car without organizer override. **Reject late votes** once a proposal is terminal. |
| **D3** | **Expiry: Time, Distance, or Both** | Does a proposal expire by time (e.g., 5 minutes), distance (e.g., before passing the candidate detour point or next stop), or whichever happens first? | **Both (whichever comes first):** 5-minute TTL (configurable by organizer) **or** when the lead vehicle passes the candidate detour / target leg. |
| **D4** | **Organizer Authority** | When can the organizer manually approve or reject a proposal—anytime while `open`, only after timeout/tie, or even to override a completed vote? Can a proposer withdraw an open proposal? | Organizer can **manually approve or reject at any time while `open`** (and withdraw/remove an already-added stop via normal trip editing). Proposer may withdraw while `open`. |
| **D5** | **Acceptance, Route Failure, & Trip End** | Where is an accepted stop inserted (before next stop, before destination, or proposer-specified)? If route recalculation fails, does the stop remain pending/retried or roll back? What happens to open proposals when the trip ends? | Insert at the **proposer-specified leg** (default: before `targetStopId` / current next stop). If route recalculation fails, **keep the accepted stop in authoritative trip state** with a visible `recalc_failed` + **Retry** state (no silent loss). **Auto-cancel all `open` proposals** when the trip ends. |

---

## 3. Proposed Durable Architecture

### 3.1 Authoritative State & Synchronization Model

- **Single authoritative source of truth:** Move proposal, vote, and trip-stop state out of ephemeral React state into a **trip-scoped authoritative backend store** (shared by web and native mobile, aligned with the transport-agnostic room/session needs of `#12`–`#14`).
- **Monotonic versioning & optimistic concurrency:**
  - Every `Trip` maintains a monotonic `tripRevision: number`.
  - Every `StopProposal` has a server-generated `id`, `tripId`, `tripRevisionAtCreation`, `proposedByParticipantId`, `candidate` (place details + coordinates), `targetStopId`, `status` (`open` | `accepted_majority` | `accepted_organizer` | `rejected_majority` | `rejected_organizer` | `expired` | `withdrawn` | `cancelled`), `resolutionReason`, `votes: Record<participantId, { choice, updatedAt }>`, `expiresAt`, and `appliedStopId`.
  - Votes and organizer decisions execute as **atomic server-side transactions** (`open` → terminal happens at most once). If a majority vote, organizer override, and expiry timer race concurrently, the first committed transaction wins and subsequent requests receive the terminal state.
- **Identity & Permissions:**
  - Add `organizerId` (authenticated user/device identity) to `Trip` / `Convoy` and bind each joined `ConvoyParticipant` to an authenticated `userId` (or verified invite-claim token) so a client can only cast a vote for **its own** `participantId`, and only `organizerId` can invoke manual approve/reject.
- **Offline & Reconnect Handling:**
  - Clients subscribe to realtime updates for the active `tripId` and cache the last known `tripRevision` locally.
  - While offline, voting/proposing queues or fails fast with an explicit offline indicator (no fake local acceptance). On reconnect, the client fetches the authoritative snapshot (`trip` + active/recent `proposals`) and reconciles local UI without duplicating notifications.

### 3.2 Idempotent Stop Insertion & Route Updates

- **Deterministic deduplication:** When a proposal transitions to `accepted_majority` or `accepted_organizer`, the backend (or authoritative state reducer) inserts the `Stop` **atomically** in the same revision increment using a deterministic `id` (`proposal:${proposalId}`) and `proposalId` field.
- **No double-add or silent loss:**
  - Replaying the acceptance event or reconnecting checks `stops.some(s => s.id === 'proposal:' + proposalId)` before inserting.
  - On native phone (`#84` / `#82`), `NavigationSessionRepository` / `NavigationController` applies the authoritative `Trip` stop list and triggers Google Navigation SDK route recalculation; if recalculation fails, the stop stays in the trip with a visible retry banner rather than being silently dropped.

### 3.3 Platform Behavior & Driver-Safety Constraints

- **Web & Native Phone (`#84`):**
  - Both share pure TypeScript domain types, validation, tally/state-machine helpers, and the backend sync contract (fitting `#84`'s shared-domain architecture and preserving `Trip.convoy` fields).
  - Phone users can propose stops via `#83`'s coordinate-free place search, view live vote tallies, cast their own vote, and (if organizer) tap **Approve** / **Reject**.
- **Android Auto:**
  - **Driver-distraction rules strictly apply:** No free-text place search, no multi-row participant vote lists, and no organizer management panels while driving.
  - Surface only concise outcome alerts (e.g., *"Stop added: <Name>"*) or, if permitted by Car App Library templates/distraction guidelines and approved by DHU testing, a minimal 1-tap `Vote Yes` / `Vote No` / `Dismiss` prompt.
- **CarPlay:**
  - Explicitly **future work** (out of scope for `#86` implementation).

---

## 4. Implementation Milestones

### Milestone 1: Shared Proposal Domain Contract & Deterministic Reducer *(Recommended First Milestone)*
- **Scope:** Pure TypeScript types (`StopProposal`, `ProposalVote`, `ProposalStatus`, `organizerId` on `Convoy`/`Trip`) and a pure, deterministic state-machine/tally/idempotent-stop-insertion module shared by web and `apps/mobile`, implementing the owner-approved D1–D5 rules. **No backend or UI changes yet** — independently reviewable and preserves all existing `Trip.convoy` data.
- **Acceptance Criteria & Tests:** Unit tests covering eligibility, majority/ties/abstentions, expiry, organizer override, concurrent transition rejection, idempotent stop insertion (duplicate approval replay), and trip-end cancellation.

### Milestone 2: Authoritative Backend Sync, Identity, & Reconnect Layer
- **Scope:** Select and implement the trip-scoped realtime sync/auth backend (aligned with `#12`–`#14`), participant vote authorization, atomic proposal resolution, and client offline/reconnect catch-up.
- **Acceptance Criteria & Tests:** Multi-client integration tests for concurrent votes, organizer-vs-majority race, disconnect/reconnect recovery, unauthorized vote/approval rejection, and `tripRevision` convergence.

### Milestone 3: Web & Native Phone UI + Route Recalculation Integration
- **Scope:** Replace the local-only multi-button vote card in `TripPlanner.tsx` with per-user authenticated voting + organizer Approve/Reject + custom stop proposal; build the native phone proposal/voting UI (`#84`) backed by `#83` place search and `#82` `NavigationController` route updates with failure/retry handling.
- **Acceptance Criteria & Tests:** Component/unit tests for proposal creation, vote state rendering, organizer controls, and route-recalc failure recovery; Jest, Vitest, `tsc`, and Android JUnit passing.

### Milestone 4: Android Auto Safety Alerts & Multi-Device / DHU Verification
- **Scope:** Add distraction-safe Android Auto outcome notifications (and host-permitted quick actions if applicable) in `MyExplorerCarScreen.kt`; validate end-to-end across multiple real devices and Android Auto DHU/vehicle.
- **Acceptance Criteria & Tests:** Recorded multi-client, disconnect, route-consistency, and DHU/vehicle verification evidence in `docs/` and `CHANGELOG.md`.

---

## 5. Open Assumptions & Inspection Limitations

- **Assumptions:** Assumes `#84` native phone screens will become the primary phone surface and that `#12`–`#14` will share the same participant identity/realtime backend chosen in Milestone 2.
- **Inspection limitations:** Findings above come from static source inspection (`TripPlanner.tsx`, `ConvoyPanel.tsx`, `src/lib/convoy.ts`, `src/types/trip.ts`, `apps/mobile/src/planner/*`, and GitHub issues `#12`–`#14`, `#86`). No live multi-user, WebView, physical Android device, Android Auto DHU, or vehicle tests were run in this phase.
