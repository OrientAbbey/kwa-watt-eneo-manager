import { describe, it, expect } from 'vitest';
import { sortByDate } from './utils';

describe('sortByDate', () => {
  const items = [
    { date: '2026-03-01', v: 'c' },
    { date: '2026-01-15', v: 'a' },
    { date: '2026-02-10', v: 'b' },
  ];

  it('sorts ascending by ISO date', () => {
    expect(sortByDate(items, 'asc').map(i => i.v)).toEqual(['a', 'b', 'c']);
  });

  it('sorts descending by ISO date', () => {
    expect(sortByDate(items, 'desc').map(i => i.v)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    sortByDate(items, 'desc');
    expect(items).toEqual(copy);
  });
});

import { compressionPlan, MAX_STORED_PHOTO_CHARS } from './utils';

describe('compressionPlan', () => {
  it('commence par la meilleure qualité puis devient de plus en plus agressif', () => {
    const plan = compressionPlan(720, 0.72);
    expect(plan[0]).toEqual({ size: 720, quality: 0.72 });
    const sizes = plan.map((a) => a.size);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(plan.at(-1)!.size).toBeLessThanOrEqual(220);
  });
  it('ne contient aucun doublon et ne descend jamais sous 160 px', () => {
    const plan = compressionPlan(200, 0.5);
    expect(new Set(plan.map((a) => `${a.size}/${a.quality}`)).size).toBe(plan.length);
    expect(Math.min(...plan.map((a) => a.size))).toBeGreaterThanOrEqual(160);
  });
  it('la limite de stockage reste très inférieure au quota du localStorage', () => {
    expect(MAX_STORED_PHOTO_CHARS).toBeLessThan(500_000);
  });
});
