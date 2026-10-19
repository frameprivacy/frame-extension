# Frame extension sign-in

The extension never asks for a Frame password. Sign-in opens `https://frameprivacy.com/connect` with `browser.identity.launchWebAuthFlow` (Chrome, Edge, Brave, and the Firefox equivalent). The site returns a scoped token. That token is not the website session.

Privacy toggles work with no account. A stub build (`npm run dev:stub`, `npm run build:stub`) signs in to a labeled preview account and does not call the site.

## IDs to configure

`client_id` is the label in the redirect host. Allow these, and the redirect URIs under them, exactly. Do not accept every `*.chromiumapp.org` host.

| Browser | client_id | Redirect URI |
| --- | --- | --- |
| Chrome, unpacked, from the public key in `wxt.config.ts` | `mhemokfamnabliomlhigbkclcfcplfln` | `https://mhemokfamnabliomlhigbkclcfcplfln.chromiumapp.org/` |
| Firefox | `86d25b817a984dadbf12ae6ae90c87df43543c41` | `https://86d25b817a984dadbf12ae6ae90c87df43543c41.extensions.allizom.org/` |

Set the Chrome id as `FRAME_CHROME_EXTENSION_IDS`. Allow the Firefox id the same way.

The private half of the Chromium key is not in this repo. It was discarded. The Chrome Web Store re-signs a published package, so a store build has a different id unless it is packed with this same key. Add that id as well when it exists.

Firefox will not load an add-on whose id is a bare hostname, and it will not put an email-shaped id in the redirect host. The manifest id is the GUID `{f4a0e6c1-8b27-4d53-9e14-6c2b7a91d0e5}`. `identity.getRedirectURL()` uses SHA-1 of that id as the host label. That label is the client id above. The extension does not hardcode it: it reads the host from `getRedirectURL()` and sends that label as `client_id` on the code exchange, refresh, and revoke.

## Connect

`GET https://frameprivacy.com/connect`

| Name | Value |
| --- | --- |
| `response_type` | `code` |
| `client_id` | the id in the redirect host |
| `redirect_uri` | `browser.identity.getRedirectURL()` with no path |
| `code_challenge` | 43 base64url characters, no padding, S256 |
| `code_challenge_method` | `S256` |
| `state` | 16–128 unreserved characters |
| `scope` | `account exposure` |

`scope` may be omitted. Omitted means both `account` and `exposure`. The extension sends both.

`redirect_uri` is `https`, with no port, query, or hash. The path is `/` or one segment.

- Chrome: `https://<id>.chromiumapp.org/`
- Firefox: `https://<id>.extensions.allizom.org/`

The browser delivers the final redirect as `redirect_uri?code&state`. Cancel is `error=access_denied&state`. The extension rejects a response whose `state` does not match this attempt. Codes are `frc_...`, single-use, and expire after one minute.

## Token

`POST /api/extension/token`, JSON. `credentials: 'omit'`. `Cache-Control` on the response should be `no-store`.

Authorization code:

```json
{
  "grant_type": "authorization_code",
  "code": "frc_...",
  "redirect_uri": "https://<id>.chromiumapp.org/",
  "client_id": "<id>",
  "code_verifier": "the-original-verifier"
}
```

Refresh:

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "frx_...",
  "client_id": "<id>"
}
```

Success:

```json
{
  "access_token": "frx_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "frx_...",
  "scope": "account exposure"
}
```

The access token lasts 15 minutes. The extension treats it as expired 60 seconds early. The refresh token lasts 30 days and rotates on every use. The extension stores the new refresh token and drops the old one. Presenting a rotated-out refresh token revokes the whole connection (`invalid_grant`). The extension treats that, and `invalid_token`, as signed out.

Both tokens must start with `frx_`. The extension refuses anything else, so a website session JWT cannot be stored by mistake.

## Revoke

`POST /api/extension/revoke` with `token` and `client_id`. The site also accepts `Authorization: Bearer`. The extension sends the JSON body. Local sign-out still deletes the session if revoke fails.

## Account

`GET /api/extension/account` with `Authorization: Bearer` and the `account` scope.

```json
{ "id": "user_123", "email": "ada@example.com", "name": "Ada", "plan": "plus" }
```

`name` may be null. `plan` is `free`, `plus`, or `family`.

## Exposure

`GET /api/extension/exposure` with the `exposure` scope.

```json
{
  "month": "2026-10",
  "score": null,
  "areas": [{ "key": "breaches", "score": null }],
  "openFindings": 1,
  "openBreaches": null
}
```

`month` is `YYYY-MM`. `score` is null until something was checked. The extension shows null as “Not checked yet” and never fills in a number. The popup polls this at most every five minutes.

## Errors

The body is `error` and `error_description`.

| Status | `error` | Extension |
| --- | --- | --- |
| 401 | `invalid_token`, or a 401 with no `error` | Signed out, including when the exposure request returns it. “Your Frame session ended. Sign in again.” |
| 401 | `invalid_client` | “This extension isn’t allowed to sign in yet.” Session kept. |
| 400 | `invalid_grant` | On refresh, signed out. On the code exchange, “That sign-in expired. Try again.” |
| 400 | `invalid_request`, `unsupported_grant_type` | “Frame couldn’t complete that request.” |
| 403 | `insufficient_scope` | “Frame did not grant access to that.” Session kept. |
| 403 | disallowed origin | “Frame refused this sign-in from this browser.” Session kept. |
| 429 | | “Frame is busy. Try again shortly.” Uses a numeric `Retry-After` when it is two minutes or less. |
| 503 | feature not configured | “Sign-in isn’t available yet.” |

## CORS, Origin, and cookies

The extension has a host permission for `https://frameprivacy.com/*`. Every Frame request sets `credentials: 'omit'` and `cache: 'no-store'`. The website cookie is not sent.

Chrome extension fetches send `Origin: chrome-extension://<chrome id>`. The site allows that origin.

Firefox sends `Origin: moz-extension://<per-install uuid>`. The site rejects that. A `no-cors` request cannot be read, and Firefox will not let the extension remove `Origin` on a CORS request. Live Firefox sign-in is off. The popup says sign-in on Firefox is coming soon. A stub build on Firefox still signs in to the preview account, because that path never calls the site.

Requests are made from the background script. The popup only receives the account and exposure summary, not the tokens.

Tokens live in `chrome.storage.local`. Sites cannot read that storage. It is not the OS keychain.
