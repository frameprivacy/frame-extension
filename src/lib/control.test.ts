import { describe, expect, it } from 'vitest';
import {
  EXTENSION_LOCK_REASON,
  POLICY_LOCK_REASON,
  aggregateControls,
  controlDisabled,
  controlNote,
  lockForLevel,
} from './control';

describe('level of control', () => {
  it('describes policy and other-extension locks', () => {
    expect(lockForLevel('not_controllable')).toEqual({ kind: 'locked', reason: POLICY_LOCK_REASON });
    expect(lockForLevel('controlled_by_other_extensions')).toEqual({
      kind: 'locked',
      reason: EXTENSION_LOCK_REASON,
    });
    expect(lockForLevel('controllable_by_this_extension')).toBeNull();
    expect(lockForLevel('controlled_by_this_extension')).toBeNull();
  });

  it('prefers a lock over a partial success', () => {
    const result = aggregateControls([
      { kind: 'applied' },
      { kind: 'locked', reason: POLICY_LOCK_REASON },
      { kind: 'unavailable', reason: 'missing' },
    ]);
    expect(result).toEqual({ kind: 'locked', reason: POLICY_LOCK_REASON });
  });

  it('hides a note when the choice was applied', () => {
    expect(controlNote({ kind: 'applied' })).toBeNull();
    expect(controlNote(undefined)).toBeNull();
    expect(controlDisabled({ kind: 'unavailable', reason: 'no' })).toBe(true);
    expect(controlDisabled({ kind: 'applied' })).toBe(false);
  });
});
