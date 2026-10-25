import { describe, expect, it } from 'vitest';
import { areaLabel, bandLabel, clampScore, scoreBand } from './score';

describe('score bands', () => {
  it('matches the website bands', () => {
    expect(scoreBand(100)).toBe('good');
    expect(scoreBand(80)).toBe('good');
    expect(scoreBand(79)).toBe('fair');
    expect(scoreBand(60)).toBe('fair');
    expect(scoreBand(59)).toBe('needs-work');
    expect(scoreBand(40)).toBe('needs-work');
    expect(scoreBand(39)).toBe('at-risk');
    expect(scoreBand(0)).toBe('at-risk');
    expect(bandLabel('needs-work')).toBe('Needs work');
  });

  it('clamps and rounds', () => {
    expect(clampScore(72.6)).toBe(73);
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it('labels areas from the API', () => {
    expect(areaLabel('brokers')).toBe('Broker listings');
    expect(areaLabel('footprint')).toBe('Public footprint');
    expect(areaLabel('new_area')).toBe('New area');
    expect(areaLabel('')).toBe('Other');
  });
});
