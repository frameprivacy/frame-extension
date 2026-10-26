import { defineConfig } from 'wxt';
import { buildManifest } from './src/lib/manifest';

/**
 * One manifest per browser, built in src/lib/manifest.ts:
 * - Chrome, Brave, Edge: `npm run build` → .output/chrome-mv3
 * - Firefox: `npm run build:firefox` → .output/firefox-mv3
 * - Safari (macOS and iOS): `npm run build:safari` → .output/safari-mv3, then
 *   wrapped in an Xcode app on a Mac (docs/safari.md).
 *
 * Firefox's add-on id is a GUID (a bare hostname is not a legal Firefox id).
 * The redirect host is SHA-1 of that id, not the id itself.
 */
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Firefox's and Safari's WXT default is still MV2. Frame is Manifest V3 everywhere.
  manifestVersion: 3,
  manifest: ({ browser }) => buildManifest(browser),
});
