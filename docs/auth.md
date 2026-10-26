# Frame extension sign-in

The extension never asks for a Frame password. Sign-in opens `https://frameprivacy.com/connect` with `browser.identity.launchWebAuthFlow` (Chrome, Edge, Brave, and the Firefox equivalent). Safari has no `identity` API and uses a tab instead; see [Safari](#safari). The site returns a scoped token. That token is not the website session.

Privacy toggles work with no account. A stub build (`npm run dev:stub`, `npm run build:stub`) signs in to a labeled preview account and does not call the site.

## IDs to configure

`client_id` is the label in the redirect host. Allow these, and the redirect URIs under them, exactly. Do not accept every `*.chromiumapp.org` host.

| Browser | client_id | Redirect URI |
| --- | --- | --- |
| Chrome, unpacked, from the public key in `src/lib/manifest.ts` | `mhemokfamnabliomlhigbkclcfcplfln` | `https://mhemokfamnabliomlhigbkclcfcplfln.chromiumapp.org/` |
| Firefox | `86d25b817a984dadbf12ae6ae90c87df43543c41` | `https://86d25b817a984dadbf12ae6ae90c87df43543c41.extensions.allizom.org/` |
| Safari (macOS, iOS), not live yet | `com.frameprivacy.safari.extension` | `https://frameprivacy.com/connect/safari` |

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
| `scope` | `account exposure aliases` |
| `client` | `firefox` or `safari`; Chrome omits it |

`scope` may be omitted. Omitted means both `account` and `exposure`. The extension sends all three. `aliases` is new in this version; a session from an earlier version does not have it, and the popup and options page offer *Allow aliases*, which signs in again with the new scope. The alias menu in email fields is registered only when the token response's `scope` includes `aliases`.

`client` is omitted on Chrome. Firefox adds `client=firefox` so the site can tell a Firefox add-on from a Chrome extension before it looks at `Origin`.

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
  "redirect_uri": "https://<id>.extensions.allizom.org/",
  "client_id": "<id>",
  "code_verifier": "the-original-verifier",
  "client": "firefox"
}
```

That body is the Firefox exchange. Chrome uses the `chromiumapp.org` redirect and omits `client`. The same `client` field is added to Firefox refresh and revoke.

Refresh:

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "frx_...",
  "client_id": "<id>",
  "client": "firefox"
}
```

`client` is Firefox only. Chrome’s refresh body has no `client` field.

Success:

```json
{
  "access_token": "frx_...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "frx_...",
  "scope": "account exposure aliases"
}
```

The access token lasts 15 minutes. The extension treats it as expired 60 seconds early. The refresh token lasts 30 days and rotates on every use. The extension stores the new refresh token and drops the old one. Presenting a rotated-out refresh token revokes the whole connection (`invalid_grant`). The extension treats that, and `invalid_token`, as signed out.

Both tokens must start with `frx_`. The extension refuses anything else, so a website session JWT cannot be stored by mistake.

## Revoke

`POST /api/extension/revoke` with `token` and `client_id`. Firefox and Safari also send `client` (`firefox` or `safari`). The site also accepts `Authorization: Bearer`. The extension sends the JSON body. Local sign-out still deletes the session if revoke fails.

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

## Email aliases

All with `Authorization: Bearer` and the `aliases` scope, from the background script.

| Request | Body | Response |
| --- | --- | --- |
| `GET /api/aliases` | | `{ aliases, destination, domain, available, max }` |
| `POST /api/aliases` | `{ label?, site? }` | 201 `{ alias }` |
| `GET /api/aliases/:id` | | `{ alias }` |
| `PATCH /api/aliases/:id` | `{ enabled?, label? }` | `{ alias }` |
| `DELETE /api/aliases/:id` | | `{ deleted: true, id }` |
| `POST /api/aliases/:id/usages` | `{ site }` | `{ alias }` |

An alias has `id`, `address`, `label`, `enabled`, `createdOrigin`, `usages` (`site`, `firstSeenAt`, `lastSeenAt`, `timesSeen`), `forwardedCount`, `lastForwardedAt`, `createdAt`, and `updatedAt`. `site` is the lowercased hostname without `www.`. It always comes from the tab the request was made for, never from the page.

The content script in email fields can only ask the background to list enabled aliases (address and label only), make an alias for its own tab's site, and record that an alias was used on its own tab's site. It cannot rename, pause, or delete. Only Frame's popup and options page can.

| Status | `error` | Extension |
| --- | --- | --- |
| 400 | `INVALID` | “Frame didn’t accept that. Labels can be up to 80 characters.” |
| 403 | `insufficient_scope` | Offers *Allow aliases*. Session kept. |
| 403 | `EMAIL_UNVERIFIED` | Asks you to verify your Frame account email. |
| 403 | `ACCOUNT_READ_ONLY` | Says the account is scheduled for deletion. |
| 404 | `NOT_FOUND` | “That alias no longer exists.” |
| 409 | `ALIAS_LIMIT` | Says the 100 alias limit is reached. |
| 429 | `RATE_LIMITED` | Names the 30 a day or 300 changes an hour limit, with the `Retry-After` wait. |
| 503 | `ALIASES_UNAVAILABLE`, `ALIAS_RETRY` | Says aliases are unavailable, or to try again in a minute. |

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

Chrome extension fetches send `Origin: chrome-extension://<chrome id>`. The site allows that origin. Chrome does not send a `client` field.

Firefox sends `Origin: moz-extension://<per-install uuid>` on its API fetches. That uuid is different on every install, so it cannot be registered in advance. Firefox cannot omit `Origin` on a CORS request. The site should allow any `moz-extension://` origin for the Firefox client on `/api/extension/token`, `/revoke`, `/account`, `/exposure`, and `/api/aliases`.

Firefox builds identify themselves with `client=firefox`:

- query parameter on `GET /connect`
- JSON field on `POST /api/extension/token` (both grant types) and `POST /api/extension/revoke`

Account, exposure, and aliases stay Bearer-only. Match those by the token, and still allow the `moz-extension://` origin. The redirect URI and `client_id` stay `https://86d25b817a984dadbf12ae6ae90c87df43543c41.extensions.allizom.org/` and `86d25b817a984dadbf12ae6ae90c87df43543c41`. The manifest add-on id is `{f4a0e6c1-8b27-4d53-9e14-6c2b7a91d0e5}`.

## Safari

Safari has no `identity` API, so there is no `launchWebAuthFlow` and no browser-owned redirect host. The Safari build opens `/connect` in a normal tab and watches that tab for an `https` return page on frameprivacy.com. Details and what Safari supports are in [safari.md](safari.md).

Sign-in is **off** in the Safari build (`SAFARI_SIGN_IN_READY = false` in `src/lib/extension-ids.ts`). The button is hidden and the popup says sign-in isn't available in Safari yet, so nobody is sent to a page that refuses them. Turn it on only after the site does all of this:

1. **Client.** Allow `client_id=com.frameprivacy.safari.extension` (the extension's bundle id; it is not derived from a redirect host) together with `client=safari`.
2. **Redirect URI.** Allow exactly `https://frameprivacy.com/connect/safari` for that client, nothing under it and no other host. After consent, `/connect` sends the tab there with an ordinary HTTP redirect: `https://frameprivacy.com/connect/safari?code=frc_...&state=...`, or `?error=access_denied&state=...` on cancel.
3. **Return page.** Serve `/connect/safari` as a plain page: "You're signed in. You can close this tab." The extension closes the tab itself when it can. The URL carries the code, so the page must load no third-party scripts or analytics, send `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, and never log the query string. The code is single-use, expires in a minute, and is useless without the PKCE verifier, which never leaves the extension.
4. **`client=safari`.** Read it on `GET /connect` and as a JSON field on `POST /api/extension/token` (both grant types) and `POST /api/extension/revoke`, the same way as `client=firefox`.
5. **Origin.** Safari extension fetches send `Origin: safari-web-extension://<per-install uuid>`. The uuid changes per install, like Firefox's. Allow any `safari-web-extension://` origin for the Safari client on `/api/extension/token`, `/revoke`, `/account`, `/exposure`, and `/api/aliases`. Account, exposure, and aliases stay Bearer-only.
6. Then flip `SAFARI_SIGN_IN_READY` to `true` and ship a Safari build.

Safari only shows an extension a tab's address on sites it is allowed on, so the *Sign in* click also asks Safari for access to `https://frameprivacy.com/*`. If that's declined, the popup says to allow Frame on frameprivacy.com and try again.

The token exchange body from Safari:

```json
{
  "grant_type": "authorization_code",
  "code": "frc_...",
  "redirect_uri": "https://frameprivacy.com/connect/safari",
  "client_id": "com.frameprivacy.safari.extension",
  "code_verifier": "the-original-verifier",
  "client": "safari"
}
```

A stub build, including on Firefox, still signs in to the preview account and does not call the site.

Requests are made from the background script. The popup only receives the account and exposure summary and the alias list, not the tokens.

Tokens live in `chrome.storage.local`. Sites cannot read that storage. It is not the OS keychain.
