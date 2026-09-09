import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '../constants';
import { AppState, Settings, MeterData } from '../types';
import { getAlerts } from './alerts';

interface StatePatch extends Partial<Omit<AppState, 'settings'>> {
  settings?: Partial<Omit<Settings, 'alerts'>> & { alerts?: Partial<Settings['alerts']> };
}

function makeState(overrides: StatePatch = {}): AppState {
  const { settings, ...rest } = overrides;
  return {
    ...INITIAL_STATE,
    ...rest,
    settings: {
      ...INITIAL_STATE.settings,
      ...settings,
      alerts: {
        ...INITIAL_STATE.settings.alerts,
        startOfMonth: false,
        highConsumptionThreshold: null,
        anomalyPercentage: null,
        ...settings?.alerts,
      },
    },
  };
}

function makeMeter(consumptions: Array<[string, number]>): MeterData {
  return {
    ...INITIAL_STATE.meters[0],
    consumptions: consumptions.map(([date, kwh]) => ({ id: `${date}-${kwh}`, date, kwh })),
  };
}

describe('getAlerts', () => {
  it('returns nothing when all alerts are disabled', () => {
    const meter = makeMeter([['2026-01', 500]]);
    expect(getAlerts(makeState(), meter, new Date(2026, 0, 15))).toEqual([]);
  });

  it('raises a start-of-month alert inside the configured window', () => {
    const state = makeState({ settings: { alerts: { startOfMonth: true, startOfMonthDays: [1, 5] } } });
    const meter = makeMeter([['2026-01', 10]]);
    const alerts = getAlerts(state, meter, new Date(2026, 0, 2));
    expect(alerts.map(a => a.id)).toContain('start');
  });

  it('keeps silent outside the start-of-month window', () => {
    const state = makeState({ settings: { alerts: { startOfMonth: true, startOfMonthDays: [1, 5] } } });
    const meter = makeMeter([['2026-01', 10]]);
    expect(getAlerts(state, meter, new Date(2026, 0, 10))).toEqual([]);
  });

  it('flags high consumption at or above the threshold', () => {
    const state = makeState({ settings: { alerts: { highConsumptionThreshold: 300 } } });
    const meter = makeMeter([['2026-01', 300]]);
    expect(getAlerts(state, meter, new Date(2026, 0, 15)).map(a => a.id)).toContain('high');
  });

  it('flags a brutal increase versus the previous month', () => {
    const state = makeState({ settings: { alerts: { anomalyPercentage: 20 } } });
    const meter = makeMeter([['2025-12', 100], ['2026-01', 121]]);
    const alerts = getAlerts(state, meter, new Date(2026, 0, 15));
    expect(alerts.map(a => a.id)).toContain('anomaly');
    expect(alerts.find(a => a.id === 'anomaly')!.message).toContain('(+21%)');
  });

  it('does not flag an increase within the threshold', () => {
    const state = makeState({ settings: { alerts: { anomalyPercentage: 20 } } });
    const meter = makeMeter([['2025-12', 100], ['2026-01', 120]]);
    expect(getAlerts(state, meter, new Date(2026, 0, 15))).toEqual([]);
  });

  it('combines multiple alerts at once', () => {
    const state = makeState({
      settings: {
        alerts: {
          startOfMonth: true,
          startOfMonthDays: [1, 5],
          highConsumptionThreshold: 300,
          anomalyPercentage: 20,
        },
      },
    });
    const meter = makeMeter([['2025-12', 100], ['2026-01', 350]]);
    const alerts = getAlerts(state, meter, new Date(2026, 0, 2));
    expect(alerts.map(a => a.id).sort()).toEqual(['anomaly', 'high', 'start']);
  });
});