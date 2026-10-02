import React, { useState } from "react";
import { Smartphone, Info, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import CopyableValue from "../ui/CopyableValue";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { buildUssdPayment, telHref } from "../../lib/contact";
import { mtnEneoPrepaidFee } from "../../lib/paymentFees";
import { useApp } from "../../store/AppContext";
import { useNav } from "../../store/NavContext";
import { MONETARY_UNIT, cn } from "../../lib/utils";

const QUICK_AMOUNTS = [1000, 2000, 3000, 5000, 10000];

/**
 * Recharge par mobile money.
 *  - Les BOUTONS ouvrent le composeur avec le code COURT (menu guidé), qui fonctionne pour tous les abonnés.
 *  - Les codes LONGS (compteur + montant déjà inclus) ne fonctionnent en général que pour certains abonnés : ils sont
 *    proposés en option secondaire, à COPIER-COLLER (jamais en lien cliquable).
 */
export default function QuickRechargeCard({ compact = false }: { compact?: boolean }) {
  const { config } = useRemoteConfig();
  const { currentMeter } = useApp();
  const { navigate } = useNav();
  const [meter, setMeter] = useState<string | null>(null); // null = suit le compteur du profil
  const [amountText, setAmountText] = useState("");

  const profileMeter = currentMeter.profile.meterNumber;
  const meterValue = meter ?? profileMeter;
  const amount = parseInt(amountText, 10);
  const min = config.minRechargeAmount;
  const amountOk = Number.isInteger(amount) && amount >= min;
  const meterOk = /^\d{8,14}$/.test(meterValue.replace(/[\s.-]/g, ""));

  const mtnLong = amountOk && meterOk ? buildUssdPayment(config.ussd.mtnPay, meterValue, amount) : null;
  const orangeLong = amountOk && meterOk ? buildUssdPayment(config.ussd.orangePay, meterValue, amount) : null;
  const mtnFee = amountOk ? mtnEneoPrepaidFee(amount) : null;
  const feesLink = config.links.find((l) => l.id === "mtn-fees");
  const mtnGuide = config.links.find((l) => l.id === "mtn-eneo-prepaid");

  return (
    <Card id="quick-recharge">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Smartphone size={20} className="mr-2 text-emerald-600" /> Recharger mon compteur</CardTitle>
        {!compact && <p className="text-sm text-slate-500 dark:text-slate-400">Le code s'ouvre dans le composeur du téléphone. Suivez ensuite le menu et confirmez avec votre code PIN.</p>}
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* ── Principal : codes courts (menu guidé), pour tous les abonnés ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExternalLink href={telHref(config.ussd.mtnMenu)} showIcon={false} className="justify-center flex-col py-3 px-4 rounded-xl font-bold text-center transition-colors bg-yellow-400 hover:bg-yellow-500 text-slate-900">
            <span>MTN Mobile Money</span>
            <span className="font-mono text-sm opacity-80">{config.ussd.mtnMenu}</span>
          </ExternalLink>
          <ExternalLink href={telHref(config.ussd.orangeMenu)} showIcon={false} className="justify-center flex-col py-3 px-4 rounded-xl font-bold text-center transition-colors bg-orange-500 hover:bg-orange-600 text-white">
            <span>Orange Money</span>
            <span className="font-mono text-sm opacity-90">{config.ussd.orangeMenu}</span>
          </ExternalLink>
        </div>

        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <li><strong>MTN</strong> : choisissez <strong>2</strong> « Prepaid ENEO invoice », puis suivez la procédure.</li>
          <li><strong>Orange</strong> : choisissez <strong>1</strong> « Recharge prépayée », puis suivez la procédure.</li>
        </ul>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <p className="flex items-center gap-1.5 flex-wrap">
            Votre n° de compteur (demandé par le menu) :
            {profileMeter
              ? <CopyableValue value={profileMeter} label="N° de compteur" className="font-semibold text-indigo-700 dark:text-indigo-400" />
              : <button onClick={() => navigate("profile")} className="text-indigo-600 underline">à renseigner dans le profil</button>}
          </p>
          <p>
            Achat minimum : <strong>{min.toLocaleString("fr-FR")} {MONETARY_UNIT}</strong>. Des frais de l'opérateur s'ajoutent au montant
            {feesLink && <> (<ExternalLink href={feesLink.url} className="font-semibold underline">grille des frais MTN</ExternalLink>)</>}.
            {mtnGuide && <> <ExternalLink href={mtnGuide.url} className="font-semibold underline">Procédure officielle MTN</ExternalLink></>}
          </p>
        </div>

        {/* ── Secondaire : codes longs à copier-coller (certains abonnés seulement) ── */}
        <details className="group rounded-xl border border-slate-100 dark:border-slate-700">
          <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>Code direct compteur + montant <span className="font-normal text-slate-400">(option, à copier-coller)</span></span>
            <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2.5">
              Ces codes longs ne fonctionnent généralement que pour certains abonnés. S'ils ne passent pas, utilisez les boutons ci-dessus.
              Copiez le code, puis collez-le dans le composeur du téléphone.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Numéro de compteur</label>
              <input
                type="text" inputMode="numeric" value={meterValue}
                onChange={(e) => setMeter(e.target.value)}
                placeholder="11 chiffres (tapez 804 sur le compteur)"
                className="w-full p-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
              {meterValue && !meterOk && <p className="text-xs text-red-600 mt-1">Le numéro doit contenir entre 8 et 14 chiffres.</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Montant de l'énergie ({MONETARY_UNIT})</label>
              <input
                type="text" inputMode="numeric" value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder={`minimum ${min.toLocaleString("fr-FR")}`}
                className="w-full p-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button key={a} onClick={() => setAmountText(String(a))} className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-colors", amount === a ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300")}>
                    {a.toLocaleString("fr-FR")}
                  </button>
                ))}
              </div>
              {amountText && !amountOk && <p className="text-xs text-red-600 mt-1">Achat minimum : {min.toLocaleString("fr-FR")} {MONETARY_UNIT}.</p>}
            </div>

            {(mtnLong || orangeLong) ? (
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {mtnLong && <p className="flex items-center gap-1.5 flex-wrap"><strong>MTN</strong> <CopyableValue value={mtnLong} label="Code MTN" className="font-semibold text-slate-800 dark:text-slate-100" /></p>}
                {orangeLong && <p className="flex items-center gap-1.5 flex-wrap"><strong>Orange</strong> <CopyableValue value={orangeLong} label="Code Orange" className="font-semibold text-slate-800 dark:text-slate-100" /></p>}
                {mtnFee !== null && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-2 text-indigo-900 dark:text-indigo-200">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Avec MTN, frais de <strong>{mtnFee.toLocaleString("fr-FR")} {MONETARY_UNIT}</strong> : environ <strong>{(amount + mtnFee).toLocaleString("fr-FR")} {MONETARY_UNIT}</strong> débités.</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Renseignez un numéro de compteur valide et un montant pour générer les codes.</p>
            )}
          </div>
        </details>

        <button
          onClick={() => navigate("history", { type: "paste-sms" })}
          className="w-full text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 py-2.5 rounded-xl transition-colors"
        >
          Enregistrer la recharge à partir du SMS reçu
        </button>
      </CardContent>
    </Card>
  );
}
