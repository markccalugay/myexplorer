# MyExplorer

MyExplorer is a next-generation travel application designed for seamless trip planning and discovery. Users can explore beautiful destinations, book unique venues, and organize their travel itineraries all in one place.

## Documentation

- [Tech Stack](./TECH_STACK.md)

## Environment

Create a local `.env.local` file from [`.env.example`](./.env.example) and set `VITE_GOOGLE_MAPS_API_KEY` before running the app.

`VITE_GOOGLE_MAPS_MAP_ID` is optional, but `VITE_GOOGLE_MAPS_API_KEY` is required. The app fails closed if the key is missing instead of falling back to a checked-in credential.

## Features (Planned)
- **Venue Booking**: Discover and book stays, restaurants, and experiences.
- **Place Exploration**: Detailed information and insights on destinations worldwide.
- **Trip Planning**: Interactive planning tools to build your perfect journey.

## Development Status
This project is currently in the initial setup phase, with a "web-first, mobile-later" development strategy.

## Getting Started
1. `npm install`
2. Create `.env.local` from [`.env.example`](./.env.example)
3. `npm run dev`

## Verification
- `npm run lint`
- `npm test`
- `npm run build`
