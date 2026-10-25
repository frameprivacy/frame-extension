import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { ExtensionMessage, UiState } from '../lib/messages';
import { optimisticState } from '../lib/optimistic';
import { callExtension } from './api';

export function useExtensionState() {
  const [state, setState] = useState<UiState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await callExtension({ type: 'frame.get-state' }));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Frame couldn’t load. Close this and open it again.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = (_changes: Record<string, unknown>, area: string) => {
      if (area === 'local') void refresh();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  async function send(message: ExtensionMessage): Promise<boolean> {
    setState((current) => optimisticState(current, message));
    try {
      setState(await callExtension(message));
      setError(null);
      return true;
    } catch (error) {
      // Put the switches back to what the background really has.
      void refresh();
      setError(error instanceof Error ? error.message : 'That didn’t go through. Try again.');
      return false;
    }
  }

  return { state, error, send, refresh };
}
