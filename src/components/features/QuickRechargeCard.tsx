import React, { useState } from "react";
import { Smartphone, Info, ListOrdered } from "lucide-react";
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
 * Recharge par mobile money : le code de paiement complet (compteur + montant) est pré-rempli dans le composeur
 * du téléphone ; l'utilisateur n'a plus qu'à appeler puis confirmer avec son code PIN. Un menu guidé (étapes
 * officielles) reste disponible si le code direct ne passe pas.
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

  const mtnCode = amountOk ? buildUssdPayment(config.ussd.mtnPay, meterValue, amount) : null;
  const orangeCode = amountOk ? buildUssdPayment(config.ussd.orangePay, meterValue, amount) : null;
  const meterOk = /^\d{8,14}$/.test(meterValue.replace(/[\s.-]/g, ""));
  const mtnFee = amountOk ? mtnEneoPrepaidFee(amount) : null;
  const feesLink = config.links.find((l) => l.id === "mtn-fees");
  const mtnGuide = config.links.find((l) => l.id === "mtn-eneo-prepaid");

  const payButton = (label: string, code: string | null, cls: string) =>
    code ? (
      <ExternalLink href={telHref(code)} showIcon={false} className={cn("justify-center flex-col py-3 px-4 rounded-xl font-bold text-center transition-colors", cls)}>
        <span>{label}</span>
      </ExternalLink>
    ) : (
      <span aria-disabled="true" className="inline-flex justify-center py-3 px-4 rounded-xl font-bold text-center bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed">
        {label}
      </span>
    );

  return (
    <Card id="quick-recharge">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Smartphone size={20} className="mr-2 text-emerald-600" /> Recharger mon compteur</CardTitle>
        {!compact && <p className="text-sm text-slate-500 dark:text-slate-400">Le code de paiement s'ouvre dans le composeur du téléphone, déjà rempli. Vous confirmez avec votre code PIN.</p>}
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Numéro de compteur</label>
            <input
              type="text" inputMode="numeric" value={meterValue}
              onChange={(e) => setMeter(e.target.value)}
              placeholder="11 chiffres (tapez 804 sur le compteur)"
              className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            {!profileMeter && (
              <button onClick={() => navigate("profile")} className="text-xs text-indigo-600 underline mt-1">Enregistrer ce numéro dans le profil</button>
            )}
            {meterValue && !meterOk && <p className="text-xs text-red-600 mt-1">Le numéro doit contenir entre 8 et 14 chiffres.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Montant de l'énergie ({MONETARY_UNIT})</label>
            <input
              type="text" inputMode="numeric" value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 7))}
              placeholder={`minimum ${min.toLocaleString("fr-FR")}`}
              className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <button key={a} onClick={() => setAmountText(String(a))} className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-colors", amount === a ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50")}>
                  {a.toLocaleString("fr-FR")}
                </button>
              ))}
            </div>
            {amountText && !amountOk && (
              <p className="text-xs text-red-600 mt-1">Achat minimum : {min.toLocaleString("fr-FR")} {MONETARY_UNIT}.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {payButton("Payer avec MTN MoMo", meterOk ? mtnCode : null, "bg-yellow-400 hover:bg-yellow-500 text-slate-900")}
          {payButton("Payer avec Orange Money", meterOk ? orangeCode : null, "bg-orange-500 hover:bg-orange-600 text-white")}
        </div>

        {(mtnCode || orangeCode) && meterOk && (
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            {mtnCode && <p className="flex items-center gap-1.5 flex-wrap">Code MTN : <CopyableValue value={mtnCode} label="Code MTN" className="font-semibold text-slate-700 dark:text-slate-200" /></p>}
            {orangeCode && <p className="flex items-center gap-1.5 flex-wrap">Code Orange : <CopyableValue value={orangeCode} label="Code Orange" className="font-semibold text-slate-700 dark:text-slate-200" /></p>}
          </div>
        )}

        {amountOk && (
          <div className="flex items-start gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-3 text-xs text-indigo-900 dark:text-indigo-200">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              Des frais de l'opérateur mobile money <strong>s'ajoutent</strong> au montant.
              {mtnFee !== null && <> Avec MTN : <strong>{mtnFee.toLocaleString("fr-FR")} {MONETARY_UNIT}</strong>, soit environ <strong>{(amount + mtnFee).toLocaleString("fr-FR")} {MONETARY_UNIT}</strong> débités.</>}
              {" "}Avec Orange, comptez un montant du même ordre (100 {MONETARY_UNIT} relevés sur un SMS pour 3 000 {MONETARY_UNIT}).
              {feesLink && <> <ExternalLink href={feesLink.url} className="font-semibold underline">Grille des frais MTN</ExternalLink></>}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ListOrdered size={16} className="text-slate-400" /> Ou en suivant le menu, pas à pas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <ExternalLink href={telHref(config.ussd.mtnMenu)} showIcon={false} className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">{config.ussd.mtnMenu}</ExternalLink>
              <p className="mt-1.5"><strong>MTN MoMo</strong> : composez ce code, choisissez <strong>2</strong> « Prepaid ENEO invoice », puis suivez la procédure.</p>
            </div>
            <div>
              <ExternalLink href={telHref(config.ussd.orangeMenu)} showIcon={false} className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">{config.ussd.orangeMenu}</ExternalLink>
              <p className="mt-1.5"><strong>Orange Money</strong> : composez ce code, choisissez <strong>1</strong> « Recharge prépayée », puis suivez la procédure.</p>
            </div>
          </div>
          {mtnGuide && <ExternalLink href={mtnGuide.url} className="text-xs font-medium text-indigo-600 hover:underline">Procédure officielle MTN</ExternalLink>}
        </div>

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
