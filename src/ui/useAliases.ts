import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { Alias, AliasList } from '../lib/aliases';
import type { AliasAccess, AliasMessage, AliasResult } from '../lib/messages';
import { t } from '../lib/i18n';

type ListData = AliasList & { site: string | null };
type Failure = Extract<AliasResult<unknown>, { ok: false }>;

export async function callAlias<T>(message: AliasMessage): Promise<AliasResult<T>> {
  try {
    const response: unknown = await browser.runtime.sendMessage(message);
    if (response && typeof response === 'object' && 'ok' in response) return response as AliasResult<T>;
  } catch {
    /* falls through */
  }
  return { ok: false, error: t('Frame did not respond.'), code: null, reconnect: false };
}

/** The alias list for the popup and options page, plus the changes they can make. */
export function useAliases(access: AliasAccess) {
  const [list, setList] = useState<ListData | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (access !== 'ready') {
      setList(null);
      setError(null);
      return;
    }
    setLoading(true);
    const result = await callAlias<ListData>({ type: 'alias.list' });
    setLoading(false);
    if (result.ok) {
      setList(result.data);
      setError(null);
    } else {
      setError(result);
    }
  }, [access]);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (alias: Alias) =>
    setList((current) =>
      current ? { ...current, aliases: current.aliases.map((item) => (item.id === alias.id ? alias : item)) } : current,
    );

  /** Runs a change. Returns the error message, or null when it worked. */
  async function run<T>(message: AliasMessage, apply: (data: T) => void): Promise<string | null> {
    const result = await callAlias<T>(message);
    if (!result.ok) {
      if (result.reconnect) setError(result);
      return result.error;
    }
    apply(result.data);
    return null;
  }

  async function create(label: string | null, forCurrentSite: boolean): Promise<{ alias: Alias | null; error: string | null }> {
    let made: Alias | null = null;
    const error = await run<Alias>({ type: 'alias.create', label, forCurrentSite }, (alias) => {
      made = alias;
      setList((current) => (current ? { ...current, aliases: [alias, ...current.aliases] } : current));
    });
    return { alias: made, error };
  }

  return {
    list,
    error,
    loading,
    reload: load,
    create,
    setEnabled: (id: string, enabled: boolean) => run<Alias>({ type: 'alias.update', id, enabled }, replace),
    rename: (id: string, label: string | null) => run<Alias>({ type: 'alias.update', id, label }, replace),
    remove: (id: string) =>
      run<{ id: string }>({ type: 'alias.delete', id }, () =>
        setList((current) => (current ? { ...current, aliases: current.aliases.filter((item) => item.id !== id) } : current)),
      ),
  };
}
