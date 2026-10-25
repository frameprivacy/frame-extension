# Changelog

All notable changes to the Frame extension. Versions match `package.json` and the manifest.

## 0.2.0

- Popup and options: a **Privacy Score ring** in the same style as the Frame dashboard (steel gradient arc, count-up that respects reduced motion) with the score band (Good, Fair, Needs work, At risk) and a bar for each area Frame has checked. The score always comes from the Frame API. Signed out, or before anything has been checked, the ring stays empty and says so.
- Protections the browser does not offer (for example Do Not Track and third-party cookies on Firefox) are grouped under *Not offered by this browser* instead of mixed in with working switches.
- A loading placeholder the same size as the content, so the popup no longer jumps when it opens. Errors are announced to screen readers.
- Clearer focus rings and hover states on switches, buttons, and links.
- Docs: new README layout with the Mozilla Add-ons link, plus PRIVACY.md, CONTRIBUTING.md, and this changelog.

No new permissions.

## 0.1.0

First public release, listed on [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/frame-privacy/).

- WebRTC IP leak protection, clean tracking links (on by default, off per site), fingerprinting protection with a per-site switch, third-party cookie blocking, Global Privacy Control, and Chromium-only ad and browser-service switches.
- Forget this site: clears one site's cookies and storage on this device after a confirm.
- Optional Frame account sign-in on Chrome and Firefox with PKCE.
