import React, { useState } from "react";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import BottomSheet from "../ui/BottomSheet";
import { AppAlert } from "../../lib/alerts";
import { cn } from "../../lib/utils";

interface NotificationBellProps {
  alerts: AppAlert[];
  /** Notifications activées dans l'application (sinon on propose de les activer). */
  notificationsEnabled: boolean;
  onGoSettings: () => void;
  onGoDashboard: () => void;
}

const SEVERITY: Record<AppAlert["type"], { rank: number; button: string; icon: React.ReactNode }> = {
  error: { rank: 3, button: "bg-red-600 hover:bg-red-700", icon: <AlertTriangle size={20} className="text-red-500" /> },
  warning: { rank: 2, button: "bg-amber-500 hover:bg-amber-600", icon: <AlertCircle size={20} className="text-orange-500" /> },
  info: { rank: 1, button: "bg-indigo-600 hover:bg-indigo-700", icon: <Info size={20} className="text-blue-500" /> },
};

/**
 * Indicateur de notifications : petit bouton rond posé AU-DESSUS du bouton flottant « + », avec le nombre d'alertes
 * actives. Absent quand il n'y a aucune alerte. Un appui ouvre la liste des alertes en cours.
 */
export default function NotificationBell({ alerts, notificationsEnabled, onGoSettings, onGoDashboard }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;

  const top = alerts.reduce((m, a) => (SEVERITY[a.type].rank > SEVERITY[m.type].rank ? a : m), alerts[0]);
  const label = `${alerts.length} notification${alerts.length > 1 ? "s" : ""}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-tour="bell"
        aria-label={label}
        title={label}
        // Au-dessus du bouton « + » (bas 6 rem, 56 px de haut) ; sans bouton « + » sur grand écran
        className={cn(
          "fixed right-5 bottom-[10.5rem] md:right-8 md:bottom-8 z-40 w-11 h-11 rounded-full text-white shadow-lg flex items-center justify-center transition-transform active:scale-95",
          SEVERITY[top.type].button
        )}
      >
        <Bell size={20} />
        <span
          data-testid="bell-count"
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-white text-slate-900 text-[11px] font-bold flex items-center justify-center border border-slate-200 shadow"
        >
          {alerts.length}
        </span>
      </button>

      <BottomSheet open={open} title="Notifications" onClose={() => setOpen(false)}>
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-3">
              <span className="shrink-0 mt-0.5">{SEVERITY[a.type].icon}</span>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{a.message}</p>
              </div>
            </li>
          ))}
        </ul>

        {notificationsEnabled ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Ces alertes restent dans la zone de notification du téléphone tant qu'elles sont actives. Pour en retirer une,
            ouvrez la notification et utilisez le bouton « Supprimer » : elle reviendra à la prochaine ouverture de l'application
            si l'alerte est toujours active.
          </p>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
            <p>Les notifications sont désactivées : ces alertes ne s'affichent pas dans la zone de notification du téléphone.</p>
            <button onClick={() => { setOpen(false); onGoSettings(); }} className="mt-2 font-semibold underline">Les activer dans les réglages</button>
          </div>
        )}

        <button
          onClick={() => { setOpen(false); onGoDashboard(); }}
          className="mt-4 w-full text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 py-2.5 rounded-xl transition-colors"
        >
          Voir le tableau de bord
        </button>
      </BottomSheet>
    </>
  );
}
