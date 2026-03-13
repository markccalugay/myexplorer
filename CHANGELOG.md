# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Landing page hero search now suggests destinations while typing, supports date range selection with calendar inputs, and lets travelers choose adults and children from a guest dropdown.

### Changed
- Trip planner map pins now match the color of each stop marker dot in the timeline, including origin, destination, suggested pitstops, and manual stops.
- Migrated Google Maps routing and marker rendering away from deprecated `DirectionsRenderer`, `DirectionsService`, `DistanceMatrixService`, and legacy `Marker` usage, while removing insecure marker asset URLs and stabilizing place identifiers.

## [0.1.0] - 2026-03-08

### Added
- Initial project structure setup.
- Comprehensive `.gitignore` for web and mobile development.
- Project `README.md` with overview and feature list.
- `CHANGELOG.md` to track project evolution.
