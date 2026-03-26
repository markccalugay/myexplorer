# Mobile Host Strategy

This planning note has been consolidated into [AUTOMOTIVE_REFERENCE.md](./AUTOMOTIVE_REFERENCE.md) for the current canonical view.

## Decision

MyExplorer should use `React Native` as the mobile host strategy for Android and future in-car support.

## Maps And Routing Decision

MyExplorer should use a hybrid maps strategy:

- Google Maps Platform remains the canonical provider for places and route data
- shared planner and navigation logic should move toward provider-neutral contracts instead of depending on `google.maps.*` browser types
- React Native phone screens should use native map rendering
- Android Auto and CarPlay should project shared trip/session state into platform-native automotive surfaces rather than trying to reuse the React Native phone map UI

This means the current Google Maps JavaScript integration is a web adapter, not the long-term shared contract for mobile and in-car projection.

## Why This Is The Right Fit

The repo is already TypeScript-first, and the most reusable parts of the product are the trip, routing, and navigation rules rather than the current browser UI.

Today the biggest blocker is not packaging the web app in a shell. It is the fact that trip planning and active navigation behavior still live inside React web components such as `src/components/TripPlanner.tsx` and the browser app shell in `src/App.tsx`.

`CARPLAY_DOC.md` is already explicit that the current Vite app cannot be projected directly to Android Auto or CarPlay. Both platforms require a native mobile layer and platform-specific automotive surfaces.

`React Native` is the best balance for this repo because it allows:

- shared TypeScript domain logic
- one mobile application stack for phone UI
- native modules where Android Auto and CarPlay require them
- a cleaner long-term path than wrapping the web app in a WebView

## Options Considered

### React Native

Pros:

- best fit for a TypeScript-heavy repo that needs a real native app
- lets us reuse shared trip/navigation logic once it is extracted
- provides a better foundation for future native automotive surfaces

Cons:

- still requires native Android Auto and CarPlay integration work
- requires reevaluating map rendering because the current app uses the Google Maps JavaScript API
- should not reuse the current web component tree directly

### Capacitor

Pros:

- fastest route to a simple Android app shell
- keeps the current web UI running quickly on a device

Cons:

- does not solve the deeper Android Auto and CarPlay architecture needs
- would likely force us to carry both a WebView shell and native automotive modules
- postpones, rather than removes, the shared-domain extraction we need anyway

### Separate Native Android And iOS Shells

Pros:

- strongest platform fit for fully native mobile and automotive work

Cons:

- too expensive for the current maturity of the repo
- pushes us into duplicated mobile work before the shared domain layer exists

## Recommended Rollout

1. Extract shared trip and navigation logic from the React web layer.
2. Define the persistent navigation session contract.
3. Stand up a React Native Android app first.
4. Build Android Auto against the shared session/domain layer.
5. Add iOS and CarPlay after the Android path is stable.

## Implications

- The current web app remains valuable as the fastest place to iterate on product behavior.
- Shared TypeScript modules should become the source of truth for trip lifecycle, stop sequencing, journey enrichment, and navigation session rules.
- Platform adapters should own permissions, location access, native map rendering, lifecycle hooks, and automotive projection surfaces.

## Status

This decision establishes the baseline for issue `#24` and keeps issue `#25` intentionally blocked until the first shared-domain extractions are in place.
