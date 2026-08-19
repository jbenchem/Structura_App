# Shipping the beta

Everything here is about getting a working build onto a student's phone. The
app itself is ready; this is the distribution wrapper.

## Before the first build

1. **Create the Expo project** (once)
   ```bash
   npx expo login
   npx eas init          # writes the projectId into app.json
   ```

2. **Replace the placeholder icons.** `assets/icon.png` and friends are
   generated placeholders — a teal hexagon in the app's own colours. They are
   there so a build does not ship with the Expo default; they are not artwork.

3. **Check the beta flag is on.** `BETA_ALL_ACCESS` in `src/state/store.js`
   must be `true`, or testers meet a paywall on day 8 when the welcome trial
   expires. `tests/beta-access.test.mjs` asserts what it does either way.

## Building

Android APK is the fastest route for a school outreach programme: it installs
from a link, needs no store account, and works on any device.

```bash
npx eas build --profile beta --platform android
```

iOS requires an Apple Developer account (US$99/yr) and TestFlight:

```bash
npx eas build --profile beta --platform ios
npx eas submit --platform ios
```

## Pushing fixes without rebuilding

```bash
npx eas update --branch beta --message "what changed"
```

Testers get the update next launch. This works for JavaScript changes, which
is nearly everything here — a new build is only needed if a native dependency
changes.

## What testers should be told

- It is a beta; their progress may be reset between versions.
- Everything is unlocked.
- Where to send feedback, and that you want to hear what confused them, not
  just what broke.
