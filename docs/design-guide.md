# MyExplorer design direction

**Status: working draft, November 21, 2026.** Product-owner approval and user research are pending. This guide describes the intended direction; it is not a claim that every screen or feature already works this way. Track this work in [#80](https://github.com/markccalugay/myexplorer/issues/80), user goals in [#78](https://github.com/markccalugay/myexplorer/issues/78), and usability research in [#79](https://github.com/markccalugay/myexplorer/issues/79).

## Evidence and research still needed

- The current web token inventory is [`tokens.json`](../src/design-system/tokens.json), with CSS values in [`index.css`](../src/index.css). The planner also uses many one-off colors in [`TripPlanner.css`](../src/components/TripPlanner.css). The existing [store screenshot brief](app-store-screenshot-brief.md) uses a different palette; it is a marketing brief, not an app-wide standard.
- The existing [logo component](../src/components/BrandLogo.tsx), [source mark](../src/assets/logo_myexplorer.svg), and [Play icon](play-store-assets/en-US/app-icon-512.png) are current assets to preserve while the owner reviews this direction.
- Mobbin's public [Going travel app palette](https://mobbin.com/colors/brand/scotts-cheap-flights-inc-dba-going) illustrates a restrained dark, light, and accent palette. This is a color reference, not evidence that those colors or interactions should be copied. Its [time picker guide](https://mobbin.com/glossary/time-picker) discusses choosing a control suited to the booking task.
- The connected Mobbin screen-search tools were not available in this session. **Travel app screen and flow comparison remains outstanding**: inspect destination search, maps, saved trips, and booking flows from at least three relevant apps on phone and web; record app, platform, screen URL, date, observation, and implication. Do not infer fonts or usability outcomes from screenshots. Update this guide after reviewing those references.
- The user's reports about trip recovery, stop entry, web/native transitions, and map gestures are important product feedback; they are not yet findings from a broader user study. No features are approved for removal by this document.

## Brand and principles

MyExplorer should feel **welcoming, capable, and calm**: the traveler knows where they are, what comes next, and how to get back to their trip. Use a clear map, real places, and concise language; let destination imagery add warmth without obscuring controls. Avoid claiming bookings, shared trips, or live navigation work unless that exact flow has been verified.

1. **One journey:** Home → plan with searchable stops → review → begin. Keep the current trip easy to find.
2. **Places, not coordinates:** search by name or address; show useful place names and context. Coordinates are an internal detail.
3. **Always explain trip state:** distinguish planning, navigating, paused, ended, and recovery; never imply guidance is active when it is not confirmed.
4. **One recognizable product:** reuse brand, labels, and trip meaning across web and phone; adapt layout and controls for each platform.
5. **Earn attention:** primary task first; disclose secondary detail when needed. In a vehicle, follow the host's driving-safety restrictions.

### Logo and imagery

Use the existing mark without stretching, cropping, adding effects, or redrawing it. Leave clear space around it and ensure contrast against its background. Use the existing app icon for launcher and store contexts; validate adaptive-icon safe areas and small-size legibility. Prefer authentic, licensed destination photographs; do not place text over busy images without an opaque or contrast-tested surface. Exact logo clear-space and minimum-size specifications require owner approval and asset review.

## Proposed shared visual tokens

These are design targets based on current repository tokens, not a request to replace them in code today. Marketing colors remain a separate unresolved choice.

| Role | Value | Use |
| --- | --- | --- |
| Primary action / link | Deep ocean `#0D47A1` | Primary buttons and links; white text, subject to context-specific verification |
| Brand accent | Explorer blue `#1E88E5` | Brand decoration, map accents, and large visual elements; do not assume white small text passes contrast |
| Light accent | Sky blue `#64B5F6` | Subtle illustration or decoration, not small text on white |
| Main surface | White `#FFFFFF` | Reading surfaces and cards |
| Secondary surface | Soft gray `#F4F6F8` | Background areas |
| Main text | Dark gray `#263238` | Text on light surfaces |
| Warm accents | Sand `#F5E9DA`, orange `#FF7043` | Small highlights and destination context, not the sole sign of status |
| Success accent | Forest green `#2E7D32` | Success indicators with a text label and icon |

Error, warning, focus, disabled, dark-mode, and route-overlay tokens need explicit accessible pairings before implementation. Check actual foreground/background combinations, including images and map overlays: WCAG AA calls for at least [4.5:1 for normal text and 3:1 for large text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), with applicable non-text contrast requirements. Do not rely on color alone to convey meaning.

### Typography

Use **Roboto** for UI and headings, retaining the current web fallback stack: Roboto, system fonts, Segoe UI, sans-serif. Bundle or load the font deliberately, and use system fallbacks until it is available; platform-controlled car templates use their own system typography. Do not guess competitors' font families from screenshots.

| Role | Starting size | Weight / line height |
| --- | --- | --- |
| Display | 48 px desktop; scale down on small screens | 700 / 1.2 |
| Page title | 36 px desktop; 28–32 px phone | 700 / 1.2 |
| Section title | 22–28 px | 700 / 1.2–1.3 |
| Card title | 18 px | 600–700 / 1.3 |
| Body | 16 px | 400 / 1.5–1.6 |
| Supporting text | 14 px | 400–500 / 1.5 |

These are starting sizes, not fixed limits: respect user font scaling, avoid clipping, and do not put essential instructions in 12 px captions. Native sizes should use platform-scalable units and car templates must use host rules.

### Spacing, surfaces, and components

- Use a 4 px spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Start phone page margins at 16; increase when space permits.
- Existing starting radii are 8 px inputs, 12 px buttons, and 16 px cards. Use soft shadows sparingly; separate surfaces with spacing and borders where clearer.
- **Primary button:** one dominant next action per view, verb first: “Plan a trip,” “Add stop,” or “Start navigation.” Provide pressed, disabled, loading, and focus states. Explain why an action is unavailable.
- **Search field:** persistent label, example place or address, clear button, recent/suggested results where available, loading, no results, network error, and keyboard/screen-reader support. A suggestion should include enough location context to choose the correct place.
- **Stop row:** name, location context, order, and accessible reorder/remove actions. Confirm destructive changes where needed; offer undo when feasible. Never silently remove a stop.
- **Trip card/status:** trip name, next destination, explicit state, and one clear “Return to trip” or “Continue planning” action. Show when state is being checked or cannot be recovered.
- **Dialogs and sheets:** a clear title, short explanation, meaningful button labels, focus management, and a visible dismissal path. Keep the map and current trip understandable when a sheet is open.
- Aim for at least 48 × 48 dp touch targets on Android and comparable accessible targets on the web; car controls follow host-provided sizing. Do not shrink targets when text scales up.

## Key journeys and screen examples

### 1. Home

Show a recognizable brand and a clear “Plan a trip” action. If a trip exists, prioritize a status card with “Continue planning” or “Return to trip” according to confirmed state. Discovery content is secondary to returning to an active journey. App version belongs in **Menu → App info**, with name and build number read from the installed app.

### 2. Plan a trip

Make the map visible alongside an ordered origin, stops, and destination. “Add stop” opens place search; choosing a result adds it visibly. Reorder or remove stops using explicit, accessible controls. Show route preview, distance and time only when available, plus a clear “Start navigation” action once the route is ready. State what changed if a route cannot be calculated.

### 3. Navigate and return

Keep the next maneuver, distance, estimated arrival, and current trip identity readable. Allow map pan and zoom; provide visible accessible zoom controls in addition to gestures. On touch screens support pinch and double-tap zoom, and evaluate double-tap-and-drag zoom where the map SDK supports it. Never promise every vehicle host supports the same gestures.

After backgrounding, reopening, or reconnecting to a car, reconcile the actual navigation session and show the appropriate state. Restore the journey automatically **when the system and persisted state permit**; if recovery is impossible or guidance has ended, explain what happened and offer the correct next action. Never display stale navigation as active. Test force-stop, process death, permission loss, offline behavior, and phone/car disagreement separately.

### 4. Stop changes and group trips

On the phone, search and add or remove a stop without entering coordinates; explain route recalculation and keep the existing route visible until a change succeeds. In-car search and stop changes must use supported templates and driving restrictions. Convoy stop suggestions and votes are a **future product proposal**, not a claim of shipped functionality: define eligible voters, deadline or distance rule, ties, offline participants, initiator approval, and clear outcomes in #78 before designing or implementing it.

## Responsive and platform behavior

- **Web:** use a single-column phone layout and a map plus planner panel when there is room. Reflow rather than scale down desktop controls; keep focus, keyboard operation, and readable text.
- **Android and iOS phones:** target a coherent native app experience with the same trip language and goals. The current Android build includes an embedded web experience and separate native navigation; a fully packaged native experience is a target, not current reality. Avoid requiring users to understand or manage that boundary.
- **Android Auto:** use supported [Android for Cars navigation templates](https://developer.android.com/design/ui/cars/guides/app-types/navigation-apps), host-controlled controls and safe map areas. Phone gestures and layouts do not automatically transfer to the car. Validate screen sizes and input methods against the [existing DHU matrix](android-auto-dhu-validation-matrix.md) and real vehicles when available.
- **Future CarPlay:** follow [Apple's CarPlay guidelines](https://developer.apple.com/design/human-interface-guidelines/carplay) and system templates. CarPlay is planned; do not represent it as implemented or approved.

## Voice, states, and validation

Write short, direct labels in sentence case. Explain the situation and a practical next step: “Can't find that place. Try another name or address.” Avoid blame, unexplained error codes, and uncertain success language. Include loading, empty, permission denied, offline, error, recovery, and success states in every relevant flow. Ask for location when the user invokes a location-dependent action, and explain the benefit before the system prompt where needed.

Before approving a design, review with the owner, test with representative travelers under #79, and record which devices and assistive technologies were actually tested. Check screen-reader labels and order, keyboard focus, text scaling, contrast, map attribution, and safe parked or simulated car interaction. Inspect phone and web at narrow and wide sizes. Track design-to-implementation gaps separately and never label proposed mockups as shipped UI.

## Decisions for owner review

1. Confirm whether the existing blue interface palette or the store brief's ocean/sand/coral palette should lead the unified brand; create tested semantic light/dark tokens after that decision.
2. Approve logo usage, responsive type scale, and any changes to existing visual assets.
3. Review the home → plan → begin and trip recovery examples against findings from #78 and #79.
4. Complete the Mobbin travel-screen comparison, then revise this document and identify prioritized implementation tickets. Keep #80 open until owner approval.
