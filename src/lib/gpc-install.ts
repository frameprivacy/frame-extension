const BRAND = Symbol.for('frame.privacy.gpc');

/** Sets the JavaScript half of Global Privacy Control. The header is separate. */
export function installGlobalPrivacyControl(): void {
  if (typeof Navigator === 'undefined') return;
  const existing = Object.getOwnPropertyDescriptor(Navigator.prototype, 'globalPrivacyControl')?.get;
  if (existing && BRAND in existing) return;
  defineGpc(Navigator.prototype);
  const workerNavigator = (globalThis as { WorkerNavigator?: { prototype: object } }).WorkerNavigator;
  if (workerNavigator?.prototype) defineGpc(workerNavigator.prototype);
}

function defineGpc(proto: object): void {
  const get = function globalPrivacyControl() {
    return true;
  };
  Object.defineProperty(get, BRAND, { value: true });
  try {
    Object.defineProperty(proto, 'globalPrivacyControl', {
      configurable: true,
      enumerable: true,
      get,
    });
  } catch {
    /* ignore */
  }
}
