/**
 * Messages clairs pour les échecs de connexion Google. Le plugin natif répond « Google Sign-In cancelled by user » dès que
 * la fenêtre de choix du compte se ferme — y compris quand elle se ferme parce qu'il n'y a PAS DE RÉSEAU. Ce message
 * brut était trompeur : on le remplace par la vraie cause probable.
 */

export type SignInErrorKind = "offline" | "network" | "cancelled" | "unknown";

export interface SignInErrorInfo {
  kind: SignInErrorKind;
  message: string;
}

export const OFFLINE_MESSAGE =
  "Connexion internet absente : la connexion avec Google a besoin du réseau. Vérifiez vos données mobiles ou le Wi‑Fi, puis réessayez — ou continuez en mode visiteur (l'application fonctionne hors ligne).";

const NETWORK_RE = /network|timeout|timed out|unreachable|failed to fetch|unable to resolve|no address associated|connection (reset|refused|lost)|offline/i;
const CANCEL_RE = /cancel/i;

/**
 * @param online résultat d'un test de connectivité RÉEL (pas seulement `navigator.onLine`, qui reste vrai en Wi‑Fi sans internet).
 */
export function describeSignInError(error: unknown, online: boolean): SignInErrorInfo {
  if (!online) return { kind: "offline", message: OFFLINE_MESSAGE };

  const code = String((error as { code?: unknown })?.code ?? "");
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : String((error as { message?: unknown })?.message ?? "");

  if (code === "auth/network-request-failed" || NETWORK_RE.test(raw)) {
    return {
      kind: "network",
      message: "Réseau indisponible ou trop lent : la connexion avec Google n'a pas pu aboutir. Réessayez dans un instant, ou continuez en mode visiteur.",
    };
  }
  if (code.includes("CANCEL") || CANCEL_RE.test(code) || CANCEL_RE.test(raw)) {
    return { kind: "cancelled", message: "Connexion Google annulée. Vous pouvez réessayer, ou continuer en mode visiteur." };
  }
  return { kind: "unknown", message: raw ? `Connexion Google impossible : ${raw}` : "Connexion Google impossible. Réessayez, ou continuez en mode visiteur." };
}
