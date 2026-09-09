import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { appConfig } from '../config';
import firebaseConfig from '../../firebase-applet-config.json';

const isNativePlatform = Capacitor.isNativePlatform();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let socialLoginInit: Promise<void> | null = null;
function ensureGoogleAuthInit() {
  if (!socialLoginInit) {
    socialLoginInit = SocialLogin.initialize({
      google: {
        webClientId: appConfig.google.webClientId,
        mode: appConfig.google.loginMode,
      },
    }).then(() => undefined);
  }
  return socialLoginInit;
}

const signInWithGoogleNative = async () => {
  await ensureGoogleAuthInit();
  const res = await SocialLogin.login({
    provider: 'google',
    options: { scopes: [...appConfig.google.scopes] },
  });
  if (res.provider !== 'google' || res.result.responseType !== 'online' || !res.result.idToken) {
    throw new Error('Connexion Google annulée ou aucun jeton reçu.');
  }
  const credential = GoogleAuthProvider.credential(res.result.idToken);
  return (await signInWithCredential(auth, credential)).user;
};

export const signInWithGoogle = async () => {
  try {
    if (isNativePlatform) {
      return await signInWithGoogleNative();
    }

    // Web / PWA : popup classique, redirection en secours
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw error;
    }
  } catch (error: any) {
    if (isNativePlatform && error?.code === '10') {
      console.error('Google sign-in failed: Android client not configured', error);
      throw new Error(
        'Connexion Google indisponible : configuration Android manquante (google-services.json ou client OAuth Android). Voir la procédure de configuration.'
      );
    }
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    if (isNativePlatform) {
      await SocialLogin.logout({ provider: 'google' });
    }
  } catch (error) {
    console.error('Error signing out from Google provider', error);
  }
  await signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
