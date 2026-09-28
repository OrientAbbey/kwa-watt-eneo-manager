import React from "react";
import { Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import { useRemoteConfig } from "../../store/RemoteConfigContext";
import { LinkCategory } from "../../lib/remoteConfig";

const TITLES: Record<LinkCategory, string> = {
  officiel: "Sites officiels",
  paiement: "Paiement et factures",
  assistance: "Assistance et guides",
  actualites: "Actualités et coupures",
};

/** Liens utiles, pilotés par la configuration à distance (mise à jour possible sans nouvelle version). */
export default function UsefulLinksCard() {
  const { config, brand } = useRemoteConfig();
  const order = Object.keys(TITLES) as LinkCategory[];
  const groups = order.map((cat) => ({ cat, links: config.links.filter((l) => l.category === cat) })).filter((g) => g.links.length > 0);

  return (
    <Card id="useful-links">
      <CardHeader>
        <CardTitle className="text-lg flex items-center"><LinkIcon size={20} className="mr-2 text-blue-600" /> Liens utiles — {brand}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {groups.map(({ cat, links }) => (
          <div key={cat}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{TITLES[cat]}</h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id}>
                  <ExternalLink href={l.url} className="text-blue-600 hover:underline font-medium">{l.label}</ExternalLink>
                  {l.description && <p className="text-xs text-slate-500 dark:text-slate-400">{l.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
