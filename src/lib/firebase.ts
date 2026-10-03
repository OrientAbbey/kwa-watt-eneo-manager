import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, signInWithCredential, deleteUser } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { appConfig } from '../config';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleSignInError, OFFLINE_MESSAGE, isOffline } from './signInErrors';

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
    throw new GoogleSignInError('no-token', 'Connexion Google annulée ou aucun jeton reçu.');
  }
  const credential = GoogleAuthProvider.credential(res.result.idToken);
  return (await signInWithCredential(auth, credential)).user;
};

export const signInWithGoogle = async () => {
  try {
    // Sans réseau, le plugin natif remonte « Google Sign-In cancelled by user » : on ne lance pas l'écran Google.
    if (isOffline()) throw new GoogleSignInError('offline', OFFLINE_MESSAGE);

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

/**
 * Suppression définitive du compte : efface la synchronisation cloud (Firestore)
 * puis supprime l'utilisateur Firebase Auth. Peut lever 'auth/requires-recent-login'
 * si la connexion est trop ancienne.
 */
export const deleteAccount = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Aucun utilisateur connecté.');
  }
  try {
    // Photos synchronisées (sous-collection) puis document principal
    const photos = await getDocs(collection(db, 'user_data', user.uid, 'photos'));
    await Promise.all(photos.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'user_data', user.uid));
  } catch (error) {
    console.error('Failed to delete cloud data', error);
  }
  await deleteUser(user);
};

export enum OperationType {
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
