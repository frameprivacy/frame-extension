import { defineContentScript } from 'wxt/utils/define-content-script';
import { installGlobalPrivacyControl } from '../src/lib/gpc-install';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'MAIN',
  allFrames: true,
  registration: 'runtime',
  main() {
    installGlobalPrivacyControl();
  },
});
