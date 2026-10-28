import { t } from './i18n';
export type ControlState =
  | { kind: 'applied' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'locked'; reason: string }
  | { kind: 'error'; reason: string };

export const UNAVAILABLE_REASON = t('This browser does not offer this setting.');
export const POLICY_LOCK_REASON = t('A browser policy controls this. Frame can’t change it.');
export const EXTENSION_LOCK_REASON = t('Another extension controls this. Frame can’t change it.');

export function lockForLevel(level: string | undefined): ControlState | null {
  if (level === 'not_controllable') return { kind: 'locked', reason: POLICY_LOCK_REASON };
  if (level === 'controlled_by_other_extensions') return { kind: 'locked', reason: EXTENSION_LOCK_REASON };
  return null;
}

export function aggregateControls(states: ControlState[]): ControlState {
  if (states.length === 0) return { kind: 'unavailable', reason: UNAVAILABLE_REASON };
  if (states.every((state) => state.kind === 'unavailable')) return states[0]!;
  const locked = states.find((state) => state.kind === 'locked');
  if (locked) return locked;
  const error = states.find((state) => state.kind === 'error');
  if (error) return error;
  const relevant = states.filter((state) => state.kind !== 'unavailable');
  if (relevant.length > 0 && relevant.every((state) => state.kind === 'applied')) return { kind: 'applied' };
  return { kind: 'error', reason: t('Some of these settings could not be changed.') };
}

export function controlNote(state: ControlState | undefined): string | null {
  if (!state || state.kind === 'applied') return null;
  return state.reason;
}

export function controlDisabled(state: ControlState | undefined): boolean {
  return state?.kind === 'locked' || state?.kind === 'unavailable';
}
