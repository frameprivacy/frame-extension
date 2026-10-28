import { useEffect, useId, useRef, useState } from 'react';
import { bandLabel, clampScore, scoreBand } from '../lib/score';
import { t } from '../lib/i18n';

const R = 15.5;
const C = 2 * Math.PI * R;
const DURATION = 1600;
const DELAY = 250;

/** cubic-bezier(0.22, 1, 0.36, 1), the Frame site's EASE, solved for progress at time t. */
function ease(t: number): number {
  const x1 = 0.22,
    y1 = 1,
    x2 = 0.36,
    y2 = 1;
  const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u ** 2 * (1 - u) + u ** 3;
  const by = (u: number) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Privacy Score ring, drawn like the one on the Frame dashboard: a faint track, a steel gradient arc with a round cap,
 * and a calm count up. `score` is null when Frame has not checked anything yet, and then the ring stays empty.
 */
export function ScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const id = useId().replace(/:/g, '');
  const target = score === null ? null : clampScore(score);
  const [shown, setShown] = useState(() => (target === null || prefersReducedMotion() ? (target ?? 0) : 0));
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (target === null) return;
    if (prefersReducedMotion()) {
      setShown(target);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    // A new score from the next refresh moves from the number on screen, not from zero again.
    const from = shownRef.current;
    if (from === target) return;
    const step = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start - DELAY;
      const t = Math.min(1, Math.max(0, elapsed / DURATION));
      setShown(Math.round(from + (target - from) * ease(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const label =
    target === null
      ? t('Privacy Score not available yet')
      : t('Privacy Score {score} out of 100, {band}', { score: target, band: bandLabel(scoreBand(target)) });

  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 36 36" className="ring-svg" aria-hidden="true">
        <circle cx="18" cy="18" r={R} fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth="2.4" />
        {target !== null && target > 0 ? (
          <circle
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke={`url(#ring${id})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={`${(shown / 100) * C} ${C}`}
          />
        ) : null}
        <defs>
          <linearGradient id={`ring${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#e7eefc" />
            <stop offset="1" stopColor="#8c99b4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-center" aria-hidden="true">
        {target === null ? (
          <span className="ring-empty">–</span>
        ) : (
          <span className="ring-num" style={{ fontSize: size * 0.27 }}>
            {shown}
          </span>
        )}
        <span className="ring-of">{t('of 100')}</span>
      </div>
    </div>
  );
}
