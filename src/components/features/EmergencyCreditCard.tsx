import React from "react";
import { LifeBuoy, Trash2 } from "lucide-react";
import { Dialog } from "@capacitor/dialog";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { useApp } from "../../store/AppContext";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { outstandingEmergencyKwh } from "../../lib/energy";
import { cn } from "../../lib/utils";

/**
 * Crédit d'urgence (code 811) : c'est un PRÊT, pas un bonus. On l'enregistre ici pour ne pas croire qu'on a plus
 * d'énergie qu'en réalité : il sera déduit automatiquement de la prochaine recharge.
 */
export default function EmergencyCreditCard() {
  const { currentMeter, activateEmergencyCredit, deleteEmergencyCredit, showToast } = useApp();
  const { config } = useRemoteConfig();
  const credits = [...(currentMeter.emergencyCredits || [])].sort((a, b) => b.date.localeCompare(a.date));
  const due = outstandingEmergencyKwh(credits);

  const onActivate = async () => {
    const { value } = await Dialog.confirm({
      title: "Crédit d'urgence",
      message: `Avez-vous tapé 811 sur le compteur pour emprunter ${config.emergencyCreditKwh} kWh ?\n\nCe prêt sera déduit de votre prochaine recharge.`,
    });
    if (!value) return;
    activateEmergencyCredit(config.emergencyCreditKwh);
    showToast(`Crédit d'urgence enregistré (${config.emergencyCreditKwh} kWh à rembourser)`);
  };

  return (
    <Card id="emergency-credit" className={cn(due > 0 && "border-orange-200 dark:border-orange-900/60")}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><LifeBuoy size={20} className="mr-2 text-orange-500" /> Crédit d'urgence (811)</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Crédit épuisé et impossible de recharger ? Tapez <span className="font-mono font-bold">811</span> sur le compteur : {config.emergencyCreditKwh} kWh vous sont prêtés et déduits de la prochaine recharge.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {due > 0 ? (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 p-4">
            <p className="text-sm font-bold text-orange-900 dark:text-orange-200">À rembourser : {due} kWh</p>
            <p className="text-xs text-orange-800 dark:text-orange-300 mt-1">Ils seront retirés de votre prochaine recharge. Comptez-les comme déjà consommés.</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun crédit d'urgence en cours.</p>
        )}

        <button
          onClick={onActivate}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          J'ai activé le crédit d'urgence
        </button>

        {credits.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {credits.slice(0, 5).map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 capitalize">{format(parseISO(c.date), "dd MMM yyyy", { locale: fr })} · {c.kwh} kWh</p>
                  <p className={cn("text-xs", c.repaid ? "text-emerald-600" : "text-orange-600")}>
                    {c.repaid ? `Remboursé${c.repaidAt ? ` le ${format(parseISO(c.repaidAt), "dd/MM/yyyy")}` : ""}` : "À rembourser"}
                  </p>
                </div>
                <button
                  aria-label="Supprimer ce crédit d'urgence"
                  onClick={async () => {
                    const { value } = await Dialog.confirm({ title: "Confirmation", message: "Supprimer cette entrée (activation enregistrée par erreur) ?" });
                    if (value) deleteEmergencyCredit(c.id);
                  }}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
