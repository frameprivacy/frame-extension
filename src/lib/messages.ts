import type { ControlState } from './control';
import type { FrameExposure, FramePlan } from './frame/types';
import type { BooleanSettingId, Settings } from './settings';

export interface PublicAccount {
  preview: boolean;
  email: string;
  name: string | null;
  plan: FramePlan | null;
  exposure: FrameExposure | null;
}

export interface UiState {
  settings: Settings;
  controls: Partial<Record<BooleanSettingId, ControlState>>;
  account: PublicAccount | null;
  authError: string | null;
  signingIn: boolean;
  /** False when the browser has taken away Frame's access to websites. Page protections can't run then. */
  siteAccess: boolean;
  tab: { host: string | null; restricted: boolean };
  siteNotice: SiteNotice | null;
}

export interface SiteNotice {
  tone: 'ok' | 'error';
  text: string;
  host: string | null;
  canReload: boolean;
}

export type ExtensionMessage =
  | { type: 'frame.get-state' }
  | { type: 'frame.set-setting'; id: BooleanSettingId; value: boolean }
  | { type: 'frame.set-host'; host: string; enabled: boolean }
  | { type: 'frame.clear-host'; host: string }
  | { type: 'frame.set-tracker-host'; host: string; enabled: boolean }
  | { type: 'frame.clear-tracker-host'; host: string }
  | { type: 'frame.forget-site' }
  | { type: 'frame.reload-tab' }
  | { type: 'frame.sign-in' }
  | { type: 'frame.sign-out' };

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('frame.');
}
