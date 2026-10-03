#!/usr/bin/env npx tsx
/**
 * Script d'administration : publie ou met à jour le document Firestore public
 * `app_config/branding` (branding SOCADEL/ENEO, liens utiles, codes USSD, montant minimum de recharge…).
 *
 * Ce document est en lecture seule pour l'application (voir firestore.rules : `allow write: if false`) :
 * seul un script qui s'authentifie avec un compte de service (droits d'administrateur) peut l'écrire.
 * Ce script utilise le Admin SDK Firebase, qui ignore les règles de sécurité — à ne lancer que
 * volontairement, en local, jamais depuis l'application ni depuis la CI.
 *
 * Utilisation :
 *   1. npm install   (installe firebase-admin et tsx, déjà en devDependencies)
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/service-account.json
 *   3. npx tsx scripts/seed-remote-config.ts
 *
 * Voir docs/CONFIG_A_DISTANCE.md pour la procédure complète (où récupérer la clé de compte de service, etc).
 *
 * Premier lancement : aucune valeur locale n'existe encore -> le script écrit
 * scripts/remote-config.seed.json (pré-rempli avec les valeurs par défaut de l'application) puis
 * s'arrête SANS toucher à Firestore, pour vous laisser le relire/l'ajuster avant publication.
 * Lancements suivants : lit ce fichier, le valide, demande confirmation, puis publie sur Firestore.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_REMOTE_CONFIG, sanitizeRemoteConfig } from "../src/lib/remoteConfigSchema.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(ROOT, "scripts", "remote-config.seed.json");
const DOC_PATH = "app_config/branding";

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function readProjectId(): string {
  const raw = JSON.parse(readFileSync(join(ROOT, "firebase-applet-config.json"), "utf8"));
  if (!raw.projectId) fail("projectId introuvable dans firebase-applet-config.json");
  return raw.projectId;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} (oui/non) `);
    return /^o(ui)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    fail(
      "Variable GOOGLE_APPLICATION_CREDENTIALS absente : elle doit pointer vers votre clé de compte de service.\n" +
      "   Procédure complète : docs/CONFIG_A_DISTANCE.md"
    );
  }
  if (!existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    fail(`Fichier introuvable : ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  }

  // Premier lancement : on dépose un fichier local éditable et on s'arrête là, par sécurité
  // (on ne publie jamais sur la première exécution sans relecture humaine).
  if (!existsSync(SEED_PATH)) {
    writeFileSync(SEED_PATH, JSON.stringify(DEFAULT_REMOTE_CONFIG, null, 2) + "\n");
    console.log(`\n📄 Aucune configuration locale trouvée : ${SEED_PATH} a été créé avec les valeurs par défaut.`);
    console.log("   Relisez-le, ajustez ce qui doit l'être (liens, tarifs, contacts…), puis relancez ce script pour publier.\n");
    return;
  }

  const raw = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  const config = sanitizeRemoteConfig(raw);
  // Avertit si des champs ont été corrigés/ignorés (ex. un lien non https, un code USSD invalide) :
  // mieux vaut le savoir avant de publier plutôt que de découvrir un lien silencieusement retombé au défaut.
  const roundTrip = JSON.stringify(config) !== JSON.stringify(sanitizeRemoteConfig(config));
  if (JSON.stringify(sanitizeRemoteConfig(raw)) !== JSON.stringify(raw) || roundTrip) {
    console.warn("⚠️  Certaines valeurs de remote-config.seed.json étaient invalides et ont été remplacées par leur défaut. Vérifiez le récapitulatif ci-dessous avant de continuer.");
  }

  console.log(`\nDocument à publier sur ${DOC_PATH} :\n`);
  console.log(JSON.stringify(config, null, 2));
  console.log("");

  if (!(await confirm(`Publier ce document sur le projet Firebase « ${readProjectId()} » ?`))) {
    console.log("Annulé, rien n'a été publié.");
    return;
  }

const app = getApps().length ? getApps()[0]! : initializeApp({ credential: applicationDefault(), projectId: readProjectId() });
  // Firestore refuse d'écrire `undefined` : sanitizeRemoteConfig laisse `tariffs` (et la `description` d'un lien
  // qui n'en a pas) à `undefined`, on supprime donc ces clés avant l'écriture (elles resteront absentes du document).
  const clean = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  await getFirestore(app).doc(DOC_PATH).set(clean);
  console.log(`\n✅ ${DOC_PATH} publié. Les appareils déjà installés le récupéreront sous 24h (durée du cache local),`);
  console.log("   ou immédiatement après avoir vidé les données de l'application / réinstallé.\n");
}

main().catch((e) => fail(e?.message ?? String(e)));
