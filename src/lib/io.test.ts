import { describe, it, expect } from 'vitest';
import { toCsv, toJson, serializeExport, parseExport } from './io';

const data = {
  consumptions: [
    { id: 'c1', date: '2024-05', kwh: 120.5 },
    { id: 'c2', date: '2024-06', kwh: 95 },
  ],
  recharges: [
    { id: 'r1', date: '2024-05-10', montant: 5000, kwh: 55.2 },
    { id: 'r2', date: '2024-06-12', montant: 3000, kwh: 33.1 },
  ],
};

describe('toCsv', () => {
  it('writes header and one row per entry', () => {
    const csv = toCsv(data);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('type,id,date,kwh,montant');
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe('consommation,c1,2024-05,120.5,');
    expect(lines[3]).toBe('recharge,r1,2024-05-10,55.2,5000');
  });
});

describe('toJson', () => {
  it('is valid JSON with both collections', () => {
    const parsed = JSON.parse(toJson(data)) as { consumptions: typeof data.consumptions; recharges: typeof data.recharges };
    expect(parsed.consumptions).toHaveLength(2);
    expect(parsed.recharges).toHaveLength(2);
    expect(parsed.consumptions[0]).toMatchObject({ id: 'c1', kwh: 120.5 });
  });
});

describe('serializeExport', () => {
  it('selects format', () => {
    expect(serializeExport(data, 'csv')).toBe(toCsv(data));
    expect(serializeExport(data, 'json')).toBe(toJson(data));
  });
});

describe('parseExport CSV', () => {
  it('round-trips an exported CSV', () => {
    const csv = toCsv(data);
    const parsed = parseExport(csv);
    expect(parsed).not.toBeNull();
    expect(parsed!.consumptions).toEqual(data.consumptions);
    expect(parsed!.recharges).toEqual(data.recharges);
  });

  it('rejects a header-only CSV', () => {
    expect(parseExport('type,id,date,kwh,montant')).toBeNull();
  });

  it('rejects an empty input', () => {
    expect(parseExport('')).toBeNull();
    expect(parseExport('   ')).toBeNull();
  });

  it('accepts a row without id and generates one', () => {
    const parsed = parseExport('type,id,date,kwh,montant\nconsommation,,2024-05,120.5,');
    expect(parsed).not.toBeNull();
    expect(parsed!.consumptions).toHaveLength(1);
    expect(parsed!.consumptions[0].id).toBeTruthy();
    expect(parsed!.consumptions[0].date).toBe('2024-05');
  });

  it('defaults missing montant to 0 for recharges', () => {
    const parsed = parseExport('type,id,date,kwh,montant\nrecharge,r1,2024-05-10,55.2,');
    expect(parsed!.recharges[0].montant).toBe(0);
  });

  it('skips malformed rows', () => {
    const parsed = parseExport(
      'type,id,date,kwh,montant\nconsommation,c1,2024-05,notanumber,\nconsommation,c2,2024-06,90.5,\n'
    );
    expect(parsed!.consumptions).toHaveLength(1);
    expect(parsed!.consumptions[0].id).toBe('c2');
  });
});

describe('parseExport JSON', () => {
  it('round-trips an exported JSON', () => {
    const parsed = parseExport(toJson(data));
    expect(parsed).toMatchObject(data);
  });

  it('accepts JSON with only consumptions', () => {
    const parsed = parseExport('{"consumptions":[{"id":"c1","date":"2024-05","kwh":10}]}');
    expect(parsed!.consumptions).toHaveLength(1);
    expect(parsed!.recharges).toEqual([]);
  });

  it('rejects malformed JSON', () => {
    expect(parseExport('{not json')).toBeNull();
  });

  it('rejects JSON without data collections', () => {
    expect(parseExport('{"foo": 1}')).toBeNull();
  });
});