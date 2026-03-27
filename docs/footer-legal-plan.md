# MyExplorer Footer + Legal Prep Plan

This is a product and implementation planning doc for the website footer and legal surface area around MyExplorer.

It is not legal advice. It is an app-specific working brief so we can scope the work correctly before drafting policies and opening GitHub issues.

## 1. Current App Inventory

Based on the current codebase, the web app and mobile shell currently touch these legal/compliance areas:

- Google Maps Platform usage
  - Maps JavaScript API
  - Places / Autocomplete
  - Routes
  - Place photos and place metadata
- Location access
  - Browser geolocation on web
  - iOS location permission copy already declared
  - Android coarse/fine location permissions already declared
- Local device storage
  - Saved trips in `localStorage`
  - Favorite places in `localStorage`
  - Navigation session state in `localStorage`
- Outbound links and third-party content
  - Google Maps URLs
  - Place websites and phone numbers
  - Place summaries, ratings, addresses, and photos

Areas that do **not** appear to be in scope yet:

- User accounts or authentication
- Payments or subscriptions
- Analytics/tracking SDKs
- Marketing cookies / ad tech
- User-generated public content
- Server-side user profiles or cloud-stored trip history

## 2. What This Means for Legal Requirements

For the current app, the footer/legal MVP should focus on four real buckets:

1. Privacy disclosures
2. Terms of use
3. Google Maps / Places / Routes attribution and usage disclosures
4. Permission and device-access explanations for location usage

Because the app currently appears to be mostly client-side and local-device based, we do **not** need to start with a giant enterprise privacy center. We need a clean, accurate, defensible baseline.

## 3. What Should Be Required Now

### A. Privacy Policy

This is required for a product like this.

For MyExplorer, the privacy policy should cover:

- What data the app handles
  - search input
  - trip stops and itinerary data
  - current location, if permission is granted
  - locally saved favorites and trips
- Where data is processed or stored
  - browser/device local storage today
  - Google Maps Platform as a service provider / third-party processor when maps, places, routes, and photos are requested
- Why location is used
  - setting origin
  - route planning
  - restoring navigation context
  - route-aware recommendations
- Whether data is sold or shared for advertising
  - current expected answer: no, unless product direction changes
- How users can control data
  - deny location permission
  - clear browser storage / saved trips
  - contact support
- Third-party links and services
  - Google Maps
  - destination websites
- Children / age minimum
  - add product decision here
- Contact details for privacy questions

### B. Terms of Service

This is also required.

For MyExplorer, the terms should cover:

- the service is provided as-is / as available
- trip, routing, ETA, and place information may be incomplete, inaccurate, or unavailable
- users are responsible for safe travel decisions
- no reliance on the app for emergencies or guaranteed navigation outcomes
- external third-party content and links are not controlled by MyExplorer
- acceptable use
- IP / ownership of the app
- limitation of liability
- termination / suspension rights if accounts are later added
- governing law / dispute language once business/legal decides it

### C. Maps & Attribution Notice

This is required because Google Maps Platform content is central to the product.

At minimum we should have:

- a footer link such as `Maps & Attribution`
- in-product attribution where Google content is shown outside the embedded map canvas
- a short note explaining that maps, place data, routes, and some imagery come from Google Maps Platform and may be subject to Google terms/policies

Important implementation note:

- If Google content is already shown inside the Google map itself, the built-in attribution usually covers that surface.
- If Google place data is shown in cards, detail panels, trip summaries, recommendation prompts, or saved items outside the map, we likely need explicit Google Maps attribution there too.

### D. Permission / Device Access Disclosure

This can live inside the Privacy Policy, but for this app it would be cleaner to also expose it as either:

- a dedicated `Permissions & Device Access` page, or
- a Privacy Policy section with a footer anchor link

For MyExplorer today, this should explain:

- Location
  - used to set current origin, guide routing, and resume navigation
  - optional on web unless a flow needs it
- Local storage
  - used to remember trips, favorites, and navigation state on the device

### E. Contact / Support

The footer should include a real support/legal contact path.

Minimum acceptable version:

- `Support`
- `Contact`
- or a single `Help & Contact` page

It should include:

- support email
- privacy/legal contact email if different
- business name

## 4. What Is Probably Not Required Yet

These do **not** look mandatory for the current website version, unless the product scope changes:

- Cookie banner
  - only needed if we add non-essential cookies or tracking tech
- Standalone cookie policy
  - same reason
- Refund policy
  - no payments/subscriptions in the current app
- Community guidelines
  - no public user content yet
- Data Processing Addendum
  - not needed for a simple consumer-facing website at this stage
- Account deletion workflow
  - no hosted accounts are visible yet

## 5. App-Specific Risks Found In The Current Implementation

These matter because the legal docs should match the actual implementation, and a few current behaviors look risky or incomplete.

### Risk 1: Hardcoded Google Maps API key fallback

Current file:

- `src/lib/googleMapsConfig.ts`

The app currently contains a checked-in fallback Google Maps API key. That should be removed before public rollout. This is partly security/operations, but it also affects how confidently we can describe platform handling and access controls.

### Risk 2: Local persistence of Google-derived place content

Current files:

- `src/App.tsx`
- `src/components/TripPlanner.tsx`
- `src/lib/navigationSessionStore.ts`

The app stores trip snapshots, favorites, and navigation session state locally. Those structures include Google-derived place/address data and route-related metadata.

This needs a dedicated policy/engineering review because Google Maps Platform terms are strict about how certain content may be stored or cached. We should not assume that “local-only” storage is automatically okay.

### Risk 3: Attribution for non-map Google content

Current files:

- `src/components/LocationDetail.tsx`
- `src/App.tsx`
- `src/components/TripPlanner.tsx`

The app presents Google-derived place content in panels/cards outside the map surface. We need to add deliberate attribution instead of relying only on the map canvas.

### Risk 4: No public legal routes yet

Current footer only shows copyright + logo:

- `src/App.tsx`

There are no dedicated routes/pages yet for privacy, terms, maps attribution, permissions, or support.

## 6. Recommended Footer Information Architecture

Recommended first-pass footer links:

- Privacy Policy
- Terms of Service
- Maps & Attribution
- Permissions & Device Access
- Support / Contact

Optional once we grow:

- Accessibility
- Data Requests
- Cookie Policy
- Press / Company

## 7. Recommended Content Structure

### Privacy Policy outline

- who we are
- what information we handle
- how location data is used
- how trip/favorites/navigation data is stored
- third-party services including Google Maps Platform
- legal basis / regional rights if we decide to support GDPR-style requests formally
- retention approach
- user controls
- children
- policy updates
- contact

### Terms of Service outline

- acceptance of terms
- service description
- no guarantee of map, route, ETA, venue, or availability accuracy
- safe-driving / real-world decision disclaimer
- third-party content and links
- prohibited uses
- intellectual property
- disclaimers
- limitation of liability
- changes to service
- governing law / dispute resolution
- contact

### Maps & Attribution page outline

- Google Maps Platform powers map, route, and place features
- Google content may be subject to Google terms/policies
- attribution statement used across the product
- note on third-party place photos/content if surfaced
- link to Google terms/policy pages we rely on

### Permissions & Device Access outline

- location permission
- local storage use
- what happens if permission is denied
- device/browser controls

## 8. Recommended Delivery Plan

### Phase 1: Compliance baseline

- remove checked-in Maps API key fallback
- inventory every Google-derived field we display and store
- decide what must stop being persisted locally
- define legal copy owner and approver

### Phase 2: Footer + legal routes

- create footer component and link structure
- add legal/support routes
- publish draft privacy policy
- publish draft terms
- publish maps attribution page
- publish permissions/device access page

### Phase 3: In-product compliance touches

- add visible attribution near non-map Google content
- add “use current location” explanatory copy where permission is requested
- add a user-visible control to clear locally saved trip/favorite/navigation data

### Phase 4: Mobile alignment

- make sure website privacy policy matches actual iOS/Android permission usage
- align App Store privacy details and Google Play Data safety declarations with the website policy before store submission

## 9. Proposed GitHub Issue Breakdown

These can become individual GitHub issues or grouped under a single epic.

### Epic: Footer + Legal Readiness

#### Issue 1: Remove hardcoded Google Maps API key fallback

Goal:

- remove the checked-in fallback key from `src/lib/googleMapsConfig.ts`
- fail closed when config is missing
- update docs to match implementation

Why:

- security and operational hygiene
- avoids shipping a credential in the client bundle

#### Issue 2: Audit Google Maps content storage and caching

Goal:

- document every Google-derived field being persisted in local storage
- decide what can remain, what must be replaced with IDs, and what must not be stored

Files to inspect first:

- `src/App.tsx`
- `src/components/TripPlanner.tsx`
- `src/lib/navigationSessionStore.ts`
- `src/types/place.ts`
- `src/types/trip.ts`

Why:

- likely the highest-risk compliance gap in the current implementation

#### Issue 3: Build footer component and legal routes

Goal:

- replace the minimal footer with a proper legal/support footer
- add pages/routes for privacy, terms, maps attribution, permissions, and support

Files to start from:

- `src/App.tsx`
- `src/App.css`

#### Issue 4: Draft Privacy Policy for current product scope

Goal:

- write a policy that accurately reflects current app behavior
- explicitly cover location, local storage, and Google Maps Platform usage

Dependency:

- should follow Issue 2, or at least use its findings

#### Issue 5: Draft Terms of Service for trip-planning product

Goal:

- write terms tailored to travel planning, routing, recommendations, and external destination information

#### Issue 6: Add Google Maps attribution on non-map content surfaces

Goal:

- identify every UI surface where Google-derived place/route content appears outside the map
- add the required attribution treatment

Likely files:

- `src/components/LocationDetail.tsx`
- `src/App.tsx`
- `src/components/TripPlanner.tsx`

#### Issue 7: Add permission and storage disclosure UX

Goal:

- add explanatory copy around current-location usage
- add or plan a simple “clear saved local data” control

Why:

- improves privacy posture and reduces surprise

#### Issue 8: Set up support and legal contact destination

Goal:

- decide the contact email(s)
- create the support/contact page used by the footer

#### Issue 9: Align mobile privacy disclosures before store distribution

Goal:

- make sure iOS/Android declarations match the published website policy
- review App Store privacy details and Google Play Data safety when mobile distribution gets closer

Relevant files:

- `apps/mobile/ios/MyExplorerMobile/Info.plist`
- `apps/mobile/ios/MyExplorerMobile/PrivacyInfo.xcprivacy`
- `apps/mobile/android/app/src/main/AndroidManifest.xml`

## 10. External Sources To Use While Drafting

Primary references to keep handy:

- Google Maps Platform policies and attribution guidance:
  - https://developers.google.com/maps/documentation/geolocation/policies
- Google Maps Platform service-specific terms:
  - https://cloud.google.com/maps-platform/terms/maps-service-terms/
- Google Maps Platform terms:
  - https://cloud.google.com/maps-platform/terms/
- Places API overview:
  - https://developers.google.com/maps/documentation/places/web-service/overview
- Apple required reason API / privacy manifest reference:
  - https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
- Google Play Data safety overview:
  - https://support.google.com/googleplay/answer/11416267

## 11. Suggested Next Working Sequence

Recommended order for us:

1. Open the Footer + Legal Readiness epic
2. Do the Google Maps storage/caching audit first
3. Remove the fallback API key
4. Draft the footer IA and route structure
5. Draft privacy policy and terms using the audit results
6. Implement attribution and permission/storage UX

## 12. Decision Calls We Still Need From The Business Side

Before final legal copy, we will still need answers for:

- legal business entity name to publish
- support email
- privacy/legal contact email
- governing law / dispute venue
- minimum user age, if any
- whether mobile launch is included in the same public policy set

