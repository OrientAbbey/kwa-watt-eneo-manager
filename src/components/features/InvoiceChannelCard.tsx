import React from "react";
import { FileText, MessageCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import CopyableValue from "../ui/CopyableValue";
import { useApp } from "../../store/AppContext";
import { useNav } from "../../store/NavContext";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { invoiceRequestText, smsHref, whatsappHref } from "../../lib/contact";

/** Canal officiel : envoyer son numéro de contrat par SMS ou WhatsApp pour recevoir factures et reçus. */
export default function InvoiceChannelCard() {
  const { currentMeter } = useApp();
  const { navigate } = useNav();
  const { config, brandName } = useRemoteConfig();
  const { contractNumber, meterNumber } = currentMeter.profile;
  const text = invoiceRequestText(contractNumber, meterNumber);

  return (
    <Card id="invoice-channel">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><FileText size={20} className="mr-2 text-blue-600" /> Récupérer ma facture ou mes reçus</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Envoyez votre numéro de contrat au service {brandName} : vous recevez votre facture du mois et l'historique de vos derniers reçus.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {text ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            Message envoyé : <CopyableValue value={text} label={contractNumber ? "N° de contrat" : "N° de compteur"} className="font-semibold text-indigo-700 dark:text-indigo-400" />
          </p>
        ) : (
          <button onClick={() => navigate("profile")} className="text-xs text-indigo-600 underline">
            Renseignez votre numéro de contrat dans le profil pour pré-remplir le message
          </button>
        )}
        {!contractNumber && meterNumber && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">Numéro de contrat absent : c'est votre numéro de compteur qui sera pré-rempli. Le service attend normalement le numéro de contrat.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExternalLink href={smsHref(config.contacts.infoLine, text)} showIcon={false} className="justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">
            <MessageSquare size={18} /> SMS au {config.contacts.infoLine}
          </ExternalLink>
          <ExternalLink href={whatsappHref(config.contacts.whatsappCountryCode, config.contacts.whatsapp, text)} className="justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors">
            <MessageCircle size={18} /> WhatsApp
          </ExternalLink>
        </div>
        <ExternalLink href={`tel:${config.contacts.infoLine}`} showIcon={false} className="text-xs text-slate-500 hover:text-indigo-600 underline">
          Ou appelez le {config.contacts.infoLine} (service client)
        </ExternalLink>
      </CardContent>
    </Card>
  );
}
