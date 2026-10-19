import { defineContentScript } from 'wxt/utils/define-content-script';
import { installFingerprintGuards } from '../src/lib/fingerprint-install';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'MAIN',
  allFrames: true,
  registration: 'runtime',
  main() {
    installFingerprintGuards();
  },
});
