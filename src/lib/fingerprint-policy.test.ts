import { describe, expect, it } from 'vitest';
import {
  bucketHardwareConcurrency,
  commonWebGl,
  hideFontCheck,
  isCommonFont,
  normalizedDeviceMemory,
  primaryFontFamily,
  quantizeChannel,
  quantizeUnitSample,
} from './fingerprint-policy';

describe('fingerprint policy', () => {
  it('buckets processor counts to 4 or 8', () => {
    expect(bucketHardwareConcurrency(2)).toBe(4);
    expect(bucketHardwareConcurrency(4)).toBe(4);
    expect(bucketHardwareConcurrency(6)).toBe(8);
    expect(bucketHardwareConcurrency(16)).toBe(8);
    expect(bucketHardwareConcurrency(Number.NaN)).toBe(4);
  });

  it('uses the common device-memory cap', () => {
    expect(normalizedDeviceMemory()).toBe(8);
  });

  it('quantizes without a per-user seed', () => {
    expect(quantizeChannel(255)).toBe(252);
    expect(quantizeChannel(5)).toBe(4);
    expect(quantizeUnitSample(0.123456)).toBe(0.1235);
    expect(quantizeUnitSample(0.12345)).toBe(0.1235);
    expect(quantizeUnitSample(2)).toBe(1);
  });

  it('picks a stable WebGL string for the platform', () => {
    const mac = commonWebGl('MacIntel', 'Mozilla/5.0 (Macintosh)');
    const windows = commonWebGl('Win32', 'Mozilla/5.0 (Windows NT 10.0)');
    expect(mac.vendor).toContain('Apple');
    expect(windows.renderer).toContain('Intel');
    expect(commonWebGl('Win32', 'Mozilla/5.0 (Windows NT 10.0)')).toEqual(windows);
    expect(commonWebGl('Linux armv8l', 'Android')).not.toEqual(windows);
  });

  it('reads the first font family and keeps a short common list', () => {
    expect(primaryFontFamily('italic bold 16px/1.2 "Times New Roman", serif')).toBe('times new roman');
    expect(primaryFontFamily('12px Arial')).toBe('arial');
    expect(isCommonFont('arial')).toBe(true);
    expect(isCommonFont('Comic Sans MS')).toBe(false);
    expect(hideFontCheck('comic sans ms', false)).toBe(true);
    expect(hideFontCheck('arial', false)).toBe(false);
    expect(hideFontCheck('brand sans', true)).toBe(false);
  });
});
