# Contributing

Thanks for helping. Issues and pull requests are welcome at [frameprivacy/frame-extension](https://github.com/frameprivacy/frame-extension).

## Setup

Node.js 22 or newer.

```bash
npm ci
npm run dev:firefox   # or: npm run dev (Chrome)
```

Use `npm run dev:stub` to see the signed-in popup with a labeled preview account. It never calls frameprivacy.com.

## Before you open a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:firefox
npm run build:safari
npx web-ext lint -s .output/firefox-mv3
```

CI runs all but the last on every push and pull request. Safari's final steps (Xcode, signing, App Store) need a Mac; see [docs/safari.md](docs/safari.md).

When a feature uses a browser API, check it exists in Safari (MDN's compatibility tables list Safari and Safari on iOS). If it doesn't, feature-detect it and show the protection as not offered, with the reason, rather than leaving a switch that does nothing.

## Ground rules

- **Say only what is true.** Copy in the popup, the options page, and the store listing must match what the code does. If a browser does not offer a setting, say so. Never show a score, count, or status the extension did not get from the browser or the Frame API.
- **No new permissions without a reason.** Explain any new permission in the README permissions table, in `src/lib/catalog.ts`, and in the pull request.
- **No tracking.** No analytics, telemetry, remote code, or third-party requests.
- **Keep it accessible.** Every control works with the keyboard, has a visible focus ring, and has a label. Respect `prefers-reduced-motion`.
- **Brand.** Black background, white text, the steel accent (`#8c99b4`, gradient `#e7eefc` to `#8c99b4`), Geist for UI and Instrument Serif for display type, as on [frameprivacy.com/brand](https://frameprivacy.com/brand).

## Releasing a Firefox version

1. Bump `version` in `package.json` (it becomes the manifest version) and add a `CHANGELOG.md` entry.
2. `npm ci && npm run build:firefox`
3. `npx web-ext lint -s .output/firefox-mv3`
4. `npx web-ext build -s .output/firefox-mv3 -a .output/web-ext` for the upload zip, and `npx wxt zip -b firefox` for the sources zip Mozilla asks for.
5. Upload both on the [Mozilla Add-ons developer hub](https://addons.mozilla.org/developers/addon/frame-privacy/versions).

## Releasing a Safari version

On a Mac: `npm ci && npm run build:safari`, rebuild in Xcode (or `npm run safari:xcode` the first time), set the app's version to `package.json`'s and bump the build number, then archive and upload both macOS and iOS. Steps are in [docs/safari.md](docs/safari.md#app-store).
