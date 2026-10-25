import React from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import ExternalLink from "../ui/ExternalLink";
import TourLauncher from "../tour/TourLauncher";
import { APP_LICENSE, APP_VERSION, ISSUES_URL, LICENSE_URL, REPO_URL } from "../../lib/appInfo";

/** « À propos » : version, licence, liens, mention d'indépendance et accès à la présentation de l'application. */
export default function AboutCard() {
  return (
    <Card id="about">
      <CardHeader>
        <CardTitle className="flex items-center text-lg"><Info size={20} className="mr-2 text-indigo-600" /> À propos de KWA-WATT</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-500 dark:text-slate-400">Version</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100" data-testid="about-version">{APP_VERSION}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Licence</dt>
          <dd><ExternalLink href={LICENSE_URL} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">{APP_LICENSE}</ExternalLink></dd>
          <dt className="text-slate-500 dark:text-slate-400">Code source</dt>
          <dd><ExternalLink href={REPO_URL} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">GitHub</ExternalLink></dd>
          <dt className="text-slate-500 dark:text-slate-400">Un problème ?</dt>
          <dd><ExternalLink href={ISSUES_URL} className="font-semibold text-indigo-700 hover:underline dark:text-indigo-400">Le signaler</ExternalLink></dd>
        </dl>

        <p className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          Application indépendante : elle n'est affiliée ni à ENEO / SOCADEL, ni à MTN, ni à Orange. Ces noms appartiennent à leurs propriétaires
          et ne servent qu'à désigner les services avec lesquels l'application aide à travailler.
        </p>

        <div>
          <h4 className="mb-2 font-semibold text-slate-800 dark:text-slate-100">Présentation de l'application</h4>
          <TourLauncher />
        </div>
      </CardContent>
    </Card>
  );
}
