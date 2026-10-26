# Changelog

All notable changes to the Frame extension. Versions match `package.json` and the manifest.

## Unreleased

- **Email aliases.** Signed in, focus an email field and a small Frame button offers *New alias for this site* or one of your aliases, and fills it in. Picking an existing alias on a new site adds that site to its *Used on* list.
- **Manage aliases** on the options page: make one with a label, copy, rename, pause, or delete, and see the site each alias was made on and every site it was used on. The popup makes an alias for the site you are on and lists the ones already used there.
- *Offer aliases in email fields* turns the field button off. The button is only added to pages while you are signed in with aliases allowed.
- Sign-in now asks for the `aliases` scope. If you signed in with an earlier version, choose *Allow aliases* to sign in again.

No new permissions. The alias menu uses the existing website access and `scripting`.

## 0.2.1

Bug fixes, found by loading the 0.2.0 build in Firefox and Chrome and checking what actually happened.

- **Firefox: Global Privacy Control header and referrer trimming now reach page loads.** The clean-links rule matched every navigation, and in Firefox a matching redirect rule stops header rules for that request, even when it changes nothing. So `Sec-GPC` was never sent on pages and frames, and the `Referrer-Policy` was never set. Each clean-links rule now matches only a link that carries its tracker parameter (case-sensitive). Chrome was not affected.
- **Firefox: Forget this site works.** It always failed with a browser error, because Firefox has no `cacheStorage` data type and no `origins` filter. It now clears cookies, local storage, IndexedDB, service workers and the network cache by hostname, and clears cache storage and session storage in the site's open tabs (on Chrome too).
- **Sign-in no longer freezes Frame.** While the sign-in window was open, the popup and options page waited on it and showed nothing until it closed. Now they keep working and show *Waiting…* on the button.
- **Website access.** If website access for Frame is turned off (Firefox allows this on the add-on's page), the popup and options page say which protections stopped and offer *Allow website access*, instead of showing them as working. Frame re-applies its rules when access changes.
- A sign-in or refresh error that cleared up on its own no longer stays on screen until the next sign-in.
- Two quick presses on a switch now toggle it twice, instead of sending the same change twice.
- Forget this site: keyboard focus moves to *Clear data* and back, and Escape cancels. The result is announced to screen readers.
- If Frame doesn't load, there is a *Try again* button.
- A long name or email in the account card shows in full on hover.
- The Privacy Score ring moves from the score on screen when a new one arrives, instead of counting up from zero again.
- Only Frame's own popup and options page can send it commands.

No new permissions.

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
