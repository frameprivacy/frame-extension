import type { Alias, AliasList } from './aliases';
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
  /** Signed out, signed in without the aliases scope, or ready to use aliases. */
  aliasAccess: AliasAccess;
}

export type AliasAccess = 'signed-out' | 'needs-scope' | 'ready';

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

/**
 * Alias calls. `alias.*` comes from Frame's popup and options page.
 * `alias.page-*` comes from Frame's own content script on a web page. The background reads the site from the
 * tab the message came from, never from the message, and page messages cannot change or delete an alias.
 */
export type AliasMessage =
  | { type: 'alias.list' }
  | { type: 'alias.create'; label: string | null; forCurrentSite: boolean }
  | { type: 'alias.update'; id: string; enabled?: boolean; label?: string | null }
  | { type: 'alias.delete'; id: string }
  | { type: 'alias.page-list' }
  | { type: 'alias.page-create' }
  | { type: 'alias.page-use'; id: string };

export type AliasResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string | null; reconnect: boolean };

export type AliasListResult = AliasResult<AliasList & { site: string | null }>;
export type AliasOneResult = AliasResult<Alias>;
export type AliasDeleteResult = AliasResult<{ id: string }>;

/** What a web page's alias menu gets: enough to show and fill an alias, nothing more. */
export interface PageAlias {
  id: string;
  address: string;
  label: string | null;
  usedHere: boolean;
}

export type PageListResult = AliasResult<{ site: string | null; aliases: PageAlias[]; canCreate: boolean }>;
export type PageCreateResult = AliasResult<{ id: string; address: string }>;
export type PageUseResult = AliasResult<{ id: string }>;

export function isAliasMessage(value: unknown): value is AliasMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && type.startsWith('alias.');
}

export function isPageAliasMessage(message: AliasMessage): boolean {
  return message.type.startsWith('alias.page-');
}
