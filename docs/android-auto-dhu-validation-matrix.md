# Issue #74 — Android Auto DHU Validation Matrix & Procedure

- **Scope:** Repeatable Desktop Head Unit (DHU) validation matrix for `com.thestillfoundation.myexplorer` (`MyExplorerCarAppService` / `MyExplorerCarScreen`).
- **Installed DHU Binary:** `/Users/markccalugay/Library/Android/sdk/extras/google/auto/desktop-head-unit` (`Build: 2022-03-30-438482292`, `Version: 2.0-mac-arm64`)
- **Installed Configs Directory:** `/Users/markccalugay/Library/Android/sdk/extras/google/auto/config/`
- **Current Run Status:** **NOT TESTED** across all profiles (no physical Android phone running Android Auto with Head Unit Server enabled is connected; `emulator-5554` does not provide a projection Head Unit Server).

## Required Equipment & Setup

1. Physical Android phone (Android 8.0+ / Android Auto app installed) connected via USB with **USB Debugging** enabled.
2. Enable **Android Auto Developer Mode** on the phone (`Android Auto Settings` → tap `Version` 10 times → accept) and enable **Unknown sources** if testing a debug/internal build.
3. On the phone, open `Android Auto Settings` → three-dot menu → **Start head unit server** (listens on TCP `5277`).
4. Forward the DHU socket from the host Mac:
   ```zsh
   /Users/markccalugay/Library/Android/sdk/platform-tools/adb forward tcp:5277 tcp:5277
   ```
5. Install the candidate MyExplorer build on the phone and grant `ACCESS_FINE_LOCATION` + `POST_NOTIFICATIONS`, then launch DHU for each profile:
   ```zsh
   /Users/markccalugay/Library/Android/sdk/extras/google/auto/desktop-head-unit \
     -c /Users/markccalugay/Library/Android/sdk/extras/google/auto/config/<profile>.ini
   ```

## DHU Profile Matrix

*Note: `Requested` values below are read directly from the installed `.ini` files. `Delivered` dimensions/density and all scenario checks must be recorded during actual execution rather than inferred from file names.*

| Profile (`.ini`) | Requested Resolution & Insets | Requested Density (`dpi`) | Input Mode (`touch` / `controller` / `touchpad`) | Delivered Viewport & Density | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `default_6in.ini` | `800x480` (`marginwidth=50`, `marginheight=30`; effective `750x450`) | `160` | `touch=true`, `controller=false`, `touchpad=false` | *Record on run* | **NOT TESTED** |
| `default_720p.ini` | `1280x720` (no margins) | `160` | `touch=true`, `controller=false`, `touchpad=false` | *Record on run* | **NOT TESTED** |
| `default_1080p.ini` | `1920x1080` (no margins) | `160` | `touch=true`, `controller=false`, `touchpad=false` | *Record on run* | **NOT TESTED** |
| `default_wide.ini` | `1280x720` (`marginheight=220`; effective `1280x500`) | `160` | `touch=true`, `controller=false`, `touchpad=false` | *Record on run* | **NOT TESTED** |
| `rotary.ini` | `800x480` (no margins) | `160` | `touch=false`, `controller=true`, `touchpad=false` | *Record on run* | **NOT TESTED** |
| `touchpad.ini` | `800x480` (no margins) | `160` | `touch=false`, `touchpad=true` (`touchpadnavigation=true`, `touchpadtapasselect=true`), `controller=false` | *Record on run* | **NOT TESTED** |
| `hybrid.ini` | `800x480` (no margins) | `160` | `touch=false`, `touchpad=true` (`touchpadnavigation=true`), `controller=true` | *Record on run* | **NOT TESTED** |

## Repeatable Per-Profile Verification Procedure

Run the following checks for each profile above (start a short multi-stop route from the phone UI before or after connecting DHU, and record screenshot + `adb logcat` evidence):

1. **Map Framing & Surface Insets**
   - Verify `NavigationViewForAuto` fills the car surface without clipping, black bars, or overlap with system/host bars (especially `default_6in.ini` `marginwidth=50, marginheight=30` and `default_wide.ini` `marginheight=220`).
   - Record actual delivered surface width/height and density from `CarHost` / `onSurfaceAvailable` logs.
2. **Route & Vehicle Visibility**
   - Confirm active route polyline, next maneuver/destination framing, and vehicle/puck marker remain clearly visible within `visibleArea` / `stableArea` during active navigation.
3. **Guidance & Attribution**
   - Confirm `NavigationManager` / `NavigationTemplate` displays synchronized maneuver text, distance, ETA, and required Google Maps/Navigation attribution without truncation.
4. **Controls (Touch, Rotary, Touchpad)**
   - On touch profiles (`default_6in`, `default_720p`, `default_1080p`, `default_wide`), verify all action strip / map / stop controls respond to touch.
   - On `rotary.ini`, `touchpad.ini`, and `hybrid.ini`, verify focus ring traversal, selection, and back/dismiss behavior using DHU rotary/touchpad input (and verify `-i rotary` / `-i hybrid` when overriding input).
5. **Day / Night Mode**
   - Toggle `night_mode` in DHU (`sensors` console / UI) and verify both `NavigationTemplate` chrome and `NavigationViewForAuto` map styling switch cleanly between day and night without surface loss.
6. **Resizing & Configuration Changes**
   - Compare `default_6in.ini` → `default_720p.ini` → `default_1080p.ini` → `default_wide.ini` (and DHU window resize if supported) to confirm surface callbacks re-apply `visibleArea` and camera padding without crash or stale layout.
7. **Reconnect & Lifecycle**
   - Disconnect and reconnect DHU (`adb forward` / DHU restart) while a trip is `ACTIVE` and while `PAUSED` on the phone; confirm `MyExplorerCarScreen` reattaches to the phone-owned `NavigationSessionRepository` without duplicating guidance or crashing.

## Separation of Acceptance Gates

- **DHU Matrix Gate (Emulator/Bench):** **NOT TESTED** — blocks internal DHU sign-off for issue `#74` until executed with a physical Android Auto phone.
- **Actual-Vehicle Road Gate:** **NOT TESTED** — separate from DHU; requires physical in-vehicle head unit testing (wired/wireless Android Auto) to validate glare, GPS lock, audio routing, and real driving ergonomics.
- **Owner Acceptance Gate:** **PENDING** — separate sign-off by product owner after DHU + actual-vehicle evidence review and vehicle UI layout review.
