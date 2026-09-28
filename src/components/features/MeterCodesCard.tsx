import React, { useState } from "react";
import { Keyboard, ChevronDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import CopyableValue from "../ui/CopyableValue";
import { groupedMeterCodes } from "../../lib/meterCodes";
import { cn } from "../../lib/utils";

/** Mémo interactif des codes du clavier du compteur : touchez un code pour le copier. */
export default function MeterCodesCard() {
  const groups = groupedMeterCodes();
  const [open, setOpen] = useState<Record<string, boolean>>({ essentiel: true });

  return (
    <Card id="meter-codes">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Keyboard size={20} className="mr-2 text-indigo-600" /> Codes du compteur</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tapez le code sur le clavier de l'interface du compteur, puis validez.</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {groups.map(({ group, title, codes }) => (
          <div key={group} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen((o) => ({ ...o, [group]: !o[group] }))}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold text-slate-700 dark:text-slate-200"
              aria-expanded={!!open[group]}
            >
              <span>{title} <span className="text-xs font-normal text-slate-400">({codes.length})</span></span>
              <ChevronDown size={18} className={cn("transition-transform text-slate-400", open[group] && "rotate-180")} />
            </button>
            {open[group] && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {codes.map((c) => (
                  <li key={c.code} className="px-4 py-3 flex items-start gap-3">
                    <CopyableValue value={c.code} label={`Code ${c.code}`} className="w-16 shrink-0 text-lg font-bold text-indigo-700 dark:text-indigo-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {c.label}
                        {c.changesState && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={10} /> agit sur le compteur
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <p className="text-[11px] text-slate-400">Source : guide prépayé officiel. Les codes du groupe « non documentés » ne sont pas garantis sur tous les modèles.</p>
      </CardContent>
    </Card>
  );
}
