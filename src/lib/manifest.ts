import type { UserManifest } from 'wxt';
import { FIREFOX_ADDON_ID, SAFARI_SIGN_IN_READY } from './extension-ids';
import { SAFARI_MIN_VERSION, browserTarget } from './platform';

/**
 * Public key for a stable unpacked Chromium extension id.
 * The private key is not in the repo. The Chrome Web Store re-signs a
 * published package, so a store build gets a different id unless it is
 * packed with this same key. Set the id below as FRAME_CHROME_EXTENSION_IDS.
 *
 * Unpacked id: mhemokfamnabliomlhigbkclcfcplfln
 * Redirect: https://mhemokfamnabliomlhigbkclcfcplfln.chromiumapp.org/
 */
export const CHROMIUM_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4bddCEanjM6EsuGohULcktJrh6KSeeNVWuVovgicIyfEqDtzagh56vJ7qYFMDPUX9HmtoSe2MBaZNGiNc+Albp9DDCGWO308cd3uA/5dh3C/Q2KJ6dUfLx86dwGpS804p5rTCIupYQvLLMjO9nBRlClpR5B/VCoUJR/4jD7GyXZ20Q26F71zoL9xbd+H794+/SnTkbml1Pm/DkUMbpEnz8o7Xz0fcgC1SY0YHJX97SoovK65EVOdN88nNBBo18qfCvek+WsPJ6VkF/fvY4fimSfk/fUosWpo66EEUbI7/hes/W4PbHQuxxxuyuKg/FzxEe2ZtLk6nzf/L2JInMSeuwIDAQAB';

const ICONS = {
  16: 'icon-16.png',
  32: 'icon-32.png',
  48: 'icon-48.png',
  128: 'icon-128.png',
};

/**
 * Safari has no `privacy`, `identity`, or `browsingData` API, so the Safari
 * manifest doesn't ask for them. Safari signs in through a tab on
 * frameprivacy.com, which the frameprivacy.com host permission already covers.
 */
const CHROMIUM_FIREFOX_PERMISSIONS = [
  'storage',
  'privacy',
  'identity',
  'scripting',
  'declarativeNetRequest',
  'browsingData',
  'cookies',
];
const SAFARI_PERMISSIONS = ['storage', 'scripting', 'declarativeNetRequest', 'cookies'];

const DESCRIPTION_CHROMIUM_FIREFOX =
  'Privacy controls for this browser, and an optional Frame account on Chrome and Firefox. Does not make you anonymous.';
const DESCRIPTION_SAFARI_WITH_ACCOUNT =
  'Privacy controls for this browser, and an optional Frame account. Does not make you anonymous.';
const DESCRIPTION_SAFARI_NO_ACCOUNT = 'Privacy controls for this browser. Does not make you anonymous.';

/**
 * The manifest for one WXT browser target. Each browser only gets the keys it
 * understands: the Chromium `key` pins the unpacked Chrome id (Firefox rejects
 * it, Safari has no use for it), `gecko` is Firefox only, and `safari` sets the
 * oldest supported Safari.
 */
export function buildManifest(browserName: string, safariSignInReady = SAFARI_SIGN_IN_READY): UserManifest {
  const target = browserTarget(browserName);
  const safari = target === 'safari';
  const manifest: UserManifest = {
    name: 'Frame',
    short_name: 'Frame',
    description: safari
      ? safariSignInReady
        ? DESCRIPTION_SAFARI_WITH_ACCOUNT
        : DESCRIPTION_SAFARI_NO_ACCOUNT
      : DESCRIPTION_CHROMIUM_FIREFOX,
    homepage_url: 'https://frameprivacy.com',
    permissions: safari ? [...SAFARI_PERMISSIONS] : [...CHROMIUM_FIREFOX_PERMISSIONS],
    host_permissions: ['https://frameprivacy.com/*'],
    // http/https host access for page scripts is added from the content-script matches.
    incognito: 'spanning',
    icons: { ...ICONS },
    action: {
      default_title: 'Frame',
      default_icon: { ...ICONS },
    },
  };
  if (target === 'chrome') {
    manifest.minimum_chrome_version = '111';
    manifest.key = CHROMIUM_PUBLIC_KEY;
  }
  if (target === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: FIREFOX_ADDON_ID,
        strict_min_version: '128.0',
        // Not in WXT's types yet. Mozilla requires it for new listings.
        ...({ data_collection_permissions: { required: ['none'] } } as object),
      },
    };
  }
  if (safari) {
    manifest.browser_specific_settings = {
      safari: { strict_min_version: SAFARI_MIN_VERSION },
    };
  }
  return manifest;
}
