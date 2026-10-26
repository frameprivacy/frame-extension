# Frame for Safari (macOS, iPhone, iPad)

Frame builds as a Safari Web Extension from the same code as Chrome and Firefox: `npm run build:safari` writes `.output/safari-mv3`. Safari only installs extensions that ship inside an app, so the last steps (wrap in an Xcode project, sign, submit to the App Store) need a Mac with Xcode. Everything before that runs anywhere, including CI.

Minimum: **Safari 16.4** on macOS, iOS, and iPadOS. That release added registered content scripts (fingerprinting protection and the Global Privacy Control flag) and request-header rules (the `Sec-GPC` header). The manifest says so in `browser_specific_settings.safari.strict_min_version`, so older Safari won't load it.

## What works on Safari, and what doesn't

Checked against Apple's Safari web extension docs and MDN's browser compatibility data. Nothing below is faked: a protection Safari can't run is listed under *Not offered by this browser* in the popup with the reason.

| Feature | Safari | Why |
| --- | --- | --- |
| Global Privacy Control | Yes | `Sec-GPC: 1` with a declarativeNetRequest request-header rule (Safari 16.4+), and `navigator.globalPrivacyControl` from a main-world script. |
| Clean tracking links | Yes | declarativeNetRequest redirect with `queryTransform.removeParams` (Safari 15.4+). Per-site exceptions use `requestDomains`/`excludedRequestDomains` (16.4+). |
| Fingerprinting protection | Yes | `scripting.registerContentScripts` with `world: 'MAIN'` at `document_start` (16.4+). |
| Email aliases (signed in) | Yes, once sign-in is on | Same content script as Chrome and Firefox. Needs a Frame account, see *Sign-in* below. |
| Forget this site | Partly | Safari has no `browsingData` API. Frame removes the site's cookies with the `cookies` API, and clears local storage, session storage, IndexedDB, the Cache API, and service workers from inside the site's **open** tabs. It can't clear the HTTP cache, or storage for a site that has no open tab, and the result message says so. On Safari before 18, `cookies.getAll` can't see `HttpOnly` cookies, so those stay. |
| Trim cross-site referrers | **No** | Safari's declarativeNetRequest has no `responseHeaders` action, so Frame can't set `Referrer-Policy`. Safari already trims cross-site referrers to the origin by default. |
| WebRTC IP leak protection, third-party cookies, hyperlink auditing, network prediction, Do Not Track, search suggestions, ad topics, error reports | **No** | Safari has no `privacy` API, so an extension can't read or change these. Safari's own settings cover some of it: *Prevent cross-site tracking* (on by default, blocks third-party cookies) and *Hide IP address* (Settings › Privacy). Frame shows these toggles under *Not offered by this browser*. |
| Privacy Score sign-in | Yes | Safari has no `identity` API, so there's no `launchWebAuthFlow`. The Safari build signs in through a normal tab instead (below). Controlled by `SAFARI_SIGN_IN_READY` in `src/lib/extension-ids.ts`. |

Header rules list only resource types WebKit knows (`csp_report` and `object` are dropped for Safari), otherwise Safari rejects the whole rule.

### Website access

Safari asks per site. Until someone chooses *Always Allow on Every Website*, Frame's page scripts and header rules only run on sites they've allowed. When `permissions.contains` says Frame isn't allowed everywhere, the popup shows *Frame isn't allowed on every website*, marks the affected protections, and offers *Allow on all websites*. People can also change it in Safari › Settings › Extensions › Frame (Mac) or Settings › Apps › Safari › Extensions › Frame (iPhone and iPad).

### Sign-in

Chrome and Firefox sign in with `identity.launchWebAuthFlow`. Safari doesn't have it, so the Safari build:

1. Asks Safari for access to `https://frameprivacy.com/*` from the *Sign in* click (Safari only shows a tab's address to an extension that is allowed on that site).
2. Saves `state`, the PKCE verifier, and the tab id in `storage.session`, so it survives the background worker being suspended. A pending sign-in expires after 10 minutes.
3. Opens `https://frameprivacy.com/connect?…&client_id=com.frameprivacy.safari.extension&redirect_uri=https://frameprivacy.com/connect/safari&client=safari` in a normal tab. The popup closes.
4. Watches `tabs.onUpdated` for that exact return page with the matching `state`, closes the tab, and exchanges the code. A look-alike host, another path, or another `state` is ignored.

The account, score, and alias calls then work as on Firefox, with `client=safari`. See [auth.md](auth.md#safari) for what the website has to allow first.

## Build on any machine

```bash
npm ci
npm run build:safari   # .output/safari-mv3
npm run dev:safari     # .output/safari-mv3-dev, rebuilt on change; Safari isn't launched for you
```

Safari can't be driven by `web-ext`, so `dev:safari` only rebuilds. The simplest loop on a Mac is `npm run build:safari` and Build again in Xcode (the project points at `.output/safari-mv3`).

The Safari manifest has no Chromium `key`, no `gecko` block, and no `privacy`, `identity`, or `browsingData` permission. It asks for `storage`, `scripting`, `declarativeNetRequest`, `cookies`, and `http://*/*`, `https://*/*`. CI builds it on every push.

There is no `web-ext lint` for Safari. The checks are: the unit tests (`src/lib/manifest.test.ts` pins the Safari manifest), the packager's manifest warnings, and Xcode's build warnings.

## On a Mac: make the Xcode project

Needs macOS with Xcode 15 or newer (Xcode 14 works with the older converter name) and an Apple Developer Program membership for App Store builds.

```bash
npm ci
npm run safari:xcode
```

`scripts/safari-xcode.sh` builds `.output/safari-mv3`, then runs:

```bash
xcrun safari-web-extension-packager .output/safari-mv3 \
  --project-location safari-xcode --app-name Frame \
  --bundle-identifier com.frameprivacy.safari \
  --swift --no-open --no-prompt --force
```

(`safari-web-extension-converter` on older Xcode.) That makes `safari-xcode/Frame/Frame.xcodeproj` with four targets: the macOS app and extension, and the iOS app and extension. `safari-xcode/` is in `.gitignore`. The project points at `.output/safari-mv3` instead of copying it, so later you only run `npm run build:safari` and build again in Xcode. Run the script with `FORCE=1` to regenerate the project (you'll redo signing). Read the manifest warnings it prints; there should be none for keys Frame relies on.

Apple also offers the same packager in App Store Connect (upload a zip of `.output/safari-mv3`), if you'd rather not keep an Xcode project.

## In Xcode

1. `open safari-xcode/Frame/Frame.xcodeproj`
2. For each of the four targets, open *Signing & Capabilities*, tick *Automatically manage signing*, and pick the Frame team.
3. Bundle ids: the apps are `com.frameprivacy.safari`. Set **both** extension targets to `com.frameprivacy.safari.extension` (the packager proposes `com.frameprivacy.safari.Extension`). The website's Safari `client_id` is this id, so keep them the same.
4. Version: set *Marketing Version* to the `version` in `package.json` and bump *Current Project Version* (build number) on every upload.
5. Deployment targets: iOS 16.4 or later; macOS can stay at the packager default (Safari enforces 16.4 itself).
6. App icon: add the Frame mark to each app's `AppIcon` asset (export a 1024 px PNG from `public/symbol.svg`; the repo's PNG icons stop at 128 px). Replace the packager's placeholder text in each app's `Main.html`/view with a one-line description and how to turn Frame on.
7. Product › Build for both schemes. Treat warnings as things to fix.

## Try it

**Mac:** run the *Frame (macOS)* scheme. For a build signed with a development certificate, Safari loads it directly. For an unsigned local build: Safari › Settings › Advanced › *Show features for web developers*, then Develop › *Allow Unsigned Extensions* (resets when Safari quits). Then Safari › Settings › Extensions › tick Frame, and choose *Always Allow on Every Website*.

**iPhone or iPad:** run the *Frame (iOS)* scheme on a device or simulator. Then Settings › Apps › Safari › Extensions › Frame › turn it on and allow *All Websites*. Or tap the puzzle icon in Safari's address bar.

Check: the popup opens; a GPC test page (any site that echoes `Sec-GPC` or reads `navigator.globalPrivacyControl`) shows GPC on; a `?utm_source=x` link loses the parameter; *Trim cross-site referrers* and the browser settings appear under *Not offered by this browser*; *Forget this site* reports what it cleared and what Safari can't.

To debug, use Develop › Web Extension Background Content › Frame on the Mac, or connect the iPhone and use Develop › *device name* in Safari on the Mac.

## App Store

One app record can carry both platforms. In App Store Connect:

1. Create the app: name *Frame Privacy*, bundle id `com.frameprivacy.safari`, platforms macOS and iOS, SKU `frame-safari`.
2. Privacy: *Data Not Collected* is accurate for the extension with no account. When Safari sign-in is turned on, declare what the signed-in features use, matching [PRIVACY.md](../PRIVACY.md): contact info (email) and identifiers linked to the user, for app functionality only, no tracking.
3. Privacy policy URL `https://frameprivacy.com/privacy`, support URL `https://frameprivacy.com/help`.
4. Screenshots: Mac (1280×800 or larger), iPhone 6.9" and iPad 13". Show the popup in Safari.
5. Review notes: say it's a Safari extension, how to turn it on, that no account is needed, and which protections Safari can't offer.
6. In Xcode: pick *Any Mac* (then *Any iOS Device*), Product › Archive, then Distribute App › App Store Connect › Upload. Use *Validate App* first.
7. Add both builds to the version, submit for review, and release.

After each release, also update the README install table with the App Store link.

## Turning sign-in on for Safari

Only after the website changes in [auth.md](auth.md#safari) are live:

1. Set `SAFARI_SIGN_IN_READY = true` in `src/lib/extension-ids.ts`.
2. `npm test` (the manifest description and permission list change with it), `npm run build:safari`, rebuild in Xcode, and sign in on a Mac and an iPhone.
3. Update the App Store privacy label (step 2 above) and ship a new version.
