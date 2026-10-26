import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./theme.css', import.meta.url)), 'utf8');

type Rgba = [number, number, number, number];

function parse(value: string): Rgba {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1] ?? '0', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) throw new Error(`Unsupported color ${value}`);
  const [r = 0, g = 0, b = 0, a = 1] = (rgba[1] ?? '').split(',').map((part) => Number(part.trim()));
  return [r, g, b, a];
}

function token(name: string): Rgba {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`Missing --${name}`);
  return parse(match[1].trim());
}

function over([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
}

function luminance([r, g, b]: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const page = token('bg');
// The lightest surface text sits on: a 4% white panel over the page background.
const panel = over([255, 255, 255, 0.04], page);

describe('theme contrast (WCAG 2.2 AA)', () => {
  it.each(['text', 'muted', 'faint', 'steel'])('--%s text meets 4.5:1 on page and panels', (name) => {
    const fg = token(name);
    expect(contrast(over(fg, page), page)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(over(fg, panel), panel)).toBeGreaterThanOrEqual(4.5);
  });

  it('control edges meet 3:1 non-text contrast', () => {
    const edges = [...css.matchAll(/(?:inset 0 0 0 1px|border: 1px solid) (rgba\([^)]+\))/g)]
      .map((m) => m[1] ?? '')
      .filter((value) => /0\.4\d?\)$/.test(value));
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(contrast(over(parse(edge), panel), panel)).toBeGreaterThanOrEqual(3);
    }
  });
});
