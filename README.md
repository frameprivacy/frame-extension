# Frame

A small Manifest V3 extension for [Frame](https://frameprivacy.com). It manages privacy settings in Chromium browsers (Chrome, Brave, Edge) and, optionally, shows the signed-in Frame account. Firefox builds with the same project.

Privacy toggles work with no account. The extension does not ask for a Frame password, and it does not make you anonymous.

## Setup

Node.js 22 or newer.

```bash
npm install
npm run dev          # Chrome, reload on change
npm run dev:firefox
npm test
npm run typecheck
npm run lint
```

Production bundles:

```bash
npm run build            # .output/chrome-mv3
npm run build:firefox    # .output/firefox-mv3
```

`npm run dev:stub` and `npm run build:stub` sign in to a labeled preview account without calling frameprivacy.com. Use that only to look at the signed-in UI. A normal build talks to the live API in [docs/auth.md](docs/auth.md). Until that feature is configured, sign-in says it isn’t available yet and the toggles still work. Live sign-in on Firefox is coming soon. The stub build on Firefox still uses the preview account.

## Load unpacked

Chrome, Brave, or Edge:

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Turn on Developer mode.
3. Load unpacked and choose `.output/chrome-mv3`.

Firefox:

1. `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`.
3. Load Temporary Add-on and choose `.output/firefox-mv3/manifest.json`.

## Extension ids

Set these on the site before sign-in can succeed. Details and redirect URIs are in [docs/auth.md](docs/auth.md).

| | Value |
| --- | --- |
| Chrome (`FRAME_CHROME_EXTENSION_IDS`) | `mhemokfamnabliomlhigbkclcfcplfln` |
| Firefox client id | `86d25b817a984dadbf12ae6ae90c87df43543c41` |

The Chrome id comes from the public key in `wxt.config.ts`. The private key is not in this repo. A Chrome Web Store build that Google re-signs gets a different id; add that id too.

Firefox’s add-on id is `{f4a0e6c1-8b27-4d53-9e14-6c2b7a91d0e5}`. Firefox does not accept a bare hostname as an add-on id, and the redirect host is SHA-1 of the add-on id. The client id in the table is that host label. Allow it the same way as the Chrome id.

## What the toggles do

On a fresh install the protections are on. WebRTC and fingerprinting can break sites. Fingerprinting can be turned off for the current site from the popup. `www.example.com` and `example.com` are different sites.

Each browser setting shows when Frame cannot change it: another extension has it, or a policy locked it. Topics, Protected Audience, and ad measurement can only be turned **off** by an extension. Turning Frame’s toggle off clears Frame’s choice and leaves the browser default. Frame does not write `true` to those settings, because the browser rejects it.

| Toggle | What it actually does |
| --- | --- |
| WebRTC IP leak protection | Sets `webRTCIPHandlingPolicy` to `disable_non_proxied_udp`. Hides the local IP from sites during calls. Does not hide your public IP. Some calls fail until you turn it off. |
| Fingerprinting protection | Main-world script at `document_start`. Normalizes canvas and WebGL readback, offline audio, `hardwareConcurrency` (to 4 or 8), `deviceMemory` (to 8), and system font checks toward common values. A font the page provides itself is left alone. Blocks Local Font Access as if permission was never granted. Does not randomize a unique fingerprint. Does not change live audio, very large canvases, or text measurement, so some font guessing still works. Per site, including IPv6 and international hostnames. |
| Block third-party cookies | `thirdPartyCookiesAllowed = false`. The site you are on can still set its own cookies. Exemptions and the Storage Access API can still apply. |
| Global Privacy Control | `Sec-GPC: 1` via declarativeNetRequest, and `navigator.globalPrivacyControl` on the page. Sites can ignore it. Workers may not see the JavaScript flag. |
| Ad topics and measurement | Sets `topicsEnabled`, `fledgeEnabled` (Protected Audience), and `adMeasurementEnabled` to false when the browser has them. |
| Hyperlink auditing | `hyperlinkAuditingEnabled = false`. Stops `<a ping>`. Does not stop `sendBeacon` or pixels. |
| Network prediction | `networkPredictionEnabled = false`. Stops browser prefetch and prerender. A page can still preconnect. |
| Trim cross-site referrers | Sets the response `Referrer-Policy` to `same-origin`. A page’s own meta tag can override it. Manifest V3 cannot rewrite an existing `Referer` down to its origin on the way out. |
| Do Not Track | `doNotTrackEnabled = true`. Many sites ignore it. |
| Search suggestions | Stops the address bar from sending what you type to the search engine. |
| Navigation error reports | Stops Chrome from sending failed addresses out for alternate error pages. |

Settings are applied to the regular profile. If you allow Frame in private windows, the page scripts run there too. Some browser settings cannot be changed for private windows.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Saves toggles, per-site fingerprint exceptions, and the Frame session on this device. |
| `privacy` | Reads and sets the browser privacy settings above, and reads `levelOfControl`. |
| `identity` | Opens frameprivacy.com with `launchWebAuthFlow` and receives the redirect. Does not read a Google account. |
| `scripting` | Injects the fingerprint normalizer and the Global Privacy Control flag. |
| `declarativeNetRequest` | Sets the `Sec-GPC` request header and the `Referrer-Policy` response header. |
| `http://*/*`, `https://*/*` | Those scripts and header rules have to run on the sites you visit. Frame does not read page contents into an account. |
| `https://frameprivacy.com/*` | Calls the sign-in API. Requests omit the website’s cookies. |

Tokens live in extension local storage. Sites cannot read that storage. It is not the OS keychain. Access tokens last 15 minutes. Refresh tokens last 30 days, rotate on every use, and a reused refresh token signs you out. Sign-out revokes the token. See [docs/auth.md](docs/auth.md).

## Scripts

| Script | |
| --- | --- |
| `npm run dev` | Chrome dev build with reload |
| `npm run build` | Chrome MV3 bundle |
| `npm run build:firefox` | Firefox MV3 bundle |
| `npm test` | Unit tests for settings, header rules, fingerprint policy, and sign-in parsing |
| `npm run lint` | ESLint |
| `npm run typecheck` | `wxt prepare` and `tsc --noEmit` |

Stack: [WXT](https://wxt.dev/) 0.21, TypeScript, React, Vitest. The popup and options page use Geist and the steel mark from the [Frame brand page](https://frameprivacy.com/brand).
