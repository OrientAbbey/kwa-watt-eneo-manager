import { v4 as uuidv4 } from 'uuid';
import { Consumption, Recharge } from '../types';

export interface ExportData {
  consumptions: Consumption[];
  recharges: Recharge[];
}

export function toCsv(data: ExportData): string {
  const lines = ['type,id,date,kwh,montant'];
  data.consumptions.forEach(c => {
    lines.push(`consommation,${c.id},${c.date},${c.kwh},`);
  });
  data.recharges.forEach(r => {
    lines.push(`recharge,${r.id},${r.date},${r.kwh},${r.montant}`);
  });
  return lines.join('\n');
}

export function toJson(data: ExportData): string {
  return JSON.stringify({ consumptions: data.consumptions, recharges: data.recharges }, null, 2);
}

export function serializeExport(data: ExportData, format: 'csv' | 'json'): string {
  return format === 'csv' ? toCsv(data) : toJson(data);
}

export type ParsedExport = ExportData | null;

export function parseExport(text: string): ParsedExport {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      if (data.consumptions || data.recharges) {
        return {
          consumptions: data.consumptions || [],
          recharges: data.recharges || [],
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const consumptions: Consumption[] = [];
  const recharges: Recharge[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;
    const type = cols[0];
    const id = cols[1] || uuidv4();
    const date = cols[2];
    const kwh = parseFloat(cols[3]);

    if (type === 'consommation' && date && !isNaN(kwh)) {
      consumptions.push({ id, date, kwh });
    } else if (type === 'recharge' && date && !isNaN(kwh)) {
      const montant = parseFloat(cols[4] || '0');
      recharges.push({ id, date, kwh, montant });
    }
  }

  if (consumptions.length === 0 && recharges.length === 0) return null;
  return { consumptions, recharges };
}