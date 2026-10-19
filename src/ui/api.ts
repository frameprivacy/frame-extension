import { browser } from 'wxt/browser';
import type { ExtensionMessage, UiState } from '../lib/messages';

export async function callExtension(message: ExtensionMessage): Promise<UiState> {
  const response: unknown = await browser.runtime.sendMessage(message);
  if (!response || typeof response !== 'object' || !('settings' in response)) {
    const detail =
      response && typeof response === 'object' && 'error' in response && typeof response.error === 'string'
        ? response.error
        : '';
    throw new Error(detail || 'Frame did not respond.');
  }
  return response as UiState;
}
