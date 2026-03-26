# MyExplorer

MyExplorer is a next-generation travel application designed for seamless trip planning and discovery. Users can explore beautiful destinations, book unique venues, and organize their travel itineraries all in one place.

## Documentation

- [Tech Stack](./TECH_STACK.md)
- [Automotive Reference](./AUTOMOTIVE_REFERENCE.md)

## Environment

Create a local `.env.local` file from [`.env.example`](./.env.example) and set `VITE_GOOGLE_MAPS_API_KEY` before running the app.

`VITE_GOOGLE_MAPS_MAP_ID` is optional, but `VITE_GOOGLE_MAPS_API_KEY` is required. The app fails closed if the key is missing instead of falling back to a checked-in credential.

## Features (Planned)
- **Venue Booking**: Discover and book stays, restaurants, and experiences.
- **Place Exploration**: Detailed information and insights on destinations worldwide.
- **Trip Planning**: Interactive planning tools to build your perfect journey.

## Development Status
This project started web-first and now includes an in-repo React Native mobile shell under [`apps/mobile`](./apps/mobile). The shared planner/session work needed for Android Auto and CarPlay is underway, but the automotive experience is not implemented yet.

## Getting Started
1. `npm install`
2. Create `.env.local` from [`.env.example`](./.env.example)
3. `npm run dev`

## Mobile Shell

The repo now includes a first native mobile host in [`apps/mobile`](./apps/mobile).

Current status:

- iOS and Android native projects exist
- the bundle/application ID is `com.thestillfoundation.myexplorer`
- the shell is suitable for local builds and internal validation
- mobile runtime config, release signing, and shared-module integration are still in progress

See [`apps/mobile/README.md`](./apps/mobile/README.md) for local mobile setup details.

## Verification
- `npm run lint`
- `npm test`
- `npm run build`
