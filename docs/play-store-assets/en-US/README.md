# MyExplorer Google Play Store Assets (`en-US`)

Upload-ready Google Play Store asset package for **MyExplorer** (`com.thestillfoundation.myexplorer`), prepared for owner review. **Do not upload or publish without owner sign-off.**

---

## Package Contents & Play Console Upload Destinations

| Asset | File | Play Console Destination | Spec |
| :--- | :--- | :--- | :--- |
| App icon | `app-icon-512.png` | **Common visual assets → App icon** | 512 × 512 px, 32-bit RGBA PNG, max 1,024 KB |
| Feature graphic | `feature-graphic-1024x500.png` | **Common visual assets → Feature graphic** | 1024 × 500 px, 24-bit RGB PNG (no alpha), max 15 MB |
| Phone screenshot 1 | `phone/01-plan-your-trip.png` | **Phone assets → Phone screenshots** | 1080 × 1920 px (9:16), 24-bit RGB PNG, max 8 MB |
| Phone screenshot 2 | `phone/02-order-trip-stops.png` | **Phone assets → Phone screenshots** | 1080 × 1920 px (9:16), 24-bit RGB PNG, max 8 MB |
| Phone screenshot 3 | `phone/03-save-and-reopen-trips.png` | **Phone assets → Phone screenshots** | 1080 × 1920 px (9:16), 24-bit RGB PNG, max 8 MB |
| Phone screenshot 4 | `phone/04-light-and-dark-theme.png` | **Phone assets → Phone screenshots** | 1080 × 1920 px (9:16), 24-bit RGB PNG, max 8 MB |
| Listing copy | `listing-copy.md` | **Common text assets** (`App name`, `Short description`, `Full description`) | 10/30, 76/80, 900/4,000 chars |
| Raw captures | `originals/*.png` | Archive / provenance only (do not upload) | 1080 × 2400 px unedited emulator captures |
| Editable sources | `source/*.html` | Design source files (do not upload) | HTML/CSS templates |
| Review sheet | `contact-sheet.png` | Owner visual review (do not upload) | Composite preview |

---

## Capture Provenance

- **App package:** `com.thestillfoundation.myexplorer`
- **Version:** `1.0` (`versionCode 2`, `apps/mobile/version.json`)
- **Git revision:** `2381679` (`main`) + in-progress Android release work
- **Device / Emulator:** `Medium_Phone_API_36.1` (`sdk_gphone64_arm64`, 1080 × 2400)
- **Sample trip data:** Synthetic Philippine destinations (`Tagaytay Ridge Loop`, `Subic Coastal Drive`) with no personal or private account data.
- **Simulated driving:** None (`01`–`04` show the actual Trip Planner UI; no simulated navigation telemetry was captured).

---

## Completed vs. Pending Items

### Completed
- `app-icon-512.png` derived directly from `MyExplorer_Logo.png` (no rounded mask or external shadow baked in).
- `feature-graphic-1024x500.png` with editable HTML source (`source/feature-graphic.html`).
- 4 framed portrait phone screenshots (`phone/01-*.png` through `phone/04-*.png`) meeting Google Play's 4-screenshot promotion threshold (`>= 1080 px` per side, 9:16 aspect ratio) alongside unedited `originals/`.
- `listing-copy.md` scoped strictly to verified Trip Planner features.
- `contact-sheet.png` for quick visual review.

### Pending
- **Android Auto (`android-auto/`):** **Pending.** Parallel Android release work in the workspace added `auto/MyExplorerCarAppService.kt`, `auto/MyExplorerCarScreen.kt`, and `navigation/NavigationController.kt`, but `NavigationController.kt` currently fails Kotlin compilation (`Unresolved reference 'TurnByTurnManager'`). No DHU or head-unit capture was manufactured. Once the release candidate builds and Android Auto projection is verified on DHU/hardware, capture real car screens into `android-auto/` and update `listing-copy.md` if Android Auto support is shipping in this release.

---

## Owner Review Notes (Reported Separately — Production UI Untouched)

1. **Launcher icon in APK (`apps/mobile/android/app/src/main/res/mipmap-*/ic_launcher*.png`):** Currently still uses the default React Native green Android robot icon rather than `MyExplorer_Logo.png`. The Play Store `app-icon-512.png` uses the official `MyExplorer_Logo.png`, so consider updating the in-APK mipmap icons if desired for consistency.
2. **Parallel Kotlin build failure:** `apps/mobile/android/app/src/main/java/com/thestillfoundation/myexplorer/navigation/NavigationController.kt` had unresolved references (`TurnByTurnManager`, `NavigationUpdatesOptions`, `NavInfo`) during build inspection. Untouched by this asset task.
