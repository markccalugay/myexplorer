# Recommended Stays Marketplace Planning

## Purpose

This document captures early planning for the `Recommended Stays` section as it evolves from a landing-page recommendation rail into a structured accommodation discovery product.

The goal is to support:

- Travelers who want trusted accommodation options for a trip they are planning
- Groups and families who want to compare, shortlist, and share stay options before booking
- Future partners or providers who may eventually supply inventory, rates, or inquiries through the platform

This is a planning document only. It is not legal advice.

## Product Direction

The current section behaves like a curated visual carousel: users browse attractive cards and are encouraged to click `Book`.

The better near-term direction is a discovery and trip-planning experience with a clear handoff to the actual booking source.

The long-term direction could become one of several product models:

- `Curated discovery only`
- `Lead generation for hotels, resorts, and hosts`
- `Affiliate / referral marketplace`
- `Managed inventory with structured partner onboarding`
- `Two-sided accommodation marketplace`

For launch planning, the safest assumption is:

- `Curated discovery + shortlist + external booking / inquiry handoff`

## Primary User Intents

The section should support these main traveler intents:

- `I already know my destination and want the best places to stay`
- `I want to browse by vibe, budget, or trip type`
- `I want to compare a few options before deciding`
- `I want to save and share stay options with family, partner, or friends`
- `I want to book or inquire once I feel confident`

## Audience Segments

The most likely audience segments in the Philippines travel context are:

### 1. Domestic Leisure Traveler

Use cases:

- Weekend beach trip
- Long weekend staycation
- Family destination trip
- Barkada outing

Needs:

- Easy comparison
- Honest pricing cues
- Ratings and trust signals
- Quick access to destination-relevant stays

### 2. Balikbayan / Overseas Visitor

Use cases:

- Returning family trip
- Vacation planning from abroad
- Multi-stop provincial travel

Needs:

- Trustworthy listings
- Clear policies
- Strong location context
- Smooth handoff to book

### 3. Family or Group Planner

Use cases:

- Family vacation
- Reunion travel
- Group destination planning

Needs:

- Capacity clarity
- Bed and room arrangement info
- Parking and kitchen filters
- Saved shortlist sharing

### 4. Couple / Premium Traveler

Use cases:

- Anniversary trip
- Honeymoon-style travel
- Scenic private stay

Needs:

- Ambience and visual confidence
- Premium property details
- Nearby activities and romantic add-ons

### 5. Budget Explorer

Use cases:

- Affordable domestic travel
- Backpacking or simple destination stays

Needs:

- Reliable price ranges
- Safety and quality reassurance
- Sorting and filtering by value

### 6. Road Trip Planner

Use cases:

- Self-drive itineraries
- Van-based group travel
- Stopover planning

Needs:

- Parking availability
- Late check-in options
- Route-aware stay suggestions

## Core Listing Types

To avoid mixing very different accommodation expectations into one vague catalog, the platform should treat these as distinct stay types:

### 1. Hotel

Use cases:

- Short city stays
- Business or airport-adjacent travel
- Standardized family trips

Planning notes:

- Usually easier to compare
- Often better suited for affiliate or partner handoff
- Strong fit for trust-first launch

### 2. Resort

Use cases:

- Beach vacations
- Family destination travel
- Premium leisure trips

Planning notes:

- Strong visual merchandising value on the landing page
- Amenities and destination context matter heavily
- Often paired with activities and transport

### 3. Vacation Home / Villa / Airbnb-Style Stay

Use cases:

- Barkada trips
- Family group trips
- Longer stays

Planning notes:

- Capacity and house rules are critical
- Quality consistency is harder to maintain
- Needs stronger listing review and trust processes

### 4. Unique Stay

Use cases:

- Glamping
- Nature cottages
- Scenic or novelty lodging

Planning notes:

- High inspiration value
- Often higher risk for expectation mismatch
- Requires excellent photo and amenity clarity

### 5. Budget Stay / Hostel / Inn

Use cases:

- Backpacking
- Simple local travel
- Overnight transit stays

Planning notes:

- Price accuracy matters more than polish
- Safety, cleanliness, and accessibility become key trust factors

## Recommended User Flow

The landing-page cards should capture travel intent, not attempt to complete booking immediately.

### Flow A. Landing Page Card to Stay Detail

1. User sees a stay card on the landing page.
2. The card communicates:
   - property name
   - destination
   - stay type
   - price cue
   - rating or review signal
   - badge with a real meaning
3. User clicks the card.
4. App opens `Stay Detail`.
5. User reviews photos, fit, location, trust, and pricing notes.
6. User chooses to:
   - `Check availability`
   - `Save`
   - `Share`
   - `View on map`
   - `See similar stays`
7. User hands off to booking or inquiry flow.

### Flow B. Landing Page to See All

1. User taps `See all`.
2. App opens a `Stays Listing` page.
3. User filters and sorts options.
4. User opens multiple detail pages.
5. User saves one or more stays into a shortlist.
6. User compares options and moves into booking or inquiry.

### Flow C. Inspiration to Shortlist

1. User scrolls without a firm destination.
2. User clicks a badge or themed entry point like:
   - beachfront
   - family-friendly
   - luxury
   - unique stay
3. App opens a pre-filtered listing.
4. User narrows by dates, budget, or guest count.
5. User saves options for later planning.

## Listing Page Requirements

The `Stays Listing` page should help travelers narrow choices quickly without losing the inspirational feel of the landing page.

It should support:

- destination-aware browsing
- dates and guests filters
- property type filters
- trip-type filters
- amenity filters
- save and compare actions
- sort by relevance, price, and rating

Priority filters:

- `Destination`
- `Dates`
- `Guests`
- `Price per night`
- `Property type`
- `Trip type`
- `Amenities`
- `Booking flexibility`
- `Parking / airport access / late check-in`

Suggested sort options:

- `Recommended`
- `Price low to high`
- `Top rated`
- `Best for families`
- `Trending`

## Stay Detail Page Requirements

The stay detail page should answer these questions in order:

1. `Is this right for my trip?`
2. `Can it fit my group and budget?`
3. `Is the location practical?`
4. `Can I trust this listing?`
5. `What do I do next to secure it?`

The page should include:

- hero gallery
- stay summary
- property type
- capacity and room arrangement
- price notes
- amenities
- check-in / check-out info
- map and nearby landmarks
- nearby activities
- policy summary
- trust or verification area
- similar stays fallback

## Save, Share, and Compare Planning

This feature should be treated as a first-class planning tool, not a minor icon only.

Recommended product behavior:

- unauthenticated users can save locally first
- sign-in can later sync saved stays
- users can save into named shortlists
- shortlists should remain visible across landing page, listing, and detail
- later phases can support shareable shortlist links
- compare mode should work for a small set of stays

This matters because one traveler often plans for several people in the Philippines travel context.

## Trust, Safety, and Listing Quality

Accommodation discovery carries trust and scam risk.

The platform should plan for:

- verified partner or verified property badges with strict definitions
- pricing freshness indicators
- transparent labels such as `starting at` or `estimated`
- review-source clarity
- cancellation-policy summaries
- photo quality standards
- clear support boundaries if booking issues happen

If MyExplorer is not the actual merchant, the UX must make that obvious before handoff.

## Pricing and Availability Rules

The product should avoid implying stronger pricing certainty than the platform can actually support.

Launch-safe rules:

- use `starting at` instead of guaranteed nightly pricing when needed
- show estimated pricing only when refresh dates are known
- avoid `Book now` language unless live inventory exists
- prefer `View stay`, `See rates`, or `Check availability`
- disclose when final booking happens on a partner site

## Edge Cases to Design Early

### A. Final Booking Price Does Not Match Displayed Price

Planning notes:

- disclose that price may vary by dates and partner inventory
- capture freshness timestamp if possible
- avoid false expectations on landing-page cards

### B. No Availability for Selected Dates

Planning notes:

- show similar stays nearby
- allow date shifting
- keep the stay saved even when unavailable

### C. User Saves Stays Before Signing In

Planning notes:

- support local save state first
- prompt account creation only when useful

### D. Duplicate or Outdated Listings

Planning notes:

- keep a normalized stay catalog
- deduplicate partner sources
- retire stale supply quickly

### E. Multi-Stop Travel

Planning notes:

- allow users to save more than one stay for one trip
- eventually connect stays to itinerary stops

### F. User Thinks MyExplorer Owns the Booking

Planning notes:

- clearly label whether the platform is discovery, referral, or booking merchant
- define support and dispute boundaries upfront

## Partner / Provider Operations

Even if launch begins as curated discovery, the platform should plan for future operational needs:

- partner verification
- content moderation
- listing freshness review
- response-time expectations
- handoff destination tracking
- delisting rules for poor-quality supply

If the platform eventually accepts direct inventory, provider tooling and compliance requirements will become much heavier.

## Support and Dispute Boundaries

The product should define who owns which part of the traveler journey.

Questions to answer early:

- who handles cancellations
- who answers booking disputes
- who resolves pricing mismatches
- what support MyExplorer offers after partner handoff
- what happens when a partner fails to respond

## Monetization Model

Possible monetization paths:

- referral or affiliate commissions
- lead-generation fees
- featured placement for verified partners
- premium placement for curated stays
- bundled upsells with transport or activities

The launch model should not depend on native booking checkout unless supply quality and support operations are ready.

## Analytics and Conversion Tracking

The system should capture:

- section impressions
- card clicks
- save actions
- shortlist creation
- detail page opens
- partner handoffs
- destination interest trends
- conversion outcomes where tracking is possible

These signals will help determine which destinations and stay types deserve deeper investment.

## Launch Recommendation

The recommended launch scope is:

- curated `Recommended Stays` carousel
- stays listing page
- stay detail page
- save / shortlist behavior
- clear external booking or inquiry handoff
- trust and pricing disclosures
- analytics on browsing and handoffs

The product should not launch first with:

- native accommodation checkout
- self-serve host onboarding
- real-time availability promises without real inventory
- refund or cancellation ownership beyond actual platform control

## Key Product Decision

The most important planning decision is this:

Should `Recommended Stays` remain a curated discovery layer tied to trip planning, or become a true accommodation marketplace?

For the current product state, the most defensible answer is:

- `Curated discovery -> shortlist -> external booking / inquiry handoff`

That approach preserves trust, reduces false promises, and still creates a strong foundation for deeper marketplace capabilities later.
