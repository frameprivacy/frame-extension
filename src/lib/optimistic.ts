import type { ExtensionMessage, UiState } from './messages';
import { isBooleanSettingId, setBooleanSetting, setFingerprintHost, setTrackerHost } from './settings';

/**
 * The switch the person just pressed, shown before the background answers.
 * Without it, a second quick press read the old value and sent the same change twice.
 * The background's answer replaces this state either way.
 */
export function optimisticState(state: UiState | null, message: ExtensionMessage): UiState | null {
  if (!state) return state;
  if (message.type === 'frame.set-setting' && isBooleanSettingId(message.id) && typeof message.value === 'boolean') {
    return { ...state, settings: setBooleanSetting(state.settings, message.id, message.value) };
  }
  if (message.type === 'frame.set-host') {
    return { ...state, settings: setFingerprintHost(state.settings, message.host, message.enabled) };
  }
  if (message.type === 'frame.set-tracker-host') {
    return { ...state, settings: setTrackerHost(state.settings, message.host, message.enabled) };
  }
  return state;
}
