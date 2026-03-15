# MyExplorer Tech Stack

This document is a quick reference for the current MyExplorer project stack.

It reflects the current state of the repository as of March 15, 2026.

## Current Stack

### Frontend

- `React 19`
- `React DOM 19`
- `TypeScript 5`
- `Vite 6`

The app is currently a client-side single-page application.

## Styling

- Plain CSS stylesheets
- Component-level CSS files
- Global app styles in `src/index.css` and `src/App.css`

The project is not currently using Tailwind CSS, Sass, or a CSS-in-JS library.

## Maps and Location

- `Google Maps JavaScript API`
- Google Maps libraries in use:
  - `maps`
  - `places`
  - `marker`
  - `routes`
- `@types/google.maps` for TypeScript support

Google Maps is a core product dependency in the current app experience.

## Tooling

- `ESLint 9`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

Available scripts:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Runtime and Package Management

- `Node.js`-based frontend toolchain
- `npm` for package management
- `package-lock.json` is present

## Data and Persistence

- No backend yet
- No database yet
- No server API yet
- Current saved trip data is stored in browser `localStorage`

At the moment, the project behaves like a frontend-first prototype/application.

## Backend Considerations

Backend is still undecided.

Options currently being considered:

- `Supabase`
- `Firebase`

These are not part of the implemented stack yet. They are only future considerations for backend, auth, database, storage, and realtime features.

## Not Currently Present

The repository does not currently show:

- `Supabase` integration
- `Firebase` integration
- `Next.js`
- `Tailwind CSS`
- `Redux`, `Zustand`, or another dedicated state library
- A custom backend service such as `Node/Express`
- A relational or document database wired into the app

## Summary

MyExplorer currently uses a modern frontend stack centered on `React + TypeScript + Vite`, with Google Maps powering mapping, places, and routing features.

Backend technology is still open and may later use either `Supabase` or `Firebase`.
