# CarPlay and Android Auto Preparation

This planning note has been consolidated into [AUTOMOTIVE_REFERENCE.md](./AUTOMOTIVE_REFERENCE.md) for the current canonical view.

## Purpose

This document captures the initial planning approach for supporting Apple CarPlay and Android Auto in MyExplorer for vehicles where a mobile phone is plugged into the car. This is a planning document only. No implementation work is included here yet.

## Current Product State

MyExplorer is currently a web-first React and Vite application. The app already contains several product concepts that are relevant to in-car use:

- Destination search
- Route planning
- Trip planning with multiple stops
- Pitstop discovery along a route
- Navigation-oriented route step data

Key current files:

- `src/App.tsx`
- `src/components/RoutePlanner.tsx`
- `src/components/TripPlanner.tsx`
- `src/lib/googleRoutes.ts`
- `src/types/trip.ts`
- `src/types/place.ts`

## Key Constraint

CarPlay and Android Auto cannot be added directly to the current Vite web app.

Both platforms require native mobile integration through iOS and Android application layers. That means MyExplorer will need a mobile host strategy before vehicle projection can be supported.

## Recommended Strategy

Plan this work in two tracks:

1. Product planning for the in-car experience
2. Platform planning for native mobile support

The existing route and trip concepts are promising, but the current implementation keeps too much navigation logic inside React UI components. Before vehicle support is realistic, route and trip behavior should be separated into shared app logic that a future mobile app can consume.

## What Can Likely Be Reused

These areas are good candidates for reuse in a mobile or vehicle-support architecture:

- Trip and stop data models
- Route computation logic
- ETA and duration calculations
- Route step parsing and formatting
- Pitstop suggestion logic

Primary starting points:

- `src/lib/googleRoutes.ts`
- `src/types/trip.ts`
- `src/types/place.ts`

## What Needs to Change Before Vehicle Support

The following items should be planned before CarPlay or Android Auto implementation begins:

- Introduce a native mobile app strategy
- Extract navigation logic from UI components into shared services or domain modules
- Create durable trip state instead of relying on local component state
- Define a lightweight navigation session model that can survive disconnects and reconnects
- Prepare a safe, minimal, driver-friendly in-car experience

## Mobile Host Decision

This is the first major decision and the main blocker for vehicle support.

Possible paths:

- React Native application with shared JavaScript or TypeScript business logic
- Capacitor-based mobile shell with custom native modules for car integrations
- Separate native iOS and Android shells with selectively shared logic

This choice should be made before deeper CarPlay and Android Auto planning is finalized, because the integration surface and engineering effort will vary significantly by platform approach.

## Recommended v1 In-Car Scope

The first release should stay narrow and navigation-focused.

Recommended v1 features:

- Start navigation from a pre-planned trip
- Show current destination
- Show next maneuver or instruction
- Show ETA and remaining distance
- Show approved pitstop suggestions already prepared by the trip engine
- Resume trip state when the phone reconnects to the vehicle

Items to avoid in v1:

- Full discovery browsing while driving
- Booking flows
- Complex editing of itineraries on the car display
- Anything that creates unnecessary driver distraction

## Shared State Needed for In-Car Support

The app should eventually define an in-car navigation state contract with fields like:

- Active trip ID
- Ordered stops
- Current leg
- Next instruction
- Remaining time
- Remaining distance
- Arrival estimate
- Approved pitstops
- Navigation status
- Resume or reconnect state

This state should be portable between phone UI and car UI.

## Platform Planning Notes

### Apple CarPlay

CarPlay support will require:

- An iOS app
- Appropriate CarPlay entitlements and template support
- A simplified in-car UI that matches Apple’s driver-safety rules

The expected CarPlay experience should focus on active trip guidance, not the full consumer app feature set.

### Android Auto

Android Auto support will require:

- An Android app
- Support for approved Android Auto app categories and templates
- A simplified, safety-limited navigation experience

Like CarPlay, Android Auto should be treated as a focused navigation surface rather than a complete trip-planning interface.

## Suggested Rollout Sequence

### Phase 0: Architecture Preparation

- Choose the mobile host strategy
- Identify which route and trip logic can be extracted from web UI components
- Define a persistent trip and navigation session model
- Document the minimum in-car feature set

### Phase 1: Shared Domain Extraction

- Move route computation into shared modules
- Move trip-stop sequencing into shared modules
- Move ETA and pitstop logic into shared modules
- Reduce direct dependency on component-local state

### Phase 2: Mobile Foundation

- Stand up iOS and Android app shells
- Reuse shared trip and route logic
- Add phone-based trip resume and active navigation state

### Phase 3: In-Car Projection

- Implement CarPlay templates for active trip guidance
- Implement Android Auto templates for active trip guidance
- Validate reconnect behavior and trip continuity

### Phase 4: Refinement

- Improve handoff between phone and car
- Expand supported trip scenarios carefully
- Add analytics and operational monitoring for in-car sessions

## Main Risks

- The current app is web-only, so vehicle support is blocked on mobile platform work
- Platform rules for in-car experiences are stricter than phone UI rules
- Current trip and navigation state is not yet durable enough for reconnect scenarios
- Web mapping logic may not transfer directly to native vehicle experiences without adaptation

## Recommended Next Planning Step

Create a short architecture brief that answers the following:

- Which mobile host strategy we are choosing
- Which modules will become shared trip and navigation logic
- What the exact v1 in-car feature set is
- What assumptions we are making for CarPlay and Android Auto templates
- What milestones define the path from web-first planning to mobile and in-car support

## Status

This document is a planning baseline for future CarPlay and Android Auto work. No implementation has started yet.
