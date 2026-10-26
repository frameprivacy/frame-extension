/**
 * Chromium id derived from the public key in src/lib/manifest.ts.
 * The private key is not in this repo. Set this as FRAME_CHROME_EXTENSION_IDS.
 */
export const CHROME_EXTENSION_ID = 'mhemokfamnabliomlhigbkclcfcplfln';

/**
 * Firefox only accepts a GUID or an email-shaped add-on id, and
 * identity.getRedirectURL() does not put that id in the host. It puts
 * SHA-1(id). This GUID is fixed so the host never changes.
 */
export const FIREFOX_ADDON_ID = '{f4a0e6c1-8b27-4d53-9e14-6c2b7a91d0e5}';

/**
 * Hostname label in https://<id>.extensions.allizom.org/.
 * This is the Firefox client_id the site must allow.
 */
export const FIREFOX_CLIENT_ID = '86d25b817a984dadbf12ae6ae90c87df43543c41';

/**
 * Safari Web Extensions ship inside a native app. These are the bundle ids to
 * use in Xcode (see docs/safari.md). The packager names the extension
 * `<app id>.Extension` by default; rename it to this id in Xcode.
 */
export const SAFARI_APP_BUNDLE_ID = 'com.frameprivacy.safari';
export const SAFARI_EXTENSION_BUNDLE_ID = 'com.frameprivacy.safari.extension';

/**
 * Safari has no `identity` API, so there is no per-browser redirect host to
 * derive a client id from. Safari signs in through a normal tab and sends this
 * fixed client id, plus `client=safari`.
 */
export const SAFARI_CLIENT_ID = SAFARI_EXTENSION_BUNDLE_ID;

/** Where frameprivacy.com sends a Safari sign-in back to. The extension watches its own sign-in tab for this page. */
export const SAFARI_REDIRECT_URI = 'https://frameprivacy.com/connect/safari';

/**
 * Safari sign-in needs frameprivacy.com to allow SAFARI_CLIENT_ID, the redirect
 * page above, `client=safari`, and `safari-web-extension://` origins
 * (docs/safari.md, "Website changes"). The site ships all of these, so Safari
 * builds offer sign-in.
 */
export const SAFARI_SIGN_IN_READY = true;
