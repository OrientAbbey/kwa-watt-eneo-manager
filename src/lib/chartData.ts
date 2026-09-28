/** Fenêtre glissante de mois CALENDAIRES (et non « les N dernières saisies » : un mois manquant ne décale plus les axes). */

export interface MonthSlot {
  /** yyyy-MM */
  key: string;
  year: number;
  /** 0 = janvier */
  month: number;
  /** Vrai au premier point et à chaque changement d'année (janvier) : l'année n'est affichée que là où elle change. */
  showYear: boolean;
}

export function lastMonths(count: number, now: Date = new Date()): MonthSlot[] {
  const slots: MonthSlot[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    slots.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      year,
      month,
      showYear: slots.length === 0 || month === 0,
    });
  }
  return slots;
}
