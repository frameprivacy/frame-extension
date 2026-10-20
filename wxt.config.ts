import { defineConfig } from 'wxt';
import { FIREFOX_ADDON_ID } from './src/lib/extension-ids';

/**
 * Public key for a stable unpacked Chromium extension id.
 * The private key is not in the repo. The Chrome Web Store re-signs a
 * published package, so a store build gets a different id unless it is
 * packed with this same key. Set the id below as FRAME_CHROME_EXTENSION_IDS.
 *
 * Unpacked id: mhemokfamnabliomlhigbkclcfcplfln
 * Redirect: https://mhemokfamnabliomlhigbkclcfcplfln.chromiumapp.org/
 *
 * Firefox add-on id is a GUID (a bare hostname is not a legal Firefox id).
 * The redirect host is SHA-1 of that id, not the id itself.
 */
const CHROMIUM_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4bddCEanjM6EsuGohULcktJrh6KSeeNVWuVovgicIyfEqDtzagh56vJ7qYFMDPUX9HmtoSe2MBaZNGiNc+Albp9DDCGWO308cd3uA/5dh3C/Q2KJ6dUfLx86dwGpS804p5rTCIupYQvLLMjO9nBRlClpR5B/VCoUJR/4jD7GyXZ20Q26F71zoL9xbd+H794+/SnTkbml1Pm/DkUMbpEnz8o7Xz0fcgC1SY0YHJX97SoovK65EVOdN88nNBBo18qfCvek+WsPJ6VkF/fvY4fimSfk/fUosWpo66EEUbI7/hes/W4PbHQuxxxuyuKg/FzxEe2ZtLk6nzf/L2JInMSeuwIDAQAB';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Firefox's WXT default is still MV2. Frame is Manifest V3 everywhere.
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Frame',
    short_name: 'Frame',
    description:
      'Privacy controls for this browser, and an optional Frame account on Chrome and Firefox. Does not make you anonymous.',
    homepage_url: 'https://frameprivacy.com',
    minimum_chrome_version: '111',
    // Pins the unpacked Chromium id. Firefox rejects this field.
    key: browser === 'firefox' ? undefined : CHROMIUM_PUBLIC_KEY,
    permissions: ['storage', 'privacy', 'identity', 'scripting', 'declarativeNetRequest', 'browsingData', 'cookies'],
    host_permissions: ['https://frameprivacy.com/*'],
    // http/https host access for page scripts is added from the content-script matches.
    incognito: 'spanning',
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: 'Frame',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_ADDON_ID,
        strict_min_version: '128.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  }),
});
