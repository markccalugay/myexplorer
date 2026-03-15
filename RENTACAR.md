# Rent a Car / Van Marketplace Planning

## Purpose

This document captures early planning for the `Rent a Car or Van` section as it evolves from a simple rental discovery area into a two-sided marketplace.

The goal is to support:

- Travelers who want to book vehicles for personal, family, or group trips
- Providers who want to list vehicles or offer transport-related services

This is a planning document only. It is not legal advice.

## Product Direction

The current section behaves like a one-sided marketplace: users browse available vehicles and reserve them.

The long-term direction is a two-sided marketplace with at least two primary roles:

- `Traveler`
- `Provider`

Eventually, the section should support two high-level user intents:

- `Book for my trip or family`
- `List my vehicle or offer my service`

## Core Service Types

To avoid mixing very different legal, operational, and insurance requirements, the platform should treat these as separate service types:

### 1. Self-Drive Rental

The customer rents a car or van without a driver.

Use cases:

- Family trip
- Barkada trip
- Small group travel
- Personal out-of-town use

Requirements to plan for:

- Verified identity
- Valid driver’s license
- Security deposit or pre-authorization
- Vehicle pickup and return process
- Fuel, mileage, and damage rules
- Late return and extension rules

### 2. Vehicle + Driver

The provider supplies both the vehicle and the driver.

Use cases:

- Family airport transfer
- Group tours
- Long-distance provincial travel
- Travelers who do not want to drive

Requirements to plan for:

- Provider verification
- Driver verification
- Commercial/legal compliance review
- Passenger safety coverage
- Driver reassignment and rescue operations

### 3. Driver-Only / Chauffeur Service

The customer already has their own vehicle and wants to hire a driver only.

Use cases:

- Family already owns a van
- Elderly passenger needs a driver
- Out-of-town trip using a personal vehicle
- Temporary personal chauffeur need

Requirements to plan for:

- Separate onboarding flow from rentals
- Clear responsibility split for customer-owned vehicle condition
- Driver identity and qualification checks
- Contract terms specific to chauffeur staffing

### 4. Emergency Replacement Driver

This is not a customer-facing primary service at launch, but an internal fallback service for active bookings.

Use cases:

- Assigned driver becomes unavailable
- Driver is involved in an incident
- Driver can no longer continue the trip safely

Requirements to plan for:

- Backup provider pool
- Fast dispatch workflow
- Incident escalation policy
- Customer notification and ETA updates

## Edge Cases to Design Early

### A. Customer Wants a Van but No Driver

This should be supported only under `Self-Drive Rental`.

Planning notes:

- Require verified license and identity
- Confirm the renter is legally qualified to operate the vehicle
- Apply a deposit, pre-authorization, or hold
- Require signed terms covering damage, late return, and cleaning/fuel conditions
- Consider age, driving history, and experience rules for larger vehicles

### B. Customer Wants a Driver but Already Has a Vehicle

This should be treated as `Driver-Only / Chauffeur Service`, not as a normal car rental.

Planning notes:

- Keep this as a separate category and workflow
- Clarify that the customer is responsible for the vehicle’s registration, condition, and owner-side insurance unless otherwise covered
- Require clear service boundaries for where the driver can operate and for how long
- Add rules for overnight trips, food/accommodation allowances, and shift limits

### C. Customer Wants to Extend a Trip

Extension should not be automatic.

Planning rules:

- Only allow extension if the vehicle and driver remain available
- Recalculate total pricing before confirmation
- Require provider approval when needed
- Capture additional payment before extension is finalized
- Define cutoff times for same-day or last-minute extension requests

### D. Customer Ends a Trip Early

Early termination should have a separate policy from cancellations.

Planning rules:

- Define what portion is refundable, if any
- Non-refundable portions may include dispatch fees, driver time already blocked, and platform fees
- Unused future days may be partially refundable depending on notice and provider policy
- Keep policy different for self-drive vs. vehicle-with-driver bookings

### E. Driver No-Show, Illness, Breakdown, or Mid-Trip Inability to Continue

This should trigger emergency operations.

Planning rules:

- Notify customer immediately
- Attempt reassignment from a verified backup pool
- Show a replacement ETA
- Offer automatic refund or partial refund if reassignment fails
- Maintain internal escalation rules for safety-first decision making

### F. Accident or Loss of Vehicle Control

This is a major operational and legal-risk scenario.

Planning rules:

- Freeze the active listing while incident review is ongoing
- Trigger incident reporting workflow immediately
- Collect police report, trip details, photos, and provider statements
- Notify insurer within required timelines
- Determine whether a replacement vehicle or driver can continue the trip safely
- Apply service recovery, refunds, or emergency assistance as needed

## Legal and Regulatory Considerations

These items need formal legal review before launch, especially for provider marketplaces involving paid passenger transport.

### High-Level Legal Concern

If the platform allows users to offer passenger transport for compensation, the service may fall into regulated transport territory in the Philippines, not merely general listing or marketplace software.

That means the platform should avoid assuming all supply can be treated the same way.

### Practical Product Implication

The safest initial launch category is likely:

- `Self-Drive Rental`

The highest-regulation category is likely:

- `Vehicle + Driver`

The `Driver-Only / Chauffeur Service` category may be workable, but it should not be launched without legal review of the exact business model and responsibility structure.

## Official Sources Reviewed

As of March 15, 2026, the following official sources were reviewed for planning context:

- LTFRB TNVS Provisional Authority records:
  https://ltfrb.gov.ph/provisional-authority-tnvs/
- LTFRB CPC requirements for new public convenience applications:
  https://www.ltfrb.gov.ph/wp-content/uploads/2017/10/A.-NEW-CERTIFICATE-OF-PUBLIC-CONVENIENCE-CPC.pdf
- LTO policy against colorum vehicles:
  https://lto.gov.ph/news/colorum-is-a-crime-lto-to-implement-no-release-policy-vs-vehicles-impounded-in-anti-colorum-operations/
- LTO 2023 Citizen’s Charter:
  https://www.lto.gov.ph/wp-content/uploads/2023/09/LTO-CITIZENS-CHARTER_2023_0905.pdf
- Insurance Commission FAQ and amended Insurance Code references:
  https://www.insurance.gov.ph/faqs/
  https://www.insurance.gov.ph/amended-insurance-code-r-a-10607/
- LawPhil jurisprudence on common carrier duty and extraordinary diligence:
  https://lawphil.net/judjuris/juri1957/aug1957/gr_l-9671_1957.html
- LTFRB contact directory for legal/technical clarification:
  https://ltfrb.gov.ph/contact-directory/

## Insurance and Liability Planning

Terms and conditions alone are not enough protection for this kind of service.

The platform should plan for layered protection:

- Mandatory proof of required motor vehicle insurance
- Additional commercial or comprehensive coverage where applicable
- Passenger coverage where required by service type
- Provider indemnity provisions
- Internal reserve or incident support mechanism
- Documented incident reporting and escalation workflow

For `Vehicle + Driver` services, planning should assume that passenger injury, third-party damage, and service interruption are all real operational risks.

For `Driver-Only / Chauffeur Service`, planning should clearly allocate responsibility for:

- Vehicle condition
- Vehicle maintenance
- Registration validity
- Owner-side insurance
- Pre-existing vehicle defects

## Replacement Driver / Service Recovery Planning

If a driver cannot continue a trip, the platform should be able to respond in a structured way.

Suggested policy direction:

- Keep a vetted backup pool of drivers or operators
- Trigger emergency reassignment workflow immediately
- Give the customer a clear ETA and status updates
- If no timely replacement is available, issue partial or full refund depending on trip stage
- Consider recovery credits for major disruption

## Suggested MVP Rollout

### Phase 1

Launch only:

- `Self-Drive Rental`
- Curated family/group vehicle inventory

Do not launch open provider marketplace supply yet.

### Phase 2

Add:

- Provider signup
- Vehicle listing creation
- Admin verification and approval
- Basic booking operations

### Phase 3

Add:

- `Vehicle + Driver`
- Incident workflows
- Backup replacement operations
- Ratings and review system
- Payouts and provider earnings

### Phase 4

Consider:

- `Driver-Only / Chauffeur Service`
- Deeper transport compliance workflows
- Dynamic bundle offers with stays and activities

## Recommended Dashboard Separation

Customer-facing booking and provider-facing operations should not share the same workflow.

Plan separate dashboards for:

- `Traveler Dashboard`
- `Provider Dashboard`
- `Admin / Verification Dashboard`

### Traveler Dashboard

Should eventually support:

- Search and filters
- Booking management
- Extension request
- Cancellation or early end request
- Incident help / support

### Provider Dashboard

Should eventually support:

- Profile setup
- Vehicle/service listings
- Pricing
- Availability
- Booking approvals
- Earnings
- Compliance documents
- Incident submissions

### Admin Dashboard

Should eventually support:

- Provider approval
- Document review
- Booking dispute handling
- Incident monitoring
- Risk controls

## Key Product Recommendation

Do not model all rent and hire scenarios as a single “book a vehicle” feature.

Instead, explicitly separate:

- `Self-Drive Rental`
- `Vehicle + Driver`
- `Driver-Only / Chauffeur Service`
- `Emergency Replacement Driver`

This will keep the product, operations, legal review, and insurance planning much cleaner.

## Next Recommended Planning Documents

After this document, the next useful planning outputs would be:

- Service-type decision matrix
- Risk matrix
- Cancellation / extension / early-end policy draft
- Provider verification checklist
- Insurance requirements checklist
- MVP vs. post-MVP scope map
