/**
 * Chromium id derived from the public key in wxt.config.ts.
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
