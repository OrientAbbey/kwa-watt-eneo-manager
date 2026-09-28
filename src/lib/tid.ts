/**
 * Diagnostic de la mise à jour TID (Token Identifier) des compteurs prépayés.
 * Contexte (ENEO/SOCADEL) : les compteurs de marques HEXING/INHEMETER posés entre 2017 et 2021 doivent passer du
 * standard STS édition 1 à l'édition 2 à l'aide de deux jetons de changement de clé (KCT). Le code 873 sur le clavier du
 * compteur indique l'édition : « 01 » = édition 1 (mise à jour à faire), « 02 » = déjà à jour.
 */

export type Sts873 = "01" | "02" | "unknown";

export type TidVerdict = "done" | "todo" | "likely" | "unlikely" | "unknown";

export interface TidAssessment {
  verdict: TidVerdict;
  title: string;
  message: string;
}

export const TID_AT_RISK_YEARS: [number, number] = [2017, 2021];

export function assessTid(code873: Sts873, installYear?: number): TidAssessment {
  if (code873 === "02") {
    return { verdict: "done", title: "Compteur à jour", message: "Votre compteur est déjà au standard STS édition 2 : aucune action n'est nécessaire." };
  }
  if (code873 === "01") {
    return {
      verdict: "todo",
      title: "Mise à jour à effectuer",
      message: "Votre compteur est encore au standard STS édition 1 : vous êtes éligible à la mise à jour TID. Suivez la procédure officielle ci-dessous.",
    };
  }
  if (installYear && Number.isFinite(installYear)) {
    const [from, to] = TID_AT_RISK_YEARS;
    if (installYear >= from && installYear <= to) {
      return {
        verdict: "likely",
        title: "Compteur probablement concerné",
        message: `Les compteurs posés entre ${from} et ${to} sont les plus touchés. Tapez le code 873 sur le clavier du compteur pour le savoir avec certitude.`,
      };
    }
    return {
      verdict: "unlikely",
      title: "Compteur probablement non concerné",
      message: `Votre compteur date de ${installYear}, hors de la période la plus touchée (${from}-${to}). Tapez 873 sur le compteur pour vérifier.`,
    };
  }
  return {
    verdict: "unknown",
    title: "À vérifier sur le compteur",
    message: "Tapez le code 873 sur le clavier du compteur : « 01 » signifie que la mise à jour est à faire, « 02 » que vous êtes à jour.",
  };
}

export const TID_STEPS: string[] = [
  "Tapez 873 puis validez sur le clavier du compteur : « 01 » = mise à jour à faire, « 02 » = déjà à jour.",
  "Si c'est « 01 », saisissez d'abord vos éventuels jetons de crédit en attente, puis obtenez vos deux jetons de mise à jour auprès de l'opérateur (agence, MyEasyLight ou service client 8010).",
  "Saisissez les deux jetons de changement de clé (KCT) sur le clavier du compteur, l'un après l'autre.",
  "Tapez de nouveau 873 et validez : le message « ACCEPTED » confirme que la mise à jour est effective.",
  "Saisissez enfin votre jeton de crédit : il sera accepté une fois la mise à jour effectuée.",
];
