/**
 * Privacy Score helpers shared by the popup and the options page.
 * The score itself always comes from the Frame API. Nothing here invents one.
 */
import { t } from './i18n';

export type ScoreBand = 'good' | 'fair' | 'needs-work' | 'at-risk';

/** Same bands as the Frame website's reports: 80+ Good, 60+ Fair, 40+ Needs work, below that At risk. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'needs-work';
  return 'at-risk';
}

export function bandLabel(band: ScoreBand): string {
  if (band === 'good') return t('Good');
  if (band === 'fair') return t('Fair');
  if (band === 'needs-work') return t('Needs work');
  return t('At risk');
}

/** Keeps a score from the API inside the ring. A value outside 0 to 100 is clamped, not hidden. */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

const AREA_LABELS: Record<string, string> = {
  breaches: t('Breaches'),
  brokers: t('Broker listings'),
  data_brokers: t('Broker listings'),
  network: t('Network'),
  footprint: t('Public footprint'),
};

export function areaLabel(key: string): string {
  const known = AREA_LABELS[key];
  if (known) return known;
  const words = key.replaceAll('_', ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : t('Other');
}
