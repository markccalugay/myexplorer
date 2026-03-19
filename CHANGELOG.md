# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 2026-03-20: Added trip-level convey coordination for saved trips, including multi-vehicle setup, family or individual participant entries, invite-style local join flows, self-assignment into cars, reassignment support, soft seat-capacity warnings, and Bookings summary/actions for managing convoy placement.
- Landing page hero search now suggests destinations while typing, supports date range selection with calendar inputs, and lets travelers choose adults and children from a guest dropdown.
- Trip planner origin setup can now use the device's current location as the starting point, with browser permission handling and reverse-geocoded address details when available.
- Trip planner users can now save favorite places like Home, Office, or family addresses and reuse them as one-tap presets for origins, destinations, and extra stops.
- Trip planner routes can now be saved into the Bookings tab, reopened later for editing or starting, and protected with unsaved-change warnings before leaving the planner.
- Added ESLint with a project-level `npm run lint` command so the app can be checked for React and TypeScript lint issues from the CLI.

### Changed
- Reworked the mobile experience across the app shell, discovery layout, landing page cards, map interactions, and detail/planner overlays so key flows stack, scroll, and fit smaller screens more reliably.
- Updated the app font family to a Google Maps-style `Roboto` stack across shared theme tokens, global styles, and existing page-level typography overrides without changing the color palette.
- Cleaned up the React and TypeScript codebase to satisfy the new ESLint rules, including safer state initialization, tighter Google Maps typings, corrected hook dependencies, and route-planner/trip-planner callback fixes so `npm run lint` and `npm run build` both pass.
- Trip planner map pins now match the color of each stop marker dot in the timeline, including origin, destination, suggested pitstops, and manual stops.
- Extended the trip planner timeline panel height on desktop so the Route Recommendations area has more room before scrolling.
- Made the Route Recommendations filter panel non-scrollable so it spans naturally inside the trip planner column, avoiding nested scroll behavior because `planner-timeline-scroll` already handles the full sidebar scrolling.
- Refined the Route Recommendations filters into a two-column bento grid with fixed-height chips, balanced spacing, and a stronger selected state so travel preferences read more like a polished booking surface than inline tags.
- Expanded the Route Recommendations filters with Philippine-specific fuel, dining, and roadside essentials options, plus multi-select chips, icon markers, and a clear-all action for faster trip preference setup.
- Adjusted Route Recommendations filter selection so choices now behave as stable trip-preference inputs for pitstop suggestions, without altering the surrounding planner layout or causing disruptive visual state changes.
- Temporarily hid the navbar `Sign In` button until Google sign-in and sign-up integration is ready, while keeping the mobile header actions visible.
- Migrated Google Maps routing and marker rendering away from deprecated `DirectionsRenderer`, `DirectionsService`, `DistanceMatrixService`, and legacy `Marker` usage, while removing insecure marker asset URLs and stabilizing place identifiers.
- Fixed the auto-pitstop routing flow to use a valid Google Maps travel mode, refresh suggested stops when trip endpoints change, and avoid stale suggestions while aligning `mapId` usage with cloud-styled map requirements.
- Trip planner `Start Trip` mode now supports in-app navigation with live-location fallback handling, ordered multi-stop routing, recommended turns for the next leg, and stop-by-stop progression so travelers can stay inside MyExplorer instead of switching to another maps app.
- Trip planner navigation now shows a live elapsed timer beneath the primary ETA so drivers can compare actual time on the road against planned arrival timing, including delays from pitstops.
- Fixed the Bookings reopen flow so saved trips load reliably back into the planner with their saved stops, while resetting stale planner-only state between trip sessions.

## [0.1.0] - 2026-03-08

### Added
- Initial project structure setup.
- Comprehensive `.gitignore` for web and mobile development.
- Project `README.md` with overview and feature list.
- `CHANGELOG.md` to track project evolution.
