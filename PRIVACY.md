# Privacy

This page covers the Frame browser extension. The Frame website and service are covered by the [Frame privacy policy](https://frameprivacy.com/privacy).

## Short version

- The extension collects no analytics, telemetry, or browsing history, and it has no ads. Its Firefox manifest declares no data collection (`data_collection_permissions: none`).
- All privacy switches work without an account. Without an account the extension makes no network requests of its own.
- Page contents, the sites you visit, and cookie values are never sent to Frame.

## What stays on this device

Stored in the extension's local storage, which websites cannot read:

- Your switch settings and per-site exceptions (for example "fingerprinting off on example.com").
- If you sign in: a Frame access token (15 minutes), a refresh token (30 days, rotated on every use), and the account summary shown in the popup: name, email, plan, Privacy Score, area scores, and open finding and breach counts.

Signing out revokes the token on frameprivacy.com and deletes the stored session. Removing the extension deletes everything it stored.

## What is sent, and only when you sign in

Signing in is optional. When you choose **Sign in**, the browser opens `https://frameprivacy.com/connect` with a PKCE code flow (`identity.launchWebAuthFlow`). You type your password on frameprivacy.com, never into the extension. After that, the extension calls only these Frame endpoints, from its background script, without the website's cookies:

| Endpoint | Why |
| --- | --- |
| `POST /api/extension/token` | Exchanges the sign-in code, and refreshes the token. |
| `GET /api/extension/account` | Your name, email, and plan for the popup. |
| `GET /api/extension/exposure` | Your current Privacy Score, area scores, and open counts. |
| `POST /api/extension/revoke` | Signs the extension out. |

The extension sends nothing about the sites you browse in these calls. Full details are in [docs/auth.md](docs/auth.md).

## What the page scripts do

The fingerprinting normalizer and the Global Privacy Control flag run inside the pages you visit, because that is the only place they can work. They change what the page can read about your browser. They do not read the page into an account or send anything anywhere.

**Forget this site** uses the `cookies` permission only to find which subdomains have cookies, so it can clear them too. Cookie values are not saved or sent.

## Permissions

Each permission and why it is needed is listed in the [README](README.md#permissions) and on the extension's options page.

## Contact

Questions or a privacy concern: [frameprivacy@proton.me](mailto:frameprivacy@proton.me).
