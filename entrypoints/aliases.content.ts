import { defineContentScript } from 'wxt/utils/define-content-script';
import { startAliasAutofill } from '../src/content/alias-autofill';

/**
 * The "Use a Frame alias" menu on email fields. Registered by the background only while you are signed in
 * with the aliases scope and the setting is on. Runs in Frame's isolated world. It reads nothing from the page
 * except which input has focus, and it writes only the address you pick into that input.
 */
export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  allFrames: true,
  registration: 'runtime',
  main() {
    startAliasAutofill();
  },
});
