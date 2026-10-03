/**
 * Messages d'erreur de la connexion Google, en français et sans jargon.
 *
 * Le plugin natif (@capgo/capacitor-social-login) rejette avec le même texte « Google Sign-In cancelled by user »
 * quand l'utilisateur ferme l'écran ET quand le réseau est indisponible : sans réseau, l'utilisateur croyait avoir
 * annulé. On distingue donc les cas, et on ne montre jamais le message brut du plugin.
 */

export const OFFLINE_MESSAGE =
  "Connexion impossible : aucune connexion Internet. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.";
export const CANCELLED_MESSAGE = "Connexion Google annulée.";
export const CONFIG_MESSAGE =
  "Connexion Google indisponible : configuration Android manquante (google-services.json ou client OAuth Android). Voir la procédure de configuration.";
export const GENERIC_MESSAGE = "Connexion Google impossible. Réessayez dans un instant.";

/** Erreur déjà traduite : `message` reste utile à la console, `userMessage` est ce qu'on affiche. */
export class GoogleSignInError extends Error {
  readonly userMessage: string;

  constructor(message: string, userMessage: string = message) {
    super(message);
    this.name = 'GoogleSignInError';
    this.userMessage = userMessage;
  }
}

/** Le téléphone/ navigateur sait-il qu'il a du réseau ? */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const CANCELLATION_PATTERN =
  /user_cancelled|user canceled|user cancelled|cancelled by user|canceled by user|access_denied|popup.closed.by.user|cancelled-popup-request|popup closed/i;
const NETWORK_PATTERN =
  /network-request-failed|no internet|unable to resolve host|failed to connect|network is unreachable|connection reset|timeout|unknown host/i;

/** Traduit n'importe quelle erreur de connexion en un message français actionnable. */
export function describeSignInError(error: unknown): string {
  if (error instanceof GoogleSignInError) return error.userMessage;
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? error ?? '');
  // Le code du plugin (`USER_CANCELLED`) et son message anglais sont ignorés : on regarde les deux.
  const haystack = `${code} ${message}`;
  // Sans réseau, le plugin dit « annulée par l'utilisateur » : le téléphone sait qu'il est hors ligne, on le croit.
  if (NETWORK_PATTERN.test(haystack) || isOffline()) return OFFLINE_MESSAGE;
  if (CANCELLATION_PATTERN.test(haystack)) return CANCELLED_MESSAGE;
  // Erreur de configuration Android (client OAuth absent) : le plugin renvoie le code « 10 ».
  if (code === '10' || /client id is not set|error 10|developer_error/i.test(message)) return CONFIG_MESSAGE;
  return GENERIC_MESSAGE;
}
