# Things to Do Marketplace Planning

## Purpose

This document captures early planning for the `Things to Do` section as it evolves from a landing-page activity carousel into a structured experience discovery and booking surface.

The goal is to support:

- Travelers who want relevant activities at or near their destination
- Group planners who need to compare experiences, schedules, and pricing
- Future operators or partners who may eventually list or fulfill experiences through the platform

This is a planning document only. It is not legal advice.

## Product Direction

The current section behaves like a visual set of activity cards with direct `Book` buttons.

The better near-term direction is a discovery-to-detail-to-handoff flow where users understand logistics, trust, and booking model before committing.

The long-term direction could support multiple transaction types:

- `Curated discovery only`
- `Lead generation for activity operators`
- `Affiliate / referral booking`
- `Request-to-book marketplace`
- `Direct booking for standardized inventory`

For launch planning, the safest assumption is:

- `Curated discovery + save/share + explicit booking handoff`

## Primary User Intents

The section should support these traveler intents:

- `What can I do in this destination?`
- `What fits my group, budget, and schedule?`
- `Can I trust this operator or activity?`
- `Can I save this for later or share it with my group?`
- `Can I add this into my trip and then book it?`

## Audience Segments

The most likely audience segments in the Philippines travel context are:

### 1. Domestic Leisure Travelers

Use cases:

- Weekend destination trips
- Barkada travel
- Family beach or island travel

Needs:

- destination relevance
- budget clarity
- easy comparison

### 2. Group Planners

Use cases:

- Mixed-age group planning
- Shared cost decision-making
- Activity bundling with transport

Needs:

- group-fit cues
- duration clarity
- saved shortlist and share behavior

### 3. Family Travelers

Use cases:

- Kid-friendly destination plans
- Safe half-day or full-day activities

Needs:

- restrictions and safety details
- timing predictability
- pickup and meeting logistics

### 4. Couples

Use cases:

- Scenic experiences
- Romantic add-ons
- Premium destination moments

Needs:

- strong visual context
- confidence in booking
- private or premium activity options

### 5. Adventure Travelers

Use cases:

- Diving
- Trekking
- ATV
- Marine activities

Needs:

- physical difficulty info
- weather dependency clarity
- inclusion and gear details

### 6. Travelers With a Stay Already Chosen

Use cases:

- searching for experiences near accommodation
- filling a destination itinerary

Needs:

- proximity-aware recommendations
- time-fit suggestions
- pairing with transport or stay

## Core Activity Types

The platform should separate major activity types because logistics, fulfillment, and risk vary by category.

### 1. Standard Scheduled Activity

Use cases:

- island hopping
- sunset sailing
- fixed ATV runs

Planning notes:

- strongest fit for eventual direct booking
- date, time, and group-size selection are central

### 2. Request-Based or Operator-Confirmed Activity

Use cases:

- private tours
- diving with operator approval
- weather-sensitive experiences

Planning notes:

- needs explicit confirmation timelines
- should not be mislabeled as instant-bookable

### 3. Transport-Linked Activity

Use cases:

- pickup tours
- van + activity bundles
- route-aligned stops

Planning notes:

- ideal future cross-sell with stays and vehicle planning
- travel time and meeting point matter heavily

### 4. Guided Adventure / Safety-Sensitive Activity

Use cases:

- scuba diving
- trekking
- marine wildlife experiences

Planning notes:

- requires safety, waiver, or qualification planning
- likely higher support and cancellation complexity

### 5. Cultural / Food / Local Experience

Use cases:

- workshops
- guided local experiences
- food experiences

Planning notes:

- strong differentiation opportunity
- often less standardized operationally

## Discovery and Booking Flow

The landing-page cards should move users into an informed detail experience, not directly into blind checkout.

### Flow A. Landing Page Card to Activity Detail

1. User sees an activity card.
2. The card communicates:
   - activity name
   - destination
   - duration
   - price basis
   - category cue
3. User clicks the card body.
4. App opens `Activity Detail`.
5. User reviews inclusions, restrictions, schedule, and logistics.
6. User chooses to:
   - `Book`
   - `Save`
   - `Share`
   - `Add to itinerary`
   - `See similar activities`

### Flow B. Landing Page Book CTA

1. User clicks `Book`.
2. App opens detail with the booking module or quick-book panel in focus.
3. User confirms date, time, and group size.
4. User proceeds into the appropriate booking model.

This should be used only when the activity is structured enough to support a confident purchase path.

### Flow C. Landing Page to See All

1. User taps `See all`.
2. App opens an `Activities Listing` page.
3. User filters by destination, date, duration, and fit.
4. User opens detail pages for comparison.
5. User saves, shares, or books when ready.

## Listing Page Requirements

The `Activities Listing` page should support decision-making, not just browsing.

It should include:

- destination-aware browsing
- dates if known
- filter bar
- sort menu
- save and compare behavior
- curated rails for common intents

Priority filters:

- `Destination`
- `Date`
- `Price range`
- `Duration`
- `Category`
- `Group type`
- `Instant confirmation`
- `Private vs shared`
- `Pickup included`
- `Beginner-friendly`
- `Family-friendly`
- `Free cancellation`

Suggested sort options:

- `Recommended`
- `Top rated`
- `Price low to high`
- `Shortest duration`
- `Best for families`
- `Bookable this weekend`

Useful curated rails:

- `Best for Families`
- `Half-Day Activities`
- `Near Your Stay`
- `Popular This Weekend`

## Activity Detail Page Requirements

The activity detail page should answer these questions fast:

1. `What is this?`
2. `Is it right for my group?`
3. `How does it work logistically?`
4. `Can I trust it?`
5. `What happens if plans or weather change?`

The page should include:

- hero gallery
- destination and category
- duration
- price model
- confirmation type
- inclusions and exclusions
- date and time selection
- group-size selection
- pickup or meeting point details
- restrictions and difficulty
- cancellation or reschedule policy
- operator or host profile
- reviews or social proof
- related stays, transport, or itinerary add-ons

Critical details to make explicit:

- age restrictions
- physical requirements
- swim ability if relevant
- weather dependency
- exact meeting expectations
- what to bring

## Booking Models

Different activities should support different booking models.

### 1. Direct Booking

Best for:

- standardized activities
- fixed schedules
- trusted operator supply

Flow:

- detail page
- date and slot selection
- traveler details
- payment
- confirmation

### 2. Request to Book

Best for:

- private tours
- operator-managed capacity
- weather-sensitive fulfillment

Flow:

- detail page
- request submission
- operator confirmation
- payment or deposit

### 3. Lead Handoff / Partner Redirect

Best for:

- early supply aggregation
- affiliate relationships
- non-integrated operators

Flow:

- detail page
- clear disclosure
- partner redirect or partner-contact handoff

The UI should always clearly label whether the experience is:

- `Instant confirmation`
- `Provider confirmation required`
- `Book on partner site`

## Logistics and Scheduling Rules

Activities are more schedule-sensitive than stays and need explicit planning.

The booking path should account for:

- selected date
- selected time slot
- expected duration
- pickup vs self-arrival
- meeting point
- arrival buffer
- travel time from stay or route
- conflict with saved itinerary items

Best endpoint-to-endpoint logistics flow:

1. User opens activity detail.
2. User selects date.
3. System shows valid times only.
4. User confirms group size.
5. System shows pickup or meeting logistics.
6. System highlights restrictions or prep needs.
7. System warns of itinerary conflicts when applicable.
8. User books, requests, or hands off to partner.
9. Confirmation state includes logistics summary.

## Save, Share, and Itinerary Integration

This feature should tie tightly into trip planning.

Recommended actions:

- `Save`
- `Share`
- `Add to itinerary`
- `Pair with stay`
- `Bundle with car/van`

Planning notes:

- saved activities should live inside a trip-planning context
- users should be able to shortlist activities before deciding
- later phases should support group coordination and link sharing
- the platform should eventually recommend nearby activities from stay detail pages

## Trust, Safety, and Social Proof

Activities carry operational and safety risk.

The platform should plan for:

- verified operator badges
- review-count transparency
- traveler photos where possible
- confirmation-type clarity
- safety notes
- host response expectations
- realistic popularity signals

Avoid misleading urgency unless backed by real inventory.

Prefer:

- `Booked 24 times this month`
- `Common choice for 4-6 person groups`
- `Good for first-time visitors`

## Edge Cases to Design Early

### A. Weather or Local Safety Cancellation

Planning notes:

- define refund and rebooking expectations
- explain whether cancellation is operator-led or platform-led

### B. Operator No-Show or Late Cancellation

Planning notes:

- define support escalation path
- decide whether credits, refunds, or alternatives are offered

### C. User Misses the Meeting Time

Planning notes:

- define late-arrival policy
- surface arrival buffer prominently before booking

### D. Restrictions Discovered Too Late

Planning notes:

- show age, fitness, and skill requirements early
- avoid burying critical rules below the fold

### E. Pickup Radius or Logistics Mismatch

Planning notes:

- clarify pickup coverage
- support self-arrival fallback when possible

### F. Activity Requires Transport Coordination

Planning notes:

- eventually connect activity timing with stay and vehicle planning
- avoid impossible itinerary combinations

## Marketplace Roles and Supply Assumptions

Likely marketplace roles:

- `Traveler`
- `Operator / Host`
- `Partner / Reseller`
- optional internal `Curator / Ops reviewer`

Important assumptions to document:

- not all activity supply supports live availability
- some experiences are content-first while others are transactional
- weather and operator responsiveness affect fulfillment quality
- activity categories may require different trust and support standards

## Legal / Regulatory / Waiver Considerations

These items need review before deeper transactional rollout, especially for guided, marine, or higher-risk activities.

Questions to plan for:

- when waivers are needed
- what safety disclosures are mandatory
- whether some activities trigger special licensing or local compliance concerns
- who owns liability language and traveler acknowledgments

## Cancellation, Refund, and Rebooking Planning

The platform should not treat all activities the same.

Planning should distinguish:

- direct-booked vs partner-booked experiences
- weather cancellations vs customer no-shows
- instant-confirmed vs request-based experiences
- partial refunds vs full refunds vs credits

These rules should be visible early in the user journey, not only after payment.

## Monetization Model

Possible monetization paths:

- referral or affiliate commissions
- lead-generation fees
- featured placement for trusted operators
- bundled upsells with stays or vehicle bookings
- platform service fees for deeper booking flows later

The launch model should not depend on full native booking unless support and operator quality are ready.

## Operational Risks and Support Flows

The platform should plan for:

- operator quality control
- listing freshness
- cancellation handling
- logistics confusion
- support escalation
- destination-level reliability review

Support boundaries must be explicit if MyExplorer is not the merchant of record.

## Launch Scope Recommendation

The recommended launch scope is:

- curated `Things to Do` carousel
- activities listing page
- logistics-rich activity detail page
- save / share / add-to-itinerary behavior
- explicit booking-model labels
- partner handoff or lead capture
- analytics on clicks, saves, and handoffs

The product should not launch first with:

- full direct-booking coverage across all activity types
- fake instant-booking expectations
- operator self-serve supply without curation
- uniform cancellation promises across inconsistent activity supply

## Key Product Decision

The most important planning decision is this:

Should `Things to Do` be a curated planning-to-booking bridge, or a true activity marketplace from day one?

For the current product state, the most defensible answer is:

- `Landing-page inspiration -> destination-aware listing -> logistics-rich detail page -> explicit booking or handoff state`

That approach keeps the experience useful and trustworthy while leaving room for deeper marketplace functionality later.
