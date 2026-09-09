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