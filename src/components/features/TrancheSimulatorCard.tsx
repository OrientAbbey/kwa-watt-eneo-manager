import React, { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { useApp } from "../../store/AppContext";
import { simulateNextTranche } from "../../lib/simulator";
import { cn, MONETARY_UNIT } from "../../lib/utils";

const fmtRange = (min: number, max: number) => `${min}–${Number.isFinite(max) ? max : "+"} kWh`;

/** Simulateur « changement de tranche » : jusqu'où puis-je consommer ce mois-ci sans changer de tranche ? */
export default function TrancheSimulatorCard() {
  const { state, currentMeter } = useApp();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthActual = currentMeter.consumptions.find((c) => c.date === currentMonth)?.kwh ?? 0;

  // Mois précédents, du plus récent au plus ancien (le 6e mois sort de la fenêtre quand le mois courant y entre)
  const previous = useMemo(
    () => currentMeter.consumptions.filter((c) => c.date < currentMonth).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((c) => c.kwh),
    [currentMeter.consumptions, currentMonth]
  );

  const [planned, setPlanned] = useState<string>(thisMonthActual ? String(thisMonthActual) : "");
  const kwh = parseFloat(planned);
  const sim = useMemo(
    () => (Number.isFinite(kwh) && kwh >= 0 ? simulateNextTranche(previous, kwh, state.settings.clientType, state.settings.tariffs) : null),
    [previous, kwh, state.settings.clientType, state.settings.tariffs]
  );

  const tone = sim?.status === "higher" ? "text-red-600" : sim?.status === "lower" ? "text-emerald-600" : "text-slate-700 dark:text-slate-200";
  const Icon = sim?.status === "higher" ? TrendingUp : sim?.status === "lower" ? TrendingDown : Minus;

  return (
    <Card id="tranche-simulator">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><TrendingUp size={20} className="mr-2 text-indigo-600" /> Simulateur de tranche</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Votre tarif dépend de la moyenne de vos 6 derniers mois (codes <span className="font-mono font-bold">820</span> à <span className="font-mono font-bold">825</span> du compteur).
          Voyez l'effet de la consommation de ce mois-ci.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {previous.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Enregistrez au moins un mois de consommation passé (onglet Historique) pour utiliser le simulateur.</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Consommation de ce mois-ci (kWh)</label>
              <input
                type="number" inputMode="decimal" min={0} value={planned}
                onChange={(e) => setPlanned(e.target.value)}
                placeholder="ex: 140"
                className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Basé sur vos {previous.length} mois précédents : {previous.map((v) => Math.round(v)).join(" · ")} kWh (du plus récent au plus ancien).</p>
            </div>

            {sim && (
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon size={20} className={tone} />
                  <p className={cn("font-bold", tone)}>
                    Tranche {fmtRange(sim.range.min, sim.range.max)}
                    {sim.status === "higher" && " — tranche supérieure"}
                    {sim.status === "lower" && " — tranche inférieure"}
                    {sim.status === "same" && sim.currentRange && " — inchangée"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-slate-500 dark:text-slate-400">Moyenne obtenue</dt>
                  <dd className="font-semibold text-right">{sim.projectedAverage.toFixed(1)} kWh</dd>
                  <dt className="text-slate-500 dark:text-slate-400">Tarif de base</dt>
                  <dd className="font-semibold text-right">{sim.range.base} {MONETARY_UNIT}/kWh</dd>
                  {sim.headroomKwh !== null && (
                    <>
                      <dt className="text-slate-500 dark:text-slate-400">Marge avant la tranche supérieure</dt>
                      <dd className="font-semibold text-right">{sim.headroomKwh} kWh</dd>
                    </>
                  )}
                  {sim.dropToLowerKwh !== null && sim.status !== "lower" && (
                    <>
                      <dt className="text-slate-500 dark:text-slate-400">Pour redescendre d'une tranche</dt>
                      <dd className="font-semibold text-right">≤ {sim.dropToLowerKwh} kWh ce mois-ci</dd>
                    </>
                  )}
                </dl>
                {sim.monthsUsed < 6 && <p className="text-[11px] text-amber-600">Moins de 6 mois de données : la moyenne réelle du compteur peut différer.</p>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
