import React from "react";
import { Zap, Search, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import { useApp } from "../../store/AppContext";
import { useNav } from "../../store/NavContext";
import { useRemoteConfig } from "../../store/RemoteConfigContext";

/**
 * Coupures programmées — version 1 SANS serveur (gratuite) : il n'existe pas de flux public structuré ; l'opérateur
 * annonce les travaux par communiqués (réseaux sociaux, presse). On propose donc des raccourcis vers ces annonces,
 * déjà filtrés sur le quartier du profil.
 */
export default function OutagesCard() {
  const { currentMeter } = useApp();
  const { navigate } = useNav();
  const { config, brandName, brand } = useRemoteConfig();
  const location = currentMeter.profile.location.trim();
  const official = config.links.find((l) => l.category === "actualites");

  const query = `coupure électricité programmée ${brandName} ${location}`.trim();
  const search = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:w`;

  return (
    <Card id="outages">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><Zap size={20} className="mr-2 text-amber-500" /> Coupures et travaux annoncés</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {brand} annonce les travaux et coupures programmées par communiqué, quartier par quartier. Voici les raccourcis pour les retrouver.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {location ? (
          <ExternalLink href={search} className="w-full justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">
            <Search size={18} /> Annonces de la semaine : {location}
          </ExternalLink>
        ) : (
          <button onClick={() => navigate("profile")} className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Indiquez votre quartier dans le profil pour filtrer les annonces
          </button>
        )}
        {official && (
          <ExternalLink href={official.url} className="text-sm font-medium text-indigo-600 hover:underline">
            {official.label}
          </ExternalLink>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <PhoneCall size={14} />
          <span>Panne chez vous ? Appelez le service client :</span>
          <ExternalLink href={`tel:${config.contacts.infoLine}`} showIcon={false} className="font-bold text-indigo-600">{config.contacts.infoLine}</ExternalLink>
        </div>
      </CardContent>
    </Card>
  );
}
