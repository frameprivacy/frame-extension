import type { BrowserTarget } from './platform';
import type { BooleanSettingId } from './settings';

export interface ToggleCopy {
  id: BooleanSettingId;
  title: string;
  summary: string;
  detail: string;
}

export const TOGGLES: ToggleCopy[] = [
  {
    id: 'protectWebRtc',
    title: 'WebRTC IP leak protection',
    summary:
      'Stops sites from seeing this device’s local IP address during calls. Your public IP is still visible. Some video calls may fail.',
    detail:
      'Sets the browser’s WebRTC policy to “disable non-proxied UDP”. Turn this off if a call will not connect. It does not hide the IP address your provider assigns you.',
  },
  {
    id: 'stripTrackers',
    title: 'Clean tracking links',
    summary:
      'Removes common tracking parameters, such as utm_source and fbclid, from links you open. The page still loads.',
    detail:
      'Strips a fixed list of tracking parameters from pages and frames you navigate to. It does not change other requests, and it leaves ordinary parameters such as ref and id alone. Turn it off for a site when a link breaks. The browser applies that choice to the site’s subdomains as well. YouTube and Spotify share links also lose the si parameter.',
  },
  {
    id: 'fingerprintProtection',
    title: 'Fingerprinting protection',
    summary:
      'Makes common fingerprint signals less unique. It does not make you anonymous, and it can break a site. Turn it off for that site when it does.',
    detail:
      'Normalizes canvas and WebGL readback, offline audio, processor count, device memory, and font checks toward common values. It does not invent a random fingerprint. Live audio, very large canvases, and a font the page provides itself are left alone. If a canvas cannot be copied, that readback is left alone too. Text measurement is unchanged, so a site can still guess some fonts. The Local Font Access API behaves as if you never granted it.',
  },
  {
    id: 'blockThirdPartyCookies',
    title: 'Block third-party cookies',
    summary:
      'Blocks cookies set by other sites. A site you visit can still set its own cookies, and some sites have a browser exemption.',
    detail:
      'Uses the browser’s third-party cookie setting. The browser may already block these, or a policy may lock the setting. After you interact with an embedded site, the Storage Access API can still grant it cookie access.',
  },
  {
    id: 'sendGpc',
    title: 'Global Privacy Control',
    summary: 'Tells sites you don’t want them to sell or share your activity. Sites and ad networks can ignore it.',
    detail:
      'Sends the Sec-GPC header on requests and sets navigator.globalPrivacyControl on pages. A worker started by a page may not see the JavaScript flag. This is a request, not a block.',
  },
  {
    id: 'disableAdPrivacyApis',
    title: 'Ad topics and measurement',
    summary: 'Turns off Topics, Protected Audience, and ad measurement where this browser allows it.',
    detail:
      'Sets Topics, FLEDGE (Protected Audience), and ad measurement off. Frame can turn them off, but the browser rejects turning them back on. Switching this off clears Frame’s choice and leaves the browser default. Some browsers do not have these settings.',
  },
  {
    id: 'disableHyperlinkAuditing',
    title: 'Hyperlink auditing',
    summary: 'Stops the browser from sending ping audits when you click a link. It does not block other tracking.',
    detail:
      'Turns off hyperlink auditing, the ping attribute on links. It does not disable navigator.sendBeacon, pixels, or scripts.',
  },
  {
    id: 'disableNetworkPrediction',
    title: 'Network prediction',
    summary: 'Stops the browser from preloading sites it thinks you will open. Pages may feel a little slower.',
    detail:
      'Turns off DNS prefetch, preconnect, and prerender started by the browser. A page can still start its own preconnect.',
  },
  {
    id: 'trimReferrers',
    title: 'Trim cross-site referrers',
    summary:
      'Asks the browser to send the full address only to the same site. A page can still set its own referrer policy.',
    detail:
      'Sets the Referrer-Policy response header to same-origin. Later requests from that page omit the cross-site referrer. Manifest V3 cannot rewrite an existing Referer header down to its origin on the way out, and a site’s own meta tag can override this header. Turning this off does not strip every referrer.',
  },
  {
    id: 'sendDoNotTrack',
    title: 'Do Not Track',
    summary: 'Sends the DNT header. Many sites ignore it. Global Privacy Control is the signal they are more likely to read.',
    detail: 'Turns on the browser’s Do Not Track setting. It is a request, not a block.',
  },
  {
    id: 'disableSearchSuggestions',
    title: 'Search suggestions',
    summary: 'Stops the address bar from sending what you type to the default search engine.',
    detail:
      'Turns off the browser’s search-suggestion service. Searches you submit, and suggestions inside a website, are unchanged.',
  },
  {
    id: 'disableAlternateErrorPages',
    title: 'Navigation error reports',
    summary: 'Stops the browser from sending failed addresses to Google for suggestions.',
    detail:
      'Turns off alternate error pages. You get the browser’s own error page instead of a remote suggestion. This is a Chrome service. Other browsers may not offer it.',
  },
];

export const PERMISSIONS: { name: string; why: string }[] = [
  {
    name: 'storage',
    why: 'Saves your toggles, per-site exceptions, and the Frame session on this device.',
  },
  {
    name: 'privacy',
    why: 'Reads and changes browser privacy settings, and checks whether another extension or a policy already controls them.',
  },
  {
    name: 'identity',
    why: 'Opens frameprivacy.com to sign in and receives the redirect, on Chrome and Firefox. Frame never asks for your password here. Your browser account is not read.',
  },
  {
    name: 'scripting',
    why: 'Injects the fingerprint normalizer and the Global Privacy Control flag into pages you visit. Signed in, it also adds the email alias menu to email fields.',
  },
  {
    name: 'declarativeNetRequest',
    why: 'Adds the Sec-GPC request header, a Referrer-Policy response header, and removes tracking parameters from navigations.',
  },
  {
    name: 'browsingData',
    why: 'Clears cookies, storage, cache, and service workers for a site when you choose Forget this site. It is not used for anything else.',
  },
  {
    name: 'cookies',
    why: 'Reads cookie domains so Forget this site can include subdomains. Cookie values are not saved or sent to an account.',
  },
  {
    name: 'Host access, http and https',
    why: 'Those page scripts and header rules have to run on the sites you visit. Frame does not read page contents into an account.',
  },
  {
    name: 'frameprivacy.com',
    why: 'Talks to the Frame sign-in API after you connect. The request does not include the website’s cookies.',
  },
];

const SAFARI_OMITS = new Set(['privacy', 'identity', 'browsingData']);

const SAFARI_WHY: Record<string, string> = {
  scripting:
    'Injects the fingerprint normalizer and the Global Privacy Control flag into pages you visit, and clears a site’s storage in its open tabs when you choose Forget this site.',
  declarativeNetRequest:
    'Adds the Sec-GPC request header and removes tracking parameters from navigations. Safari doesn’t let extensions change response headers.',
  cookies:
    'Removes a site’s cookies when you choose Forget this site, because Safari has no browsingData API. Cookie values are not saved or sent anywhere.',
  'Host access, http and https':
    'Those page scripts and header rules have to run on the sites you visit. Safari asks you site by site, or once for all websites. Frame does not read page contents into an account.',
};

/**
 * The permissions this build asks for, with why. Safari's build has no
 * privacy, identity, or browsingData permission (Safari has none of those APIs),
 * and it only talks to frameprivacy.com once sign-in is available there.
 */
export function permissionsFor(target: BrowserTarget, signInAvailable: boolean): { name: string; why: string }[] {
  if (target !== 'safari') return PERMISSIONS;
  return PERMISSIONS.filter((item) => !SAFARI_OMITS.has(item.name))
    .filter((item) => signInAvailable || item.name !== 'frameprivacy.com')
    .map((item) => ({ name: item.name, why: SAFARI_WHY[item.name] ?? item.why }));
}
