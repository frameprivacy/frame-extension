/** Common buckets only. Odd counts like 6, 10, or 24 stand out more than they help. */
export function bucketHardwareConcurrency(cores: number): number {
  if (!Number.isFinite(cores) || cores < 1) return 4;
  return cores <= 4 ? 4 : 8;
}

/**
 * `navigator.deviceMemory` already tops out at 8. Reporting 8 matches the
 * largest, most common bucket instead of a per-user seed.
 */
export function normalizedDeviceMemory(): number {
  return 8;
}

export function quantizeChannel(value: number): number {
  if (!Number.isFinite(value)) return value;
  return value & 0xfc;
}

/** Offline audio only. Live playback is not passed through this. */
export function quantizeUnitSample(sample: number): number {
  if (!Number.isFinite(sample)) return sample;
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped * 10000) / 10000;
}

export interface WebGlIdentity {
  vendor: string;
  renderer: string;
}

/**
 * Fixed, real-looking strings per platform. The same machine always reports
 * the same value, and that value is shared with other people on that platform.
 * It is not a random fingerprint.
 */
export function commonWebGl(platform: string, userAgent: string): WebGlIdentity {
  const ua = userAgent || '';
  const host = platform || '';
  if (/android/i.test(ua)) {
    return {
      vendor: 'Google Inc. (Qualcomm)',
      renderer: 'ANGLE (Qualcomm, Adreno (TM) 640, OpenGL ES 3.2)',
    };
  }
  if (/mac/i.test(host) || /Mac OS X/i.test(ua)) {
    return {
      vendor: 'Google Inc. (Apple)',
      renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
    };
  }
  if (/linux/i.test(host) || /cros/i.test(host)) {
    return {
      vendor: 'Google Inc. (Intel)',
      renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)',
    };
  }
  return {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  };
}

const COMMON_FONTS = new Set([
  'arial',
  'helvetica',
  'helvetica neue',
  'times new roman',
  'times',
  'courier new',
  'courier',
  'verdana',
  'georgia',
  'trebuchet ms',
  'tahoma',
  'segoe ui',
  'calibri',
  'cambria',
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'cursive',
  'fantasy',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'liberation sans',
  'liberation serif',
  'liberation mono',
  'noto sans',
  'noto serif',
  'roboto',
  '-apple-system',
  'blinkmacsystemfont',
]);

export function normalizeFontFamily(family: string): string {
  return family
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isCommonFont(family: string): boolean {
  return COMMON_FONTS.has(normalizeFontFamily(family));
}

/**
 * System fonts outside the common set are hidden. A face the page added
 * (a webfont) is not a system-font probe, so it stays visible.
 */
export function hideFontCheck(family: string | null, pageProvided: boolean): boolean {
  if (!family || pageProvided || isCommonFont(family)) return false;
  return true;
}

/** First family from a CSS font shorthand, lowercased, or null. */
export function primaryFontFamily(font: string): string | null {
  if (!font) return null;
  const quoted = font.match(/["']([^"']+)["']/);
  const source = quoted?.[1] ?? font;
  const withoutSize = source.replace(
    /(\d+(\.\d+)?)(px|pt|em|rem|%)(\s*\/\s*(\d+(\.\d+)?)(px|pt|em|rem|%)?)?/gi,
    ' ',
  );
  const cleaned = withoutSize
    .replace(
      /\b(normal|italic|oblique|small-caps|bold|bolder|lighter|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded)\b/gi,
      ' ',
    )
    .replace(/["']/g, ' ');
  const family = cleaned
    .split(',')[0]
    ?.trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return family || null;
}
